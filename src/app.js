import {
  activeEntries,
  activeMoments,
  activeTrip,
  appendJourneyEvent,
  CATEGORIES,
  CATEGORY_ICONS,
  CURRENT_SCHEMA_VERSION,
  dateLabel,
  dateRange,
  groupDayByCategory,
  isValidState,
  localDay,
  money,
  MOMENT_TYPES,
  normalizeConcern,
  normalizeEntry,
  normalizeMoment,
  normalizeTrip,
  RECENT_MOMENTS_SHOWN,
  seeAllShown,
  summarize,
} from './model.js';
import { exportState, importState, loadState, resetState, saveState } from './store.js';
import { ApiError, TogetherApi } from './api.js';
import { fitTyping } from './display-text.js';
import { rowEdges, scrollToShow, showsJourneyRow } from './journey-row.js';
import { LEAVE_WORD, leaveOffer, leaveRefusalTone } from './leave-journey.js';
import { MOMENT_THEMES, momentThemeLabel, normalizeMomentTheme } from './moment-themes.js';
import { stripPhotoMetadata } from './photo-metadata.js';
import {
  HISTORY_ENTRY_PARTS, HISTORY_ENTRY_PARTS_HEADING, HISTORY_EVENT_GROUPS, HISTORY_FIELDS, HISTORY_FIELDS_HEADING, HISTORY_GUIDE_INTRO,
  HISTORY_GUIDE_SECTIONS, HISTORY_GUIDE_TITLE, HISTORY_KINDS_HEADING, HISTORY_NEVER_LABEL, HISTORY_RECORDS_LABEL, HISTORY_RECORDS_NOTHING,
} from './history-guide.js';
import { activeLanguage, applyTranslations, chooseLanguage, format, languageChoice, languageOptions, t } from './i18n/web.js';
import { errorKey, errorMessage } from './i18n/translator.js';
import { showPassword } from './a11y/show-password/show-password.js';
import { prefersReducedMotion } from './a11y/device-settings/device-settings.js';

// The sentences index.html names by key but data-i18n can't fill on its own: a heading with
// words in italics, and the example ledger's days, written for the active language.
function translatePage() {
  applyTranslations();
  // A ＋ drawn before the words: the same in every language, so it isn't in the sentence, and in
  // the same run of text, so a button's flex layout keeps the space between them.
  document.querySelectorAll('[data-i18n-plus]').forEach((element) => { element.textContent = `＋ ${t(element.dataset.i18nPlus)}`; });
  document.querySelectorAll('[data-i18n-sentence]').forEach(renderEmphasis);
  // The day in bold, then its month as plain text beside it, as the example has always been drawn.
  document.querySelectorAll('[data-example-day]').forEach((time) => {
    const day = `${time.getAttribute('datetime')}T12:00:00Z`;
    const strong = document.createElement('strong');
    strong.textContent = format.date(day, { day: '2-digit', timeZone: 'UTC' });
    time.replaceChildren(strong, ` ${format.date(day, { month: 'short', timeZone: 'UTC' })}`);
  });
}

// A heading whose last words are drawn in italics. The italic words are their own key, and are
// found inside the sentence rather than joined onto it, so a translation can put them anywhere;
// if a translation's italic words aren't in its sentence, the sentence still reads, just upright.
function renderEmphasis(element) {
  const emphasis = t(element.dataset.i18nEmphasis);
  // A sentence that takes its italic words as a value ({together}, as the phone's headline does).
  const value = element.dataset.emphasisValue;
  if (value) {
    element.replaceChildren(...t.parts(element.dataset.i18nSentence, { [value]: emphasis }, (text) => {
      const em = document.createElement('em');
      em.textContent = text;
      return em;
    }));
    return;
  }
  const sentence = t(element.dataset.i18nSentence);
  const at = emphasis ? sentence.lastIndexOf(emphasis) : -1;
  if (at === -1) {
    element.textContent = sentence;
    return;
  }
  const em = document.createElement('em');
  em.textContent = emphasis;
  element.replaceChildren(sentence.slice(0, at), em, sentence.slice(at + emphasis.length));
}

// Every sentence index.html names by key (data-i18n) is filled in before anything else draws.
translatePage();

const loginPassword = document.querySelector('#login-form input[name="password"]');
if (loginPassword) showPassword(loginPassword, t);

// A sentence as markup for a row built as an HTML string: the words escaped, a person's own text
// in a <bdi>, and a value given as { html } (a <time>) put in as it is.
function sentenceMarkup(key, values = {}) {
  return t.parts(key, values, (text) => ({ isolated: text }))
    .map((part) => {
      if (typeof part === 'string') return escapeHtml(part);
      if (part && typeof part.html === 'string') return part.html;
      return `<bdi>${escapeHtml(part?.isolated ?? part)}</bdi>`;
    })
    .join('');
}

const timeMarkup = (value) => ({ html: `<time datetime="${escapeHtml(value || '')}">${escapeHtml(dateTimeLabel(value))}</time>` });

// Text from t() into an element. A value t() inserted (a name, a journey, an amount) arrives
// between Unicode's isolate marks, U+2068 … U+2069; on a page it goes in a <bdi> instead, which
// lays it out on its own the same way and leaves the words as they were (docs/TRANSLATION.md).
function writeText(element, text) {
  const parts = String(text ?? '').split(/\u2068([^\u2069]*)\u2069/);
  element.replaceChildren(...parts.map((part, index) => {
    if (index % 2 === 0) return part;
    const bdi = document.createElement('bdi');
    bdi.textContent = part;
    return bdi;
  }));
}

// An emailed link's one-time code: verify, recovery or invite. The server puts it after the #,
// which no browser sends to any server or puts in a Referer (#261). A link sent before that
// carries it in the query, and an invitation lasts 14 days, so that shape is still read. Either
// way it is taken out of the address first, before the page does anything else.
const EMAILED_CODES = ['verify', 'recovery', 'invite'];
// An invitation's link has its own path, so the phone app can claim it and nothing else (#266).
// It is this same page; once its code is taken, the address goes back to the app's home.
const INVITATION_PATH = '/invite';

function takeEmailedCodes() {
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const inFragment = EMAILED_CODES.some((key) => fragment.has(key));
  const inQuery = EMAILED_CODES.some((key) => query.has(key));
  const codes = new Map();
  for (const key of EMAILED_CODES) {
    if (fragment.has(key)) codes.set(key, fragment.get(key));
    else if (query.has(key)) codes.set(key, query.get(key));
    fragment.delete(key);
    query.delete(key);
  }
  if (inFragment || inQuery) {
    const search = query.toString();
    const hash = inFragment ? fragment.toString() : window.location.hash.slice(1);
    const pathname = codes.has('invite') && window.location.pathname === INVITATION_PATH ? '/' : window.location.pathname;
    window.history.replaceState({}, '', `${pathname}${search ? `?${search}` : ''}${hash ? `#${hash}` : ''}`);
  }
  return codes;
}

const emailedCodes = takeEmailedCodes();

// A link pasted into a tab already on this page changes only what follows the #, which loads
// nothing, so the page loads again and reads it as it would a link opened fresh.
window.addEventListener('hashchange', () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (EMAILED_CODES.some((key) => fragment.has(key))) window.location.reload();
});

// Visibility is carried by shape as well as colour and word: an empty ring holds nothing
// out, a half ring is meant for later, a full ring is out. The order reads even in
// monochrome, in forced colours, and for anyone who cannot separate the three hues.
const VISIBILITY_CUES = Object.freeze({
  private: { glyph: '○', key: 'common.visibility.private' },
  'share-later': { glyph: '◐', key: 'common.visibility.shareLater' },
  'shared-now': { glyph: '●', key: 'common.visibility.sharedNow' },
});

function visibilityCue(visibility) {
  const cue = VISIBILITY_CUES[visibility];
  return cue ? { glyph: cue.glyph, label: t(cue.key) } : { glyph: '○', label: String(visibility || '').replaceAll('-', ' ') };
}

// A consequence is read before it is agreed to. The confirming button names the act rather
// than saying OK, and focus opens on the way out, so the irreversible choice is never the one
// a stray Return key reaches first.
function confirmConsequence({ title, consequence, confirmLabel, keepLabel = t('common.dialog.keep'), destructive = false }) {
  const dialog = document.querySelector('#consequence-dialog');
  if (!dialog?.showModal) return Promise.resolve(false);
  writeText(dialog.querySelector('#consequence-dialog-title'), title);
  writeText(dialog.querySelector('#consequence-dialog-consequence'), consequence);
  const cancel = dialog.querySelector('#consequence-dialog-cancel');
  const accept = dialog.querySelector('#consequence-dialog-accept');
  cancel.textContent = keepLabel;
  accept.textContent = confirmLabel;
  accept.className = destructive ? 'button danger' : 'button primary';
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
    cancel.focus();
  });
}

// Signing out everywhere, changing the password, and being signed out by either (#194). The phone
// says the same words (apps/mobile/src/auth/account-messages.ts).
const SIGN_OUT_EVERYWHERE_CONSEQUENCE = 'Every device signed in to this account, this one included, will need to sign in again. Nothing in your journeys is deleted.';
const SIGNED_OUT_EVERYWHERE = 'Signed out on every device, this one included. Sign in again to continue.';
const signedOutHere = () => t('common.account.signedOutHere');
const PASSWORD_CHANGED_HERE = 'Password changed. Every other device was signed out, and this one stays signed in.';

// A confirmation may pass; a problem must not. Anything a person needs to read twice, act on,
// or copy down stays on the page until they dismiss it, rather than fading after 2.6 seconds.
// Tone is carried by a shape as well as a colour, so the two kinds are told apart without it.
const STATUS_TONES = Object.freeze({
  caution: { glyph: '▲', className: 'caution' },
  problem: { glyph: '■', className: 'problem' },
});
let statusBannerSource = '';
const statusHomeParent = document.querySelector('#status-banner')?.parentNode || null;
const statusHomeNext = document.querySelector('#status-banner')?.nextSibling || null;

// The status region sits above the work so nothing is covered. A modal dialog is the one place
// that stops being true: it draws over the page and dims it, so a problem raised inside a dialog
// was being written behind the dialog reporting it — a wrong password said nothing a person could
// see. There is still one region; it moves to wherever the work currently is.
function modalOnTop() {
  const open = Array.from(document.querySelectorAll('dialog[open]'));
  for (let index = open.length - 1; index >= 0; index -= 1) {
    try {
      if (open[index].matches(':modal')) return open[index];
    } catch {
      return open[index];
    }
  }
  return null;
}

function placeStatus(banner) {
  const modal = modalOnTop();
  const target = modal || statusHomeParent;
  if (!target || banner.parentNode === target) return;
  if (modal) modal.prepend(banner);
  else statusHomeParent.insertBefore(banner, statusHomeNext);
}

function showStatus(message, { tone = 'problem', source = 'action' } = {}) {
  const banner = document.querySelector('#status-banner');
  if (!banner) return;
  // Being signed out is a condition to act on, not a failure, whichever request noticed it first.
  if (message === signedOutHere()) ({ tone, source } = { tone: 'caution', source: 'signed-out' });
  placeStatus(banner);
  const shape = STATUS_TONES[tone] || STATUS_TONES.problem;
  banner.querySelector('.status-banner-glyph').textContent = shape.glyph;
  writeText(banner.querySelector('#status-banner-message'), message);
  banner.className = `status-banner ${shape.className}`;
  banner.hidden = false;
  statusBannerSource = source;
  // A dialog holds whatever scroll position it already had, so a region placed at its top can
  // still sit above the fold. Being in the right box is not the same as being seen.
  if (banner.parentNode !== statusHomeParent) banner.scrollIntoView({ block: 'nearest' });
}

function clearStatus(source) {
  const banner = document.querySelector('#status-banner');
  // Reconnecting clears the offline notice, but never a problem the person has not read.
  if (!banner || (source && statusBannerSource !== source)) return;
  banner.hidden = true;
  statusBannerSource = '';
}

// An empty surface still says what it is and why it is empty, rather than trailing off.
function emptyState(title, body, { compact = false } = {}) {
  return `<div class="empty${compact ? ' compact' : ''}"><strong>${title}</strong><p>${body}</p></div>`;
}

let state = loadState();
const api = new TogetherApi();
let accountUser = null;
let billingState = null;
let cloudJourneyIds = new Set();
let filter = 'All';
let selectedDay = null;
let selectedCategory = null;
let removeId = null;
let removeSnapshot = null;
let guidanceIndex = 0;
const momentImageUrls = new Map();
let momentsExpanded = false;
let momentLocations = [];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

function saveWorkingState() {
  if (accountUser) return;
  try {
    saveState(state);
  } catch (error) {
    // Invalid data is a bug and stays loud. A full or blocked store is said in the status
    // region instead, and the change still shows (#185).
    if (!isValidState(state)) throw error;
    showStatus(t('status.banner.storageFull'), { tone: 'caution', source: 'storage' });
  }
}

function isCloudJourney(trip = activeTrip(state)) {
  return Boolean(accountUser && trip && cloudJourneyIds.has(trip.id));
}

// A refusal from the service reads in the person's language, by its code (docs/TRANSLATION.md),
// and in the server's own English for a code with no sentence yet. area is where a code means
// something narrower than it does everywhere: on the sign-in forms, invalid_credentials is only
// ever a wrong sign-in (error.signIn), never the wrong password for deleting an account.
function accountMessage(error, area = '') {
  if (error instanceof ApiError && error.sessionEnded) return signedOutHere();
  if (error instanceof ApiError && area && error.code && t.has(errorKey(error.code, area))) return t(errorKey(error.code, area));
  // The web's own client refused before sending anything: the phone says the same words.
  if (error instanceof ApiError && error.code === 'accounts_unavailable') return t('error.client.accountsUnavailable');
  if (error instanceof ApiError) return errorMessage(t, error);
  return t('common.account.fallbackError');
}

function snapshotToState(snapshots) {
  const previousActive = state.activeTripId;
  const preferences = state.preferences;
  const trips = [];
  const entries = [];
  const moments = [];
  const concerns = [];
  const events = [];
  for (const snapshot of snapshots) {
    const membersById = Object.fromEntries(snapshot.members.map((member) => [member.id, member.displayName]));
    const creationEvent = snapshot.events.find((event) => event.action === 'journey_created');
    const fallbackCreator = snapshot.members.find((member) => member.role === 'owner');
    const createdByUserId = creationEvent?.actorUserId || fallbackCreator?.id || '';
    const createdByDisplayName = membersById[createdByUserId] || (creationEvent ? t('common.person.formerJourneyer') : fallbackCreator?.displayName || t('common.person.journeyMember'));
    const milestones = { reviewedPicture: false, chosePrompt: false, agreedNextAction: false };
    snapshot.milestones.forEach((item) => { milestones[item.key] = item.completed; });
    trips.push({ ...snapshot.journey, members: snapshot.members.map((member) => member.displayName), memberRecords: snapshot.members, invitationRecords: snapshot.invitations || [], inviteProposalRecords: snapshot.inviteProposals || [], capacity: snapshot.capacity, createdByUserId, createdByDisplayName, createdAt: creationEvent?.createdAt || snapshot.journey.createdAt, milestones, archivedAt: '' });
    entries.push(...snapshot.expenses.map((expense) => ({ ...expense, tripId: expense.journeyId, paidBy: expense.payerLabel })));
    const imagesByMoment = Object.groupBy((snapshot.images || []).filter((image) => !image.deletedAt), (image) => image.momentId);
    const removedImagesByMoment = Object.groupBy((snapshot.images || []).filter((image) => image.deletedAt), (image) => image.momentId);
    moments.push(...snapshot.moments.map((moment) => ({ ...moment, tripId: moment.journeyId, images: imagesByMoment[moment.id] || [], removedImages: removedImagesByMoment[moment.id] || [] })));
    concerns.push(...snapshot.concerns.map((concern) => ({ ...concern, tripId: concern.journeyId, updatedBy: t('common.person.journeyMember'), updatedAt: new Date(concern.updatedAt).toISOString() })));
    snapshot.events.forEach((event, index) => events.push({
      ...event,
      tripId: snapshot.journey.id,
      occurredAt: event.createdAt,
      actorName: membersById[event.actorUserId] || t('common.person.formerJourneyer'),
      previousEventId: snapshot.events[index - 1]?.id || '',
      source: 'server-authoritative',
    }));
  }
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    activeTripId: trips.some((trip) => trip.id === previousActive) ? previousActive : trips[0].id,
    preferences,
    trips,
    entries,
    moments,
    concerns,
    events,
  };
}

async function refreshCloudState({ announce = false } = {}) {
  if (!accountUser) return;
  const { journeys } = await api.request('/journeys');
  const heldCloudJourneys = state.trips.some((trip) => cloudJourneyIds.has(trip.id));
  cloudJourneyIds = new Set(journeys.map((journey) => journey.id));
  if (!journeys.length) {
    // The last private journey is gone, by leaving it (#96) or otherwise: what was read from the
    // service leaves the page, and this browser's own ledger comes back, as after signing out.
    if (heldCloudJourneys) state = loadState();
    renderAccountState();
    render();
    if (announce) showToast(t('common.start.accountReady'));
    return;
  }
  const snapshots = await Promise.all(journeys.map((journey) => api.request(`/journeys/${journey.id}/snapshot`)));
  state = snapshotToState(snapshots);
  renderAccountState();
  render();
  if (announce) showToast(t('signIn.toast.refreshed'));
}

