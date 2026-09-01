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

export type Market = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: MarketStatus;
  closesAt: string;
  resolutionCriteria: string;
  yesProbability: number;
};

export type Position = {
  id: string;
  userId: string;
  marketId: string;
  outcome: Outcome;
  stake: number;
  potentialPayout: number;
  status: PositionStatus;
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
  action:
    | 'ODDS_OVERRIDE'
    | 'BET_REFUNDED'
    | 'MARKET_VOIDED'
    | 'MARKET_CREATED'
    | 'MARKET_UPDATED'
    | 'MARKET_CLOSED'
    | 'MARKET_REOPENED'
    | 'MARKET_RESOLVED'
    | 'MARKET_DELETED'
    | 'USER_SUSPENDED'
    | 'USER_REACTIVATED'
    | 'USER_ROLE_CHANGED'
    | 'CREDIT_ADJUSTMENT';
  target: string;
  summary: string;
  reason: string;
  createdAt: string;
};
