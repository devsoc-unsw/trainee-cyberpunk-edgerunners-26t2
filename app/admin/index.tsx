import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';

export default function AdminScreen() {
  return (
    <Screen centered>
      <PlaceholderState
        title="Resolve markets"
        description="No markets are ready to resolve."
      />
    </Screen>
  );
}
