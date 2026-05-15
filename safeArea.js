import { Platform, StatusBar } from 'react-native';

// Manual safe-area insets that work without react-native-safe-area-context.
// We err on the side of MORE padding rather than less — a little extra
// whitespace at the top is harmless, but content slipping under the
// notch/status bar is ugly.
//
// On Android, StatusBar.currentHeight can under-report on devices with
// extra-wide cutouts, so we add a fixed buffer on top.
export const SAFE_TOP =
  Platform.OS === 'ios'
    ? 50
    : (StatusBar.currentHeight || 24) + 8;

export const SAFE_BOTTOM = Platform.OS === 'ios' ? 28 : 24;