export type MarketStatus = 'OPEN' | 'CLOSED' | 'RESOLVED';
export type Outcome = 'YES' | 'NO';
export type PositionStatus = 'OPEN' | 'WON' | 'LOST';
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