function renderBillingState() {
  const panel = $('#billing-panel');
  if (!panel) return;
  const visible = Boolean(accountUser && billingState?.enabled);
  panel.hidden = !visible;
  if (!visible) return;

  const testMode = billingState.environment === 'test';
  $('#billing-environment').hidden = !testMode;
  $('#billing-environment').textContent = testMode ? 'Test mode — checkout cannot create a real charge.' : '';
  const entitlement = billingState.entitlement;
  const periodEnd = billingState.subscription?.currentPeriodEnd || entitlement?.expiresAt;
  const until = periodEnd ? ` through ${dateTimeLabel(periodEnd)}` : '';
  const paidCapacity = billingState.subscription?.paidCapacity || entitlement?.quantity || 0;
  // Tone as well as words: settled and waiting look different, and neither is a failure, so
  // neither takes the destructive role. A glyph carries the distinction without the colour.
  const capacity = billingState.subscription?.cancelAtPeriodEnd
    ? { tone: 'waiting', message: `Cancellation is set for renewal${until}. Existing people, shared history, and valid invitation reservations remain.` }
    : !entitlement
    ? { tone: '', message: `The first two people in ${billingState.journey.name} are included. Add another person for $1 USD each month.` }
    : entitlement.state === 'active'
      ? { tone: 'settled', message: `${paidCapacity} additional ${paidCapacity === 1 ? 'person is' : 'people are'} covered for this journey${until}.` }
      : entitlement.state === 'grace'
        ? { tone: 'waiting', message: `This journey's paid capacity needs payment attention${until}. No person or shared history is removed automatically.` }
        : entitlement.state === 'pending'
          ? { tone: 'waiting', message: 'This journey is waiting for payment confirmation.' }
          : { tone: '', message: 'This journey does not currently have paid additional-person capacity.' };
  const status = $('#billing-status');
  status.className = `billing-status ${capacity.tone}`.trim();
  status.replaceChildren();
  if (capacity.tone) {
    const glyph = document.createElement('span');
    glyph.className = 'billing-status-glyph';
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = capacity.tone === 'settled' ? '\u25CF' : '\u25B2';
    status.append(glyph);
  }
  status.append(document.createTextNode(capacity.message));

  const offers = $('#billing-offers');
  const hasCurrentSubscription = billingState.subscription
    && !['canceled', 'incomplete_expired'].includes(billingState.subscription.status);
  const availableOffers = !hasCurrentSubscription ? billingState.offers : [];
  offers.replaceChildren(...availableOffers.map((offer) => {
    const button = document.createElement('button');
    button.className = 'button primary';
    button.type = 'button';
    button.dataset.billingOffer = offer.id;
    button.textContent = `Add another person · $${(offer.unitAmount / 100).toFixed(2)} ${offer.currency} / month`;
    return button;
  }));

  const picker = $('#billing-capacity-picker');
  const showPicker = Boolean(availableOffers.length);
  if (showPicker && picker.hidden) {
    $('#billing-capacity-range').value = '1';
    $('#billing-capacity-number').value = '1';
  }
  picker.hidden = !showPicker;
  if (showPicker) updateCapacityTotal(availableOffers[0]);
  $('#billing-portal-button').hidden = !billingState.portalEnabled;
}

function clampCapacity(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(99, Math.max(1, parsed)) : 1;
}

function capacityQuantity() {
  return clampCapacity($('#billing-capacity-number').value);
}

function updateCapacityTotal(offer) {
  const total = $('#billing-capacity-total');
  if (!offer) { total.textContent = ''; return; }
  total.textContent = `${money(offer.unitAmount * capacityQuantity(), offer.currency, format)} / month`;
}

function syncCapacityFromRange() {
  const quantity = clampCapacity($('#billing-capacity-range').value);
  $('#billing-capacity-number').value = String(quantity);
  updateCapacityTotal(billingState?.offers?.[0]);
}

function previewCapacityFromNumber() {
  $('#billing-capacity-range').value = String(capacityQuantity());
  updateCapacityTotal(billingState?.offers?.[0]);
}

function normalizeCapacityNumber() {
  $('#billing-capacity-number').value = String(capacityQuantity());
  previewCapacityFromNumber();
}

async function refreshBillingState() {
  const journey = activeTrip(state);
  if (!accountUser || !isCloudJourney(journey) || journey.role !== 'owner') {
    billingState = null;
    renderBillingState();
    return;
  }
  try {
    billingState = await api.request(`/journeys/${journey.id}/billing`);
  } catch (error) {
    if (![403, 404, 503].includes(error.status)) throw error;
    billingState = null;
  }
  renderBillingState();
}

// An account opened with Apple that shared no usable email holds a placeholder the server made
// from its own id (server/platform.js), which is nobody's address. It is said in words (#217).
// Such an account can't be sent a verification email, so it is told where to write instead.
const APPLE_SHARED_NO_EMAIL = 'Apple didn’t share an email address.';
const NO_EMAIL_SUPPORT = 'For help with this account, write to ledger-support@together-ledger.com.';
function appleSharedNoEmail(email) {
  return /^apple-[^@\s]+@no-email\.invalid$/i.test(email);
}
function accountEmailLabel(email) {
  return appleSharedNoEmail(email) ? APPLE_SHARED_NO_EMAIL : email;
}

// What this page held for the account goes, and the browser-only ledger comes back, as signing
// out does. Then the person is on the sign-in form, with what happened said above it rather than
// in a toast that fades, and nothing half-loaded is left open behind it.
function landOnSignIn(explanation) {
  accountUser = null;
  billingState = null;
  cloudJourneyIds = new Set();
  state = loadState();
  document.querySelectorAll('dialog[open]').forEach((dialog) => { if (dialog.id !== 'account-dialog') dialog.close(); });
  render();
  if (state.preferences.onboardingComplete) showLedgerSurface();
  else showWelcomeSurface();
  renderAccountState();
  if (!$('#account-dialog').open) openAccountDialog();
  showStatus(explanation, { tone: 'caution', source: 'signed-out' });
}

// The service refused this page's session: it was ended somewhere else, or it ran out. Every
// request that was waiting on it fails the same way, so this runs once, for the first.
api.onSignedOut = () => {
  if (accountUser) landOnSignIn(signedOutHere());
};

function renderAccountState() {
  const signedIn = Boolean(accountUser);
  const accountsAvailable = api.accountsAvailable;
  $('#account-unavailable').hidden = signedIn || accountsAvailable;
  $('#signed-out-account').hidden = signedIn || !accountsAvailable;
  $('#signed-in-account').hidden = !signedIn;
  renderAccountLabels(signedIn, accountsAvailable);
  $('#account-name').textContent = signedIn ? accountUser.displayName : '';
  const nameInput = $('#display-name-form [name=displayName]');
  if (document.activeElement !== nameInput) nameInput.value = signedIn ? accountUser.displayName : '';
  $('#account-username').textContent = signedIn ? `@${accountUser.username}` : '';
  $('#account-email').textContent = signedIn ? accountEmailLabel(accountUser.email) : '';
  $('#verification-status').textContent = signedIn ? (accountUser.emailVerified ? 'Email verified' : 'Email verification is still required before accepting an invitation.') : '';
  const noEmail = signedIn && appleSharedNoEmail(accountUser.email);
  $('#resend-verification-button').hidden = !signedIn || accountUser.emailVerified || noEmail;
  $('#no-email-support').hidden = !noEmail;
  $('#no-email-support').textContent = noEmail ? NO_EMAIL_SUPPORT : '';
  // An account opened with Google or Apple has no password, so deleting it asks only for DELETE.
  const deleteAsksForPassword = !signedIn || accountUser.hasPassword !== false;
  $('#delete-account-password').hidden = !deleteAsksForPassword;
  $('#delete-account-password input').disabled = !deleteAsksForPassword;
  // Nor is it offered a password to change (#194). Setting a first password is not offered yet.
  const changesPassword = signedIn && accountUser.hasPassword !== false;
  $('#change-password-section').hidden = !changesPassword;
  $$('#change-password-form input').forEach((input) => { input.disabled = !changesPassword; });
  $('#account-sync-copy').textContent = isCloudJourney() ? 'Private journey sync is active. Moment visibility is enforced by the account service; shared threads and practical context remain visible to people in this journey.' : 'Your account is ready. Create a private journey when you are ready to invite another journeyer.';
  $('#settings-storage-copy').textContent = t(isCloudJourney() ? 'settings.storage.signedIn' : 'settings.storage.browserOnly');
  $('#sync-badge').textContent = syncBadgeLabel(signedIn, accountsAvailable);
  $('#sync-badge').classList.toggle('cloud', signedIn);
  renderBillingState();
  $('#actor-control').hidden = isCloudJourney();
  const sharing = isCloudJourney();
  renderJourneySharing(signedIn, sharing);
  renderGraceBanner(sharing ? activeTrip(state) : null);
  if (sharing) {
    const trip = activeTrip(state);
    const members = trip.memberRecords || [];
    $('#member-list').innerHTML = memberListMarkup(members, (member) => memberRowMarkup(trip, member))
      || emptyState(t('sharing.member.emptyTitle'), t('sharing.member.emptyBody'), { compact: true });
    const invitations = trip.invitationRecords || [];
    // Once everyone has agreed and the invitation is out, nothing is being decided any more: the
    // place is held for the person until they accept, it runs out, or it is withdrawn (#350).
    const reserved = reservedInvitations(invitations);
    $('#reserved-places').hidden = !reserved.length;
    $('#reserved-place-list').innerHTML = reserved.map(reservedPlaceRow).join('');
    const { deciding, settled } = splitProposals(trip.inviteProposalRecords || []);
    $('#invite-proposals').hidden = !deciding.length;
    $('#invite-proposal-list').innerHTML = deciding.map((proposal) => inviteProposalRow(proposal, trip)).join('');
    $('#settled-proposals').hidden = !settled.length;
    $('#settled-proposal-list').innerHTML = settled.map((proposal) => inviteProposalRow(proposal, trip)).join('');
    renderUnpaidCapacityRest(trip, members);
    $('#invitation-history').hidden = !invitations.length;
    $('#invitation-list').innerHTML = invitations.map(invitationHistoryRow).join('');
    renderLeaveJourney(trip);
  } else {
    renderLeaveJourney(null);
    $('#member-list').innerHTML = '';
    $('#reserved-places').hidden = true;
    $('#reserved-place-list').innerHTML = '';
    $('#invite-proposals').hidden = true;
    $('#invite-proposal-list').innerHTML = '';
    $('#settled-proposals').hidden = true;
    $('#settled-proposal-list').innerHTML = '';
    $('#invitation-history').hidden = true;
    $('#invitation-list').innerHTML = '';
  }
  $('#theme-copy').textContent = t('common.theme.note');
}

// Sign in, Account settings or Accounts soon, wherever an account is opened from.
function renderAccountLabels(signedIn, accountsAvailable) {
  const label = signedIn ? t('common.account.settings') : accountsAvailable ? t('common.account.signIn') : t('common.account.soon');
  $('#account-button').textContent = label;
  $$('[data-open-account]').forEach((button) => { button.textContent = label; });
  $('#account-dialog-copy').textContent = accountsAvailable ? t('common.account.passwordsPrivate') : t('account.dialog.unavailable');
}

function syncBadgeLabel(signedIn, accountsAvailable) {
  if (isCloudJourney()) return t('common.sync.privateSync');
  if (signedIn) return t('common.sync.accountReady');
  return accountsAvailable ? t('common.sync.browserOnly') : t('common.account.soon');
}

// The top of Journey sharing: who is here and how someone is added, or how to get there.
function renderJourneySharing(signedIn, sharing) {
  const needsPrivateJourney = signedIn && !sharing;
  const canInvite = activeTrip(state)?.capacity?.canInvite ?? activeTrip(state)?.members.length < 2;
  // Any journeyer may ask; the asking is not the adding, so this is no longer the owner's form.
  $('#invite-form').hidden = !sharing || !canInvite;
  $('#sharing-create-journey-button').hidden = !needsPrivateJourney;
  writeText($('#sharing-copy'), sharing
    ? sharingCopy(activeTrip(state).members.length, canInvite, reservedFor(activeTrip(state)))
    : needsPrivateJourney
      ? t('sharing.copy.needsJourney')
      : t('sharing.copy.signedOut'));
  $('#journey-record').hidden = !sharing;
}

// One person in Journey record: who they are, when they came, and their part in the journey.
function memberRowMarkup(trip, member) {
  const memberActions = trip.role === 'owner' && member.id !== accountUser.id
    ? `<div class="journey-member-actions"><button class="button quiet" type="button" data-transfer-owner="${escapeHtml(member.id)}" data-member-name="${escapeHtml(member.displayName)}">${escapeHtml(t('sharing.member.makeOwner'))}</button><button class="button danger" type="button" data-remove-member="${escapeHtml(member.id)}" data-member-name="${escapeHtml(member.displayName)}">${escapeHtml(t('common.action.remove'))}</button></div>`
    : '';
  const createdJourney = member.id === trip.createdByUserId;
  const timestamp = createdJourney ? trip.createdAt : member.joinedAt;
  const description = sentenceMarkup(createdJourney ? 'sharing.member.createdBy' : 'sharing.member.joined', { name: member.displayName });
  const timing = sentenceMarkup(createdJourney ? 'sharing.member.createdAt' : 'sharing.member.joinedAt', { time: timeMarkup(timestamp) });
  const role = member.role === 'owner' ? 'owner' : createdJourney ? 'creator' : 'journeyer';
  const roleLabel = t(member.id === accountUser.id ? 'sharing.member.roleYou' : 'sharing.member.role', { role });
  return `<div class="journey-record-row"><div><strong>${description}</strong><small>${timing}</small>${memberActions}</div><span class="journey-role">${escapeHtml(roleLabel)}</span></div>`;
}

