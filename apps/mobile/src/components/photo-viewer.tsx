import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { fonts, leading, scriptStyles, targetSize, useTheme } from '../theme';

export function PhotoViewer({
  visible,
  onClose,
  source,
  name,
}: {
  visible: boolean;
  onClose: () => void;
  source: { uri: string; headers: Record<string, string> };
  name: string;
}) {
  const { colors, radius } = useTheme().theme;

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      accessibilityViewIsModal
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>
              {t('moment.viewer.eyebrow')}
            </Text>
            <Text style={[styles.title, fonts.serif, { color: colors.fg }]}>
              {name}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('moment.viewer.close')}
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              targetSize,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1, borderRadius: radius.pill },
            ]}
          >
            <Text style={[styles.closeButtonText, { color: colors.fg }]}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          minimumZoomScale={1}
          maximumZoomScale={3}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bouncesZoom={true}
        >
          <Image
            source={source}
            style={styles.image}
            resizeMode="contain"
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = scriptStyles(() => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 18,
    paddingTop: Platform.OS === 'ios' ? 50 : 18,
    gap: 16,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: leading(20, 26),
  },
  closeButton: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    height: 44,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
}));
