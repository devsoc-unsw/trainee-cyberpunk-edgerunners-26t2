import { Redirect } from 'expo-router';

import { useSession } from '@/state/session';

export default function Index() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return null;
  }

  return <Redirect href={session ? '/feed' : '/login'} />;
}
