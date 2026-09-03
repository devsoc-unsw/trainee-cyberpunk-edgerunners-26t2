import { supabase } from '@/lib/supabase';
import { AdminAction, AdminBet, AdminUser, Market, MarketOutcome, Position, UserRole } from '@/types';

type MarketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  closes_at: string;
  status: string;
  resolution_criteria: string | null;
  created_at: string;
  outcomes: {
    id: string;
    name: string;
    pool: number;
  }[];
};

type ProfileRow = {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  status: string;
};

type AdminActionRow = {
  id: string;
  admin_id: string;
  action: string;
  target: string;
  summary: string;
  reason: string;
  created_at: string;
  profiles: { username: string | null; email: string | null } | null;
};

function getMarketStatus(status: string): Market['status'] {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === 'CLOSED') return 'CLOSED';
  if (normalizedStatus === 'RESOLVED') return 'RESOLVED';
  if (normalizedStatus === 'VOIDED') return 'VOIDED';
  return 'OPEN';
}

function getUserRole(role: string): UserRole {
  return role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function getAdminAction(action: string): AdminAction['action'] {
  if (action === 'MARKET_CREATED') return 'MARKET_CREATED';
  if (action === 'MARKET_UPDATED') return 'MARKET_UPDATED';
  if (action === 'ODDS_OVERRIDE') return 'ODDS_OVERRIDE';
  if (action === 'BET_REFUNDED') return 'BET_REFUNDED';
  if (action === 'MARKET_VOIDED') return 'MARKET_VOIDED';
  if (action === 'ROLE_UPDATED') return 'ROLE_UPDATED';
  if (action === 'USER_SUSPENDED') return 'USER_SUSPENDED';
  return 'CREDIT_ADJUSTMENT';
}

async function recordAdminAction(input: {
  action: AdminAction['action'];
  target: string;
  summary: string;
  reason?: string;
}) {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return;

  const { error } = await supabase.from('admin_actions').insert({
    admin_id: userData.user.id,
    action: input.action,
    target: input.target,
    summary: input.summary,
    reason: input.reason ?? '',
  });

  if (error) throw error;
}

function getMarketOutcome(row: MarketRow, name: string) {
  return row.outcomes.find((outcome) => outcome.name.toLowerCase() === name.toLowerCase());
}

function mapMarket(row: MarketRow): Market {
  const outcomes: MarketOutcome[] = row.outcomes.map((outcome) => ({
    id: outcome.id,
    name: outcome.name.toUpperCase() === 'NO' ? 'NO' : 'YES',
    pool: outcome.pool,
  }));
  const yesOutcome = getMarketOutcome(row, 'yes');
  const totalPool = row.outcomes.reduce((total, outcome) => total + outcome.pool, 0);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    status: getMarketStatus(row.status),
    closesAt: row.closes_at,
    resolutionCriteria: row.resolution_criteria ?? '',
    yesProbability: totalPool > 0 ? (yesOutcome?.pool ?? 0) / totalPool : 0.5,
    outcomes,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export async function fetchMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select(
      'id, title, description, category, closes_at, status, resolution_criteria, created_at, outcomes(id, name, pool)',
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as MarketRow[]).map(mapMarket);
}

export async function fetchMarket(id: string) {
  const { data, error } = await supabase
    .from('markets')
    .select(
      'id, title, description, category, closes_at, status, resolution_criteria, created_at, outcomes(id, name, pool)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMarket(data as unknown as MarketRow) : null;
}

export async function fetchBalance(profileId: string) {
  const { data, error } = await supabase
    .from('profile_balances')
    .select('balance')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return data?.balance ?? 0;
}

export async function fetchProfile(profileId: string, email: string | null) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email, role, status')
    .eq('id', profileId)
    .maybeSingle();

  if (error) throw error;

  if (data) {
    return data as unknown as ProfileRow;
  }

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: profileId,
      username: email?.split('@')[0] ?? 'UNSW Student',
      email,
    })
    .select('id, username, email, role, status')
    .single();

  if (createError) throw createError;
  return createdProfile as unknown as ProfileRow;
}

export async function fetchPositions(profileId: string) {
  const { data, error } = await supabase
    .from('positions')
    .select(
      'id, profile_id, market_id, outcome_id, stake, created_at, markets(title), outcomes(name, pool)',
    )
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    profile_id: string;
    market_id: string;
    outcome_id: string;
    stake: number;
    created_at: string;
    markets: { title: string } | null;
    outcomes: { name: string; pool: number } | null;
  }[]).map<Position>((position) => ({
    id: position.id,
    userId: position.profile_id,
    marketId: position.market_id,
    outcome: position.outcomes?.name.toUpperCase() === 'NO' ? 'NO' : 'YES',
    stake: position.stake,
    potentialPayout: position.stake,
    status: 'OPEN',
    marketTitle: position.markets?.title ?? 'Unknown market',
    placedAt: position.created_at,
  }));
}

export async function placeBet(outcomeId: string, stake: number) {
  const { data, error } = await supabase.functions.invoke('place_bet', {
    body: {
      outcome_id: outcomeId,
      stake,
    },
  });

  if (error) throw new Error(getErrorMessage(error));

  const result = (data as { data?: { balance?: number } } | null)?.data ?? data;
  return result as { position_id: string; stake: number; pool: number; balance: number };
}

