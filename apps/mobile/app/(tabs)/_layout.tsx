import { Tabs } from 'expo-router';
import { colors } from '@/src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { fontWeight: '600', color: colors.text },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '书架', headerTitle: '我的书架' }} />
      <Tabs.Screen name="search" options={{ title: '搜索', headerTitle: '搜索小说' }} />
      <Tabs.Screen name="sources" options={{ title: '书源', headerTitle: '我的书源' }} />
      <Tabs.Screen name="settings" options={{ title: '设置', headerTitle: '设置' }} />
    </Tabs>
  );
}
