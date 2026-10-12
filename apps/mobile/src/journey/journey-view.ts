/**
 * What the phone's ledger shows, and how, for TL-M-07 (#182). Ported from the web's
 * renderSharedJourney(), journeyPeriod(), momentLabel() and visibilityCue() in src/app.js.
 *
 * Dates, money and the moment types come from the web's own src/model.js, imported rather than
 * copied, so a date or an amount can never read differently on the phone.
 */
import { dateLabel, money, MOMENT_TYPES, RECENT_MOMENTS_SHOWN, seeAllShown } from '../../../../src/model.js';
import { MOMENT_THEMES, momentThemeLabel, normalizeMomentTheme } from '../../../../src/moment-themes.js';
import { t } from '../i18n/sentences.js';
import { momentThemeName, themeName } from '../i18n/theme-names.js';
import type { MomentView } from '../storage/ledger-store';
import type { Grace } from './sharing-view';

export { dateLabel, money, MOMENT_THEMES, MOMENT_TYPES, momentThemeLabel, momentThemeName, normalizeMomentTheme, seeAllShown, themeName };

export type Visibility = 'private' | 'share-later' | 'shared-now';

export type Journey = {
  id: string;
  name: string;
  location?: string | null;
  startDate?: string | null;
  startDateStatus?: string;
  endDate?: string | null;
  endDateStatus?: string;
};

export type MomentImage = { id: string; momentId: string; filename: string; deletedAt: string | null };

export type Moment = {
  id: string;
  journeyId: string;
  kind: string;
  kindLabel?: string | null;
  occurredOn: string;
  title: string;
  detail?: string | null;
  visibility: string;
  theme?: string | null;
  moneyCents?: number | null;
  moneyCurrency?: string;
  locations?: { label: string }[];
  createdBy?: string;
  shapedByBoth?: boolean;
  version?: number;
  updatedAt: string;
};

export type Concern = { id: string; title: string; detail?: string | null; status: string };

// inviteProposals is what the service already sends and the sharing screen already reads; naming
// it here lets the ledger's chrome count what is waiting without casting the whole snapshot.
/** What the ledger needs of the capacity answer: the grace banner's facts (see sharing-view.ts). */
export type SnapshotCapacity = { peopleHere: number; grace?: Grace | null };

export type Snapshot = { journey: Journey; moments: Moment[]; images?: MomentImage[]; concerns: Concern[]; inviteProposals?: { viewerMayDecide?: boolean }[]; capacity?: SnapshotCapacity; extras?: { place?: boolean } };

/** A moment as the list draws it: its photos, and its removed photos, already attached. */
export type ShownMoment = Moment & { images: MomentImage[]; removedImages: MomentImage[] };

// Visibility is carried by shape as well as colour and word: an empty ring holds nothing
// out, a half ring is meant for later, a full ring is out. The web's exact cues.
// Each word is read in the active language as it is drawn.
export const VISIBILITY_CUES: Readonly<Record<Visibility, { glyph: string; label: string }>> = Object.freeze({
  private: { glyph: '○', get label() { return t('common.visibility.private'); } },
  'share-later': { glyph: '◐', get label() { return t('common.visibility.shareLater'); } },
  'shared-now': { glyph: '●', get label() { return t('common.visibility.sharedNow'); } },
});

/**
 * An unknown visibility takes the private ring, the web's own fallback. Reading as private is
 * the safe mistake; reading as shared is the one this screen must never make.
 */
export function visibilityCue(visibility: string) {
  return VISIBILITY_CUES[visibility as Visibility] || { glyph: '○', label: String(visibility || '').replaceAll('-', ' ') };
}

/** Which colour role a visibility wears. Anything unknown wears private's. */
export function visibilityRole(visibility: string): 'private' | 'sharedNow' | 'shareLater' {
  if (visibility === 'shared-now') return 'sharedNow';
  if (visibility === 'share-later') return 'shareLater';
  return 'private';
}

// The kinds of moment are the web's (src/model.js); their words are read in the active language.
const KIND_KEYS: Readonly<Record<string, string>> = Object.freeze({
  promise: 'common.momentKind.promise',
  acknowledgment: 'common.momentKind.acknowledgment',
  trigger: 'common.momentKind.trigger',
  'missed-chance': 'common.momentKind.missedChance',
  'heart-to-heart': 'common.momentKind.heartToHeart',
  memory: 'common.momentKind.memory',
  feeling: 'common.momentKind.feeling',
  boundary: 'common.momentKind.boundary',
  'repair-request': 'common.momentKind.repairRequest',
  'learned-something': 'common.momentKind.learnedSomething',
  'call-me': 'common.momentKind.callMe',
  'called-you': 'common.momentKind.calledYou',
  'practical-matter': 'common.momentKind.practicalMatter',
  other: 'common.momentKind.addYourOwn',
});