function dateTimeLabel(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return t('common.time.notRecorded');
  if (format) return format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' });
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

// A journey can hold a hundred and one people. Every one of them is a named row, deliberately —
// the visual-token idea is parked in #155 — but a hundred and one named rows is about twenty
// screens of list, and everything below membership was being pushed under it.
//
// So a small journey reads exactly as it did, and a large one keeps in view the two rows that
// answer the questions actually being asked of this list: who holds this journey, and where do I
// stand in it. The rest opens when somebody wants it, which is also when the removal and
// ownership controls inside it are wanted.
const MEMBERS_SHOWN_BEFORE_FOLDING = 8;

function memberListMarkup(members, memberRow) {
  if (members.length <= MEMBERS_SHOWN_BEFORE_FOLDING) return members.map(memberRow).join('');
  const inView = members.filter((member) => member.role === 'owner' || member.id === accountUser?.id);
  const folded = members.filter((member) => !inView.includes(member));
  if (!folded.length) return members.map(memberRow).join('');
  return `${inView.map(memberRow).join('')}<details class="member-overflow"><summary>${escapeHtml(t('sharing.member.showOthers', { count: folded.length }))}</summary>${folded.map(memberRow).join('')}</details>`;
}

// "N people are here…": the top line of Journey sharing. Where the journey is full only because
// places are held for people invited, it says so, rather than that there is no open place (#350).
function sharingCopy(memberCount, canInvite, reserved) {
  const here = t('sharing.copy.here', { count: memberCount });
  let room = canInvite ? t('sharing.copy.room') : t('sharing.copy.noRoom');
  if (!canInvite && reserved?.held && reserved.invitations.length === 1) room = t('sharing.copy.reservedOne', { person: invitedPerson(reserved.invitations[0]) });
  else if (!canInvite && reserved?.held && reserved.invitations.length > 1) room = t('sharing.copy.reservedMany', { count: reserved.invitations.length });
  return [here, room, t('sharing.copy.separately')].join(' ');
}

function reservedFor(trip) {
  return { held: Boolean(trip?.capacity?.heldForInvitations), invitations: reservedInvitations(trip?.invitationRecords || []) };
}

// The server sends only the masked email (#350); once the person has joined, their name.
function invitedPerson(record) {
  return record.joinedDisplayName || record.email;
}

function reservedInvitations(invitations) {
  return invitations.filter((invitation) => invitation.status === 'pending');
}

// "Being decided on" is only for people the journey hasn't finished agreeing on. Everything else
// is settled, and its record stays readable below it.
function splitProposals(proposals) {
  return { deciding: proposals.filter((proposal) => proposal.status === 'open'), settled: proposals.filter((proposal) => proposal.status !== 'open') };
}

// Time left, said in the units that are actually left, as src/model.js's remainingLabel says it
// for the phone. A month-long wait reads in days, a short-lived invitation in minutes.
function remainingText(expiresAt, now = Date.now()) {
  const deadline = new Date(expiresAt).getTime();
  if (!expiresAt || Number.isNaN(deadline)) return t('common.time.noEnd');
  const remaining = deadline - now;
  if (remaining <= 0) return t('common.time.none');
  const minutes = Math.floor(remaining / 60000);
  if (minutes < 1) return t('common.time.underAMinute');
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  if (days > 0) return t('common.time.days', { days, hours, minutes: rest });
  if (hours > 0) return t('common.time.hours', { hours, minutes: rest });
  return t('common.time.minutes', { minutes: rest });
}

// Two different waits, and they are not the same length: the journeyers have a month to answer,
// and the person invited has two weeks to accept (#347). "left" is said once, by the value (#282).
function countdownMarkup(expiresAt, key) {
  return `<small class="countdown" data-expires-at="${escapeHtml(expiresAt || '')}" data-countdown-key="${escapeHtml(key)}">${escapeHtml(t(key, { left: remainingText(expiresAt) }))}</small>`;
}

function sentByMarkup(invitation) {
  return sentenceMarkup('sharing.invitation.sentBy', { name: invitation.invitedByDisplayName, time: timeMarkup(invitation.sentAt) });
}

function reservedPlaceRow(invitation) {
  const withdraw = invitation.viewerMayWithdraw
    ? `<div class="settings-actions"><button class="button quiet" type="button" data-withdraw-invitation="${escapeHtml(invitation.id)}">${escapeHtml(t('sharing.invitation.withdraw'))}</button></div>`
    : '';
  return `<div class="journey-record-row"><div><strong>${sentenceMarkup('sharing.reserved.title', { person: invitedPerson(invitation) })}</strong><small>${sentByMarkup(invitation)}</small>${countdownMarkup(invitation.expiresAt, 'sharing.invitation.timeToJoin')}${withdraw}</div><span class="invitation-status ${escapeHtml(invitation.status)}">${escapeHtml(invitationStatusLabel(invitation.status))}</span></div>`;
}

function invitationHistoryRow(invitation) {
  const joining = invitation.status === 'pending' ? countdownMarkup(invitation.expiresAt, 'sharing.invitation.timeToJoin') : '';
  const sendAgain = invitation.viewerMaySendAgain
    ? `<small>${sentenceMarkup('sharing.invitation.sendAgainNote', { time: dateTimeLabel(invitation.sendAgainUntil) })}</small><div class="settings-actions"><button class="button quiet" type="button" data-send-invitation-again="${escapeHtml(invitation.id)}">${escapeHtml(t('sharing.invitation.sendAgain'))}</button></div>`
    : '';
  return `<div class="journey-record-row"><div><strong>${sentenceMarkup('sharing.invitation.sentTo', { person: invitedPerson(invitation) })}</strong><small>${sentByMarkup(invitation)}</small>${joining}${sendAgain}</div><span class="invitation-status ${escapeHtml(invitation.status)}">${escapeHtml(invitationStatusLabel(invitation.status))}</span></div>`;
}

// The times on both sides of a decision are kept in the record: when somebody was asked, and
// when they answered. A journey can fold this away to read the summary, and cannot lose it.
function inviteProposalRow(proposal, trip) {
  const waiting = proposal.status === 'open'
    ? t('sharing.proposal.waiting', { agreed: proposal.agreedCount, asked: proposal.askedCount, pending: proposal.pendingCount })
    : t('sharing.proposal.agreedCount', { agreed: proposal.agreedCount, asked: proposal.askedCount });
  // Whoever asked can stop asking, and so can the owner. Withdrawing settles the question
  // without recording a refusal against anybody who simply had not answered yet.
  const mayWithdraw = proposal.status === 'open' && (proposal.proposedByUserId === accountUser?.id || trip?.role === 'owner');
  // Agreeing and declining carry the same weight on purpose. A solid primary on one of them is
  // the product having an opinion about how somebody should answer a question about another
  // person's access to everything this journey has shared. It does not get one.
  const buttons = [
    proposal.viewerMayDecide ? `<button class="button quiet" type="button" data-agree-proposal="${escapeHtml(proposal.id)}">${escapeHtml(t('sharing.proposal.agree'))}</button>` : '',
    proposal.viewerMayDecide ? `<button class="button quiet" type="button" data-decline-proposal="${escapeHtml(proposal.id)}">${escapeHtml(t('sharing.proposal.decline'))}</button>` : '',
    mayWithdraw ? `<button class="button quiet" type="button" data-withdraw-proposal="${escapeHtml(proposal.id)}">${escapeHtml(t('sharing.proposal.withdraw'))}</button>` : '',
  ].filter(Boolean).join('');
  const actions = buttons ? `<div class="settings-actions">${buttons}</div>` : '';
  const note = proposal.note ? `<small>${escapeHtml(proposal.note)}</small>` : '';
  const countdown = proposal.status === 'open' ? countdownMarkup(proposal.expiresAt, 'sharing.proposal.timeToAnswer') : '';
  const proposedBy = sentenceMarkup('sharing.proposal.proposedBy', { name: proposal.proposedByDisplayName, time: timeMarkup(proposal.proposedAt) });
  return `<div class="journey-record-row"><div><strong>${escapeHtml(invitedPerson(proposal))}</strong><small>${proposedBy}</small>${note}<small>${escapeHtml(waiting)}</small>${countdown}${actions}<details class="proposal-detail"><summary>${escapeHtml(t('sharing.proposal.whoWasAsked'))}</summary>${proposal.decisions.map(proposalDecisionRow).join('')}</details></div><span class="invitation-status ${escapeHtml(proposal.status)}">${escapeHtml(proposalStatusLabel(proposal.status))}</span></div>`;
}

function proposalDecisionRow(entry) {
  const asked = entry.decision === 'pending'
    ? sentenceMarkup('sharing.proposal.askedWaiting', { time: timeMarkup(entry.requestedAt) })
    : sentenceMarkup('sharing.proposal.askedAnswered', { time: timeMarkup(entry.requestedAt), decision: entry.decision === 'agree' ? 'agree' : 'decline', answeredAt: dateTimeLabel(entry.decidedAt) });
  return `<div class="journey-record-row"><div><strong>${escapeHtml(entry.displayName)}</strong><small>${asked}</small></div><span class="invitation-status ${escapeHtml(entry.decision)}">${escapeHtml(proposalDecisionLabel(entry.decision))}</span></div>`;
}

// The countdowns are redrawn in place rather than by re-rendering the journey, so that a fold
// somebody opened to read the record does not close under them while they are reading it.
function refreshCountdowns() {
  document.querySelectorAll('.countdown[data-expires-at]').forEach((element) => {
    element.textContent = t(element.dataset.countdownKey, { left: remainingText(element.dataset.expiresAt) });
  });
}

function proposalStatusLabel(status) {
  return t('sharing.proposal.status', { status });
}

function proposalDecisionLabel(decision) {
  return t('sharing.proposal.decision', { decision });
}

// Only the owner sees this: they hold the journey and the payment, and the decision is theirs.
// It is written as a consequence rather than a setting, because what it chooses is what happens
// to another person's access when a payment lapses. Resting is always read-only (the Book, 4.7),
// so the order is all there is to choose: the last person in it keeps adding with the owner.
function renderUnpaidCapacityRest(trip, members) {
  const section = $('#unpaid-capacity-rest');
  if (!section) return;
  const capacity = trip.capacity;
  const owning = trip.role === 'owner' && capacity && capacity.mode === 'billing';
  section.hidden = !owning;
  if (!owning) return;

  const queue = restQueue(members, capacity.restOrder);
  const resting = new Set(capacity.restingMemberIds || []);
  $('#rest-queue').innerHTML = queue.length
    ? `<p class="rest-queue-copy">Who rests first, if it isn't paid. The last person here keeps adding with you.</p>${queue.map((member, index) => `<div class="journey-record-row"><div><strong>${escapeHtml(member.displayName)}</strong>${resting.has(member.id) ? '<small>Resting now</small>' : ''}${index === queue.length - 1 ? '<small class="rest-keeps-adding">Keeps adding with you</small>' : ''}</div><div class="journey-member-actions"><button class="button quiet" type="button" data-rest-earlier="${escapeHtml(member.id)}"${index === 0 ? ' disabled' : ''}>Rest earlier</button><button class="button quiet" type="button" data-rest-later="${escapeHtml(member.id)}"${index === queue.length - 1 ? ' disabled' : ''}>Rest later</button></div></div>`).join('')}`
    : emptyState('No one else is here yet', 'When another journeyer joins, you can choose who keeps adding with you.', { compact: true });

  const order = queue.map((member) => member.id);
  $$('[data-rest-earlier]', section).forEach((button) => button.addEventListener('click', () => moveRestOrder(trip, order, button.dataset.restEarlier, -1)));
  $$('[data-rest-later]', section).forEach((button) => button.addEventListener('click', () => moveRestOrder(trip, order, button.dataset.restLater, 1)));
}

// The order comes from the server (#281), so a move always starts from the order that is saved,
// never from the order people joined in. Someone the server does not list is not in the queue.
function restQueue(members, restOrder) {
  const byId = new Map(members.map((member) => [member.id, member]));
  return (restOrder || []).map((id) => byId.get(id)).filter(Boolean);
}

// A journey waiting on a payment tells everyone in it: who pays, the time left, the weeks asked
// for this year and who can still add if it isn't paid (the Book, 4.7). Everyone knows, so the
// payer can't quietly lean on the group's trust. The person reading is "you".
function graceBannerCopy(grace, viewerId, peopleHere) {
  const name = (person) => (person.id === viewerId ? 'you' : person.displayName);
  const names = (people) => {
    const listed = people.map(name);
    return listed.length > 1 ? `${listed.slice(0, -1).join(', ')} and ${listed[listed.length - 1]}` : listed[0] || '';
  };
  const payer = name(grace.payer);
  // A seventh week given under the old limit of 7 still reads as all of them, never 7 of 6.
  const weeks = `${Math.min(grace.requestsUsed, grace.requestsPerYear)} of ${grace.requestsPerYear} extra weeks asked for this year`;
  const someoneRests = grace.keepAdding.length < peopleHere;
  const whoAdds = `only ${names(grace.keepAdding)} can add new moments. Everyone else can still see everything, and nothing is lost.`;
  const days = `${grace.daysLeft} ${grace.daysLeft === 1 ? 'day' : 'days'} left`;
  return [
    `This journey is waiting on a payment from ${payer}.`,
    `${days} · ${weeks}.`,
    someoneRests ? `If it isn't paid, ${whoAdds} Paying again brings everyone back.` : 'If it isn\'t paid, everyone here can still add, and nothing is lost.',
  ].join(' ');
}

// What the payer reads under the banner when another week can't be asked for yet, or at all
// this year.
function graceRequestNote(grace, viewerId) {
  if (grace.payer.id !== viewerId || grace.canRequest) return '';
  if (grace.requestsUsed >= grace.requestsPerYear) return `All ${grace.requestsPerYear} extra weeks for ${grace.calendarYear} have been asked for. The count starts again on January 1.`;
  return `Another week can be asked for once ${grace.requestDays} days or fewer are left.`;
}

function renderGraceBanner(trip) {
  const banner = $('#grace-banner');
  if (!banner) return;
  const grace = trip?.capacity?.grace;
  banner.hidden = !grace;
  if (!grace) return;
  $('#grace-banner-message').textContent = graceBannerCopy(grace, accountUser?.id, trip.capacity.peopleHere);
  const note = graceRequestNote(grace, accountUser?.id);
  $('#grace-banner-note').textContent = note;
  $('#grace-banner-note').hidden = !note;
  const button = $('#grace-request-button');
  button.hidden = !(grace.payer.id === accountUser?.id && grace.canRequest);
  button.textContent = `Ask for ${grace.requestDays} more days`;
}

async function requestMoreGrace() {
  const trip = activeTrip(state);
  if (!trip) return;
  try {
    await api.mutate(`/journeys/${trip.id}/grace-requests`, 'POST', {});
    await refreshCloudState();
    showToast('Asked for 7 more days. Everyone in this journey can see it.');
  } catch (error) {
    showStatus(accountMessage(error));
  }
}

function moveRestOrder(trip, order, memberUserId, direction) {
  const from = order.indexOf(memberUserId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return;
  const next = [...order];
  [next[from], next[to]] = [next[to], next[from]];
  saveUnpaidCapacityRest(trip, { restOrder: next });
}

async function saveUnpaidCapacityRest(trip, payload) {
  try {
    await api.mutate(`/journeys/${trip.id}/unpaid-capacity`, 'PATCH', payload);
    await refreshCloudState();
    showToast('Saved the resting order.');
  } catch (error) {
    showStatus(accountMessage(error));
  }
}

function invitationStatusLabel(status) {
  return t('sharing.invitation.status', { status });
}

// The four themes' names, read by key. src/themes.js keeps their ids and colours, for the web and
// the phone alike; what a theme is called is a sentence like any other.
const THEME_NAME_KEYS = Object.freeze({
  light: 'common.theme.name.light',
  dark: 'common.theme.name.dark',
  green: 'common.theme.name.green',
  flexoki: 'common.theme.name.flexoki',
});

function themeName(id) {
  return THEME_NAME_KEYS[id] ? t(THEME_NAME_KEYS[id]) : t('common.theme.label');
}

function renderThemeOptions() {
  const themes = window.TOGETHER_THEMES || [];
  $$('[data-theme-picker]').forEach((select) => {
    select.replaceChildren(...themes.map((theme) => {
      const option = document.createElement('option');
      option.value = theme.id;
      option.textContent = themeName(theme.id);
      return option;
    }));
    select.value = document.documentElement.dataset.theme || 'light';
  });
}

function initializeThemePicker() {
  const selects = $$('[data-theme-picker]');
  renderThemeOptions();
  selects.forEach((select) => {
    select.addEventListener('change', () => {
      const id = window.applyTogetherTheme(select.value);
      localStorage.setItem('theme', id);
      selects.forEach((item) => { item.value = id; });
      showToast(t('common.theme.applied', { theme: themeName(id) }));
    });
  });
}

// The language menus: the Language row in Settings (101B) and the small one at the top of the
// welcome page (102A). Both are always there (owner, Oct 12, 2026, decision 160) and list "Follow
// my device", then every language in the manifest, each in its own name and script. An approved
// language may be chosen; one in preview carries the word Preview beside its name and is chosen by
// hand only (decision 145); a draft or a language in review says Coming soon and can't be chosen.
const LANGUAGE_LISTING_KEYS = Object.freeze({ preview: 'common.language.preview', comingSoon: 'common.language.comingSoon' });

function languageMenuOptions() {
  return [{ tag: '', nativeName: t('common.language.followDevice'), listing: 'approved' }, ...languageOptions()].map(({ tag, nativeName, listing }) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = LANGUAGE_LISTING_KEYS[listing] ? t(LANGUAGE_LISTING_KEYS[listing], { language: nativeName }) : nativeName;
    // Each name in its own language, so a screen reader says हिन्दी as Hindi, not as English.
    if (tag) option.lang = tag;
    if (listing === 'preview') option.dataset.preview = '';
    option.disabled = listing === 'comingSoon';
    return option;
  });
}

function renderLanguageRow() {
  for (const select of [$('#language-select'), $('#welcome-language-select')]) {
    select.replaceChildren(...languageMenuOptions());
    select.value = languageChoice() || '';
  }
}

// Switches the page to a choice (a tag, or null for "Follow my device") and redraws what app.js
// draws itself; index.html's own sentences are redrawn by chooseLanguage.
async function showLanguage(choice) {
  const before = activeLanguage();
  await chooseLanguage(choice);
  if (activeLanguage() !== before) {
    translatePage();
    renderThemeOptions();
    setSurface(document.body.dataset.surface || 'welcome');
    render();
    renderAccountState();
  }
  renderLanguageRow();
}

// Once someone is signed in, the account's choice is the one that counts. A choice made in this
// browser before signing in carries into an account that has none of its own, and never over one
// it has (unlessChosen: the server decides, so two devices can't both win). If the carry can't
// reach the service, this browser keeps its choice and tries again at the next sign-in.
async function settleLanguage() {
  if (!accountUser) return;
  const kept = languageChoice();
  if (!accountUser.language && kept) {
    try {
      accountUser = await api.setLanguage(kept, { unlessChosen: true });
    } catch {
      return;
    }
  }
  await showLanguage(accountUser.language);
}

function initializeLanguageRow() {
  renderLanguageRow();
  for (const select of [$('#language-select'), $('#welcome-language-select')]) {
    select.addEventListener('change', async (event) => {
      // A language coming soon can't be chosen: the menu never lets a person pick it, and if a
      // script sets it anyway, nothing changes and nothing is sent.
      if (event.currentTarget.selectedOptions[0]?.disabled) {
        renderLanguageRow();
        return;
      }
      const choice = event.currentTarget.value || null;
      try {
        // Signed in, the choice is saved to the account first, and the page follows what it kept.
        if (accountUser) accountUser = await api.setLanguage(choice);
        await showLanguage(accountUser ? accountUser.language : choice);
      } catch (error) {
        showStatus(accountMessage(error));
        renderLanguageRow();
      }
    });
  }
}

function initializeDialogBranding() {
  $$('dialog').forEach((dialog) => {
    const signature = document.createElement('div');
    signature.className = 'dialog-signature';
    signature.setAttribute('aria-hidden', 'true');
    signature.innerHTML = '<span class="mini-mark"><i></i><i></i></span><span>Together Ledger</span>';
    dialog.prepend(signature);
  });
}

function setSurface(surface) {
  const welcome = surface === 'welcome';
  document.body.dataset.surface = welcome ? 'welcome' : 'ledger';
  $$('[data-welcome-only]').forEach((element) => { element.hidden = !welcome; });
  $$('[data-ledger-only]').forEach((element) => { element.hidden = welcome; });
  const skipLink = $('.skip-link');
  skipLink.href = welcome ? '#welcome-title' : '#moments-title';
  skipLink.textContent = welcome ? t('header.skip.story') : t('header.skip.ledger');
  if (!welcome) $('#ledger-app').hidden = false;
}

function showWelcomeSurface() {
  setSurface('welcome');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function showLedgerSurface({ persist = false, focus = false } = {}) {
  if (persist && !state.preferences.onboardingComplete) {
    state.preferences.onboardingComplete = true;
    saveWorkingState();
  }
  setSurface('ledger');
  $$('.welcome-menu').forEach((menu) => { menu.open = false; });
  window.scrollTo({ top: 0, behavior: 'auto' });
  if (focus) $('#moments-title').focus?.({ preventScroll: true });
}

function beginLedger() {
  showLedgerSurface({ persist: true });
  window.requestAnimationFrame(() => {
    if (accountUser && !isCloudJourney()) openJourney();
    else {
      $('#moment-dialog').addEventListener('close', () => $('#moments-title').focus({ preventScroll: true }), { once: true });
      openMoment();
    }
  });
}

function render() {
  const trip = activeTrip(state);
  const moments = activeMoments(state);
  const isEmptyStart = trip.id === 'first-shared-space' && !moments.length && !state.entries.length && !state.concerns.length;
  const accountNeedsJourney = Boolean(accountUser && !isCloudJourney(trip));
  renderJourneyControls(trip);
  $('.trip-bar').hidden = isEmptyStart;
  $('#start-name').hidden = !isEmptyStart;
  $('#start-name').textContent = trip.name;
  // The ＋ is drawn beside the words rather than written in them: it is the same in every language.
  $$('[data-open-moment]').forEach((button) => { button.textContent = accountNeedsJourney ? t('home.journey.create') : isEmptyStart ? t('home.moment.begin') : `＋ ${t('home.moment.hold')}`; });
  $('#trip-name').textContent = trip.name;
  writeText($('#trip-period'), isEmptyStart ? t('home.trip.empty') : journeyPeriod(trip));
  $('#guidance').hidden = isEmptyStart || guidanceEndedToday();
  $('#threads').hidden = isEmptyStart;
  renderSharedJourney(trip, moments, isEmptyStart);
}

// A proposal is a question put to this person about another person, and until now it was only
// visible inside Journey settings — so somebody could be asked and never know. It is shown on the
// control that already leads there rather than announced: a count beside a label is seen whenever
// the ledger is, and it waits instead of interrupting. Nothing is added to the chrome, so there is
// no new thing to dismiss and nothing to grow louder the longer it is left.
function awaitingYourAnswer(trip) {
  return (trip?.inviteProposalRecords || []).filter((proposal) => proposal.viewerMayDecide).length;
}


// The journeys as one row that scrolls sideways (#404), the same as the phone's. Each is a radio,
// so a keyboard reaches the row with Tab and moves along it with the arrow keys, and a screen
// reader announces the chosen one. The row is only rebuilt when the journeys or their names
// change: the arrow keys switch journeys as they go, and a row rebuilt under them would drop focus.
let journeyRowNames = '';
// The journey last brought into view; null until the row has been seen with a width.
let journeyRowShown = null;

function renderJourneyRow(trip) {
  const row = $('#journey-row');
  $('#journey-picker').hidden = !showsJourneyRow(state.trips);
  const names = JSON.stringify(state.trips.map((item) => [item.id, item.name]));
  if (names !== journeyRowNames) {
    journeyRowNames = names;
    // A long name is cut short on screen with an ellipsis; the radio's name is still the whole of
    // it, and pointing at it shows it whole.
    row.innerHTML = state.trips.map((item) => `<label class="journey-choice" title="${escapeHtml(item.name)}"><input class="sr-only" type="radio" name="journey" value="${escapeHtml(item.id)}"><span class="journey-choice-mark" aria-hidden="true">●</span><span class="journey-choice-name">${escapeHtml(item.name)}</span></label>`).join('');
  }
  row.querySelectorAll('input[name="journey"]').forEach((input) => { input.checked = input.value === trip.id; });
  revealOpenJourney();
  markJourneyRowEdges();
}

// The open journey comes into view when the ledger opens and whenever it changes, never on any
// other render, so a row someone has scrolled stays where they left it.
function revealOpenJourney() {
  const row = $('#journey-row');
  const chosen = row.querySelector('input[name="journey"]:checked')?.closest('.journey-choice');
  if (!chosen || !row.clientWidth || journeyRowShown === chosen.firstElementChild.value) return;
  const style = getComputedStyle(row);
  const inset = Math.max(parseFloat(style.paddingLeft) || 0, parseFloat(style.getPropertyValue('--journey-row-fade')) || 0);
  const left = scrollToShow({ start: chosen.offsetLeft, end: chosen.offsetLeft + chosen.offsetWidth, scrolled: row.scrollLeft, visible: row.clientWidth, total: row.scrollWidth, inset });
  const smooth = journeyRowShown !== null && !prefersReducedMotion();
  if (left !== null) row.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
  journeyRowShown = chosen.firstElementChild.value;
}

// An end with journeys beyond it fades, so the row reads as one that goes on.
function markJourneyRowEdges() {
  const row = $('#journey-row');
  const edges = rowEdges({ scrolled: row.scrollLeft, visible: row.clientWidth, total: row.scrollWidth });
  row.toggleAttribute('data-more-before', edges.before);
  row.toggleAttribute('data-more-after', edges.after);
}

function renderJourneyControls(trip) {
  renderJourneyRow(trip);
  const actor = currentActor(trip);
  $('#actor-select').innerHTML = trip.members.map((member) => `<option>${escapeHtml(member)}</option>`).join('');
  $('#actor-select').value = actor;
  $('#event-manager-button').textContent = t('home.trip.eventHistory', { count: state.events.filter((event) => event.tripId === trip.id).length });
  $('#settings-button').textContent = t('home.settings.button', { count: awaitingYourAnswer(trip) });
  const accountWithoutJourney = Boolean(accountUser && !isCloudJourney(trip));
  $$('[data-open-moment]').forEach((button) => { button.disabled = false; });
  $('#edit-journey-button').disabled = accountWithoutJourney;
  $('#event-manager-button').disabled = accountWithoutJourney;
  renderAccountState();
}

// The kinds of moment, read by key. src/model.js keeps which kinds there are, for the web and the
// phone alike; what each is called is a sentence like any other.
const MOMENT_KIND_KEYS = Object.freeze({
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
  other: 'common.momentKind.other',
});

function momentKindName(kind) {
  return MOMENT_KIND_KEYS[kind] ? t(MOMENT_KIND_KEYS[kind]) : t('common.moment.kindFallback');
}

function momentLabel(kind, kindLabel = '') {
  if (kind === 'other') return kindLabel || t('common.moment.sharedNote');
  return momentKindName(kind);
}

// A moment's own theme, by name: one of the four themes, or each reader's own.
function momentThemeName(value) {
  const theme = normalizeMomentTheme(value);
  return theme ? themeName(theme) : t('common.moment.useMyTheme');
}

function momentThemeAttribute(value) {
  const theme = normalizeMomentTheme(value);
  return theme ? ` data-moment-theme="${theme}"` : '';
}

function localDayKey() {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

function guidanceEndedToday() {
  return localStorage.getItem('together-ledger-guidance-ended-on') === localDayKey();
}

function journeyPeriod(trip) {
  const pieces = [];
  if (trip.location) pieces.push(trip.location);
  pieces.push(trip.startDateStatus === 'unknown' ? t('common.journey.beganUnknown') : t('common.journey.began', { date: dateLabel(trip.startDate, undefined, format) }));
  pieces.push(trip.endDateStatus === 'forever' ? t('common.journey.noEnd') : trip.endDateStatus === 'unsure' ? t('common.journey.endUnsure') : t('common.journey.ends', { date: dateLabel(trip.endDate, undefined, format) }));
  return pieces.join(' · ');
}

// The check-in's questions, one key each, in the order they are asked.
const GUIDANCE_PROMPT_KEYS = Object.freeze([
  'home.guidance.nameWithCare',
  'home.guidance.appreciated',
  'home.guidance.lighterThread',
  'home.guidance.spaciousBoundary',
  'home.guidance.rememberSeason',
]);

function renderSharedJourney(trip, moments, isEmptyStart) {
  const threads = state.concerns.filter((concern) => concern.tripId === trip.id && concern.status === 'open');
  const recent = [...moments].sort((a, b) => `${b.occurredOn}-${b.updatedAt}`.localeCompare(`${a.occurredOn}-${a.updatedAt}`));

  const prompts = GUIDANCE_PROMPT_KEYS;
  guidanceIndex = Math.min(guidanceIndex, prompts.length - 1);
  $('#guidance-progress').textContent = t('home.guidance.progress', { current: guidanceIndex + 1, total: prompts.length });
  $('#guidance-prompt').textContent = t(prompts[guidanceIndex]);
  $('#guidance-prev').disabled = guidanceIndex === 0;
  $('#guidance-skip').hidden = guidanceIndex === prompts.length - 1;
  $('#guidance-done').hidden = guidanceIndex !== prompts.length - 1;
  $('#moments-eyebrow').textContent = isEmptyStart ? t('common.start.eyebrow') : t('common.ledger.eyebrow');
  $('#moments-title').textContent = isEmptyStart ? t('common.start.title') : t('home.moments.title');
  $('#moments-copy').textContent = isEmptyStart ? t('common.start.lead') : t('common.ledger.lead');
  $('#toggle-moments-button').hidden = !seeAllShown(recent.length, momentsExpanded);
  $('#toggle-moments-button').textContent = momentsExpanded ? t('home.moments.showRecent') : t('common.ledger.seeAll', { count: recent.length });
  // Every moment once "See all" is chosen, with no filter between them (#405).
  const visible = momentsExpanded ? recent : recent.slice(0, RECENT_MOMENTS_SHOWN);
  $('#moment-timeline').innerHTML = visible.length ? visible.map(momentCardMarkup.bind(null, trip)).join('') : isEmptyStart ? `<div class="log-types"><p>${escapeHtml(t('common.start.kinds'))}</p><div>${MOMENT_TYPES.filter(([value]) => value !== 'other').map(([value]) => `<span>${escapeHtml(momentKindName(value))}</span>`).join('')}<button type="button" data-open-custom-moment>＋ ${escapeHtml(t('home.moments.addYourOwn'))}</button></div></div>` : emptyState(escapeHtml(t('common.ledger.emptyTitle')), escapeHtml(t('common.ledger.emptyBody')));
  $$('[data-edit-moment]').forEach((button) => button.addEventListener('click', () => openMoment(button.dataset.editMoment)));
  $$('[data-open-moment-image]').forEach((button) => button.addEventListener('click', () => openMomentImage(button.dataset.openMomentImage)));
  $$('[data-share-moment]').forEach((button) => button.addEventListener('click', () => shareMoment(button.dataset.shareMoment)));
  $$('[data-open-custom-moment]').forEach((button) => button.addEventListener('click', () => {
    if (accountUser && !isCloudJourney(trip)) { openJourney(); return; }
    openMoment('', 'other');
  }));
  $('#open-threads').innerHTML = threads.length ? threads.map((thread) => `<article class="thread-row"><div><span class="status-chip open">${escapeHtml(t('home.threads.open'))}</span><strong>${escapeHtml(thread.title)}</strong>${thread.detail ? `<p>${escapeHtml(thread.detail)}</p>` : ''}</div><button data-edit-thread="${escapeHtml(thread.id)}">${escapeHtml(t('common.action.open'))}</button></article>`).join('') : emptyState(escapeHtml(t('common.threads.emptyTitle')), escapeHtml(t('common.threads.emptyBody')), { compact: true });
  $$('[data-edit-thread]').forEach((button) => button.addEventListener('click', () => openConcern(button.dataset.editThread)));
  hydrateMomentImagePreviews(trip);
}

// One moment, as it reads on the ledger.
function momentCardMarkup(trip, moment) {
  const attribution = `<span>${sentenceMarkup('common.moment.heldBy', { name: moment.createdBy || t('common.person.journeyMember') })}</span>${moment.shapedByBoth ? `<span class="moment-collaboration-badge">${escapeHtml(t('common.moment.shapedByMany'))}</span>` : ''}`;
  const shareAction = isCloudJourney(trip) && moment.visibility === 'share-later' ? `<button data-share-moment="${escapeHtml(moment.id)}">${escapeHtml(t('common.action.shareNow'))}</button>` : '';
  const photoName = (image) => image.filename || t('common.moment.image');
  const attachments = moment.images?.length ? `<div class="moment-attachments">${moment.images.map((image) => `<button type="button" class="moment-image-attachment" data-open-moment-image="${escapeHtml(image.id)}" aria-label="${escapeHtml(t('moment.photo.open', { name: photoName(image) }))}"><img data-moment-image-preview="${escapeHtml(image.id)}" alt="${escapeHtml(t('common.moment.photoOf', { title: moment.title }))}" /><span class="moment-image-attachment-copy"><span>${escapeHtml(t('common.moment.photo'))}</span><strong>${escapeHtml(photoName(image))}</strong><small>${escapeHtml(t('moment.photo.openLarger'))}</small></span></button>`).join('')}</div>` : '';
  const removed = moment.removedImages?.length ? `<details class="moment-removed-photos"><summary>${escapeHtml(t('common.moment.removedPhoto'))}</summary>${moment.removedImages.map((image) => `<button type="button" class="moment-image-attachment" data-open-moment-image="${escapeHtml(image.id)}" aria-label="${escapeHtml(t('moment.photo.openRemoved', { name: photoName(image) }))}"><span class="moment-image-attachment-copy"><span>${escapeHtml(t('common.moment.removedPhoto'))}</span><strong>${escapeHtml(photoName(image))}</strong><small>${escapeHtml(t('moment.photo.openLarger'))}</small></span></button>`).join('')}</details>` : '';
  const locations = Array.isArray(moment.locations) ? moment.locations : [];
  const locationContext = locations.length ? `<div class="location-context">${escapeHtml(locations.map((location) => location.label).join(' · '))}</div>` : '';
  const moneyContext = moment.moneyCents != null ? `<details class="money-context"><summary>${escapeHtml(t('common.moment.money'))}</summary><p>${sentenceMarkup('common.moment.moneyContext', { amount: money(moment.moneyCents, moment.moneyCurrency, format) })}</p></details>` : '';
  return `<article class="moment-card ${moment.visibility}"${momentThemeAttribute(moment.theme)}><div class="moment-meta"><span class="moment-kind">${escapeHtml(momentLabel(moment.kind, moment.kindLabel))}</span><span>${moment.occurredOn ? dateLabel(moment.occurredOn, undefined, format) : t('common.date.notSet')}</span><span class="visibility-chip ${moment.visibility}"><span class="visibility-glyph" aria-hidden="true">${visibilityCue(moment.visibility).glyph}</span>${escapeHtml(visibilityCue(moment.visibility).label)}</span></div><strong>${escapeHtml(moment.title)}</strong>${moment.detail ? `<p>${escapeHtml(moment.detail)}</p>` : ''}${locationContext}${attachments}${removed}${moneyContext}<div class="moment-actions"><small class="moment-author">${attribution}</small>${shareAction}<button data-edit-moment="${escapeHtml(moment.id)}">${escapeHtml(t('common.action.edit'))}</button></div></article>`;
}

async function imageUrlForMoment(trip, moment, image) {
  const key = `${trip.id}/${moment.id}/${image.id}`;
  if (momentImageUrls.has(key)) return momentImageUrls.get(key);
  const blob = await api.momentImageBlob(trip.id, moment.id, image.id);
  const url = URL.createObjectURL(blob);
  momentImageUrls.set(key, url);
  return url;
}

async function hydrateMomentImagePreviews(trip) {
  const previews = $$('[data-moment-image-preview]');
  await Promise.all(previews.map(async (preview) => {
    const imageId = preview.dataset.momentImagePreview;
    const moment = activeMoments(state).find((item) => item.images?.some((image) => image.id === imageId));
    const image = moment?.images.find((item) => item.id === imageId);
    if (!moment || !image) return;
    try {
      preview.src = await imageUrlForMoment(trip, moment, image);
    } catch {
      preview.closest('.moment-image-attachment')?.classList.add('image-unavailable');
      preview.alt = t('moment.photo.unavailable');
    }
  }));
}

async function openMomentImage(imageId) {
  const trip = activeTrip(state);
  const moment = activeMoments(state).find((item) => item.images?.some((image) => image.id === imageId));
  const image = moment?.images.find((item) => item.id === imageId);
  if (!trip || !moment || !image) return;
  $('#moment-image-viewer-name').textContent = image.filename || t('common.moment.image');
  const viewer = $('#moment-image-viewer-image');
  const error = $('#moment-image-viewer-error');
  viewer.hidden = true;
  error.hidden = true;
  viewer.alt = t('common.moment.photoOf', { title: moment.title });
  $('#moment-image-viewer').showModal();
  try {
    viewer.src = await imageUrlForMoment(trip, moment, image);
    viewer.hidden = false;
  } catch (loadError) {
    error.textContent = loadError.message;
    error.hidden = false;
  }
}

function updateMomentKindField(form) {
  const custom = form.elements.kind.value === 'other';
  $('#moment-kind-label-field').hidden = !custom;
  form.elements.kindLabel.required = custom;
  form.elements.kindLabel.disabled = !custom;
}

function syncMomentThemePreview(form) {
  const theme = normalizeMomentTheme(form.elements.theme?.value);
  const preview = $('#moment-theme-preview');
  if (theme) preview.dataset.momentTheme = theme;
  else delete preview.dataset.momentTheme;
  $('#moment-theme-preview-name').textContent = momentThemeName(theme);
}

function renderMomentThemeChooser(form, selectedTheme = '') {
  const selected = normalizeMomentTheme(selectedTheme);
  const choices = [{ id: '' }, ...MOMENT_THEMES];
  $('#moment-theme-options').innerHTML = choices.map(({ id }) => `<label><input type="radio" name="theme" value="${id}"${id === selected ? ' checked' : ''} /><span class="moment-theme-swatch${id ? '' : ' inherited'}"${momentThemeAttribute(id)} aria-hidden="true"></span><span>${escapeHtml(momentThemeName(id))}</span></label>`).join('');
  $$('input[name="theme"]', form).forEach((input) => input.addEventListener('change', () => syncMomentThemePreview(form)));
  syncMomentThemePreview(form);
}

function renderMomentLocations() {
  const list = $('#moment-locations');
  list.innerHTML = momentLocations.map((location, index) => `<li><strong>${escapeHtml(location.label)}</strong><small>${escapeHtml(index === 0 ? t('moment.form.placeIncluded') : t('moment.form.placePrice'))}</small><button type="button" data-remove-location="${index}" aria-label="${escapeHtml(t('common.moment.removePlace', { place: location.label }))}">${escapeHtml(t('common.action.remove'))}</button></li>`).join('');
  $$('[data-remove-location]', list).forEach((button) => button.addEventListener('click', () => {
    momentLocations.splice(Number(button.dataset.removeLocation), 1);
    renderMomentLocations();
  }));
}

function addMomentLocation(location) {
  if (!location.label?.trim()) return;
  if (momentLocations.length >= 12) { showToast(t('common.moment.tooManyPlaces')); return; }
  momentLocations.push({ ...location, label: location.label.trim() });
  renderMomentLocations();
}

// The photo picked in the moment dialog, its location and camera details already removed (#258).
// The line beneath the picker says so only once that has happened, so it is never a promise.
let preparedMomentPhoto = null;

function forgetMomentPhoto() {
  preparedMomentPhoto = null;
  clearStatus('photo');
  const note = $('#moment-image-privacy');
  note.hidden = true;
  note.textContent = '';
}

async function prepareMomentPhoto(input) {
  forgetMomentPhoto();
  const file = input.files?.[0];
  if (!file) return;
  try {
    const { bytes, contentType } = stripPhotoMetadata(new Uint8Array(await file.arrayBuffer()));
    if (input.files?.[0] !== file) return; // another photo was picked meanwhile
    preparedMomentPhoto = { source: file, photo: new File([bytes], file.name, { type: contentType }) };
    const note = $('#moment-image-privacy');
    note.textContent = t('moment.form.photoMetadataRemoved');
    note.hidden = false;
  } catch (error) {
    if (input.files?.[0] !== file) return; // a newer pick is not this one's to clear
    input.value = '';
    showStatus(error.message, { source: 'photo' });
  }
}

function openMoment(id = '', initialKind = '') {
  const form = $('#moment-form');
  const trip = activeTrip(state);
  const moment = state.moments.find((item) => item.id === id && item.tripId === trip?.id);
  const hosted = isCloudJourney();
  form.reset();
  forgetMomentPhoto();
  // A new moment must never inherit an ID from a dialog that previously edited one.
  form.elements.id.value = '';
  form.elements.kind.innerHTML = MOMENT_TYPES.map(([value]) => `<option value="${value}">${escapeHtml(momentKindName(value))}</option>`).join('');
  form.elements.occurredOn.value = localDay();
  form.elements.visibility.value = 'shared-now';
  renderMomentThemeChooser(form, moment?.theme);
  momentLocations = [];
  $('#moment-dialog-title').textContent = moment ? t('common.moment.editTitle') : t('common.screen.moment.title');
  $('#save-moment').textContent = moment ? t('common.moment.save') : t('common.moment.hold');
  $('#moment-dialog-copy').textContent = hosted ? t('common.moment.lead') : t('moment.form.localCopy');
  $('#moment-visibility-help').textContent = hosted
    ? moment?.visibility === 'shared-now'
      ? t('common.moment.visibilityLocked')
      : t('common.moment.visibilityHelp')
    : t('moment.form.visibilityLocal');
  $('#moment-visibility-field').hidden = false;
  $('#moment-image-field').hidden = !hosted;
  $$('input[name="visibility"]', form).forEach((input) => { input.disabled = Boolean(hosted && moment?.visibility === 'shared-now' && input.value !== 'shared-now'); });
  $('#moment-location-label').closest('.location-field').hidden = false;
  if (moment) {
    form.elements.id.value = moment.id; form.elements.kind.value = moment.kind; form.elements.kindLabel.value = moment.kindLabel || ''; form.elements.title.value = moment.title; form.elements.detail.value = moment.detail; form.elements.occurredOn.value = moment.occurredOn; form.elements.visibility.value = moment.visibility; form.elements.money.value = moment.moneyCents == null ? '' : (moment.moneyCents / 100).toFixed(2); form.elements.moneyCurrency.value = moment.moneyCurrency || ''; momentLocations = Array.isArray(moment.locations) ? structuredClone(moment.locations) : [];
  } else if (initialKind) {
    form.elements.kind.value = initialKind;
  }
  const hasIncludedImage = Boolean(moment?.images?.length);
  const includedImage = moment?.images?.[0];
  form.elements.image.disabled = hasIncludedImage;
  $('#moment-image-help').textContent = hasIncludedImage ? t('moment.form.photoHeld') : t('moment.form.photoHelp');
  $('#remove-moment-image-button').hidden = !hosted || !includedImage;
  $('#remove-moment-image-button').dataset.momentId = moment?.id || '';
  $('#remove-moment-image-button').dataset.imageId = includedImage?.id || '';
  $('#buy-image-slot-button').hidden = !hosted || !moment || !hasIncludedImage;
  $('#buy-image-slot-button').dataset.momentId = moment?.id || '';
  $('#buy-location-slot-button').hidden = !hosted || !moment || momentLocations.length === 0;
  $('#buy-location-slot-button').dataset.momentId = moment?.id || '';
  delete form.dataset.paidSlotId;
  if (hosted && moment && hasIncludedImage) {
    api.imageSlots(activeTrip(state).id, moment.id).then(({ slots }) => {
      const slot = slots.find((item) => ['active', 'grace'].includes(item.state));
      if (!slot || !$('#moment-dialog').open) return;
      form.elements.image.disabled = false;
      form.dataset.paidSlotId = slot.id;
      $('#moment-image-help').textContent = t('moment.form.photoReady');
    }).catch(() => {});
  }
  form.elements.kind.onchange = () => updateMomentKindField(form);
  updateMomentKindField(form);
  renderMomentLocations();
  $('#moment-dialog').showModal(); form.elements.title.focus({ preventScroll: true });
}

async function shareMoment(id) {
  const moment = state.moments.find((item) => item.id === id);
  const trip = activeTrip(state);
  if (!moment || !isCloudJourney(trip) || moment.visibility !== 'share-later') return;
  if (!await confirmConsequence({ title: t('common.moment.shareTitle'), consequence: t('common.moment.shareConsequence'), confirmLabel: t('common.moment.shareAction') })) return;
  try {
    const payload = { kind: moment.kind, kindLabel: moment.kindLabel || '', title: moment.title, detail: moment.detail, occurredOn: moment.occurredOn, visibility: 'shared-now', theme: normalizeMomentTheme(moment.theme), moneyCents: moment.moneyCents, moneyCurrency: moment.moneyCurrency || '', locations: moment.locations || [], version: moment.version };
    await api.mutate(`/journeys/${trip.id}/moments/${moment.id}`, 'PATCH', payload);
    await refreshCloudState();
    showToast(t('common.moment.sharedWithJourneyer'));
  } catch (error) {
    showStatus(accountMessage(error));
  }
}

function currentActor(trip = activeTrip(state)) {
  if (isCloudJourney(trip)) return accountUser.displayName;
  const selected = state.preferences.activeActorByTrip[trip.id];
  return trip.members.includes(selected) ? selected : trip.members[0];
}

function eventRecord(input) {
  appendJourneyEvent(state, { ...input, actorName: input.actorName || currentActor(), tripId: input.tripId || activeTrip(state).id });
}

function renderSummary(summary, count) {
  const cards = [
    ['Total trip cost', money(summary.totalCents, undefined, format), `${count} ${count === 1 ? 'expense' : 'expenses'}`, ''],
    ['Budget left', money(summary.budgetLeftCents, undefined, format), `${money(summary.budgetCents, undefined, format)} planned`, summary.budgetLeftCents < 0 ? 'alert' : ''],
    ['Still due', money(summary.dueCents, undefined, format), summary.dueCents ? 'Worth agreeing on next' : 'Nothing waiting', summary.dueCents ? 'alert' : ''],
    ['Shared clarity', count ? 'Up to date' : 'Start here', count ? 'A common picture for the next talk' : 'Add the first cost together', ''],
  ];
  $('#summary-grid').innerHTML = cards.map(([label, value, note, className]) => `<article class="card summary ${className}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
}

function renderCategoryChart(summary) {
  const rows = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  $('#category-chart').innerHTML = rows.length ? rows.map(([category, total]) => `<div class="bar-row"><div class="bar-copy"><span>${escapeHtml(category)}</span><strong>${money(total, undefined, format)}</strong></div><div class="bar-track"><i style="width:${Math.max(1, total / max * 100)}%"></i></div></div>`).join('') : '<p class="empty">Add an expense to see the category mix.</p>';
}

function renderPayerChart(summary, members) {
  const totals = members.map((member) => [member, summary.byPayer[member] || 0]);
  const combined = totals.reduce((total, [, amount]) => total + amount, 0) || 1;
  $('#payer-chart').innerHTML = `<div class="payer-track" role="img" aria-label="${totals.map(([name, amount]) => `${name} ${money(amount, undefined, format)}`).join(', ')}">${totals.map(([, amount]) => `<i style="width:${amount / combined * 100}%"></i>`).join('')}</div><div class="payer-key">${totals.map(([name, amount]) => `<div><span>${escapeHtml(name)}</span><strong>${money(amount, undefined, format)}</strong></div>`).join('')}</div>`;
}

function renderFilters() {
  const filters = ['All', 'Bookings', 'Meals', 'Transportation', 'Due'];
  $('#filters').innerHTML = filters.map((name) => `<button class="${filter === name ? 'active' : ''}" data-filter="${name}" aria-pressed="${filter === name}">${name}</button>`).join('');
  $$('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.filter;
    renderFilters();
    renderLedger(activeEntries(state));
  }));
}

function filteredEntries(entries) {
  if (filter === 'Bookings') return entries.filter((entry) => ['Flights', 'Hotel'].includes(entry.category));
  if (filter === 'Meals') return entries.filter((entry) => entry.category === 'Restaurants');
  if (filter === 'Transportation') return entries.filter((entry) => entry.category === 'Transportation');
  if (filter === 'Due') return entries.filter((entry) => entry.status === 'due');
  return entries;
}

function renderLedger(entries) {
  const list = filteredEntries(entries).sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
  if (!list.length) {
    $('#ledger').innerHTML = `<div class="empty"><strong>${entries.length ? 'Nothing in this view.' : 'Start with one shared fact.'}</strong><p>${entries.length ? 'Choose another filter.' : 'Add a flight, hotel, meal, ride, activity, or any other trip cost.'}</p></div>`;
    return;
  }
  $('#ledger').innerHTML = list.map((entry) => `<article class="entry">
    <span class="entry-icon" aria-hidden="true">${CATEGORY_ICONS[entry.category] || '·'}</span>
    <div class="entry-main"><strong>${escapeHtml(entry.merchant)}</strong><div class="entry-meta"><span>${escapeHtml(entry.category)}</span><span>${entry.occurredOn ? dateLabel(entry.occurredOn, undefined, format) : t('common.date.notSet')}</span><span>Paid by ${escapeHtml(entry.paidBy)}</span>${entry.account ? `<span>From ${escapeHtml(entry.account)}</span>` : ''}${entry.reference ? `<span>Ref ${escapeHtml(entry.reference)}</span>` : ''}</div></div>
    <div class="entry-amount"><strong>${money(entry.amountCents, undefined, format)}</strong><small>${entry.status === 'due' ? 'Still due' : 'Paid'}</small></div>
    <div class="entry-actions"><button data-edit="${escapeHtml(entry.id)}">Edit</button><button data-remove="${escapeHtml(entry.id)}">Remove</button></div>
  </article>`).join('');
  $$('[data-edit]').forEach((button) => button.addEventListener('click', () => openExpense(button.dataset.edit)));
  $$('[data-remove]').forEach((button) => button.addEventListener('click', () => confirmRemove(button.dataset.remove)));
}

function renderTimeline(trip, entries, summary) {
  const days = dateRange(trip.startDate, trip.endDate, entries);
  const peak = Math.max(...days.map((date) => summary.byDay[date] || 0), 1);
  $('#timeline-chart').innerHTML = days.map((date) => {
    const total = summary.byDay[date] || 0;
    const height = total ? Math.max(3, total / peak * 100) : 1;
    return `<button class="day-button${selectedDay === date ? ' selected' : ''}" data-day="${date}" aria-pressed="${selectedDay === date}" aria-label="${dateLabel(date, { weekday: 'long', month: 'long', day: 'numeric' }, format)}: ${money(total, undefined, format)}. Show details."><span class="day-bar-space"><i class="day-bar" style="height:${height}%">${total ? `<em>${money(total, undefined, format)}</em>` : ''}</i></span><span class="day-label">${dateLabel(date, undefined, format)}<br>${dateLabel(date, { weekday: 'short' }, format)}</span></button>`;
  }).join('');
  $$('[data-day]').forEach((button) => button.addEventListener('click', () => {
    selectedDay = button.dataset.day;
    selectedCategory = null;
    renderTimeline(trip, entries, summary);
    $('#timeline-detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
  renderTimelineDetail(entries);
}

function renderTimelineDetail(entries) {
  const detail = $('#timeline-detail');
  if (!selectedDay) {
    detail.hidden = true;
    detail.innerHTML = '';
    return;
  }
  detail.hidden = false;
  const groups = groupDayByCategory(entries, selectedDay);
  const dayEntries = Object.values(groups).flat();
  const dayTotal = dayEntries.reduce((total, entry) => total + entry.amountCents, 0);
  const head = `<div class="detail-head"><div><h3>${dateLabel(selectedDay, { weekday: 'long', month: 'long', day: 'numeric' }, format)}</h3><p>${money(dayTotal, undefined, format)} across ${dayEntries.length} ${dayEntries.length === 1 ? 'entry' : 'entries'}</p></div><button class="icon-button" data-close-day aria-label="Close day details">×</button></div>`;
  if (!dayEntries.length) {
    detail.innerHTML = `${head}<p class="empty">No spending is recorded for this day.</p>`;
  } else if (!selectedCategory) {
    const categories = Object.entries(groups).map(([category, items]) => [category, items.reduce((total, entry) => total + entry.amountCents, 0), items.length]).sort((a, b) => b[1] - a[1]);
    detail.innerHTML = head + categories.map(([category, total, count]) => `<button class="category-button" data-detail-category="${escapeHtml(category)}"><span><strong>${escapeHtml(category)}</strong><small>${count} ${count === 1 ? 'entry' : 'entries'}</small></span><strong>${money(total, undefined, format)} →</strong></button>`).join('');
  } else {
    const categoryEntries = groups[selectedCategory] || [];
    detail.innerHTML = `${head}<button class="back-button" data-back-day>← All spending for this day</button>${categoryEntries.map((entry) => `<div class="detail-entry"><span><strong>${escapeHtml(entry.merchant)}</strong><small>${escapeHtml(entry.paidBy)} · ${entry.status === 'due' ? 'Still due' : 'Paid'}</small></span><strong>${money(entry.amountCents, undefined, format)}</strong></div>`).join('')}`;
  }
  $('[data-close-day]')?.addEventListener('click', () => {
    selectedDay = null;
    selectedCategory = null;
    render();
  });
  $$('[data-detail-category]').forEach((button) => button.addEventListener('click', () => {
    selectedCategory = button.dataset.detailCategory;
    renderTimelineDetail(entries);
  }));
  $('[data-back-day]')?.addEventListener('click', () => {
    selectedCategory = null;
    renderTimelineDetail(entries);
  });
}

function openExpense(id = '') {
  const dialog = $('#expense-dialog');
  const form = $('#expense-form');
  const trip = activeTrip(state);
  form.reset();
  form.elements.category.innerHTML = CATEGORIES.map((category) => `<option>${category}</option>`).join('');
  form.elements.paidBy.innerHTML = trip.members.map((member) => `<option>${escapeHtml(member)}</option>`).join('');
  form.elements.occurredOn.value = localDay();
  form.elements.category.value = 'Restaurants';
  $('#expense-title').textContent = 'Add an expense';
  $('#save-expense').textContent = 'Save expense';
  const entry = state.entries.find((item) => item.id === id);
  if (entry) {
    form.elements.id.value = entry.id;
    form.elements.merchant.value = entry.merchant;
    form.elements.category.value = entry.category;
    form.elements.amount.value = (entry.amountCents / 100).toFixed(2);
    form.elements.occurredOn.value = entry.occurredOn;
    form.elements.paidBy.value = entry.paidBy;
    form.elements.account.value = entry.account;
    form.elements.status.value = entry.status;
    form.elements.reference.value = entry.reference;
    form.elements.notes.value = entry.notes;
    $('#expense-title').textContent = 'Edit expense';
    $('#save-expense').textContent = 'Save changes';
  }
  dialog.showModal();
  form.elements.merchant.focus({ preventScroll: true });
}

function openJourney(trip = null) {
  const form = $('#journey-form');
  form.reset();
  const today = localDay();
  form.elements.startDate.value = today;
  form.elements.endDate.value = today;
  form.elements.startDateStatus.value = 'exact';
  form.elements.endDateStatus.value = 'forever';
  $('#journey-dialog-title').textContent = trip ? t('journey.form.editTitle') : t('journey.form.title');
  $('#journey-dialog-eyebrow').textContent = accountUser ? t('journey.form.privateEyebrow') : t('journey.form.localEyebrow');
  $('#journey-dialog-copy').textContent = accountUser ? t('journey.form.privateCopy') : t('journey.form.localCopy');
  $('#save-journey-button').textContent = trip ? t('journey.form.saveChanges') : t('journey.form.create');
  $$('.member-field').forEach((field) => {
    field.hidden = Boolean(accountUser);
    const input = field.querySelector('input');
    input.disabled = Boolean(accountUser);
    input.required = !accountUser;
  });
  if (trip) {
    form.elements.id.value = trip.id;
    form.elements.name.value = trip.name;
    form.elements.location.value = trip.location;
    form.elements.startDateStatus.value = trip.startDateStatus || 'exact';
    form.elements.endDateStatus.value = trip.endDateStatus || 'forever';
    form.elements.startDate.value = trip.startDate || today;
    form.elements.endDate.value = trip.endDate || today;
    form.elements.budget.value = (trip.budgetCents / 100).toFixed(2);
    form.elements.memberOne.value = trip.members[0];
    form.elements.memberTwo.value = trip.members[1];
  }
  syncJourneyDateFields(form);
  $('#journey-dialog').showModal();
  form.elements.name.focus({ preventScroll: true });
}

function syncJourneyDateFields(form = $('#journey-form')) {
  const hasExactStart = form.elements.startDateStatus.value === 'exact';
  const hasExactEnd = form.elements.endDateStatus.value === 'date';
  $('#start-date-field').hidden = !hasExactStart;
  $('#end-date-field').hidden = !hasExactEnd;
  form.elements.startDate.disabled = !hasExactStart;
  form.elements.endDate.disabled = !hasExactEnd;
  form.elements.startDate.required = hasExactStart;
  form.elements.endDate.required = hasExactEnd;
}

function meaningfulChanges(before, after) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])).map((key) => ({ key, before: before?.[key], after: after?.[key] }));
}

function valueLabel(key, value) {
  if (value == null || value === '') return 'none';
  if (key === 'budgetCents' || key === 'amountCents') return money(value, undefined, format);
  if (key === 'theme') return momentThemeLabel(value);
  // A list of places is a list of values: each is written out, rather than read as [object Object].
  if (Array.isArray(value)) return value.map((item) => (item && typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function renderEventManager() {
  const trip = activeTrip(state);
  const concerns = state.concerns.filter((concern) => concern.tripId === trip.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const events = state.events.filter((event) => event.tripId === trip.id).sort((a, b) => b.sequence - a.sequence);
  $('#event-dialog-title').textContent = `${trip.name} history`;
  $('#event-manager-copy').textContent = isCloudJourney(trip) ? 'Server-authoritative, account-attributed history. HMAC chaining makes database changes detectable; deleted records retain privacy-bounded tombstones.' : 'Browser-local preview. Production attribution requires separate signed-in accounts.';
  // The guide explains what the server writes, so a browser-only journey, whose history this
  // browser keeps for itself, isn't sent to it.
  $('#history-guide-link').hidden = !isCloudJourney(trip);
  $('#history-guide').hidden = !isCloudJourney(trip);
  renderHistoryGuide();
  $('#concern-list').innerHTML = concerns.length ? concerns.map((concern) => `<article class="concern-row"><div><span class="status-chip ${concern.status}">${concern.status}</span><strong>${escapeHtml(concern.title)}</strong>${concern.detail ? `<p>${escapeHtml(concern.detail)}</p>` : ''}<small>Updated by ${escapeHtml(concern.updatedBy)} · ${new Date(concern.updatedAt).toLocaleString()}</small></div><div><button type="button" data-edit-concern="${escapeHtml(concern.id)}">Edit</button><button type="button" data-remove-concern="${escapeHtml(concern.id)}">Delete</button></div></article>`).join('') : emptyState('Nothing to return to yet', 'Conversations you want to come back to together will appear here.', { compact: true });
  $('#event-list').innerHTML = events.length ? events.map((event) => {
    const changes = meaningfulChanges(event.before, event.after);
    return `<details class="event-row"><summary><span><strong>#${event.sequence} · ${escapeHtml(event.summary)}</strong><small>${escapeHtml(event.actorName)} · ${new Date(event.occurredAt).toLocaleString()}</small></span><span aria-hidden="true">＋</span></summary>${changes.length ? `<dl>${changes.map(({ key, before, after }) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(valueLabel(key, before))} → ${escapeHtml(valueLabel(key, after))}</dd></div>`).join('')}</dl>` : '<p>No field-level value change was stored for this event.</p>'}<small>Event ID ${escapeHtml(event.id)} · Previous ${escapeHtml(event.previousEventId || 'none')} · ${escapeHtml(event.source)}${event.eventHash ? ` · Hash ${escapeHtml(event.eventHash.slice(0, 12))}…` : ''}</small></details>`;
  }).join('') : emptyState('No recorded changes yet', 'Changes appear here as they happen. Activity from before the Event Manager began cannot be reconstructed.', { compact: true });
  $$('[data-edit-concern]').forEach((button) => button.addEventListener('click', () => openConcern(button.dataset.editConcern)));
  $$('[data-remove-concern]').forEach((button) => button.addEventListener('click', () => removeConcern(button.dataset.removeConcern)));
}

// "How to read your history" (#349), in the phone's words too: both draw src/history-guide.js.
// The words never change while the page is open, so they are drawn once.
function renderHistoryGuide() {
  const section = $('#history-guide');
  if (section.childElementCount) return;
  const paragraphs = (texts) => texts.map((text) => `<p>${escapeHtml(text)}</p>`).join('');
  const terms = (entries) => `<dl class="history-guide-terms">${Object.entries(entries).map(([name, meaning]) => `<div><dt><code>${escapeHtml(name)}</code></dt><dd>${escapeHtml(meaning)}</dd></div>`).join('')}</dl>`;
  const kinds = HISTORY_EVENT_GROUPS.map((group) => `<h5>${escapeHtml(group.heading)}</h5>${group.kinds.map((kind) => `<article class="history-guide-kind"><strong>${escapeHtml(kind.reads.join(' / '))}</strong><code>${escapeHtml(kind.action)}</code><p>${escapeHtml(kind.when)}</p><p><b>${escapeHtml(HISTORY_RECORDS_LABEL)}:</b> ${escapeHtml(kind.records.length ? kind.records.join(', ') : HISTORY_RECORDS_NOTHING)}</p><p><b>${escapeHtml(HISTORY_NEVER_LABEL)}:</b> ${escapeHtml(kind.never)}</p></article>`).join('')}`).join('');
  section.innerHTML = `<h3 id="history-guide-title">${escapeHtml(HISTORY_GUIDE_TITLE)}</h3>${paragraphs(HISTORY_GUIDE_INTRO)}`
    + HISTORY_GUIDE_SECTIONS.map((part) => `<h4>${escapeHtml(part.heading)}</h4>${paragraphs(part.paragraphs)}`).join('')
    + `<h4>${escapeHtml(HISTORY_KINDS_HEADING)}</h4>${kinds}`
    + `<h4>${escapeHtml(HISTORY_FIELDS_HEADING)}</h4>${terms(HISTORY_FIELDS)}`
    + `<h4>${escapeHtml(HISTORY_ENTRY_PARTS_HEADING)}</h4>${terms(HISTORY_ENTRY_PARTS)}`;
}

function openConcern(id = '') {
  const form = $('#concern-form');
  const concern = state.concerns.find((item) => item.id === id);
  form.reset();
  $('#concern-dialog-title').textContent = concern ? t('concern.form.editTitle') : t('concern.form.title');
  $('#save-concern-button').textContent = concern ? t('concern.form.saveChanges') : t('concern.form.keepOpen');
  $$('select[name="status"] option', form).forEach((option) => { option.textContent = t('history.concern.status', { status: option.value }); });
  if (concern) {
    form.elements.id.value = concern.id;
    form.elements.title.value = concern.title;
    form.elements.detail.value = concern.detail;
    form.elements.status.value = concern.status;
  }
  $('#concern-dialog').showModal();
  form.elements.title.focus({ preventScroll: true });
}

async function removeConcern(id) {
  const concern = state.concerns.find((item) => item.id === id);
  if (!concern) return;
  if (!await confirmConsequence({ title: 'Delete this conversation to return to?', consequence: `“${concern.title}” will be removed. The event history keeps a deletion tombstone, so the change stays attributable.`, confirmLabel: 'Delete conversation', destructive: true })) return;
  if (isCloudJourney()) {
    try {
      await api.mutate(`/journeys/${activeTrip(state).id}/concerns/${id}`, 'DELETE', { version: concern.version });
      await refreshCloudState();
      renderEventManager();
      showToast('Concern deleted; the event tombstone remains.');
    } catch (error) {
      showStatus(accountMessage(error));
    }
    return;
  }
  state.concerns = state.concerns.filter((item) => item.id !== id);
  eventRecord({ action: 'concern_deleted', entityType: 'concern', entityId: concern.id, summary: `Deleted concern: ${concern.title}`, before: concern, after: null });
  saveWorkingState();
  render();
  renderEventManager();
  showToast('Concern deleted; tombstone retained in event history.');
}

function confirmRemove(id) {
  removeId = id;
  removeSnapshot = structuredClone(state.entries.find((entry) => entry.id === id));
  $('#confirm-dialog').returnValue = '';
  $('#confirm-dialog').showModal();
}

function persistAndRender(message) {
  saveWorkingState();
  render();
  showToast(message);
}

function showToast(message) {
  const toast = $('#toast');
  writeText(toast, message);
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2600);
}

function setButtonPending(button, pending, pendingLabel = t('common.action.working')) {
  if (!button) return;
  if (pending) {
    button.dataset.idleLabel = button.textContent;
    button.textContent = pendingLabel;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.idleLabel || button.textContent;
    delete button.dataset.idleLabel;
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

$$('[data-open-expense]').forEach((button) => button.addEventListener('click', () => openExpense()));
$$('[data-open-moment]').forEach((button) => button.addEventListener('click', () => {
  if (accountUser && !isCloudJourney()) { openJourney(); return; }
  openMoment();
}));
// A name's box counts its limit in the characters a person sees (src/display-text.js), not in the
// UTF-16 units a browser's maxlength counts, which could take half of an emoji (owner, Oct 10,
// 2026). An edit that would go past the limit keeps as much of what was typed or pasted as fits,
// and what was there already stays. While an input method is still composing, nothing is touched
// until the word is done.
const textBeforeEdit = new WeakMap();
const limitedBox = (target) => ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && target.dataset.characterLimit ? target : null);
function holdCharacterLimit(box) {
  const { value, caret } = fitTyping(textBeforeEdit.get(box) ?? '', box.value, Number(box.dataset.characterLimit));
  if (value !== box.value) {
    box.value = value;
    box.setSelectionRange(caret, caret);
  }
  textBeforeEdit.set(box, box.value);
}
document.addEventListener('beforeinput', (event) => {
  const box = limitedBox(event.target);
  if (box && !event.isComposing) textBeforeEdit.set(box, box.value);
}, true);
document.addEventListener('compositionstart', (event) => {
  const box = limitedBox(event.target);
  if (box) textBeforeEdit.set(box, box.value);
}, true);
document.addEventListener('compositionend', (event) => {
  const box = limitedBox(event.target);
  if (box) holdCharacterLimit(box);
}, true);
document.addEventListener('input', (event) => {
  const box = limitedBox(event.target);
  if (box && !event.isComposing) holdCharacterLimit(box);
}, true);
$('#add-manual-location').addEventListener('click', () => {
  const input = $('#manual-location');
  if (!input.value.trim()) { input.focus(); return; }
  addMomentLocation({ label: input.value });
  input.value = '';
  input.focus();
});
$('#manual-location').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); $('#add-manual-location').click(); }
});
$('#use-device-location').addEventListener('click', () => {
  if (!navigator.geolocation) { showToast(t('moment.form.noGeolocation')); return; }
  const button = $('#use-device-location');
  button.disabled = true;
  button.textContent = t('moment.form.findingLocation');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      // Kept with the moment as it is written, so the coordinates go in as plain text, unmarked.
      const label = t.parts('moment.form.deviceLocation', { latitude: latitude.toFixed(4), longitude: longitude.toFixed(4) }, (text) => text).join('');
      addMomentLocation({ label, latitude, longitude, accuracyMeters: accuracy });
      button.disabled = false;
      button.textContent = t('moment.form.useLocation');
    },
    () => {
      button.disabled = false;
      button.textContent = t('moment.form.useLocation');
      showToast(t('moment.form.locationRefused'));
    },
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
  );
});
$$('[data-close-moment]').forEach((button) => button.addEventListener('click', () => $('#moment-dialog').close()));
$$('[data-close-image-viewer]').forEach((button) => button.addEventListener('click', () => $('#moment-image-viewer').close()));
$$('[data-close-journey]').forEach((button) => button.addEventListener('click', () => $('#journey-dialog').close()));

