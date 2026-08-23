import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';

export default function FeedScreen() {
  return (
    <Screen centered>
      <PlaceholderState
        title="One market at a time"
        description="Swipe up or down to browse."
      />
    </Screen>
  );
}