export async function createMarket(input: {
  title: string;
  description: string;
  category: string;
  closesAt: string;
  resolutionCriteria: string;
}) {
  const { data, error } = await supabase
    .from('markets')
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      closes_at: input.closesAt,
      resolution_criteria: input.resolutionCriteria,
    })
    .select('id')
    .single();

  if (error) throw error;

  const { error: outcomesError } = await supabase.from('outcomes').insert([
    { market_id: data.id, name: 'Yes', pool: 1 },
    { market_id: data.id, name: 'No', pool: 1 },
  ]);

  if (outcomesError) throw outcomesError;
  await recordAdminAction({
    action: 'MARKET_CREATED',
    target: input.title,
    summary: 'Created market',
  });
  return data.id;
}

export async function updateMarket(
  id: string,
  input: {
    title: string;
    description: string;
    category: string;
    closesAt: string;
    resolutionCriteria: string;
  },
) {
  const { error } = await supabase
    .from('markets')
    .update({
      title: input.title,
      description: input.description,
      category: input.category,
      closes_at: input.closesAt,
      resolution_criteria: input.resolutionCriteria,
    })
    .eq('id', id);

  if (error) throw error;

  await recordAdminAction({
    action: 'MARKET_UPDATED',
    target: input.title,
    summary: 'Updated market details',
  });
}

export async function updateMarketOdds(marketId: string, yesProbability: number, reason = '') {
  const { data: outcomes, error } = await supabase
    .from('outcomes')
    .select('id, name')
    .eq('market_id', marketId);

  if (error) throw error;

  const updates = (outcomes ?? []).map((outcome) =>
    supabase
      .from('outcomes')
      .update({ pool: outcome.name.toLowerCase() === 'yes' ? Math.round(yesProbability * 100) : Math.round((1 - yesProbability) * 100) })
      .eq('id', outcome.id),
  );

  const results = await Promise.all(updates);
  const updateError = results.find((result) => result.error)?.error;

  if (updateError) throw updateError;

  await recordAdminAction({
    action: 'ODDS_OVERRIDE',
    target: marketId,
    summary: `Changed YES odds to ${Math.round(yesProbability * 100)}%`,
    reason,
  });
}

export async function updateUserAccess(id: string, field: 'role' | 'status', value: string) {
  const update = field === 'role' ? { role: value } : { status: value };
  const { error } = await supabase.from('profiles').update(update).eq('id', id);

  if (error) throw error;

  await recordAdminAction({
    action: field === 'role' ? 'ROLE_UPDATED' : 'USER_SUSPENDED',
    target: id,
    summary: field === 'role' ? 'Updated user role' : 'Suspended user',
  });
}

export async function fetchAdminHistory() {
  const { data, error } = await supabase
    .from('admin_actions')
    .select('id, admin_id, action, target, summary, reason, created_at, profiles(username, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as AdminActionRow[]).map<AdminAction>((item) => ({
    id: item.id,
    adminName: item.profiles?.username ?? item.profiles?.email ?? 'Admin',
    action: getAdminAction(item.action),
    target: item.target,
    summary: item.summary,
    reason: item.reason,
    createdAt: item.created_at,
  }));
}

export async function fetchAdminUsers() {
  const [{ data: profiles, error: profilesError }, { data: balances, error: balancesError }, { data: positions, error: positionsError }] = await Promise.all([
    supabase.from('profiles').select('id, username, email, role, status'),
    supabase.from('profile_balances').select('profile_id, balance'),
    supabase.from('positions').select('profile_id'),
  ]);

  if (profilesError) throw profilesError;
  if (balancesError) throw balancesError;
  if (positionsError) throw positionsError;

  const balanceByProfile = new Map((balances ?? []).map((item) => [item.profile_id, item.balance ?? 0]));
  const betsByProfile = new Map<string, number>();

  for (const position of positions ?? []) {
    betsByProfile.set(position.profile_id, (betsByProfile.get(position.profile_id) ?? 0) + 1);
  }

  return ((profiles ?? []) as unknown as ProfileRow[]).map<AdminUser>((profile) => ({
    id: profile.id,
    name: profile.username ?? profile.email ?? 'UNSW Student',
    email: profile.email ?? '—',
    balance: balanceByProfile.get(profile.id) ?? 0,
    role: getUserRole(profile.role),
    status: profile.status.toUpperCase() === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    betCount: betsByProfile.get(profile.id) ?? 0,
  }));
}

export async function fetchAdminBets() {
  const { data, error } = await supabase
    .from('positions')
    .select(
      'id, profile_id, market_id, outcome_id, stake, created_at, profiles(username, email), markets(title, outcomes(name, pool)), outcomes(name, pool)',
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    profile_id: string;
    market_id: string;
    outcome_id: string;
    stake: number;
    created_at: string;
    profiles: { username: string | null; email: string | null } | null;
    markets: { title: string; outcomes: { name: string; pool: number }[] } | null;
    outcomes: { name: string; pool: number } | null;
  }[]).map<AdminBet>((bet) => {
    const yesPool = bet.markets?.outcomes.find((outcome) => outcome.name.toLowerCase() === 'yes')?.pool ?? 0;
    const totalPool = bet.markets?.outcomes.reduce((total, outcome) => total + outcome.pool, 0) ?? 0;

    return {
      id: bet.id,
      userId: bet.profile_id,
      marketId: bet.market_id,
      outcome: bet.outcomes?.name.toUpperCase() === 'NO' ? 'NO' : 'YES',
      stake: bet.stake,
      potentialPayout: bet.stake,
      status: 'OPEN',
      userName: bet.profiles?.username ?? bet.profiles?.email ?? 'UNSW Student',
      marketTitle: bet.markets?.title ?? 'Unknown market',
      placedAt: bet.created_at,
      oddsAtPlacement: totalPool > 0 ? yesPool / totalPool : 0.5,
    };
  });
}