/** The kinds of moment, [value, words], in the web's order and the active language. */
export function momentKinds(): [string, string][] {
  return (MOMENT_TYPES as [string, string][]).map(([value, label]) => [value, KIND_KEYS[value] ? t(KIND_KEYS[value]) : label]);
}

export function momentLabel(kind: string, kindLabel?: string | null) {
  if (kind === 'other') return kindLabel || t('common.momentKind.sharedNote');
  return momentKinds().find(([value]) => value === kind)?.[1] || t('common.momentKind.moment');
}


/** The choice above the moment list (Oct 9), in the words the owner approves. */
export const MOMENT_VIEW_LABEL = 'Show moments';
export const MOMENT_VIEWS: [MomentView, string][] = [['full', 'In full'], ['compact', 'Compact']];

/**
 * The heading over the moment list (Oct 10). In full shows the recent three first, as the web
 * does, so it keeps "Recent moments"; Compact holds every moment, so it says so.
 */
export function momentListHeading(compact: boolean) {
  return compact ? 'All moments' : 'Recent moments';
}

/** What a screen reader hears for a compact row: its title, its date and its visibility. */
export function compactRowLabel(moment: Moment) {
  return `${moment.title}, ${dateLabel(moment.occurredOn)}, Visibility: ${visibilityCue(moment.visibility).label}`;
}

export function journeyPeriod(journey: Journey) {
  const pieces: string[] = [];
  if (journey.location) pieces.push(journey.location);
  pieces.push(journey.startDateStatus === 'unknown' ? t('home.trip.beganUnknown') : t('home.trip.began', { date: dateLabel(journey.startDate) }));
  pieces.push(journey.endDateStatus === 'forever' ? t('home.trip.noEnd') : journey.endDateStatus === 'unsure' ? t('home.trip.endUnsure') : t('home.trip.ends', { date: dateLabel(journey.endDate) }));
  return pieces.join(' · ');
}

/** Newest first, by the day it happened and then by its last change, as the web sorts. */
export function recentMoments(snapshot: Snapshot): ShownMoment[] {
  const images = snapshot.images || [];
  return snapshot.moments
    .map((moment) => ({
      ...moment,
      images: images.filter((image) => image.momentId === moment.id && !image.deletedAt),
      removedImages: images.filter((image) => image.momentId === moment.id && image.deletedAt),
    }))
    .sort((a, b) => `${b.occurredOn}-${b.updatedAt}`.localeCompare(`${a.occurredOn}-${a.updatedAt}`));
}

/** The web's "See all" button, with a singular for one moment (#337). */
export function seeAllLabel(count: number) {
  return t('home.moments.seeAll', { count });
}

/** Three recent moments until the person asks for all, then every moment. */
export function shownMoments(recent: ShownMoment[], { expanded }: { expanded: boolean }) {
  return expanded ? recent : recent.slice(0, RECENT_MOMENTS_SHOWN);
}

/**
 * What the moment list holds in each view (Oct 9, #379). In full is the web's ledger: three
 * recent moments until "See all". Compact fits ten or so to a screen, so it holds every moment
 * from the start: no "See all" or "Show recent".
 *
 * There is no filter in either view (Oct 12, #405): the view is In full or Compact and nothing
 * else, so nothing can narrow the list and leave a moment out of reach. A way to narrow a long
 * list may come back later as one control (#406).
 */
export function momentListing(recent: ShownMoment[], { compact, expanded }: { compact: boolean; expanded: boolean }) {
  return {
    shown: shownMoments(recent, { expanded: compact || expanded }),
    seeAll: !compact && seeAllShown(recent.length, expanded),
  };
}

export function openThreads(snapshot: Snapshot) {
  return snapshot.concerns.filter((concern) => concern.status === 'open');
}

export function moneyContext(moment: Moment) {
  return moment.moneyCents == null ? null : t('moment.card.money', { amount: money(moment.moneyCents, moment.moneyCurrency) });
}

export function locationContext(moment: Moment) {
  const locations = Array.isArray(moment.locations) ? moment.locations : [];
  return locations.length ? locations.map((location) => location.label).join(' · ') : null;
}

/** The journey that stays open across a refresh, or the most recently changed one. */
export function chooseJourney(journeys: Journey[], previousId: string | null) {
  return journeys.find((journey) => journey.id === previousId)?.id ?? journeys[0]?.id ?? null;
}
