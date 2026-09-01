import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  AdminAction,
  AdminBet,
  AdminUser,
  AccountStatus,
  Database,
  Market,
  MarketStatus,
  Outcome,
  Position,
  PositionStatus,
  User,
  UserRole,
} from '@/types';

type MarketRow = Database['public']['Tables']['markets']['Row'];
type OutcomeRow = Database['public']['Tables']['outcomes']['Row'];
type PositionRow = Database['public']['Tables']['positions']['Row'];
type LeaderboardRow = Database['public']['Views']['leaderboard']['Row'];

type MarketRowWithOutcomes = MarketRow & {
  outcomes: OutcomeRow[] | null;
};

type PositionRowWithRelations = PositionRow & {
  markets: MarketRowWithOutcomes | MarketRowWithOutcomes[] | null;
  outcomes: OutcomeRow | OutcomeRow[] | null;
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

type AdminBetRow = PositionRow & {
  profiles: ProfileRow | ProfileRow[] | null;
  markets: MarketRowWithOutcomes | MarketRowWithOutcomes[] | null;
  outcomes: OutcomeRow | OutcomeRow[] | null;
};

type AdminActionRow = Database['public']['Tables']['admin_actions']['Row'];

export type MarketOutcome = {
  id: string;
  name: Outcome;
  pool: number;
};

export type MarketWithOutcomes = Market & {
  closesAtIso: string;
  resolvedOutcome: Outcome | null;
  outcomes: MarketOutcome[];
  yesPool: number;
  noPool: number;
  totalPool: number;
};

export type PortfolioPosition = Position & {
  marketTitle: string;
  marketCategory: string;
  marketStatus: MarketStatus;
  outcomeId: string;
  placedAt: string;
};

export type PlaceBetResult = {
  positionId: string;
  stake: number;
  pool: number;
  balance: number;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  balance: number;
  rank: number;
};

const MARKET_SELECT = `
  id,
  title,
  description,
  category,
  resolution_criteria,
  closes_at,
  status,
  resolved_outcome,
  created_at,
  outcomes (
    id,
    market_id,
    name,
    pool,
    created_at
  )
`;

const POSITION_SELECT = `
  id,
  profile_id,
  market_id,
  outcome_id,
  stake,
  created_at,
  updated_at,
  outcomes (
    id,
    market_id,
    name,
    pool,
    created_at
  ),
  markets (
    id,
    title,
    description,
    category,
    resolution_criteria,
    closes_at,
    status,
    resolved_outcome,
    created_at,
    outcomes (
      id,
      market_id,
      name,
      pool,
      created_at
    )
  )
`;

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function normalizeMarketStatus(status: string): MarketStatus {
  switch (status.toLowerCase()) {
    case 'open':
      return 'OPEN';
    case 'closed':
      return 'CLOSED';
    case 'resolved':
      return 'RESOLVED';
    case 'voided':
      return 'VOIDED';
    default:
      return 'CLOSED';
  }
}

function normalizeOutcome(name: string): Outcome | null {
  switch (name.trim().toLowerCase()) {
    case 'yes':
      return 'YES';
    case 'no':
      return 'NO';
    default:
      return null;
  }
}

function firstRelation<T>(relation: T | T[] | null | undefined): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation ?? null;
}

function fallbackStudentName(id: string) {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  const number = Math.abs(hash) % 100000;
  return `Student ${number.toString().padStart(5, '0')}`;
}

function mapOutcome(row: OutcomeRow): MarketOutcome | null {
  const name = normalizeOutcome(row.name);

  if (!name) {
    return null;
  }

  return {
    id: row.id,
    name,
    pool: row.pool,
  };
}

function outcomeSortValue(outcome: MarketOutcome) {
  return outcome.name === 'YES' ? 0 : 1;
}

export function mapMarket(row: MarketRowWithOutcomes): MarketWithOutcomes {
  const outcomes = (row.outcomes ?? [])
    .map(mapOutcome)
    .filter((outcome): outcome is MarketOutcome => Boolean(outcome))
    .sort((left, right) => outcomeSortValue(left) - outcomeSortValue(right));

  const yesPool = outcomes.find((outcome) => outcome.name === 'YES')?.pool ?? 0;
  const noPool = outcomes.find((outcome) => outcome.name === 'NO')?.pool ?? 0;
  const totalPool = yesPool + noPool;

  return {
    id: row.id,
    title: row.title,
    description: row.description || 'No description has been added yet.',
    category: row.category,
    status: normalizeMarketStatus(row.status),
    closesAt: formatDate(row.closes_at),
    closesAtIso: row.closes_at,
    resolvedOutcome: row.resolved_outcome ? normalizeOutcome(row.resolved_outcome) : null,
    resolutionCriteria:
      row.resolution_criteria || 'Resolution criteria will be posted by admins.',
    yesProbability: totalPool > 0 ? yesPool / totalPool : 0.5,
    outcomes,
    yesPool,
    noPool,
    totalPool,
  };
}

