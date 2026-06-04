import type { CapacitorConfig } from '@capacitor/cli';

/** Capacitor réservé à iOS uniquement. Android = `colis-direct/android/` (natif Kotlin). */
const config: CapacitorConfig = {
  appId: 'ci.colisdirect.app',
  appName: 'ColisDirect',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    iosScheme: 'https',
  },
};

export default config;
