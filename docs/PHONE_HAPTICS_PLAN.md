# Phone Haptics Plan

A light vibration can help people who don't notice a visual change, but haptics will never be used as the only cue (decision 198C).

Haptics will be added in three places. Currently, `expo-haptics` is **not** a dependency. The haptics should follow the reduce motion setting, which will be available in `apps/mobile/src/a11y/reduce-motion.ts` once PR 130b-1 merges (instead of reading it directly as currently done in `apps/mobile/src/components/journey-row.tsx`).

### 1. A moment saved (success)
- **File:** `apps/mobile/src/journey/moment-actions.ts`
- **Function:** `save`
- **Line:** 74
- **Visible cue already shown:** A toast shown with `shell.showToast(savedMessage(before, draft.visibility));`

### 2. A moment kept on the phone while offline (warning)
- **File:** `apps/mobile/src/journey/moment-actions.ts`
- **Function:** `save`
- **Line:** 66
- **Visible cue already shown:** A toast shown with `shell.showToast(keptOnPhone());`

### 3. An action that failed (error)
- **File:** `apps/mobile/src/journey/moment-actions.ts`
- **Function:** `attempt`
- **Line:** 41
- **Visible cue already shown:** A status banner shown with `shell.showStatus(accountMessage(error, 'error.moment'), { source: 'moment' });`
