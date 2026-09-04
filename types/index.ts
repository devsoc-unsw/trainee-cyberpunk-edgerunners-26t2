export type MarketStatus = 'OPEN' | 'CLOSED' | 'RESOLVED' | 'VOIDED';
export type Outcome = 'YES' | 'NO';
export type PositionStatus = 'OPEN' | 'WON' | 'LOST' | 'REFUNDED';
export type UserRole = 'USER' | 'ADMIN';
export type { Database, Json } from './api';

export type User = {
  id: string;
  name: string;
  email: string;
  balance: number;
  role: UserRole;
};

export type MarketOutcome = {
  id: string;
  name: Outcome;
  pool: number;
  liquidity: number;
  wagerPool: number;
};

export type MarketPricePoint = {
  /** YES probability at this point in time, 0..1. */
  probability: number;
  totalPool: number;
  recordedAt: string;
};

export type Market = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: MarketStatus;
  closesAt: string;
  resolutionCriteria: string;
  yesProbability: number;
  resolvedOutcomeId?: string;
  resolvedAt?: string;
  deletedAt?: string;
  videoPath?: string;
  videoDurationMs?: number;
  outcomes?: MarketOutcome[];
};

export type Position = {
  id: string;
  userId: string;
  marketId: string;
  outcome: Outcome;
  stake: number;
  potentialPayout: number;
  status: PositionStatus;
  payout?: number;
  entryProbability?: number;
  marketTitle?: string;
  placedAt?: string;
};

export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export type AdminUser = User & {
  status: AccountStatus;
  betCount: number;
};

export type AdminBet = Position & {
  userName: string;
  marketTitle: string;
  placedAt: string;
  oddsAtPlacement: number;
};

export type AdminAction = {
  id: string;
  adminName: string;
  action: 'MARKET_CREATED' | 'MARKET_UPDATED' | 'ODDS_OVERRIDE' | 'MARKET_CLOSED' | 'MARKET_REOPENED' | 'MARKET_RESOLVED' | 'MARKET_VOIDED' | 'MARKET_DELETED' | 'BET_REFUNDED' | 'ROLE_UPDATED' | 'USER_SUSPENDED' | 'USER_REACTIVATED' | 'CREDIT_ADJUSTMENT';
  targetType?: 'MARKET' | 'BET' | 'USER' | 'OTHER';
  targetId?: string;
  target: string;
  summary: string;
  reason: string;
  createdAt: string;
};