$('#journey-row').addEventListener('change', (event) => {
  if (event.target.name !== 'journey') return;
  state.activeTripId = event.target.value;
  filter = 'All';
  selectedDay = null;
  selectedCategory = null;
  guidanceIndex = 0;
  persistAndRender(t('home.journeyRow.switched'));
  refreshBillingState().catch((error) => showStatus(accountMessage(error)));
});

$('#journey-row').addEventListener('scroll', markJourneyRowEdges, { passive: true });
// Seen with a width for the first time (the ledger opening) or resized: bring the open journey
// into view if it has not been yet, and mark which ends go on.
new ResizeObserver(() => { revealOpenJourney(); markJourneyRowEdges(); }).observe($('#journey-row'));
$('#new-journey-button').addEventListener('click', () => openJourney());
$('#edit-journey-button').addEventListener('click', () => openJourney(activeTrip(state)));
$('#journey-form').elements.startDateStatus.addEventListener('change', () => syncJourneyDateFields());
$('#journey-form').elements.endDateStatus.addEventListener('change', () => syncJourneyDateFields());
$('#actor-select').addEventListener('change', (event) => {
  state.preferences.activeActorByTrip[activeTrip(state).id] = event.target.value;
  saveWorkingState();
  showToast(t('home.actor.changed', { name: event.target.value }));
});
$('#event-manager-button').addEventListener('click', () => {
  renderEventManager();
  $('#event-dialog').showModal();
});
$('#history-guide-link').addEventListener('click', () => {
  const guide = $('#history-guide');
  guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
  guide.focus({ preventScroll: true });
});
$('#add-thread-button').addEventListener('click', () => openConcern());
$('#journey-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const input = Object.fromEntries(new FormData(event.currentTarget));
    if (accountUser) {
      const existing = state.trips.find((trip) => trip.id === input.id && cloudJourneyIds.has(trip.id));
      const payload = {
        name: input.name,
        location: input.location,
        startDateStatus: input.startDateStatus,
        endDateStatus: input.endDateStatus,
        startDate: input.startDateStatus === 'exact' ? input.startDate : null,
        endDate: input.endDateStatus === 'date' ? input.endDate : null,
        budgetCents: Math.round(Number(input.budget) * 100),
        ...(existing ? { version: existing.version } : {}),
      };
      const result = existing
        ? await api.mutate(`/journeys/${existing.id}`, 'PATCH', payload)
        : await api.mutate('/journeys', 'POST', payload);
      state.activeTripId = result.journey.id;
      $('#journey-dialog').close();
      await refreshCloudState();
      showToast(existing ? t('journey.form.synced') : t('journey.form.createdPrivate'));
      return;
    }
    const existingIndex = state.trips.findIndex((trip) => trip.id === input.id);
    const before = existingIndex >= 0 ? structuredClone(state.trips[existingIndex]) : null;
    const actorName = existingIndex >= 0 ? currentActor(state.trips[existingIndex]) : input.memberOne;
    const normalized = normalizeTrip(input);
    const trip = existingIndex >= 0 ? { ...normalized, milestones: before.milestones, archivedAt: before.archivedAt } : normalized;
    if (existingIndex >= 0) state.trips[existingIndex] = trip;
    else state.trips.push(trip);
    state.activeTripId = trip.id;
    state.preferences.activeActorByTrip[trip.id] = trip.members.includes(actorName) ? actorName : trip.members[0];
    eventRecord({ actorName, action: existingIndex >= 0 ? 'journey_updated' : 'journey_created', entityType: 'journey', entityId: trip.id, summary: existingIndex >= 0 ? `Updated journey details for ${trip.name}` : `Created the ${trip.name} journey`, before, after: trip });
    if (before) {
      before.members.forEach((oldName, memberIndex) => {
        const newName = trip.members[memberIndex];
        if (oldName === newName) return;
        state.entries.filter((entry) => entry.tripId === trip.id && entry.paidBy === oldName).forEach((entry) => {
          const entryBefore = structuredClone(entry);
          entry.paidBy = newName;
          eventRecord({ actorName, action: 'expense_updated', entityType: 'expense', entityId: entry.id, summary: `Updated payer name on expense: ${entry.merchant}`, before: entryBefore, after: entry });
        });
      });
    }
    guidanceIndex = 0;
    selectedDay = null;
    selectedCategory = null;
    $('#journey-dialog').close();
    persistAndRender(existingIndex >= 0 ? t('journey.form.updatedLocal') : t('journey.form.createdLocal'));
  } catch (error) {
    showToast(error.message);
  }
});

