import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '../src/auth/session';
import { LEDGER_WHILE_OFFLINE, type OfflineReason } from '../src/auth/session-state';
import { Choices } from '../src/components/choices';
import { EmptyState } from '../src/components/empty-state';
import { GraceBanner } from '../src/components/grace-banner';
import { JourneyRow } from '../src/components/journey-row';
import { CardAction, MomentCard, momentColors } from '../src/components/moment-card';
import { MomentRow } from '../src/components/moment-row';
import { ScreenStatusRegion } from '../src/components/status-region';
import { Body, Button, Screen } from '../src/components/ui';
import { INVITATION_WORDS } from '../src/invitations/invitation-words';
import { journeyPeriod, momentKinds, momentListHeading, momentListing, MOMENT_VIEW_LABEL, MOMENT_VIEWS, openThreads, recentMoments, seeAllLabel, type Concern } from '../src/journey/journey-view';
import { useMomentActions } from '../src/journey/moment-actions';
import type { EditableMoment } from '../src/journey/moment-draft';
import { journeysNotLoaded, nextJourneyWords } from '../src/journey/journey-state';
import { useJourney } from '../src/journey/use-journey';
import { useMomentView } from '../src/journey/use-moment-view';
import { WaitingMoments } from '../src/components/waiting-moments';
import type { MomentView } from '../src/storage/ledger-store';
import { t } from '../src/i18n';
import { useLanguage } from '../src/i18n/language-provider';
import { fonts, leading, scriptStyles, tracking, useTheme } from '../src/theme';
import { showsJourneyRow } from '../../../src/journey-row.js';

// The list's own padding; the journey row runs on past it to the screen's edge (#404).
const LIST_INSET = 24;

/**
 * The ledger surface: the open journey and its moments (TL-M-07, #182), ported from the web's
 * render() and renderSharedJourney(). Holding, editing and sharing a moment is #183, in app/moment.tsx.
 */
