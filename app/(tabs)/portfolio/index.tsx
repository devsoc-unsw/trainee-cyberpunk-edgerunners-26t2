import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';

export default function PortfolioScreen() {
  return (
    <Screen centered>
      <PlaceholderState
        title="No predictions yet"
        description="Your active and settled predictions will show here."
      />
    </Screen>
  );
}
