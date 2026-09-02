import { fetchBalance as fetchRemoteBalance } from '@/lib/data';
import { useDemoSession } from '@/state/demo-session';

export function useBalance() {
  const { session, setBalance } = useDemoSession();
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