function positionStatusFromMarket(
  status: MarketStatus,
  outcome: Outcome,
  resolvedOutcome: Outcome | null,
): PositionStatus {
  if (status === 'VOIDED') {
    return 'REFUNDED';
  }

  if (status === 'RESOLVED') {
    return resolvedOutcome === outcome ? 'WON' : 'LOST';
  }

  return 'OPEN';
}

function potentialPayout(stake: number, outcome: Outcome, market: MarketWithOutcomes | null) {
  if (!market || market.totalPool <= 0) {
    return stake;
  }

  const selectedPool = outcome === 'YES' ? market.yesPool : market.noPool;

  if (selectedPool <= 0) {
    return stake;
  }

  return Math.round((stake / selectedPool) * market.totalPool);
}

function displayNameForUser(user: SupabaseAuthUser, username?: string | null) {
  const metadata = user.user_metadata as Record<string, unknown>;
  const metadataName = metadata.full_name ?? metadata.name;

  if (typeof metadataName === 'string' && metadataName.trim().length > 0) {
    return metadataName.trim();
  }

  if (username && username.trim().length > 0) {
    return username.trim();
  }

  return user.email?.split('@')[0] || 'UNSW Student';
}

export function maxStakeForBalance(balance: number) {
  return Math.min(Math.floor(balance / 5), 500);
}

export function formatCredits(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString();
}

export function getOutcome(market: MarketWithOutcomes, side: Outcome) {
  return market.outcomes.find((outcome) => outcome.name === side) ?? null;
}

export async function ensureCurrentProfile() {
  const { error } = await supabase.rpc('ensure_current_profile');

  if (error) {
    throw error;
  }
}

export async function fetchCurrentUser(): Promise<User | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    return null;
  }

  await ensureCurrentProfile();

  const user = session.user;
  const [{ data: profile, error: profileError }, { data: balance, error: balanceError }] =
    await Promise.all([
      supabase.from('profiles').select('username, role, status').eq('id', user.id).maybeSingle(),
      supabase
        .from('profile_balances')
        .select('balance')
        .eq('profile_id', user.id)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw profileError;
  }

  if (balanceError) {
    throw balanceError;
  }

  return {
    id: user.id,
    name: displayNameForUser(user, profile?.username),
    email: user.email ?? 'student@unsw.edu.au',
    balance: balance?.balance ?? 0,
    role: user.app_metadata?.role === 'admin' || profile?.role?.toLowerCase() === 'admin' ? 'ADMIN' : 'USER',
  };
}

