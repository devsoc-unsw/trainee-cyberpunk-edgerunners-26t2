import { PlaceholderState } from '@/components/ui/placeholder-state';
import { Screen } from '@/components/ui/screen';
import { LineChart } from "react-native-gifted-charts";

export default function FeedScreen() {
  const data=[ 
    {value:50}, 
    {value:80}, 
    {value:90}, 
    {value:70},
    {value:60},
    {value:50},
    {value:60},
    {value:10},
    {value:20},
    {value:30},
  ]
  return (
    <Screen centered>
      <LineChart
        data={data}
        curved
        areaChart
        color="#007AFF"
        thickness={2}
        startFillColor="#007AFF"
        endFillColor="#007AFF"
        startOpacity={0.4}
        endOpacity={0.0}
        hideRules
        gradientDirection="vertical"
        hideDataPoints
        hideYAxisText
        hideAxesAndRules
      />
    </Screen>
  );
}