$('#guidance-skip').addEventListener('click', () => {
  guidanceIndex = Math.min(GUIDANCE_PROMPT_KEYS.length - 1, guidanceIndex + 1);
  renderSharedJourney(activeTrip(state), activeMoments(state));
});
$('#guidance-prev').addEventListener('click', () => {
  guidanceIndex = Math.max(0, guidanceIndex - 1);
  renderSharedJourney(activeTrip(state), activeMoments(state));
});
function endGuidanceForToday(message) {
  localStorage.setItem('together-ledger-guidance-ended-on', localDayKey());
  $('#guidance').open = false;
  render();
  showToast(message);
}

$('#guidance-end').addEventListener('click', () => endGuidanceForToday(t('home.guidance.ended')));
$('#guidance-done').addEventListener('click', () => endGuidanceForToday(t('home.guidance.finished')));

$('#remove-moment-image-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  const trip = activeTrip(state);
  const momentId = button.dataset.momentId;
  const imageId = button.dataset.imageId;
  if (!trip || !momentId || !imageId || !isCloudJourney(trip)) return;
  if (!await confirmConsequence({ title: t('moment.removePhoto.title'), consequence: t('moment.removePhoto.consequence'), confirmLabel: t('moment.form.removePhoto'), destructive: true })) return;
  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = t('moment.removePhoto.pending');
  try {
    await api.deleteMomentImage(trip.id, momentId, imageId);
    $('#moment-dialog').close();
    await refreshCloudState();
    showToast(t('moment.removePhoto.done'));
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});

