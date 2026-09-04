import { isMarketExpired } from '@/lib/countdown';
import { supabase } from '@/lib/supabase';
import { AdminAction, AdminBet, AdminUser, Market, MarketOutcome, MarketPricePoint, Position, UserRole } from '@/types';

type MarketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  closes_at: string;
  status: string;
  resolution_criteria: string | null;
  created_at: string;
  resolved_outcome_id: string | null;
  resolved_at: string | null;
  deleted_at: string | null;
  video_path: string | null;
  video_duration_ms: number | null;
  outcomes: {
    id: string;
    name: string;
    pool: number;
    liquidity: number;
    wager_pool: number;
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
  target_type: string;
  target_id: string | null;
  profiles: { username: string | null; email: string | null } | null;
};

function getMarketStatus(status: string, closesAt: string): Market['status'] {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === 'CLOSED') return 'CLOSED';
  if (normalizedStatus === 'RESOLVED') return 'RESOLVED';
  if (normalizedStatus === 'VOIDED') return 'VOIDED';

  // close_expired_markets() runs once a minute, so a market can still read as
  // 'open' for up to a minute after its deadline. place_bet already rejects
  // those bets, so show them as closed rather than inviting a bet that fails.
  if (isMarketExpired(closesAt)) return 'CLOSED';

  return 'OPEN';
}

