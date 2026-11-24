import { BodoniModa_400Regular_Italic } from '@expo-google-fonts/bodoni-moda/400Regular_Italic';
import { BodoniModa_500Medium } from '@expo-google-fonts/bodoni-moda/500Medium';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  const [loaded, error] = useFonts({ BodoniModa_400Regular_Italic, BodoniModa_500Medium, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });

  useEffect(() => {
    // a font that fails to load falls back to the system font rather than blocking the app
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  const base = dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.background, card: c.background, text: c.text, border: c.line, primary: c.text } }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="palette/[no]" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={dark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
