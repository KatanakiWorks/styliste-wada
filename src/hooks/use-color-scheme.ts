import { useColorScheme as useSystemScheme } from 'react-native';

import { useProfile } from '@/lib/store';

/** The system scheme, unless the user forced light or dark in the settings. */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemScheme();
  const { theme } = useProfile();
  return theme === 'system' ? (system === 'dark' ? 'dark' : 'light') : theme;
}