export default function LedgerScreen() {
  const session = useSession();
  const journey = useJourney();
  const actions = useMomentActions();
  const { theme } = useTheme();
  // Its words and type are read again when the language changes; the list redraws with them,
  // since each drawing hands it a new renderItem.
  useLanguage();
  const [expanded, setExpanded] = useState(false);
  const momentView = useMomentView();
  // The compact rows opened to their full card; folded again on a second tap.
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set());
  const { state } = journey;

  if (state.phase === 'loading') return <Screen title={t('common.ledger.title')}><Body>{t('common.status.loading')}</Body></Screen>;
  // Signed in, but the service could not be asked (#352): never the sign-in prompt below. A first
  // load the connection stopped is drawn the same, and no failure is ever a bare Try again.
  if (state.phase === 'offline') return <LedgerWhileOffline reason={state.reason} onRetry={session.refresh} />;
  if (state.phase === 'failed') {
    if (state.reason) return <LedgerWhileOffline reason={state.reason} onRetry={journey.retry} />;
    return (
      <Screen title={t('common.ledger.title')}>
        {/* Why is in the status region above, in the service's own words. */}
        <Body>{journeysNotLoaded()}</Body>
        <WaitingMoments activeJourneyId={null} />
        <Button kind="quiet" label={t('mobile.action.tryAgain')} onPress={journey.retry} />
      </Screen>
    );
  }
  if (state.phase === 'signed-out' || state.phase === 'no-journeys') return <EmptyStart signedIn={state.phase === 'no-journeys'} />;

  const { snapshot, journeys, activeId, next } = state;
  const nextName = next ? journeys.find((item) => item.id === next.journeyId)?.name : null;
  const recent = recentMoments(snapshot);
  const compact = momentView.view === 'compact';
  const listing = momentListing(recent, { compact, expanded });
  const shown = listing.shown;
  const threads = openThreads(snapshot);
  const colors = theme.colors;
  const toggle = (id: string) => setOpened((current) => {
    const next = new Set(current);
    if (!next.delete(id)) next.add(id);
    return next;
  });

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.fill, { backgroundColor: colors.bg }]}>
      <FlatList
        data={shown}
        keyExtractor={(moment) => moment.id}
        extraData={{ compact, opened }}
        renderItem={({ item }) => {
          const cardColors = momentColors(item, colors);
          const cardActions = (
            <>
              {item.visibility === 'share-later' ? <CardAction label={t('common.action.shareNow')} colors={cardColors} onPress={() => actions.share(item as EditableMoment)} /> : null}
              <CardAction label={t('common.action.edit')} colors={cardColors} onPress={() => router.push({ pathname: '/moment', params: { id: item.id } })} />
            </>
          );
          return compact
            ? <MomentRow moment={item} open={opened.has(item.id)} onToggle={() => toggle(item.id)} actions={cardActions} />
            : <MomentCard moment={item} actions={cardActions} />;
        }}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={compact ? styles.rowGap : styles.gap} />}
        refreshControl={<RefreshControl refreshing={journey.refreshing} onRefresh={journey.refresh} tintColor={colors.accent} colors={[colors.accent]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenStatusRegion />
            <View>
              <Text style={[styles.small, { color: colors.muted }]}>{t('common.ledger.yourSpace')}</Text>
              <Text accessibilityRole="header" style={[styles.journeyName, fonts.serif, { color: colors.fg }]}>{snapshot.journey.name}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{journeyPeriod(snapshot.journey)}</Text>
            </View>
            <GraceBanner journeyId={snapshot.journey.id} grace={snapshot.capacity?.grace} peopleHere={snapshot.capacity?.peopleHere ?? 0} />
            {/* One row that scrolls sideways, and New journey on its own line directly below it (#404). */}
            {showsJourneyRow(journeys) ? <JourneyRow label={t('mobile.ledger.journeys')} journeys={journeys} activeId={activeId} inset={LIST_INSET} onSelect={(id) => { setExpanded(false); setOpened(new Set()); journey.select(id); }} /> : null}
            <Button kind="quiet" label={t('common.ledger.newJourney')} onPress={() => router.push('/new-journey')} />
            {/* The open journey stays while another is asked for; offline, it opens once the connection is back (#352). */}
            {next && nextName ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.muted }]}>{nextJourneyWords(nextName, next.when)}</Text> : null}
            <View style={styles.section}>
              <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('common.ledger.eyebrow')}</Text>
              <Text accessibilityRole="header" style={[styles.sectionTitle, fonts.serif, { color: colors.fg }]}>{momentListHeading(compact)}</Text>
              <Text style={[styles.body, { color: colors.muted }]}>{t('common.ledger.lead')}</Text>
            </View>
            <Button label={`＋ ${t('home.moment.hold')}`} onPress={() => router.push('/moment')} />
            <WaitingMoments activeJourneyId={activeId} />
            {/* Only In full and Compact here, no filter (#405): "＋ Hold a moment" above is the way in for any kind. */}
            {recent.length ? (
              <View style={styles.viewChoice}>
                <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.small, { color: colors.muted }]}>{MOMENT_VIEW_LABEL}</Text>
                <Choices label={MOMENT_VIEW_LABEL} options={MOMENT_VIEWS} selected={momentView.view} onSelect={(value) => momentView.setView(value as MomentView)} />
              </View>
            ) : null}
            {listing.seeAll ? <Button kind="quiet" label={expanded ? t('home.moments.showRecent') : seeAllLabel(recent.length)} onPress={() => setExpanded(!expanded)} /> : null}
          </View>
        }
        ListEmptyComponent={<EmptyState title={t('common.ledger.emptyTitle')} body={t('common.ledger.emptyBody')} />}
        ListFooterComponent={<Threads threads={threads} />}
      />
    </SafeAreaView>
  );
}

/**
 * Signed in, with no journey this phone can show (#352, #360): opened offline, or a first load the
 * connection stopped. What was held here and not sent yet is still in sight, with Try sending now.
 */
function LedgerWhileOffline({ reason, onRetry }: { reason: OfflineReason; onRetry: () => void }) {
  return (
    <Screen title={t('common.ledger.title')}>
      <Body>{LEDGER_WHILE_OFFLINE[reason]}</Body>
      {/* What this account held and the service doesn't have yet: kept, not lost (#352). */}
      <WaitingMoments activeJourneyId={null} />
      <Button kind="quiet" label={t('mobile.action.tryAgain')} onPress={onRetry} />
    </Screen>
  );
}

