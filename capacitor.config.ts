import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.coaching.app',
  appName: 'Coaching App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