$('#moment-form').elements.image.addEventListener('change', (event) => prepareMomentPhoto(event.currentTarget));

$('#moment-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    const input = { ...Object.fromEntries(new FormData(form)), locations: structuredClone(momentLocations) };
    // The browser stops an empty name; a name of only spaces gets past it, so it is caught here,
    // in the form's own name for the field, and the person is taken back to it (#354).
    if (!String(input.title || '').trim()) {
      showStatus(t('common.moment.nameMissing'), { source: 'moment' });
      form.elements.title.focus();
      return;
    }
    clearStatus('moment');
    const trip = activeTrip(state);
    const existingIndex = state.moments.findIndex((moment) => moment.id === input.id && moment.tripId === trip?.id);
    const before = existingIndex >= 0 ? structuredClone(state.moments[existingIndex]) : null;
    if (isCloudJourney(trip)) {
      const moneyCents = input.money === '' ? null : Math.round(Number(input.money) * 100);
      const payload = { kind: input.kind, kindLabel: input.kindLabel || '', title: input.title, detail: input.detail, occurredOn: input.occurredOn, visibility: input.visibility, theme: normalizeMomentTheme(input.theme), moneyCents, moneyCurrency: input.moneyCurrency || '', locations: input.locations, ...(before ? { version: before.version } : {}) };
      const result = before ? await api.mutate(`/journeys/${trip.id}/moments/${before.id}`, 'PATCH', payload) : await api.mutate(`/journeys/${trip.id}/moments`, 'POST', payload);
      const image = form.elements.image.files[0];
      if (image) await api.uploadMomentImage(trip.id, result.moment.id, preparedMomentPhoto?.source === image ? preparedMomentPhoto.photo : image, form.dataset.paidSlotId || '');
      $('#moment-dialog').close();
      await refreshCloudState();
      showToast(before ? t('common.moment.updated') : input.visibility === 'shared-now' ? t('common.moment.shared') : t('common.moment.heldWithYou'));
      return;
    }
    const actorName = currentActor();
    const moment = normalizeMoment({ ...input, createdBy: actorName, updatedBy: actorName }, activeTrip(state).id, before);
    if (existingIndex >= 0) state.moments[existingIndex] = moment;
    else state.moments.push(moment);
    eventRecord({ action: existingIndex >= 0 ? 'moment_updated' : 'moment_added', entityType: 'moment', entityId: moment.id, summary: `${existingIndex >= 0 ? 'Updated' : 'Held'} ${momentLabel(moment.kind, moment.kindLabel).toLowerCase()}: ${moment.title}`, before, after: moment });
    if (before && before.theme !== moment.theme) eventRecord({ action: 'moment_theme_changed', entityType: 'moment', entityId: moment.id, summary: 'Changed moment theme', before: { theme: before.theme }, after: { theme: moment.theme } });
    $('#moment-dialog').close();
    persistAndRender(existingIndex >= 0 ? t('common.moment.updated') : t('moment.form.heldLocally'));
  } catch (error) {
    showToast(error.message);
  }
});

