import { useRef, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountMessage } from '../auth/account-messages';
import { t } from '../i18n';
import { useLanguage } from '../i18n/language-provider';
import { keepThingsLabel } from '../shell/defaults';
import { languageOptions, type LanguageOption } from '../shell/screens';
import { useShell } from '../shell/shell-provider';
import { fonts, leading, scriptStyles, targetSize, useTheme } from '../theme';
import { Button } from './ui';

/**
 * The language choice (103A), the same as the web's Language row (101B): "Follow my device", then
 * each language in its own name and script. A language in preview carries the word Preview after
 * its name (decision 145); an approved one doesn't. A change takes effect at once, and is saved to
 * the account when someone is signed in (src/i18n/language-provider.tsx).
 *
 * The welcome shows it small, near the top: one control that opens the list. Settings shows the
 * list itself, as it shows the themes. Neither shows anything while English is the only language.
 */
export function LanguageList() {
  const { choose, choice, offered } = useLanguage();
  const pick = useChoose(choose);
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t('common.language.title')} style={styles.options}>
      {languageOptions(offered).map((option) => <LanguageRow key={option.choice ?? 'device'} option={option} chosen={option.choice === choice} onPress={() => pick(option.choice)} />)}
    </View>
  );
}

/** The welcome's small control: the language the app is in, opening the list when tapped. */
export function LanguageControl() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const { choose, choice, offered, active } = useLanguage();
  const pick = useChoose(choose);
  const [open, setOpen] = useState(false);
  const chosenRow = useRef<View>(null);
  const options = languageOptions(offered);
  const current = offered.find((language) => language.tag === active);
  return (
    <View style={styles.control}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('mobile.language.current', { language: current?.nativeName ?? active })}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, targetSize, { borderColor: colors.border, borderRadius: theme.radius.pill, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text accessibilityLanguage={active} style={[styles.buttonText, { color: colors.fg }]}>{current?.nativeName ?? active}</Text>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.chevron, { color: colors.muted }]}>▾</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
        onShow={() => { if (chosenRow.current) AccessibilityInfo.sendAccessibilityEvent(chosenRow.current, 'focus'); }}
      >
        <View style={[styles.frame, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14, paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]}>
          {/* The shell dialog's backdrop: the text colour at 72%. */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { backgroundColor: colors.fg, opacity: 0.72 }]} />
          <View accessibilityViewIsModal style={[styles.card, { backgroundColor: colors.surface, borderRadius: theme.radius.xl }]}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text accessibilityRole="header" style={[styles.title, fonts.serif, { color: colors.fg }]}>{t('common.language.title')}</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel={t('common.language.title')} style={styles.options}>
                {options.map((option) => (
                  <LanguageRow
                    key={option.choice ?? 'device'}
                    option={option}
                    chosen={option.choice === choice}
                    rowRef={option.choice === choice ? chosenRow : undefined}
                    onPress={() => { setOpen(false); pick(option.choice); }}
                  />
                ))}
              </View>
              <Text style={[styles.note, { color: colors.muted }]}>{t('common.language.note')}</Text>
              <Button kind="quiet" label={keepThingsLabel()} onPress={() => setOpen(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/**
 * One language: its own name, read in its own language. A language in preview reads "हिन्दी ·
 * Preview" in the web's own sentence (common.language.preview), so the two say it the same way.
 */
function LanguageRow({ option, chosen, onPress, rowRef }: { option: LanguageOption; chosen: boolean; onPress: () => void; rowRef?: React.Ref<View> }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const label = option.preview ? t('common.language.preview', { language: option.label }) : option.label;
  return (
    <Pressable
      ref={rowRef}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen }}
      accessibilityLabel={label}
      accessibilityLanguage={option.lang}
      onPress={onPress}
      style={({ pressed }) => [styles.option, targetSize, {
        borderColor: chosen ? colors.accent : colors.border,
        borderRadius: theme.radius.m,
        backgroundColor: colors.surfaceElevated,
        opacity: pressed ? 0.7 : 1,
      }]}
    >
      <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.mark, { color: chosen ? colors.accent : colors.muted }]}>{chosen ? '●' : '○'}</Text>
      <Text style={[styles.label, { color: colors.fg }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Choosing: at once, and saved to the account when signed in. If the account can't be reached,
 * nothing changes, and the status region says why in the account's own words.
 */
function useChoose(choose: (choice: string | null) => Promise<void>) {
  const { showStatus } = useShell();
  return (next: string | null) => {
    choose(next).catch((error: unknown) => showStatus(accountMessage(error)));
  };
}

const styles = scriptStyles(() => StyleSheet.create({
  control: { alignSelf: 'flex-end' },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 14 },
  buttonText: { fontSize: 14, fontWeight: '700' },
  chevron: { fontSize: 14 },
  frame: { flex: 1, justifyContent: 'center' },
  card: { maxHeight: '100%', width: '100%', maxWidth: 520, alignSelf: 'center' },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 24, lineHeight: leading(24, 30) },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  mark: { fontSize: 16 },
  label: { fontSize: 16, flex: 1 },
  note: { fontSize: 14, lineHeight: 20 },
}));
