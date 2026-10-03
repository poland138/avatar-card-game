import { Dimensions, Platform, StatusBar } from 'react-native';

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

// On Android, derive the on-screen nav-bar height from the difference
// between the full screen and the visible app window. If the device uses
// gesture nav (or has a translucent nav bar / immersive mode), the delta
// collapses to ~0 even though the system buttons are still painted over
// our content. The status bar contributes to that delta too, so we
// subtract it out to isolate the bottom inset, then floor at the standard
// 48dp Android nav-bar height so anchored UI never tucks under the
// back/home/recents row.
function getAndroidBottomInset() {
  const screen = Dimensions.get('screen');
  const window = Dimensions.get('window');
  const statusBar = StatusBar.currentHeight || 0;
  const measured = Math.max(0, screen.height - window.height - statusBar);
  return Math.max(measured, 48) + 8;
}

export const SAFE_BOTTOM =
  Platform.OS === 'ios' ? 28 : getAndroidBottomInset();