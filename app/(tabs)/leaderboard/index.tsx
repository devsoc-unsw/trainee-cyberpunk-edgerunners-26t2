import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';

export default function LeaderboardScreen() {
  return (
    <Screen>
      <PlaceholderState
        title="No rankings yet"
        description="Rankings will appear once people start predicting."
      />
    </Screen>
  );
}
