import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DataSourceProvider } from '@/data/data-source-context';
import { NetworkProvider } from '@/state/network';
import { SettingsProvider } from '@/state/settings';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // コンテスト版はライトテーマ固定(docs/design/ui-mockup.html の決定)
    <ThemeProvider value={DefaultTheme}>
      <SettingsProvider>
        <DataSourceProvider>
          <NetworkProvider>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              {/* AR はタブバーごと覆う全画面体験にする */}
              <Stack.Screen name="ar" options={{ presentation: 'fullScreenModal' }} />
            </Stack>
          </NetworkProvider>
        </DataSourceProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