function Threads({ threads }: { threads: Concern[] }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  return (
    <View style={[styles.threads, { borderColor: colors.border, borderRadius: theme.radius.l, backgroundColor: colors.surface }]}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('common.threads.eyebrow')}</Text>
      <Text accessibilityRole="header" style={[styles.sectionTitle, fonts.serif, { color: colors.fg }]}>{t('history.concerns.heading')}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t('common.threads.lead')}</Text>
      {threads.length ? threads.map((thread) => (
        <View key={thread.id} style={[styles.thread, { borderTopColor: colors.border }]}>
          <Text style={[styles.openChip, { color: colors.caution, borderColor: colors.caution, borderRadius: theme.radius.pill }]}>{t('history.concern.status', { status: 'open' })}</Text>
          <Text style={[styles.threadTitle, { color: colors.fg }]}>{thread.title}</Text>
          {thread.detail ? <Text style={[styles.body, { color: colors.muted }]}>{thread.detail}</Text> : null}
        </View>
      )) : <EmptyState compact title={t('common.threads.emptyTitle')} body={t('common.threads.emptyBody')} />}
    </View>
  );
}

/** Before there is a journey: the web's empty start, which says what can live here. */
function EmptyStart({ signedIn }: { signedIn: boolean }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const kinds = momentKinds().filter(([value]) => value !== 'other');
  return (
    <Screen title={t('common.ledger.title')}>
      <Text style={[styles.eyebrow, { color: colors.accent }]}>{t('common.start.eyebrow')}</Text>
      <Text accessibilityRole="header" style={[styles.sectionTitle, fonts.serif, { color: colors.fg }]}>{t('common.start.title')}</Text>
      <Body>{t('common.start.lead')}</Body>
      <View style={[styles.types, { backgroundColor: colors.metaBg, borderColor: colors.border, borderRadius: theme.radius.l }]}>
        <Text style={[styles.body, { color: colors.muted }]}>{t('common.start.kinds')}</Text>
        <View style={styles.kinds}>
          {kinds.map(([value, label]) => (
            <Text key={value} style={[styles.type, { color: colors.fg, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: theme.radius.pill }]}>{label}</Text>
          ))}
        </View>
      </View>
      {signedIn ? (
        <>
          <Body>{t('common.start.accountReady')}</Body>
          <Button label={t('common.ledger.newJourney')} onPress={() => router.push('/new-journey')} />
        </>
      ) : (
        <>
          <Body>{t('mobile.start.signedOut')}</Body>
          <Button label={t('common.account.signIn')} onPress={() => router.push('/account')} />
        </>
      )}
      {/* Joining someone else's journey begins with their invitation (#266). */}
      <Button kind="quiet" label={INVITATION_WORDS.haveOne} onPress={() => router.push('/invite')} />
    </Screen>
  );
}

const styles = scriptStyles(() => StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: LIST_INSET, gap: 0 },
  gap: { height: 14 },
  rowGap: { height: 8 },
  viewChoice: { gap: 8 },
  header: { gap: 16, marginBottom: 16 },
  small: { fontSize: 13, fontWeight: '700' },
  journeyName: { fontSize: 32, lineHeight: leading(32, 38) },
  body: { fontSize: 16, lineHeight: 23 },
  section: { gap: 6, marginTop: 8 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: tracking(1.9), textTransform: 'uppercase' },
  sectionTitle: { fontSize: 28, lineHeight: leading(28, 34) },
  threads: { borderWidth: 1, padding: 20, gap: 6, marginTop: 24 },
  thread: { borderTopWidth: 1, paddingVertical: 17, gap: 6 },
  openChip: { alignSelf: 'flex-start', borderWidth: 1, fontSize: 12, fontWeight: '900', letterSpacing: tracking(1), paddingHorizontal: 8, paddingVertical: 4, textTransform: 'uppercase', overflow: 'hidden' },
  threadTitle: { fontSize: 17, fontWeight: '700' },
  types: { borderWidth: 1, padding: 22, gap: 16 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  type: { borderWidth: 1, fontSize: 14, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 9, overflow: 'hidden' },
}));