export async function fetchMarkets() {
  const { data, error } = await supabase
    .from('markets')
    .select(MARKET_SELECT)
    .order('closes_at', { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MarketRowWithOutcomes[]).map(mapMarket);
}

export async function fetchMarket(id: string) {
  const { data, error } = await supabase
    .from('markets')
    .select(MARKET_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapMarket(data as MarketRowWithOutcomes) : null;
}

export async function fetchPortfolioPositions() {
  const { data, error } = await supabase
    .from('positions')
    .select(POSITION_SELECT)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PositionRowWithRelations[])
    .map((row): PortfolioPosition | null => {
      const outcomeRow = firstRelation(row.outcomes);
      const outcome = outcomeRow ? normalizeOutcome(outcomeRow.name) : null;

      if (!outcome) {
        return null;
      }

      const marketRow = firstRelation(row.markets);
      const market = marketRow ? mapMarket(marketRow) : null;
      const marketStatus = market?.status ?? 'CLOSED';

      return {
        id: row.id,
        userId: row.profile_id,
        marketId: row.market_id,
        outcome,
        stake: row.stake,
        potentialPayout: potentialPayout(row.stake, outcome, market),
        status: positionStatusFromMarket(marketStatus, outcome, market?.resolvedOutcome ?? null),
        marketTitle: market?.title ?? 'Deleted market',
        marketCategory: market?.category ?? 'unknown',
        marketStatus,
        outcomeId: row.outcome_id,
        placedAt: formatDate(row.created_at),
      };
    })
    .filter((position): position is PortfolioPosition => Boolean(position));
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('profile_id, username, balance')
    .order('balance', { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as LeaderboardRow[]).map((row, index): LeaderboardEntry => {
    const id = row.profile_id ?? `rank-${index + 1}`;

    return {
      id,
      name: row.username || fallbackStudentName(id),
      balance: row.balance ?? 0,
      rank: index + 1,
    };
  });
}

export async function placeBet(outcomeId: string, stake: number): Promise<PlaceBetResult> {
  const { data, error } = await supabase.rpc('place_bet', {
    p_outcome_id: outcomeId,
    p_stake: stake,
  });

  if (error) {
    throw error;
  }

  const result = data && typeof data === 'object' && !Array.isArray(data) ? data : {};

  return {
    positionId: typeof result.position_id === 'string' ? result.position_id : '',
    stake: typeof result.stake === 'number' ? result.stake : stake,
    pool: typeof result.pool === 'number' ? result.pool : 0,
    balance: typeof result.balance === 'number' ? result.balance : 0,
  };
}

export type MarketInput = {
  title: string;
  description: string;
  category: string;
  closesAtIso: string;
  resolutionCriteria: string;
};

function dataRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export async function createMarket(input: MarketInput) {
  const { data, error } = await supabase.rpc('create_market', {
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_closes_at: input.closesAtIso,
    p_resolution_criteria: input.resolutionCriteria,
    p_yes_pool: 0,
    p_no_pool: 0,
  });

  if (error) throw error;

  const marketId = dataRecord(data).market_id;
  if (typeof marketId !== 'string') throw new Error('Market was created without an id');

  return fetchMarket(marketId);
}

export async function updateMarket(marketId: string, input: MarketInput) {
  const { error } = await supabase.rpc('update_market', {
    p_market_id: marketId,
    p_title: input.title,
    p_description: input.description,
    p_category: input.category,
    p_closes_at: input.closesAtIso,
    p_resolution_criteria: input.resolutionCriteria,
  });

  if (error) throw error;
  return fetchMarket(marketId);
}

export async function setMarketStatus(marketId: string, status: MarketStatus, reason: string) {
  const { error } = await supabase.rpc('set_market_status', {
    p_market_id: marketId,
    p_status: status.toLowerCase(),
    p_reason: reason,
  });

  if (error) throw error;
  return fetchMarket(marketId);
}

export async function overrideMarketOdds(marketId: string, yesPercent: number, reason: string) {
  const { error } = await supabase.rpc('override_market_odds', {
    p_market_id: marketId,
    p_yes_percent: yesPercent,
    p_reason: reason,
  });

  if (error) throw error;
  return fetchMarket(marketId);
}

export async function resolveMarket(marketId: string, winningOutcome: Outcome, reason: string) {
  const { error } = await supabase.rpc('resolve_market', {
    p_market_id: marketId,
    p_winning_outcome: winningOutcome,
    p_reason: reason,
  });

  if (error) throw error;
  return fetchMarket(marketId);
}

export async function voidMarket(marketId: string, reason: string) {
  const { error } = await supabase.rpc('void_market', {
    p_market_id: marketId,
    p_reason: reason,
  });

  if (error) throw error;
  return fetchMarket(marketId);
}

export async function deleteMarket(marketId: string) {
  const { error } = await supabase.rpc('delete_market', { p_market_id: marketId });
  if (error) throw error;
}

export async function refundPosition(positionId: string, reason: string) {
  const { error } = await supabase.rpc('refund_position', {
    p_position_id: positionId,
    p_reason: reason,
  });

  if (error) throw error;
}

export async function adjustUserBalance(userId: string, delta: number, reason: string) {
  const { error } = await supabase.rpc('adjust_user_balance', {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
  });

  if (error) throw error;
}

export async function setUserStatus(userId: string, status: AccountStatus, reason: string) {
  const { error } = await supabase.rpc('set_user_status', {
    p_user_id: userId,
    p_status: status.toLowerCase(),
    p_reason: reason,
  });

  if (error) throw error;
}

export async function setUserRole(userId: string, role: UserRole, reason: string) {
  const { error } = await supabase.rpc('set_user_role', {
    p_user_id: userId,
    p_role: role.toLowerCase(),
    p_reason: reason,
  });

  if (error) throw error;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const [profilesResult, balancesResult, positionsResult] = await Promise.all([
    supabase.from('profiles').select('id, email, username, role, status').order('created_at', { ascending: false }),
    supabase.from('profile_balances').select('profile_id, balance'),
    supabase.from('positions').select('profile_id'),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (balancesResult.error) throw balancesResult.error;
  if (positionsResult.error) throw positionsResult.error;

  const balances = new Map(
    (balancesResult.data ?? []).map((row) => [row.profile_id, row.balance ?? 0]),
  );
  const betCounts = new Map<string, number>();
  for (const row of positionsResult.data ?? []) {
    betCounts.set(row.profile_id, (betCounts.get(row.profile_id) ?? 0) + 1);
  }

  return (profilesResult.data ?? []).map((profile): AdminUser => ({
    id: profile.id,
    name: profile.username || profile.email?.split('@')[0] || `Student ${profile.id.slice(0, 8)}`,
    email: profile.email || 'unknown@unsw.edu.au',
    balance: balances.get(profile.id) ?? 0,
    role: profile.role?.toLowerCase() === 'admin' ? 'ADMIN' : 'USER',
    status: profile.status?.toLowerCase() === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
    betCount: betCounts.get(profile.id) ?? 0,
  }));
}

const ADMIN_BET_SELECT = `
  id,
  profile_id,
  market_id,
  outcome_id,
  stake,
  created_at,
  updated_at,
  profiles (id, email, username, role, status),
  outcomes (id, market_id, name, pool, created_at),
  markets (
    id,
    title,
    description,
    category,
    resolution_criteria,
    closes_at,
    status,
    resolved_outcome,
    created_at,
    outcomes (id, market_id, name, pool, created_at)
  )
`;

export async function fetchAdminBets(): Promise<AdminBet[]> {
  const [positionsResult, ledgerResult] = await Promise.all([
    supabase.from('positions').select(ADMIN_BET_SELECT).order('created_at', { ascending: false }),
    supabase.from('ledger').select('ref_id, reason').eq('reason', 'refund'),
  ]);

  if (positionsResult.error) throw positionsResult.error;
  if (ledgerResult.error) throw ledgerResult.error;

  const refundedIds = new Set(
    (ledgerResult.data ?? []).map((row) => row.ref_id).filter((id): id is string => Boolean(id)),
  );

  return ((positionsResult.data ?? []) as unknown as AdminBetRow[]).map((row) => {
    const marketRow = firstRelation(row.markets);
    const outcomeRow = firstRelation(row.outcomes);
    const profileRow = firstRelation(row.profiles);
    const market = marketRow ? mapMarket(marketRow) : null;
    const outcome = outcomeRow ? normalizeOutcome(outcomeRow.name) : null;
    const isRefunded = refundedIds.has(row.id) || market?.status === 'VOIDED';
    const status: PositionStatus = isRefunded
      ? 'REFUNDED'
      : market?.status === 'RESOLVED'
        ? market.resolvedOutcome === outcome
          ? 'WON'
          : 'LOST'
        : 'OPEN';

    return {
      id: row.id,
      userId: row.profile_id,
      marketId: row.market_id,
      outcome: outcome ?? 'YES',
      stake: row.stake,
      potentialPayout: potentialPayout(row.stake, outcome ?? 'YES', market),
      status,
      userName: profileRow?.username || profileRow?.email?.split('@')[0] || 'UNSW Student',
      marketTitle: market?.title ?? 'Deleted market',
      placedAt: formatDate(row.created_at),
      oddsAtPlacement: outcome === 'NO' ? 1 - (market?.yesProbability ?? 0.5) : market?.yesProbability ?? 0.5,
    };
  });
}

export async function fetchAdminHistory(): Promise<AdminAction[]> {
  const [{ data, error }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase
      .from('admin_actions')
      .select('id, admin_id, action, target, summary, reason, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, email, username, role, status'),
  ]);

  if (error) throw error;
  if (profilesError) throw profilesError;

  const profileNames = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.username || profile.email || profile.id]),
  );

  return ((data ?? []) as AdminActionRow[])
    .map((row): AdminAction | null => {
      const action = row.action as AdminAction['action'];
      if (![
        'ODDS_OVERRIDE',
        'BET_REFUNDED',
        'MARKET_VOIDED',
        'MARKET_CREATED',
        'MARKET_UPDATED',
        'MARKET_CLOSED',
        'MARKET_REOPENED',
        'MARKET_RESOLVED',
        'MARKET_DELETED',
        'USER_SUSPENDED',
        'USER_REACTIVATED',
        'USER_ROLE_CHANGED',
        'CREDIT_ADJUSTMENT',
      ].includes(action)) {
        return null;
      }

      return {
        id: row.id,
        adminName: profileNames.get(row.admin_id) ?? row.admin_id,
        action,
        target: row.target,
        summary: row.summary,
        reason: row.reason,
        createdAt: formatDate(row.created_at),
      };
    })
    .filter((action): action is AdminAction => Boolean(action));
}
