import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';


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
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveRoute(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveRoute(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </GestureHandlerRootView>
  );
}