$('#toggle-moments-button').addEventListener('click', () => {
  momentsExpanded = !momentsExpanded;
  renderSharedJourney(activeTrip(state), activeMoments(state));
});
$('#buy-image-slot-button').addEventListener('click', async (event) => {
  const momentId = event.currentTarget.dataset.momentId;
  const trip = activeTrip(state);
  if (!momentId || !isCloudJourney(trip)) return;
  try {
    const session = await api.createImageCheckout(trip.id, momentId);
    window.location.assign(session.url);
  } catch (error) {
    showStatus(accountMessage(error));
  }
});
$('#buy-location-slot-button').addEventListener('click', async (event) => {
  const momentId = event.currentTarget.dataset.momentId;
  const trip = activeTrip(state);
  if (!momentId || !isCloudJourney(trip)) return;
  try {
    const session = await api.createLocationCheckout(trip.id, momentId);
    const checkout = new URL(session.url);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.stripe.com') throw new Error('Unexpected checkout destination.');
    window.location.assign(checkout.href);
  } catch (error) {
    showStatus(accountMessage(error));
  }
});
$('#settings-button').addEventListener('click', () => $('#settings-dialog').showModal());
$$('[data-close-settings]').forEach((button) => button.addEventListener('click', () => $('#settings-dialog').close()));
$('#sharing-create-journey-button').addEventListener('click', () => {
  $('#settings-dialog').close();
  openJourney();
});
function openAccountDialog() {
  renderAccountState();
  $('#account-dialog').showModal();
  if (accountUser) refreshBillingState().catch((error) => showStatus(accountMessage(error)));
  else offerSocialSignIn();
}

$('#account-button').addEventListener('click', openAccountDialog);
$$('[data-open-account]').forEach((button) => button.addEventListener('click', openAccountDialog));
$$('[data-begin-ledger]').forEach((button) => button.addEventListener('click', beginLedger));
$$('.welcome-menu a').forEach((link) => link.addEventListener('click', () => { link.closest('details').open = false; }));
$$('[data-close-account]').forEach((button) => button.addEventListener('click', () => $('#account-dialog').close()));

$('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"], button:not([type])');
  setButtonPending(button, true, t('common.account.signingIn'));
  try {
    accountUser = await api.login(Object.fromEntries(new FormData(event.currentTarget)));
    await settleLanguage();
    await refreshCloudState({ announce: true });
    refreshBillingState().catch((error) => showStatus(accountMessage(error)));
    showLedgerSurface({ persist: true });
    renderAccountState();
    $('#account-dialog').close();
  } catch (error) {
    showStatus(accountMessage(error, 'error.signIn'));
  } finally {
    setButtonPending(button, false);
  }
});

$('#register-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button');
  setButtonPending(button, true, t('common.register.creating'));
  try {
    accountUser = await api.register(Object.fromEntries(new FormData(event.currentTarget)));
    await settleLanguage();
    await refreshCloudState();
    refreshBillingState().catch((error) => showStatus(accountMessage(error)));
    showLedgerSurface({ persist: true });
    renderAccountState();
    showToast(api.lastVerificationSent ? t('common.account.registered') : t('common.account.registeredEmailDelayed'));
  } catch (error) {
    showStatus(accountMessage(error));
  } finally {
    setButtonPending(button, false);
  }
});

// Continue with Google and Continue with Apple (#216). Neither button shows until the server says
// both are configured and both companies' own scripts have loaded: a button that can't work is
// worse than none. The scripts come only from Google's and Apple's own addresses, and only once a
// signed-out person opens this dialog, so neither company hears about a visit that never asks for
// them. The ID token goes to our server and nowhere else; the reply is a password sign-in's cookie
// and CSRF pair, and nothing is written to localStorage.
const PROVIDER_SCRIPTS = {
  google: 'https://accounts.google.com/gsi/client',
  apple: 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
};
// Google draws its button 40px high; styles.css scales it to the 44px the Apple button is.
const GOOGLE_BUTTON_SCALE = 1.1;
// Closing Apple's window, or choosing Cancel in it, puts the person back where they were.
const APPLE_CANCELLED = new Set(['popup_closed_by_user', 'user_cancelled_authorize']);
const providerScripts = new Map();
let socialSignInReady = null;
let appleState = '';
let googleButtonWidth = 0;
let pendingLink = null;

function loadProviderScript(src) {
  if (!providerScripts.has(src)) {
    providerScripts.set(src, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => {
        providerScripts.delete(src);
        script.remove();
        reject(new Error(`${src} did not load.`));
      }, { once: true });
      document.head.append(script);
    }));
  }
  return providerScripts.get(src);
}

async function prepareSocialSignIn() {
  const { google, apple } = await api.providers() || {};
  if (!google?.clientId || !apple?.clientId || !apple.redirectUri) return false;
  // Apple hands its answer back to the Return URL's own address, so anywhere else its button
  // could never finish.
  if (new URL(apple.redirectUri).origin !== window.location.origin) return false;
  await Promise.all([loadProviderScript(PROVIDER_SCRIPTS.google), loadProviderScript(PROVIDER_SCRIPTS.apple)]);
  if (!window.google?.accounts?.id || !window.AppleID?.auth) return false;
  window.google.accounts.id.initialize({
    client_id: google.clientId,
    callback: ({ credential }) => signInWith(() => api.socialSignIn('google', { idToken: credential }), (error) => askForLinkPassword('google', { idToken: credential }, error)),
    ux_mode: 'popup',
    auto_select: false,
  });
  appleState = crypto.randomUUID();
  window.AppleID.auth.init({ clientId: apple.clientId, scope: 'name email', redirectURI: apple.redirectUri, state: appleState, usePopup: true });
  new ResizeObserver(() => renderGoogleButton()).observe($('.google-slot'));
  return true;
}

function offerSocialSignIn() {
  if (accountUser || !api.accountsAvailable) return;
  socialSignInReady ??= prepareSocialSignIn().catch(() => false);
  socialSignInReady.then((ready) => {
    // Not ready is asked again the next time the dialog opens; ready stays ready.
    if (!ready) {
      socialSignInReady = null;
      return;
    }
    $('#social-sign-in').hidden = false;
    renderGoogleButton();
  });
}

// Google takes a width, not a height, so it is asked for the width that fills the slot once scaled.
function renderGoogleButton() {
  const slot = $('.google-slot');
  if (!slot.clientWidth || $('#social-sign-in').hidden) return;
  const width = Math.min(400, Math.max(200, Math.floor(slot.clientWidth / GOOGLE_BUTTON_SCALE)));
  if (width === googleButtonWidth) return;
  googleButtonWidth = width;
  window.google.accounts.id.renderButton($('#google-sign-in-button'), {
    type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', logo_alignment: 'center', width,
  });
}

async function signInWith(signIn, onRefused = () => {}) {
  try {
    accountUser = await signIn();
    await settleLanguage();
    forgetPendingLink();
    await refreshCloudState({ announce: true });
    refreshBillingState().catch((error) => showStatus(accountMessage(error)));
    showLedgerSurface({ persist: true });
    renderAccountState();
    $('#account-dialog').close();
  } catch (error) {
    onRefused(error);
    showStatus(accountMessage(error, 'error.signIn'));
  }
}

// An email that already has a password account is never signed in or merged because the
// addresses match (#214). The server says so in its own words, and the password is asked for
// once, here; the sign-in it answers is held in memory only until then.
function askForLinkPassword(provider, body, error) {
  if (!(error instanceof ApiError) || error.code !== 'link_required') return;
  pendingLink = { provider, ...body };
  const form = $('#link-identity-form');
  form.reset();
  $('#link-identity-title').textContent = provider === 'apple' ? 'Connect Apple to your account' : 'Connect Google to your account';
  $('#link-identity-email').textContent = error.details?.email || 'this email';
  form.hidden = false;
  form.elements.password.focus({ preventScroll: true });
}

function forgetPendingLink() {
  pendingLink = null;
  $('#link-identity-form').reset();
  $('#link-identity-form').hidden = true;
}

$('#apple-sign-in-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  let answer;
  try {
    answer = await window.AppleID.auth.signIn();
  } catch (error) {
    if (!APPLE_CANCELLED.has(error?.error)) showStatus(accountMessage(error));
    return;
  }
  const { authorization = {}, user } = answer || {};
  if (authorization.state !== appleState) {
    showStatus(accountMessage(null));
    return;
  }
  // Apple sends the person's name on their first sign-in only. A new account starts with the first
  // name alone, and the full name only when Apple gives no first name (#399, decided Oct 12, 2026).
  const [firstName, lastName] = [user?.name?.firstName, user?.name?.lastName].map((part) => (typeof part === 'string' ? part.trim() : ''));
  // Without a first name, the full name is the family name alone.
  const displayName = firstName || lastName;
  const body = { idToken: authorization.id_token, authorizationCode: authorization.code };
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  await signInWith(() => api.socialSignIn('apple', displayName ? { ...body, displayName } : body), (error) => askForLinkPassword('apple', body, error));
  button.disabled = false;
  button.removeAttribute('aria-busy');
});

$('#link-identity-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!pendingLink) return;
  const button = event.currentTarget.querySelector('button:not([type])');
  const { password } = Object.fromEntries(new FormData(event.currentTarget));
  setButtonPending(button, true, 'Connecting…');
  await signInWith(() => api.linkIdentity({ ...pendingLink, password }), (error) => {
    // A wrong password can be tried again. A sign-in that has run out, or that belongs to
    // another account, has to start again from its button.
    if (error instanceof ApiError && ['invalid_token', 'identity_in_use'].includes(error.code)) forgetPendingLink();
  });
  setButtonPending(button, false);
});

$('#link-identity-cancel').addEventListener('click', () => {
  forgetPendingLink();
  clearStatus();
});
$('#account-dialog').addEventListener('close', forgetPendingLink);

$('#recovery-button').addEventListener('click', () => {
  $('#account-dialog').close();
  $('#recovery-request-form').reset();
  $('#recovery-request-dialog').showModal();
  $('#recovery-request-form').elements.email.focus({ preventScroll: true });
});
$$('[data-close-recovery-request]').forEach((button) => button.addEventListener('click', () => $('#recovery-request-dialog').close()));
$('#recovery-request-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  // Recovery sends mail, so it is the slowest thing in the dialog and the one reached by
  // someone already locked out. It should say it is working, as every other form does.
  const button = event.currentTarget.querySelector('button[type="submit"], button:not([type])');
  setButtonPending(button, true, 'Sending…');
  try {
    await api.request('/recovery/request', { method: 'POST', body: Object.fromEntries(new FormData(event.currentTarget)) });
    $('#recovery-request-dialog').close();
    showToast('If that account exists, a recovery link is on its way.');
  } catch (error) {
    showStatus(accountMessage(error));
  } finally {
    setButtonPending(button, false);
  }
});
$$('[data-close-recovery-confirm]').forEach((button) => button.addEventListener('click', () => $('#recovery-confirm-dialog').close()));
$('#recovery-confirm-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(event.currentTarget));
  // A mismatch has to be fixed by retyping, which takes longer than a toast lasts. It stays.
  if (input.password !== input.confirmPassword) {
    showStatus('The new passwords do not match.');
    return;
  }
  const button = event.currentTarget.querySelector('button[type="submit"], button:not([type])');
  setButtonPending(button, true, 'Changing…');
  try {
    clearStatus();
    await api.request('/recovery/confirm', { method: 'POST', body: { token: input.token, password: input.password } });
    accountUser = null;
    billingState = null;
    cloudJourneyIds = new Set();
    state = loadState();
    $('#recovery-confirm-dialog').close();
    render();
    showToast('Password changed. Sign in again on every device.');
  } catch (error) {
    showStatus(accountMessage(error));
  } finally {
    setButtonPending(button, false);
  }
});

$('#logout-button').addEventListener('click', async () => {
  try { await api.logout(); } catch (error) { showStatus(accountMessage(error)); return; }
  accountUser = null;
  billingState = null;
  cloudJourneyIds = new Set();
  state = loadState();
  $('#account-dialog').close();
  render();
  if (state.preferences.onboardingComplete) showLedgerSurface();
  else showWelcomeSurface();
  showToast(t('common.account.signedOut'));
});

$('#logout-everywhere-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  if (!await confirmConsequence({ title: 'Sign out everywhere?', consequence: SIGN_OUT_EVERYWHERE_CONSEQUENCE, confirmLabel: 'Sign out everywhere' })) return;
  setButtonPending(button, true, 'Signing out…');
  try {
    clearStatus();
    await api.logoutEverywhere();
  } catch (error) {
    showStatus(accountMessage(error));
    return;
  } finally {
    setButtonPending(button, false);
  }
  landOnSignIn(SIGNED_OUT_EVERYWHERE);
});

$('#change-password-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = Object.fromEntries(new FormData(form));
  // As in recovery: a mismatch is fixed by retyping, so it stays until the next attempt.
  if (input.newPassword !== input.confirmPassword) {
    showStatus('The new passwords do not match.');
    return;
  }
  const button = form.querySelector('button');
  setButtonPending(button, true, 'Changing…');
  try {
    clearStatus();
    accountUser = await api.changePassword(input.currentPassword, input.newPassword);
    form.reset();
    renderAccountState();
    showToast(PASSWORD_CHANGED_HERE);
  } catch (error) {
    showStatus(accountMessage(error));
  } finally {
    setButtonPending(button, false);
  }
});

$('#refresh-sync-button').addEventListener('click', async () => {
  try {
    await refreshCloudState({ announce: true });
    refreshBillingState().catch((error) => showStatus(accountMessage(error)));
  } catch (error) { showStatus(accountMessage(error)); }
});

$('#grace-request-button').addEventListener('click', requestMoreGrace);
$('#billing-capacity-range').addEventListener('input', syncCapacityFromRange);
$('#billing-capacity-number').addEventListener('input', previewCapacityFromNumber);
$('#billing-capacity-number').addEventListener('change', normalizeCapacityNumber);

$('#billing-offers').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-billing-offer]');
  if (!button) return;
  setButtonPending(button, true, 'Opening secure checkout…');
  try {
    const journey = activeTrip(state);
    if (!isCloudJourney(journey) || journey.role !== 'owner') throw new Error('Only a hosted journey owner can add another person.');
    const result = await api.mutate(`/journeys/${journey.id}/billing/checkout-sessions`, 'POST', {
      offerId: button.dataset.billingOffer,
      paidCapacity: capacityQuantity(),
      requestId: crypto.randomUUID(),
    });
    const checkout = new URL(result.url);
    if (checkout.protocol !== 'https:' || checkout.hostname !== 'checkout.stripe.com') throw new Error('Unexpected checkout destination.');
    window.location.assign(checkout.href);
  } catch (error) {
    showStatus(accountMessage(error));
    setButtonPending(button, false);
  }
});

$('#billing-portal-button').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  setButtonPending(button, true, 'Opening secure billing…');
  try {
    const journey = activeTrip(state);
    if (!isCloudJourney(journey) || journey.role !== 'owner') throw new Error('Only a hosted journey owner can manage this billing relationship.');
    const result = await api.mutate(`/journeys/${journey.id}/billing/portal-sessions`, 'POST', {});
    const portal = new URL(result.url);
    if (portal.protocol !== 'https:' || portal.hostname !== 'billing.stripe.com') throw new Error('Unexpected billing destination.');
    window.location.assign(portal.href);
  } catch (error) {
    showStatus(accountMessage(error));
    setButtonPending(button, false);
  }
});

$('#resend-verification-button').addEventListener('click', async () => {
  try {
    const result = await api.mutate('/auth/resend-verification', 'POST', {});
    showToast(result.delivered ? 'A new verification link is on its way.' : 'Email delivery is still unavailable. Please try again later.');
  } catch (error) {
    showStatus(accountMessage(error));
  }
});

$('#display-name-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const { displayName } = Object.fromEntries(new FormData(form));
  try {
    const { user } = await api.mutate('/account', 'PATCH', { displayName });
    accountUser = user;
    form.querySelector('[name=displayName]').blur();
    renderAccountState();
    if (isCloudJourney()) await refreshCloudState();
    showToast('Name saved. Your journeyers see it now.');
  } catch (error) {
    showStatus(accountMessage(error));
  }
});

$('#delete-account-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(event.currentTarget));
  if (!await confirmConsequence({ title: 'Permanently delete this account?', consequence: 'This follows the journey ownership rules shown here and cannot be undone.', confirmLabel: 'Permanently delete account', destructive: true })) return;
  try {
    await api.mutate('/account', 'DELETE', input);
    accountUser = null;
    billingState = null;
    cloudJourneyIds = new Set();
    state = loadState();
    $('#account-dialog').close();
    render();
    showToast('Account deleted and sessions revoked.');
  } catch (error) {
    showStatus(accountMessage(error));
  }
});

