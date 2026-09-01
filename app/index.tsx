import { Redirect } from 'expo-router';
import { useDemoSession } from '@/state/demo-session';

export default function Index() {
  const { session, isReady } = useDemoSession();

  if (!isReady) return null;
  return <Redirect href={session ? '/feed' : '/login'} />;
}