function getUserRole(role: string): UserRole {
  return role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function getAdminAction(action: string): AdminAction['action'] {
  if (action === 'MARKET_CREATED') return 'MARKET_CREATED';
  if (action === 'MARKET_UPDATED') return 'MARKET_UPDATED';
  if (action === 'ODDS_OVERRIDE') return 'ODDS_OVERRIDE';
  if (action === 'MARKET_CLOSED') return 'MARKET_CLOSED';
  if (action === 'MARKET_REOPENED') return 'MARKET_REOPENED';
  if (action === 'MARKET_RESOLVED') return 'MARKET_RESOLVED';
  if (action === 'MARKET_DELETED') return 'MARKET_DELETED';
  if (action === 'BET_REFUNDED') return 'BET_REFUNDED';
  if (action === 'MARKET_VOIDED') return 'MARKET_VOIDED';
  if (action === 'ROLE_UPDATED') return 'ROLE_UPDATED';
  if (action === 'USER_SUSPENDED') return 'USER_SUSPENDED';
  if (action === 'USER_REACTIVATED') return 'USER_REACTIVATED';
  return 'CREDIT_ADJUSTMENT';
}

function getMarketOutcome(row: MarketRow, name: string) {
  return row.outcomes.find((outcome) => outcome.name.toLowerCase() === name.toLowerCase());
}

function mapMarket(row: MarketRow): Market {
  const outcomes: MarketOutcome[] = row.outcomes.map((outcome) => ({
    id: outcome.id,
    name: outcome.name.toUpperCase() === 'NO' ? 'NO' : 'YES',
    pool: outcome.pool,
    liquidity: outcome.liquidity,
    wagerPool: outcome.wager_pool,
  }));
  const yesOutcome = getMarketOutcome(row, 'yes');
  const totalPool = row.outcomes.reduce((total, outcome) => total + outcome.pool, 0);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category,
    status: getMarketStatus(row.status, row.closes_at),
    closesAt: row.closes_at,
    resolutionCriteria: row.resolution_criteria ?? '',
    yesProbability: totalPool > 0 ? (yesOutcome?.pool ?? 0) / totalPool : 0.5,
    resolvedOutcomeId: row.resolved_outcome_id ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
    videoPath: row.video_path ?? undefined,
    videoDurationMs: row.video_duration_ms ?? undefined,
    outcomes,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

// markets and outcomes are joined by two foreign keys -- outcomes.market_id and
// markets.resolved_outcome_id -- so a bare `outcomes(...)` embed is ambiguous and
// PostgREST rejects it with PGRST201. Every markets -> outcomes embed therefore
// names the constraint it means.
export async function fetchMarkets(options: { includeDeleted?: boolean } = {}) {
  let query = supabase
    .from('markets')
    .select(
      'id, title, description, category, closes_at, status, resolution_criteria, created_at, resolved_outcome_id, resolved_at, deleted_at, video_path, video_duration_ms, outcomes!outcomes_market_id_fkey(id, name, pool, liquidity, wager_pool)',
    )
    .order('created_at', { ascending: false });

  if (!options.includeDeleted) query = query.is('deleted_at', null);
  const { data, error } = await query;

  if (error) throw error;

  return ((data ?? []) as unknown as MarketRow[]).map(mapMarket);
}

export async function fetchMarket(id: string) {
  const { data, error } = await supabase
    .from('markets')
    .select(
      'id, title, description, category, closes_at, status, resolution_criteria, created_at, resolved_outcome_id, resolved_at, deleted_at, video_path, video_duration_ms, outcomes!outcomes_market_id_fkey(id, name, pool, liquidity, wager_pool)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapMarket(data as unknown as MarketRow) : null;
}

/**
 * Probability history for a set of markets, oldest point first, grouped by
 * market id. Fetched in one round trip rather than per card so the feed does
 * not fire a request per market as it scrolls.
 */
export async function fetchMarketHistories(marketIds: string[]) {
  const histories: Record<string, MarketPricePoint[]> = {};

  if (marketIds.length === 0) return histories;

  const { data, error } = await supabase
    .from('market_probability_points')
    .select('market_id, yes_probability, total_pool, recorded_at')
    .in('market_id', marketIds)
    .order('recorded_at', { ascending: true });

  if (error) throw error;

  for (const row of (data ?? []) as unknown as {
    market_id: string;
    yes_probability: number | string;
    total_pool: number;
    recorded_at: string;
  }[]) {
    const points = histories[row.market_id] ?? (histories[row.market_id] = []);

    points.push({
      // numeric arrives as a string over the wire when it exceeds JS precision,
      // so coerce rather than trusting the type.
      probability: Number(row.yes_probability),
      totalPool: row.total_pool,
      recordedAt: row.recorded_at,
    });
  }

  return histories;
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
      'id, profile_id, market_id, outcome_id, stake, payout, status, entry_probability, created_at, markets(title), outcomes(name, pool)',
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
    payout: number | null;
    status: string;
    entry_probability: number;
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
    status: position.status as Position['status'],
    payout: position.payout ?? undefined,
    entryProbability: position.entry_probability,
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
  yesPercentage?: number;
  videoPath?: string | null;
  videoDurationMs?: number | null;
}) {
  const { data, error } = await supabase.rpc('admin_create_market', {
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_closes_at: input.closesAt,
    p_resolution_criteria: input.resolutionCriteria,
    p_yes_percentage: input.yesPercentage ?? 50,
    p_video_path: input.videoPath ?? null,
    p_video_duration_ms: input.videoDurationMs ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMarket(
  id: string,
  input: {
    title: string;
    description: string;
    category: string;
    closesAt: string;
    resolutionCriteria: string;
    videoPath?: string | null;
    videoDurationMs?: number | null;
  },
) {
  const { error } = await supabase.rpc('admin_update_market', {
    p_market_id: id,
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_closes_at: input.closesAt,
    p_resolution_criteria: input.resolutionCriteria,
    p_video_path: input.videoPath ?? null,
    p_video_duration_ms: input.videoDurationMs ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateMarketOdds(marketId: string, yesProbability: number, reason: string) {
  const { error } = await supabase.rpc('admin_override_odds', {
    p_market_id: marketId,
    p_yes_percentage: Math.round(yesProbability * 100),
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
}

async function runAdminRpc(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function setMarketBetting(marketId: string, open: boolean) {
  const { error } = await supabase.rpc('admin_set_market_betting', { p_market_id: marketId, p_open: open });
  await runAdminRpc(error);
}

export async function resolveMarket(marketId: string, outcome: 'YES' | 'NO') {
  const { error } = await supabase.rpc('admin_resolve_market', { p_market_id: marketId, p_outcome_name: outcome });
  await runAdminRpc(error);
}

export async function voidMarket(marketId: string, reason: string) {
  const { error } = await supabase.rpc('admin_void_market', { p_market_id: marketId, p_reason: reason });
  await runAdminRpc(error);
}

export async function deleteMarket(marketId: string, reason: string) {
  const { error } = await supabase.rpc('admin_delete_market', { p_market_id: marketId, p_reason: reason });
  await runAdminRpc(error);
}

export async function refundBet(positionId: string, reason: string) {
  const { error } = await supabase.rpc('admin_refund_bet', { p_position_id: positionId, p_reason: reason });
  await runAdminRpc(error);
}

export async function adjustUserCredits(profileId: string, delta: number, reason: string, requestId: string) {
  const { data, error } = await supabase.rpc('admin_adjust_credits', { p_profile_id: profileId, p_delta: delta, p_reason: reason, p_request_id: requestId });
  await runAdminRpc(error);
  if (data === null) throw new Error('The updated balance was not returned.');
  return data;
}

export async function setUserRole(profileId: string, role: UserRole, reason: string) {
  const { error } = await supabase.rpc('admin_set_user_role', { p_profile_id: profileId, p_role: role, p_reason: reason });
  await runAdminRpc(error);
}

export async function setUserStatus(profileId: string, status: 'ACTIVE' | 'SUSPENDED', reason: string) {
  const { error } = await supabase.rpc('admin_set_user_status', { p_profile_id: profileId, p_status: status, p_reason: reason });
  await runAdminRpc(error);
}

export async function fetchAdminHistory() {
  const { data, error } = await supabase
    .from('admin_actions')
    .select('id, admin_id, action, target, target_type, target_id, summary, reason, created_at, profiles(username, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as AdminActionRow[]).map<AdminAction>((item) => ({
    id: item.id,
    adminName: item.profiles?.username ?? item.profiles?.email ?? 'Admin',
    action: getAdminAction(item.action),
    targetType: (['MARKET', 'BET', 'USER'].includes(item.target_type) ? item.target_type : 'OTHER') as AdminAction['targetType'],
    targetId: item.target_id ?? undefined,
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
      'id, profile_id, market_id, outcome_id, stake, payout, status, entry_probability, created_at, profiles(username, email), markets(title, outcomes!outcomes_market_id_fkey(name, pool)), outcomes(name, pool)',
    )
    .order('created_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as {
    id: string;
    profile_id: string;
    market_id: string;
    outcome_id: string;
    stake: number;
    payout: number | null;
    status: string;
    entry_probability: number;
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
      status: bet.status as AdminBet['status'],
      payout: bet.payout ?? undefined,
      entryProbability: bet.entry_probability,
      userName: bet.profiles?.username ?? bet.profiles?.email ?? 'UNSW Student',
      marketTitle: bet.markets?.title ?? 'Unknown market',
      placedAt: bet.created_at,
      oddsAtPlacement: bet.entry_probability ?? (totalPool > 0 ? yesPool / totalPool : 0.5),
    };
  });
}
