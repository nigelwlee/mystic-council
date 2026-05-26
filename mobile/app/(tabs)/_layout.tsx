import { Tabs } from 'expo-router';
import { C, F } from '../../lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none', width: 0, height: 0 },
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopWidth: 1,
          borderTopColor: C.accentDim,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingTop: 10,
          paddingBottom: 4,
        },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.dim,
        tabBarLabelStyle: {
          fontFamily: F.ui,
          fontSize: 9,
          letterSpacing: 1.8,
          textTransform: 'uppercase',
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Read' }} />
      <Tabs.Screen name="chat"  options={{ title: 'Py' }} />
      <Tabs.Screen name="me"    options={{ title: 'Me' }} />
    </Tabs>
  );
}
