# Phone device settings

This document lists where the phone app (`apps/mobile/src`, `apps/mobile/app`) currently reads or reacts to accessibility settings provided by the OS (reduced motion, higher contrast, bold text, and font scale), and every animation that could respect reduced motion.

| File | What it reads or animates | Respects setting |
| ---- | ------------------------- | ---------------- |
| `apps/mobile/src/components/journey-row.tsx` | Reads `AccessibilityInfo.isReduceMotionEnabled()` | Yes |
| `apps/mobile/src/components/journey-row.tsx` | `scroller.current?.scrollTo({ animated })` | Yes |
| `apps/mobile/src/components/ui.tsx` | `scroll.current?.scrollTo({ animated: true })` | No |
| `apps/mobile/app/moment.tsx` | `scroll.current?.scrollTo({ animated: true })` | No |
| `apps/mobile/src/components/drop-down.tsx` | `<Modal animationType="fade">` | No |
| `apps/mobile/src/components/dialogs.tsx` | `<Modal animationType="fade">` | No |
| `apps/mobile/src/components/language-choice.tsx` | `<Modal animationType="fade">` | No |

## Settings not read anywhere

The following accessibility settings or APIs are not read or reacted to anywhere in the phone app:

- **Reduced motion APIs:** `useReducedMotion`, `reduceMotionChanged`
- **Bold text**
- **Higher contrast or grayscale**
- **Font scale:** `useWindowDimensions().fontScale`, `PixelRatio.getFontScale`, `allowFontScaling`, `maxFontSizeMultiplier`
- **Animation APIs:** `Animated`, `LayoutAnimation`, `reanimated` (none exist in the codebase)
