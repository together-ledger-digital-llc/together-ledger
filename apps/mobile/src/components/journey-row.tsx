import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { rowEdges, scrollToShow } from '../../../../src/journey-row.js';
import type { Journey } from '../journey/journey-view';
import { targetSize, useTheme } from '../theme';

// The edge fades in steps rather than with a gradient, which would need a native module of its own.
// Strongest at the edge, gone by the inside.
const FADE = [0.92, 0.75, 0.55, 0.35, 0.18, 0.06];
const FADE_STEP = 5;

type Frame = { scrolled: number; visible: number; total: number };

/**
 * The journeys as one row that scrolls sideways (#404), the open one chosen and scrolled into view,
 * the same as the web's. The row runs on under the screen's edge, `inset` past the list's padding,
 * so the last journey in sight is cut by it, and an edge with more beyond it fades. Each journey is
 * a radio, announced as chosen; a long name is cut short on screen and read in full.
 */
export function JourneyRow({ label, journeys, activeId, inset, onSelect }: {
  label: string;
  journeys: Journey[];
  activeId: string;
  inset: number;
  onSelect: (id: string) => void;
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const scroller = useRef<ScrollView>(null);
  const places = useRef(new Map<string, { start: number; end: number }>());
  const frame = useRef<Frame>({ scrolled: 0, visible: 0, total: 0 });
  // The journey last brought into view; null until the row has been drawn once.
  const shown = useRef<string | null>(null);
  const reduceMotion = useRef(false);
  const [edges, setEdges] = useState({ before: false, after: false });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { reduceMotion.current = value; }).catch(() => {});
  }, []);

  // Opening the screen shows the open journey where it is; choosing another slides it into view.
  const reveal = () => {
    if (shown.current === activeId) return;
    const place = places.current.get(activeId);
    if (!place || !frame.current.visible || !frame.current.total) return;
    const x = scrollToShow({ ...place, ...frame.current, inset });
    if (x !== null) scroller.current?.scrollTo({ x, animated: shown.current !== null && !reduceMotion.current });
    shown.current = activeId;
  };
  useEffect(() => { reveal(); });

  const measured = (next: Partial<Frame>) => {
    frame.current = { ...frame.current, ...next };
    const now = rowEdges(frame.current);
    setEdges((current) => (current.before === now.before && current.after === now.after ? current : now));
    reveal();
  };

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ marginHorizontal: -inset }}>
      <ScrollView
        ref={scroller}
        horizontal
        contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}
        onLayout={(event) => measured({ visible: event.nativeEvent.layout.width })}
        onContentSizeChange={(width) => measured({ total: width })}
        onScroll={(event) => measured({ scrolled: event.nativeEvent.contentOffset.x })}
        scrollEventThrottle={32}
      >
        {journeys.map((item) => {
          const active = item.id === activeId;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityLabel={item.name}
              accessibilityState={{ checked: active }}
              onPress={() => onSelect(item.id)}
              onLayout={(event) => {
                const { x, width } = event.nativeEvent.layout;
                places.current.set(item.id, { start: x, end: x + width });
                reveal();
              }}
              style={({ pressed }) => [styles.choice, targetSize, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.surface, borderRadius: theme.radius.pill, opacity: pressed ? 0.55 : 1 }]}
            >
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.choiceText, { color: active ? colors.onAccent : colors.fg }]}>{active ? '● ' : ''}{item.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {edges.before ? <Fade side="left" color={colors.bg} /> : null}
      {edges.after ? <Fade side="right" color={colors.bg} /> : null}
    </View>
  );
}

function Fade({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.fade, side === 'left' ? styles.left : styles.right]}
    >
      {FADE.map((opacity) => <View key={opacity} style={[styles.step, { backgroundColor: color, opacity }]} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8 },
  choice: { borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center', maxWidth: 260 },
  choiceText: { fontSize: 15, fontWeight: '700' },
  fade: { position: 'absolute', top: 0, bottom: 0, width: FADE.length * FADE_STEP },
  // Strongest at the edge: the steps run inward from it.
  left: { left: 0, flexDirection: 'row' },
  right: { right: 0, flexDirection: 'row-reverse' },
  step: { width: FADE_STEP },
});
