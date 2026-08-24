import { Market } from '@/types';

export const mockMarkets: Market[] = [
  {
    id: '1',
    title: 'Will UNSW cancel classes because of extreme weather this term?',
    description: 'A campus prediction for the current teaching term.',
    category: 'UNSW',
    status: 'OPEN',
    closesAt: '2026-11-15',
    resolutionCriteria: 'Resolves YES if UNSW officially cancels on-campus classes for a full day.',
    yesProbability: 0.24,
  },
  {
    id: '2',
    title: 'Will Australia win the next Ashes series?',
    description: 'Predict the winner of the next completed Ashes series.',
    category: 'Sport',
    status: 'OPEN',
    closesAt: '2027-01-01',
    resolutionCriteria: 'Resolves YES if Australia wins the next completed Ashes series.',
    yesProbability: 0.55,
  },
  {
    id: '3',
    title: 'Will the RBA cut interest rates before December?',
    description: 'Tracks the official cash rate announced by the Reserve Bank of Australia.',
    category: 'Economics',
    status: 'OPEN',
    closesAt: '2026-12-01',
    resolutionCriteria: 'Resolves YES if the RBA announces a cash-rate reduction before 1 December 2026.',
    yesProbability: 0.68,
  },
  {
    id: '4',
    title: 'Will a student society event sell out during O-Week?',
    description: 'A sample closed market for empty and disabled states.',
    category: 'Campus',
    status: 'CLOSED',
    closesAt: '2026-08-20',
    resolutionCriteria: 'Resolves YES if the event reaches its listed capacity before it begins.',
    yesProbability: 0.74,
  },
];
