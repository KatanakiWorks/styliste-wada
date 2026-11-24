import { Redirect, Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/icon';
import { Camera, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/lib/store';

function icon(name: IconName) {
  return function TabIcon({ color }: { color: unknown }) {
    return <Icon name={name} color={String(color)} />;
  };
}

export default function TabLayout() {
  const t = useTheme();
  const { onboarded } = useProfile();
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.text,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: { backgroundColor: t.background, borderTopColor: t.line, borderTopWidth: 0.5, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 9.5, letterSpacing: 1.4, textTransform: 'uppercase' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Caméra',
          tabBarIcon: icon('camera'),
          // the camera stays black in both themes
          tabBarActiveTintColor: Camera.text,
          tabBarInactiveTintColor: Camera.dim,
          tabBarStyle: { backgroundColor: Camera.background, borderTopColor: Camera.background, height: 64, paddingTop: 6 },
        }}
      />
      <Tabs.Screen name="closet" options={{ title: 'Placard', tabBarIcon: icon('closet') }} />
      <Tabs.Screen name="composer" options={{ title: 'Composer', tabBarIcon: icon('compose') }} />
      <Tabs.Screen name="looks" options={{ title: 'Looks', tabBarIcon: icon('heart') }} />
    </Tabs>
  );
}
