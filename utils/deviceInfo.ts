import { Platform } from 'react-native';

// A short, human-readable label identifying this device for the Active Sessions screen.
// No new native dependency (e.g. expo-device) — built from what React Native already exposes.
export function getDeviceLabel(): string {
  if (Platform.OS === 'web') return 'Web Browser';
  if (Platform.OS === 'ios') return `iOS ${Platform.Version}`;
  if (Platform.OS === 'android') return `Android ${Platform.Version}`;
  return 'Unknown device';
}
