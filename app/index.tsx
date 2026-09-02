import { Redirect } from 'expo-router';

import { useDemoSession } from '@/state/demo-session';

export default function Index() {
  const { session, isLoading } = useDemoSession();

  if (isLoading) {
    return null;
  }

  return <Redirect href={session ? '/feed' : '/login'} />;
}
