import { fetchBalance as fetchRemoteBalance } from '@/lib/data';
import { useSession } from '@/state/session';

export function useBalance() {
  const { session, setBalance } = useSession();
  const balance = session?.balance ?? null;
  const refresh = async () => {
    if (!session?.id) {
      return null;
    }

    const nextBalance = await fetchRemoteBalance(session.id);
    setBalance(nextBalance);
    return nextBalance;
  };

  return { balance, setBalance, refresh };
}