$('#invite-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  setButtonPending(button, true, t('sharing.invite.pending'));
  try {
    const result = await api.mutate(`/journeys/${activeTrip(state).id}/invitations`, 'POST', Object.fromEntries(new FormData(form)));
    form.reset();
    // A journey of one has nobody to ask, so the invitation goes out there and then. Everywhere
    // else this has only asked a question, and saying "sent" would not be true.
    showToast(result?.invitationSent ? t('sharing.invite.sent') : t('sharing.invite.proposed'));
    await refreshCloudState();
  } catch (error) {
    showStatus(accountMessage(error));
  } finally {
    setButtonPending(button, false);
  }
});

// Leaving (#96): its own danger zone, two deliberate steps as deleting the account takes. The
// button opens the consequence dialog; only then is LEAVE asked for, in full. Not offered in a
// journey of one, and the owner hands the journey over first. The words are the phone's too.
let leaveAskedFor = '';

function renderLeaveJourney(trip) {
  const zone = $('#leave-journey');
  const offer = trip ? leaveOffer({ role: trip.role, peopleHere: (trip.memberRecords || []).length }) : 'none';
  zone.hidden = offer === 'none';
  if (offer === 'none') {
    leaveAskedFor = '';
    return;
  }
  if (leaveAskedFor && leaveAskedFor !== trip.id) leaveAskedFor = '';
  $('#leave-journey-title').textContent = t('common.leave.title');
  $('#leave-journey-note').textContent = offer === 'hand-over-first' ? t('common.leave.ownerFirst') : t('common.leave.note');
  $('#leave-journey-safety').textContent = t('common.leave.safety');
  const button = $('#leave-journey-button');
  button.textContent = t('common.leave.start');
  const asked = offer === 'leave' && leaveAskedFor === trip.id;
  button.hidden = offer !== 'leave' || asked;
  const form = $('#leave-journey-form');
  if (form.hidden === asked) form.reset();
  form.hidden = !asked;
  // LEAVE is what the server checks, so it is the same word in every language, and goes in as it is.
  const word = (key) => t.parts(key, { word: LEAVE_WORD }, (text) => text).join('');
  $('#leave-journey-field-label').textContent = word('common.leave.fieldLabel');
  $('#leave-journey-hint').textContent = word('common.leave.fieldHint');
  $('#leave-journey-stay').textContent = t('common.leave.stay');
  const confirm = $('#leave-journey-confirm');
  if (confirm.getAttribute('aria-busy') !== 'true') {
    confirm.textContent = t('common.leave.confirm');
    confirm.disabled = form.elements.confirmation.value !== LEAVE_WORD;
  }
}

$('#leave-journey-button').addEventListener('click', async () => {
  const trip = activeTrip(state);
  if (!isCloudJourney(trip)) return;
  if (!await confirmConsequence({ title: t('common.leave.consequenceTitle', { journey: trip.name }), consequence: t('common.leave.consequence'), confirmLabel: t('common.leave.continue') })) return;
  leaveAskedFor = trip.id;
  renderLeaveJourney(trip);
  $('#leave-journey-form [name=confirmation]').focus();
});

$('#leave-journey-stay').addEventListener('click', () => {
  leaveAskedFor = '';
  renderLeaveJourney(activeTrip(state));
  $('#leave-journey-button').focus();
});

$('#leave-journey-form').addEventListener('input', (event) => {
  $('#leave-journey-confirm').disabled = event.currentTarget.elements.confirmation.value !== LEAVE_WORD;
});

$('#leave-journey-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const trip = activeTrip(state);
  if (!isCloudJourney(trip) || leaveAskedFor !== trip.id || event.currentTarget.elements.confirmation.value !== LEAVE_WORD) return;
  const button = $('#leave-journey-confirm');
  setButtonPending(button, true, t('common.leave.pending'));
  try {
    await api.mutate(`/journeys/${trip.id}/leave`, 'POST', { confirmation: LEAVE_WORD });
  } catch (error) {
    setButtonPending(button, false);
    showStatus(accountMessage(error), { tone: leaveRefusalTone(error?.code) });
    return;
  }
  leaveAskedFor = '';
  setButtonPending(button, false);
  $('#settings-dialog').close();
  // The next read no longer has it: the page opens on the next journey, or the empty start.
  try {
    await refreshCloudState();
  } catch (error) {
    showStatus(accountMessage(error));
  }
  showToast(t('common.leave.left', { journey: trip.name }));
});

$('#member-list').addEventListener('click', async (event) => {
  const transferButton = event.target.closest('[data-transfer-owner]');
  const removeButton = event.target.closest('[data-remove-member]');
  const button = transferButton || removeButton;
  if (!button) return;
  const memberName = button.dataset.memberName || 'this person';
  try {
    if (transferButton) {
      if (!await confirmConsequence({ title: `Make ${memberName} the journey owner?`, consequence: 'You will remain here as a journeyer. Ownership moves to them.', confirmLabel: 'Transfer ownership' })) return;
      await api.mutate(`/journeys/${activeTrip(state).id}/ownership`, 'POST', { userId: button.dataset.transferOwner });
      showToast(`${memberName} is now the journey owner.`);
    } else {
      if (!await confirmConsequence({ title: `Remove ${memberName} from this journey?`, consequence: 'Their private moments will be removed. Already shared history remains.', confirmLabel: 'Remove journeyer', destructive: true })) return;
      await api.mutate(`/journeys/${activeTrip(state).id}/members/${button.dataset.removeMember}`, 'DELETE', {});
      showToast(`${memberName} was removed from this journey.`);
    }
    await refreshCloudState();
  } catch (error) {
    showStatus(accountMessage(error));
  }
});

async function onProposalClick(event) {
  const agreeButton = event.target.closest('[data-agree-proposal]');
  const declineButton = event.target.closest('[data-decline-proposal]');
  const withdrawButton = event.target.closest('[data-withdraw-proposal]');
  const button = agreeButton || declineButton || withdrawButton;
  if (!button) return;
  const proposalId = agreeButton ? button.dataset.agreeProposal : declineButton ? button.dataset.declineProposal : button.dataset.withdrawProposal;
  const proposal = (activeTrip(state).inviteProposalRecords || []).find((entry) => entry.id === proposalId);
  if (!proposal) return;
  if (withdrawButton) {
    if (!await confirmConsequence({
      title: t('sharing.proposal.withdrawTitle', { email: proposal.email }),
      consequence: t('sharing.proposal.withdrawConsequence'),
      confirmLabel: t('sharing.proposal.withdrawConfirm'),
    })) return;
    try {
      await api.mutate(`/journeys/${activeTrip(state).id}/invite-proposals/${proposalId}`, 'DELETE', {});
      showToast(t('sharing.proposal.withdrawn'));
      await refreshCloudState();
    } catch (error) {
      showStatus(accountMessage(error));
    }
    return;
  }
  const agreeing = Boolean(agreeButton);
  const consequence = agreeing
    ? { title: t('sharing.proposal.agreeTitle', { email: proposal.email }), consequence: t('sharing.proposal.agreeConsequence'), confirmLabel: t('sharing.proposal.agree') }
    : { title: t('sharing.proposal.declineTitle', { email: proposal.email }), consequence: t('sharing.proposal.declineConsequence'), confirmLabel: t('sharing.proposal.decline'), destructive: true };
  if (!await confirmConsequence(consequence)) return;
  try {
    const result = await api.mutate(`/journeys/${activeTrip(state).id}/invite-proposals/${proposalId}/decision`, 'POST', { decision: agreeing ? 'agree' : 'decline' });
    if (result?.invitationSent) showToast(t('sharing.proposal.everyoneAgreed'));
    else if (agreeing) showToast(t('sharing.proposal.agreed'));
    else showToast(t('sharing.proposal.declined'));
    await refreshCloudState();
  } catch (error) {
    showStatus(accountMessage(error));
  }
}

$('#invite-proposal-list')?.addEventListener('click', onProposalClick);

// Withdrawing frees the place at once; sending again is one tap, because everyone has already
// agreed and that agreement still holds (#347).
async function onInvitationClick(event) {
  const withdrawButton = event.target.closest('[data-withdraw-invitation]');
  const againButton = event.target.closest('[data-send-invitation-again]');
  const button = withdrawButton || againButton;
  if (!button) return;
  const invitationId = withdrawButton ? button.dataset.withdrawInvitation : button.dataset.sendInvitationAgain;
  const invitation = (activeTrip(state).invitationRecords || []).find((entry) => entry.id === invitationId);
  if (!invitation) return;
  try {
    if (withdrawButton) {
      if (!await confirmConsequence({
        title: t('sharing.invitation.withdrawTitle', { email: invitation.email }),
        consequence: t('sharing.invitation.withdrawConsequence'),
        confirmLabel: t('sharing.invitation.withdraw'),
      })) return;
      await api.mutate(`/journeys/${activeTrip(state).id}/invitations/${invitationId}`, 'DELETE', {});
      showToast(t('sharing.invitation.withdrawn'));
    } else {
      setButtonPending(button, true, t('common.action.sending'));
      await api.mutate(`/journeys/${activeTrip(state).id}/invitations/${invitationId}/send-again`, 'POST', {});
      showToast(t('sharing.invitation.sentAgain'));
    }
    await refreshCloudState();
  } catch (error) {
    if (againButton) setButtonPending(button, false);
    showStatus(accountMessage(error));
  }
}

$('#reserved-place-list')?.addEventListener('click', onInvitationClick);
$('#invitation-list')?.addEventListener('click', onInvitationClick);

$('#expense-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const input = Object.fromEntries(new FormData(event.currentTarget));
    const trip = activeTrip(state);
    if (isCloudJourney(trip)) {
      const existing = state.entries.find((entry) => entry.id === input.id);
      const payer = trip.memberRecords.find((member) => member.displayName === input.paidBy);
      const payload = {
        merchant: input.merchant,
        category: input.category,
        amountCents: Math.round(Number(input.amount) * 100),
        occurredOn: input.occurredOn,
        paidByUserId: payer?.id || null,
        payerLabel: input.paidBy,
        account: input.account,
        status: input.status,
        reference: input.reference,
        notes: input.notes,
        ...(existing ? { version: existing.version } : {}),
      };
      if (existing) await api.mutate(`/journeys/${trip.id}/expenses/${existing.id}`, 'PATCH', payload);
      else await api.mutate(`/journeys/${trip.id}/expenses`, 'POST', payload);
      $('#expense-dialog').close();
      await refreshCloudState();
      showToast(existing ? 'Expense changes synced.' : 'Expense securely synced.');
      return;
    }
    const entry = normalizeEntry(input, activeTrip(state).id);
    const index = state.entries.findIndex((item) => item.id === entry.id);
    const before = index >= 0 ? structuredClone(state.entries[index]) : null;
    if (index >= 0) state.entries[index] = entry;
    else state.entries.push(entry);
    eventRecord({ action: index >= 0 ? 'expense_updated' : 'expense_added', entityType: 'expense', entityId: entry.id, summary: `${index >= 0 ? 'Edited' : 'Added'} expense: ${entry.merchant}`, before, after: entry });
    $('#expense-dialog').close();
    persistAndRender(index >= 0 ? 'Expense updated.' : 'Expense added to the shared picture.');
  } catch (error) {
    showToast(error.message);
  }
});

$('#confirm-dialog').addEventListener('close', async () => {
  if ($('#confirm-dialog').returnValue === 'confirm' && removeId) {
    if (isCloudJourney()) {
      try {
        await api.mutate(`/journeys/${activeTrip(state).id}/expenses/${removeId}`, 'DELETE', { version: removeSnapshot.version });
        await refreshCloudState();
        showToast('Expense deleted; the event tombstone remains.');
      } catch (error) {
        showStatus(accountMessage(error));
      }
      removeId = null;
      removeSnapshot = null;
      return;
    }
    state.entries = state.entries.filter((entry) => entry.id !== removeId);
    eventRecord({ action: 'expense_deleted', entityType: 'expense', entityId: removeId, summary: `Deleted expense: ${removeSnapshot?.merchant || removeId}`, before: removeSnapshot, after: null });
    persistAndRender('Expense removed.');
  }
  removeId = null;
  removeSnapshot = null;
});

$('#add-concern-button').addEventListener('click', () => openConcern());
$$('[data-close-concern]').forEach((button) => button.addEventListener('click', () => $('#concern-dialog').close()));
$('#concern-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const input = Object.fromEntries(new FormData(event.currentTarget));
    if (isCloudJourney()) {
      const existing = state.concerns.find((concern) => concern.id === input.id);
      const payload = { title: input.title, detail: input.detail, status: input.status, ...(existing ? { version: existing.version } : {}) };
      if (existing) await api.mutate(`/journeys/${activeTrip(state).id}/concerns/${existing.id}`, 'PATCH', payload);
      else await api.mutate(`/journeys/${activeTrip(state).id}/concerns`, 'POST', payload);
      $('#concern-dialog').close();
      await refreshCloudState();
      renderEventManager();
      showToast(existing ? t('concern.form.synced') : t('concern.form.created'));
      return;
    }
    const index = state.concerns.findIndex((concern) => concern.id === input.id);
    const before = index >= 0 ? structuredClone(state.concerns[index]) : null;
    const concern = normalizeConcern(input, activeTrip(state).id, currentActor(), before);
    if (index >= 0) state.concerns[index] = concern;
    else state.concerns.push(concern);
    eventRecord({ action: index >= 0 ? 'concern_updated' : 'concern_added', entityType: 'concern', entityId: concern.id, summary: `${index >= 0 ? 'Edited' : 'Logged'} concern: ${concern.title}`, before, after: concern });
    $('#concern-dialog').close();
    saveWorkingState();
    render();
    renderEventManager();
    showToast(index >= 0 ? t('concern.form.updatedLocal') : t('concern.form.createdLocal'));
  } catch (error) {
    showToast(error.message);
  }
});

$('#export-button').addEventListener('click', () => {
  const blob = new Blob([exportState(state)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `together-ledger-${localDay()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(t('settings.backup.exported'));
});

$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    state = importState(await file.text());
    state.preferences.onboardingComplete = true;
    saveWorkingState();
    selectedDay = null;
    selectedCategory = null;
    render();
    showLedgerSurface();
    showToast(t('settings.backup.imported'));
  } catch (error) {
    showToast(error.message);
  } finally {
    event.target.value = '';
  }
});

$('#reset-button').addEventListener('click', async () => {
  if (!await confirmConsequence({ title: t('settings.reset.confirmTitle'), consequence: t('settings.reset.confirmConsequence'), confirmLabel: t('settings.reset.confirmAction'), destructive: true })) return;
  state = resetState();
  selectedDay = null;
  selectedCategory = null;
  render();
  showWelcomeSurface();
  showToast(t('settings.reset.done'));
});

initializeDialogBranding();
initializeThemePicker();
initializeLanguageRow();
render();
if (state.preferences.onboardingComplete) showLedgerSurface();
else showWelcomeSurface();

async function initializeAccount() {
  const params = new URLSearchParams(window.location.search);
  try {
    if (emailedCodes.has('verify')) {
      await api.request('/auth/verify-email', { method: 'POST', body: { token: emailedCodes.get('verify') } });
      showToast(t('common.account.verified'));
    }
    if (emailedCodes.has('recovery')) {
      $('#recovery-confirm-form').elements.token.value = emailedCodes.get('recovery');
      $('#recovery-confirm-dialog').showModal();
      $('#recovery-confirm-form').elements.password.focus({ preventScroll: true });
      renderAccountState();
      return;
    }
    try { accountUser = await api.session(); } catch (error) {
      if (![401, 404].includes(error.status)) throw error;
    }
    if (accountUser) {
      await settleLanguage();
      await refreshCloudState();
      refreshBillingState().catch((error) => showStatus(accountMessage(error)));
      showLedgerSurface({ persist: true });
      if (emailedCodes.has('invite')) {
        await api.acceptInvitation(emailedCodes.get('invite'));
        await refreshCloudState({ announce: true });
      }
    } else if (emailedCodes.has('invite')) {
      $('#account-dialog').showModal();
      showToast(t('signIn.toast.invitedEmail'));
    }
    if (params.get('billing') === 'success') {
      showToast(accountUser ? 'Payment received. Paid capacity will appear after Stripe confirms it.' : 'Payment received. Sign in to see the journey’s paid capacity.');
    } else if (params.get('billing') === 'canceled') {
      showToast('Checkout closed without changing this journey’s paid capacity.');
    } else if (params.get('billing') === 'portal') {
      showToast('Billing settings closed. Stripe updates may take a moment to appear.');
    }
  } catch (error) {
    showStatus(accountMessage(error));
  } finally {
    if ([...params.keys()].some((key) => ['billing', 'session_id'].includes(key))) {
      window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
    }
    renderAccountState();
  }
}

initializeAccount();

document.querySelector('#status-banner-dismiss')?.addEventListener('click', () => clearStatus());

// A problem belonging to a dialog leaves with it, and the region goes back above the work so
// the next page-level problem is not stranded inside something that is closed.
document.querySelectorAll('dialog').forEach((dialog) => dialog.addEventListener('close', () => {
  const banner = document.querySelector('#status-banner');
  if (!banner || !dialog.contains(banner)) return;
  banner.hidden = true;
  statusBannerSource = '';
  statusHomeParent?.insertBefore(banner, statusHomeNext);
}));

// Being offline is a condition, not a failure. It is stated plainly, and it clears itself
// when the connection returns rather than leaving a stale warning on the page.
function reportConnection() {
  if (navigator.onLine) clearStatus('connection');
  else showStatus(t('status.banner.offline'), { tone: 'caution', source: 'connection' });
}
window.addEventListener('online', reportConnection);
window.addEventListener('offline', reportConnection);
if (!navigator.onLine) reportConnection();

// A minute is the smallest unit either countdown shows, so it is also how often they are redrawn.
// Nothing is fetched to do it: the deadline is already on the page, and only the reading changes.
window.setInterval(refreshCountdowns, 60000);
