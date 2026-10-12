import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { HISTORY_GUIDE_TITLE } from '../../../src/history-guide.js';
import { accountMessage } from '../src/auth/account-messages';
import { useSession } from '../src/auth/session';
import { JourneyNotOpen } from '../src/components/journey-not-open';
import { Body, Button, Screen } from '../src/components/ui';
import { HISTORY_WITHOUT_JOURNEY } from '../src/journey/journey-state';
import { CONSEQUENCES, concernsByRecency, historyEvents, valueLabel, type ConcernRecord, type SharingSnapshot } from '../src/journey/sharing-view';
import { useJourney, useReloadWhenShown } from '../src/journey/use-journey';
import { format, t } from '../src/i18n';
import { useShell } from '../src/shell/shell-provider';
import { targetSize, tracking, useTheme } from '../src/theme';

/**
 * The web's event manager (renderEventManager): conversations to return to, then the journey's
 * append-only, account-attributed history, newest first (TL-M-09, #184). Its intro leads to "How
 * to read your history" (#349), which explains every part of it in plain words.
 *
 * Its own sentences are keys in locales/en.json (docs/TRANSLATION.md). What it draws from
 * sharing-view (valueLabel, the delete question, "Former journeyer") and the guide's title are
 * still the words the web shares word for word, and move with the web's.
 */
export default function HistoryScreen() {
  const { state } = useJourney();
  if (state.phase !== 'ready') return <JourneyNotOpen title={t('history.screen.name')} signedOut={t('history.screen.signedOut')} noJourneys={HISTORY_WITHOUT_JOURNEY} />;
  return <History snapshot={state.snapshot as unknown as SharingSnapshot} />;
}

function History({ snapshot }: { snapshot: SharingSnapshot }) {
  const { theme } = useTheme();
  const { client } = useSession();
  const { reload, refresh, refreshing } = useJourney();
  const { confirmConsequence, showStatus, showToast } = useShell();
  const [pending, setPending] = useState<string | null>(null);
  useReloadWhenShown();
  const concerns = concernsByRecency(snapshot.concerns);
  const events = historyEvents(snapshot);

  const remove = async (concern: ConcernRecord) => {
    if (!await confirmConsequence(CONSEQUENCES.deleteConcern(concern.title))) return;
    setPending(concern.id);
    try {
      await client.deleteConcern(snapshot.journey.id, concern.id, concern.version);
      await reload();
      showToast(t('history.concern.deleted'));
    } catch (error) {
      showStatus(accountMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <Screen title={t('history.screen.title', { journey: snapshot.journey.name })} lead={t('history.screen.lead')} refresh={{ refreshing, onRefresh: refresh }}>
      <Button kind="quiet" label={HISTORY_GUIDE_TITLE} onPress={() => router.push('/history-guide')} />
      <Text accessibilityRole="header" style={[styles.section, { color: theme.colors.fg }]}>{t('history.concerns.heading')}</Text>
      <Button label={t('history.concerns.start')} onPress={() => router.push('/concern')} />
      {concerns.length ? concerns.map((concern) => (
        <View key={concern.id} style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius.m }]}>
          <Text style={[styles.chip, { color: theme.colors.muted }]}>{t('history.concern.status', { status: concern.status })}</Text>
          <Text style={[styles.title, { color: theme.colors.fg }]}>{concern.title}</Text>
          {concern.detail ? <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{concern.detail}</Text> : null}
          <Text style={[styles.meta, { color: theme.colors.muted }]}>{t('history.concern.updated', { time: when(concern.updatedAt) })}</Text>
          <View style={styles.actions}>
            <Button kind="quiet" label={t('common.action.edit')} onPress={() => router.push({ pathname: '/concern', params: { id: concern.id } })} />
            <Button kind="quiet" label={t('common.action.delete')} pending={pending === concern.id} onPress={() => remove(concern)} />
          </View>
        </View>
      )) : <Body>{t('history.concerns.empty')}</Body>}

      <Text accessibilityRole="header" style={[styles.section, { color: theme.colors.fg }]}>{t('history.events.heading')}</Text>
      {events.length ? events.map((event) => <EventRow key={event.id} event={event} />) : <Body>{t('history.events.empty')}</Body>}
    </Screen>
  );
}

function EventRow({ event }: { event: ReturnType<typeof historyEvents>[number] }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius.m }]}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={[targetSize, styles.eventHead]}>
        <View style={styles.eventText}>
          <Text style={[styles.title, { color: theme.colors.fg }]}>{t('history.event.heading', { sequence: event.sequence, summary: event.summary })}</Text>
          <Text style={[styles.meta, { color: theme.colors.muted }]}>{t('history.event.byline', { actor: event.actorName, time: when(event.createdAt) })}</Text>
        </View>
        <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.toggle, { color: theme.colors.accent }]}>{open ? '−' : '＋'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.detail}>
          {event.changes.length ? event.changes.map(({ key, before, after }) => (
            <Text key={key} style={[styles.body, { color: theme.colors.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: theme.colors.fg }}>{key}</Text> {t('history.event.change', { before: valueLabel(key, before), after: valueLabel(key, after) })}
            </Text>
          )) : <Text style={[styles.body, { color: theme.colors.textSecondary }]}>{t('history.event.noChange')}</Text>}
          <Text style={[styles.meta, { color: theme.colors.muted }]}>
            {t('history.event.record', {
              id: event.id,
              hasPrevious: event.previousEventId ? 'yes' : 'no',
              previous: event.previousEventId,
              hasHash: event.eventHash ? 'yes' : 'no',
              hash: event.eventHash ? event.eventHash.slice(0, 12) : '',
            })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** A date and time for the active language, the way sharing-view's dateTimeLabel writes it. */
function when(value: string | null | undefined) {
  return format.dateTime(value) ?? t('common.time.notRecorded');
}

const styles = StyleSheet.create({
  section: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  card: { borderWidth: 1, padding: 14, gap: 4 },
  chip: { fontSize: 12, fontWeight: '900', letterSpacing: tracking(1), textTransform: 'uppercase' },
  title: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 18 },
  actions: { gap: 8, marginTop: 8 },
  eventHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventText: { flex: 1, gap: 2 },
  toggle: { fontSize: 20, fontWeight: '700' },
  detail: { gap: 6, marginTop: 6 },
});
