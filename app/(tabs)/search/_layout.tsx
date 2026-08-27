import { Stack } from 'expo-router/stack';

export default function SearchLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Search' }} />
    </Stack>
  );
}
