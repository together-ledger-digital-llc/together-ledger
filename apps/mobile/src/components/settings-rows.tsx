import { Children, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { PENDING_LABEL } from '../shell/defaults';
import { targetSize, useTheme } from '../theme';

/**
 * Settings in the platform's own shape (owner, Oct 12, 2026; #399): a heading above a rounded
 * group of rows, each row a whole-width target of at least 44 points. Colour comes from the
 * semantic roles; the destructive one is only for a row whose act cannot be undone.
 */
export function SettingsHeading({ children }: { children: string }) {
  const { theme } = useTheme();
  return <Text accessibilityRole="header" style={[styles.heading, { color: theme.colors.muted }]}>{children}</Text>;
}

export function SettingsGroup({ heading, children }: { heading: string; children: ReactNode }) {
  const { theme } = useTheme();
  // A row a store or a session leaves out (null) draws no line of its own.
  const rows = Children.toArray(children);
  return (
    <View style={styles.group}>
      <SettingsHeading>{heading}</SettingsHeading>
      <View style={[styles.rows, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radius.m }]}>
        {rows.map((row, index) => (
          <View key={index} style={index ? [styles.divided, { borderTopColor: theme.colors.border }] : null}>{row}</View>
        ))}
      </View>
    </View>
  );
}

export function SettingsRow({ label, detail, onPress, destructive = false, pending = false, pendingLabel = PENDING_LABEL, disabled = false }: {
  label: string;
  /** A second line under the label, such as the account's email. */
  detail?: string;
  onPress: () => void;
  destructive?: boolean;
  pending?: boolean;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  const shown = pending ? pendingLabel : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail && !pending ? `${label}, ${detail}` : shown}
      accessibilityState={{ disabled: disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [styles.row, targetSize, { backgroundColor: pressed ? theme.colors.surfaceElevated : 'transparent', opacity: disabled ? 0.7 : 1 }]}
    >
      <View style={styles.words}>
        <Text style={[styles.label, { color: destructive ? theme.colors.destructive : theme.colors.fg }]}>{shown}</Text>
        {detail && !pending ? <Text style={[styles.detail, { color: theme.colors.textSecondary }]}>{detail}</Text> : null}
      </View>
      {pending ? <ActivityIndicator color={theme.colors.muted} /> : null}
      {/* iOS marks a row that opens another screen; Android's settings rows carry no mark. */}
      {!pending && !destructive && Platform.OS === 'ios' ? <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.chevron, { color: theme.colors.muted }]}>›</Text> : null}
    </Pressable>
  );
}

/**
 * A quiet link at the foot of Settings: words only, still a 44-point target. One that opens words
 * in place (Help) says it is expanded or not, and is read as a button, since it goes nowhere.
 */
export function FootLink({ label, onPress, expanded }: { label: string; onPress: () => void; expanded?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole={expanded === undefined ? 'link' : 'button'}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      onPress={onPress}
      style={({ pressed }) => [styles.link, targetSize, { opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.linkText, { color: theme.colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  // Not set in capitals: a heading carries a journey's own name, which is shown as it was written.
  heading: { fontSize: 14, fontWeight: '700', paddingHorizontal: 4 },
  rows: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  words: { flex: 1, gap: 2 },
  label: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 14, lineHeight: 19 },
  chevron: { fontSize: 22, lineHeight: 24 },
  link: { justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
});
