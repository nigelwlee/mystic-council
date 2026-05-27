import { useEffect } from 'react';
import { Stack, router, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { recovery } from '../lib/recovery';
import { triggerDailyGeneration, clearDailyCache } from '../lib/daily-api';
import { registerForPushNotifications } from '../lib/push';

SplashScreen.preventAutoHideAsync();


async function resolveRoute(s: Session | null) {
  if (!s) {
    router.replace('/auth');
    return;
  }
  const { data, error } = await supabase.from('birth_data').select('user_id').maybeSingle();
  // If error is non-null (e.g. missing SELECT RLS policy), we can't determine state cleanly.
  // Treat it as "row exists" so the user isn't stuck in the onboarding loop.
  router.replace((data || error) ? '/(tabs)' : '/onboarding');
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'CormorantGaramond-Regular': require('../assets/fonts/CormorantGaramond-Regular.ttf'),
    'CormorantGaramond-Italic':  require('../assets/fonts/CormorantGaramond-Italic.ttf'),
    'Geist-Regular':             require('../assets/fonts/Geist-Regular.ttf'),
    'Geist-Medium':              require('../assets/fonts/Geist-Medium.ttf'),
    'GeistMono-Regular':         require('../assets/fonts/GeistMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveRoute(session);
      if (session && !recovery.active) {
        triggerDailyGeneration();
        void registerForPushNotifications(session.user.id).catch(() => {});
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (recovery.active) return;
      resolveRoute(session);
      if (event === 'SIGNED_IN' && session) {
        triggerDailyGeneration();
        void registerForPushNotifications(session.user.id).catch(() => {});
      }
      if (event === 'SIGNED_OUT') clearDailyCache();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="reset-password" />
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
