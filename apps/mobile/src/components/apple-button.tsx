import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Sign in with Apple on Android (#400). Apple's own button exists only on Apple's platforms, so on
 * Android it is drawn here, as Apple's guidelines ask of other platforms: Apple's words, as the
 * iPhone's button says them, in Apple's black button on a light screen and its white button on a
 * dark one, the same as the iPhone (social-sign-in.tsx), never the theme's colours.
 *
 * Apple's logo is not drawn yet. It must be Apple's own artwork, unaltered (Apple's "Sign in with
 * Apple" logo files, developer.apple.com/design/resources), which could not be fetched where this
 * was built; until it is added beside the words, the button carries the words alone.
 */
const APPLE_COLOURS = {
  light: { fill: '#000000', text: '#FFFFFF' },
  dark: { fill: '#FFFFFF', text: '#000000' },
} as const;

export function AppleButton({ dark, disabled, onPress, style }: { dark: boolean; disabled: boolean; onPress: () => void; style: StyleProp<ViewStyle> }) {
  const colours = dark ? APPLE_COLOURS.dark : APPLE_COLOURS.light;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      accessibilityState={{ disabled, busy: disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, { backgroundColor: colours.fill, opacity: pressed || disabled ? 0.7 : 1 }]}
    >
      <Text style={[styles.label, { color: colours.text }]}>Sign in with Apple</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Google's native button beside it on Android is a rectangle with slightly rounded corners.
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 4 },
  label: { fontSize: 17, fontWeight: '500' },
});
