// The journeys as one row that scrolls sideways, with "＋ New journey" on its own line below it
// (owner, Oct 12, 2026, #404). Four journeys as wrapped buttons already looked messy, and many would
// have been a wall of them above the moments. The web and the phone both decide with this file, so
// the open journey comes into view, and the row shows that it goes on, the same way on each.
//
// Every measure is along the row, in the row's own pixels: `start` and `end` are where a journey's
// choice begins and ends in the scrolled content, `scrolled` is how far the row is scrolled,
// `visible` how much of it shows and `total` how long it is. `inset` is the gutter the row keeps at
// each end; the row runs on under the screen's edge, so the last journey in sight is cut by it.

/** A row is only drawn for more than one journey; with one there is nothing to choose (#404). */
export function showsJourneyRow(journeys) {
  return Array.isArray(journeys) && journeys.length > 1;
}

/**
 * Where to scroll the row so the open journey is wholly in sight with the gutter beside it, or null
 * when it already is. Never past either end of the row.
 * @param {{ start: number, end: number, scrolled: number, visible: number, total: number, inset: number }} row
 * @returns {number | null}
 */
export function scrollToShow({ start, end, scrolled, visible, total, inset }) {
  const furthest = Math.max(0, total - visible);
  if (start - inset < scrolled) return Math.min(furthest, Math.max(0, start - inset));
  if (end + inset > scrolled + visible) return Math.min(furthest, Math.max(0, end + inset - visible));
  return null;
}

/**
 * Which ends of the row have journeys beyond them, so that edge fades and the row reads as one that
 * goes on. A pixel of slack absorbs the rounding a scrolled position comes back with.
 * @param {{ scrolled: number, visible: number, total: number }} row
 * @returns {{ before: boolean, after: boolean }}
 */
export function rowEdges({ scrolled, visible, total }) {
  return { before: scrolled > 1, after: total - (scrolled + visible) > 1 };
}
