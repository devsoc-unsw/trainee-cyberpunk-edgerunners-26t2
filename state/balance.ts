import { useDemoSession } from '@/state/demo-session';

export function useBalance() {
    const { session, setBalance } = useDemoSession();
    const balance = session?.balance ?? null;
    const refresh = async () => {};

    return {balance, setBalance, refresh};
}