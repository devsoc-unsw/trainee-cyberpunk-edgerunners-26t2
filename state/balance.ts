import { useDemoSession } from '@/state/demo-session';

export function useBalance() {
    const { session, setBalance, refreshUser } = useDemoSession();
    const balance = session?.balance ?? null;
    const refresh = refreshUser;

    return {balance, setBalance, refresh};
}
