import { useSession } from '@/state/session';

export function useBalance() {
    const { profile, setBalance, refresh } = useSession();
    const balance = profile?.balance ?? null;

    return { balance, setBalance, refresh };
}
