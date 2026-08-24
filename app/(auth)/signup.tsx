import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';

export default function SignupScreen() {
  return (
    <Screen centered>
      <PlaceholderState
        title="Create account"
        description="Account creation is not available yet."
      />
    </Screen>
  );
}
