import { Stack } from 'expo-router/stack';

export default function PortfolioLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Portfolio' }} />
    </Stack>
  );
}
