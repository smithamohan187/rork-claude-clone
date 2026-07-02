import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Share,
  Platform,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Snackbar, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Calendar,
  MapPin,
  Check,
} from 'lucide-react-native';
import { fetchEventById, type Event } from '@/api/services/eventsService';
import { fetchBusinessProfile, type BusinessProfile } from '@/api/services/businessProfileService';

const PURPLE = '#1A5C35';
const BG = '#F8F7FF';
const BORDER = '#E8F5EE';
const TEAL = '#1D9E75';

type WebNavigator = {
  share?: (data: { text: string }) => Promise<void>;
  canShare?: (data: { text: string }) => boolean;
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatEventTime(start: string, end: string | null): string {
  try {
    const s = new Date(start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (!end) return s;
    const e = new Date(end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${s} – ${e}`;
  } catch {
    return '—';
  }
}

function statusPillStyle(status: string): object {
  if (status === 'upcoming') return { backgroundColor: TEAL };
  if (status === 'cancelled') return { backgroundColor: '#E24B4A' };
  return { backgroundColor: '#6B7280' }; // past
}

export default function ViewEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; businessId?: string }>();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';
  const paramBizId = typeof params.businessId === 'string' ? params.businessId : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [isSubscribed] = useState(false);

  const fetchData = useCallback(async () => {
    if (!eventId) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const ev = await fetchEventById(eventId);
      setEvent(ev);
      const biz = await fetchBusinessProfile(paramBizId || ev.business_id);
      setBusiness(biz);
    } catch (e) {
      if (__DEV__) console.log('[ViewEvent] fetch error', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [eventId, paramBizId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubscribe = useCallback(() => {
    // Subscriptions module not yet built
    setSnackMsg('Subscription feature coming soon');
    setSnackVisible(true);
  }, []);

  const buildShareText = useCallback(() => {
    if (!event) return '';
    const date = formatEventDate(event.starts_at);
    const time = formatEventTime(event.starts_at, event.ends_at);
    const loc = event.location ? ` at ${event.location}` : '';
    const biz = business ? ` by ${business.name}` : '';
    return `${event.title}${biz} on ${date} at ${time}${loc}. Check it out on TouchPoints!`;
  }, [event, business]);

  const handleShareIcon = useCallback(async () => {
    const text = buildShareText();
    if (!text) return;
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as { navigator?: WebNavigator }).navigator;
        if (nav?.share && nav.canShare && nav.canShare({ text })) {
          await nav.share({ text });
          setSnackMsg('Event shared!');
          setSnackVisible(true);
        } else {
          await Clipboard.setStringAsync(text);
          setSnackMsg('Link copied to clipboard!');
          setSnackVisible(true);
        }
      } else {
        const result = await Share.share({ message: text });
        if (result.action === Share.sharedAction) {
          setSnackMsg('Event shared!');
          setSnackVisible(true);
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[ViewEvent] share error', e);
      await Clipboard.setStringAsync(text);
      setSnackMsg('Link copied to clipboard!');
      setSnackVisible(true);
    }
  }, [buildShareText]);

  const handleShareEvent = useCallback(async () => {
    const text = buildShareText();
    if (!text) return;
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as { navigator?: WebNavigator }).navigator;
        if (nav?.share && nav.canShare && nav.canShare({ text })) {
          await nav.share({ text });
          setSnackMsg('Event shared!');
          setSnackVisible(true);
        } else {
          await Clipboard.setStringAsync(text);
          setSnackMsg('Link copied to clipboard!');
          setSnackVisible(true);
        }
      } else {
        const result = await Share.share({ message: text });
        if (result.action === Share.sharedAction) {
          setSnackMsg('Event shared!');
          setSnackVisible(true);
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[ViewEvent] share error', e);
      await Clipboard.setStringAsync(text);
      setSnackMsg('Link copied to clipboard!');
      setSnackVisible(true);
    }
  }, [buildShareText]);

  if (loading) {
    return (
      <View style={styles.root} testID="view-event-screen">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />
        <View style={[styles.hero, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator color="#fff" />
        </View>
        <View style={styles.skeletonBlock} />
        <View style={[styles.skeletonBlock, { width: '60%' }]} />
        <View style={[styles.skeletonBlock, { width: '85%' }]} />
        <View style={[styles.skeletonBlock, { width: '70%' }]} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.root} testID="view-event-screen">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Event not available</Text>
          <Text style={styles.errorSub}>This event may have been removed or is no longer accessible.</Text>
          <Button mode="contained" buttonColor={PURPLE} onPress={() => router.back()} style={styles.goBackBtn}>
            Go Back
          </Button>
        </View>
      </View>
    );
  }

  const bizInitial = business?.name?.charAt(0)?.toUpperCase() ?? 'B';

  return (
    <View style={styles.root} testID="view-event-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroGlow2} />

          <View style={styles.calendarIllustration}>
            <View style={styles.circleOuter}>
              <View style={styles.circleInner}>
                <Text style={styles.calendarEmoji}>📅</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.iconCircle, styles.backBtn]}
            onPress={() => router.back()}
            testID="back-button"
          >
            <ArrowLeft size={18} color="#fff" strokeWidth={2.2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconCircle, styles.shareBtn]}
            testID="share-top-button"
            onPress={handleShareIcon}
          >
            <Share2 size={16} color="#fff" strokeWidth={2.2} />
          </TouchableOpacity>

          <View style={styles.pillsRow}>
            <View style={[styles.pill, statusPillStyle(event.effective_status)]}>
              <Text style={styles.pillText}>{event.effective_status}</Text>
            </View>
          </View>

          {/* Fade overlay bottom */}
          <View style={styles.heroFade1} />
          <View style={styles.heroFade2} />
          <View style={styles.heroFade3} />
        </View>

        {/* ORGANISER STRIP */}
        <View style={styles.organiserStrip}>
          {business?.logo_url ? (
            <Image source={{ uri: business.logo_url }} style={styles.logoSquare} resizeMode="cover" />
          ) : (
            <View style={styles.logoSquare}>
              <Text style={styles.logoText}>{bizInitial}</Text>
            </View>
          )}
          <View style={styles.organiserMiddle}>
            <View style={styles.organiserNameRow}>
              <Text style={styles.organiserName} numberOfLines={1}>
                {business?.name ?? '—'}
              </Text>
              {isSubscribed && (
                <View style={styles.subscribedChip} testID="subscribed-chip">
                  <Text style={styles.subscribedChipText}>Subscribed ✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.organiserSub} numberOfLines={1}>
              {[business?.category_name, business?.city].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity
            testID="view-organiser"
            onPress={() =>
              router.push({
                pathname: '/business-profile/[id]',
                params: { id: event.business_id },
              })
            }
          >
            <Text style={styles.viewLink}>View →</Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          {/* META */}
          <View style={styles.metaRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5EE' }]}>
              <Calendar size={16} color={PURPLE} strokeWidth={2} />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Date & time</Text>
              <Text style={styles.metaValue}>
                {formatEventDate(event.starts_at)} · {formatEventTime(event.starts_at, event.ends_at)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E1F5EE' }]}>
              <MapPin size={16} color={TEAL} strokeWidth={2} />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{event.location ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ABOUT */}
          <Text style={styles.sectionLabel}>ABOUT THIS EVENT</Text>
          <Text style={styles.bodyText}>{event.description ?? ''}</Text>

          <View style={styles.divider} />

          {/* SUBSCRIBE BANNER / SUCCESS STRIP */}
          {!isSubscribed ? (
            <View style={styles.subscribeBanner}>
              <Text style={styles.subscribeText}>
                Subscribe to {business?.name ?? 'this business'} to get exclusive access to events like this and earn reward points.
              </Text>
              <Button
                mode="contained"
                onPress={handleSubscribe}
                buttonColor={PURPLE}
                style={styles.subscribeNowPaperBtn}
                labelStyle={styles.subscribeNowPaperLabel}
                testID="subscribe-inline"
              >
                Subscribe Now
              </Button>
            </View>
          ) : (
            <View style={styles.successStrip} testID="subscribed-success">
              <View style={styles.successIconCircle}>
                <Check size={14} color="#fff" strokeWidth={3} />
              </View>
              <View style={styles.successTextWrap}>
                <Text style={styles.successTitle}>
                  You are subscribed to {business?.name ?? 'this business'}
                </Text>
                <Text style={styles.successSub}>
                  You earned 50 welcome points for joining!
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FIXED BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <Button
          mode="outlined"
          onPress={handleShareEvent}
          textColor={PURPLE}
          icon="share-variant"
          style={styles.shareEventPaperBtn}
          contentStyle={styles.shareEventPaperContent}
          labelStyle={styles.shareEventPaperLabel}
          testID="share-event-btn"
        >
          Share Event
        </Button>
        {!isSubscribed && (
          <Button
            mode="contained"
            onPress={handleSubscribe}
            buttonColor={PURPLE}
            style={styles.joinPaperBtn}
            contentStyle={styles.shareEventPaperContent}
            labelStyle={styles.shareEventPaperLabel}
            testID="subscribe-join-btn"
          >
            Subscribe & Join
          </Button>
        )}
      </View>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2500}
        style={{ backgroundColor: PURPLE }}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  hero: {
    height: 240,
    backgroundColor: PURPLE,
    position: 'relative',
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: '#1A5C35',
    opacity: 0.55,
    top: -80,
    alignSelf: 'center',
  },
  heroGlow2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#00B246',
    opacity: 0.35,
    top: 20,
    alignSelf: 'center',
  },
  calendarIllustration: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarEmoji: { fontSize: 40 },

  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 52,
  },
  backBtn: { left: 16 },
  shareBtn: { right: 16 },

  pillsRow: {
    position: 'absolute',
    bottom: 26,
    left: 16,
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: { color: '#fff', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  heroFade1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: BG,
    opacity: 0.6,
  },
  heroFade2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: BG,
    opacity: 0.85,
  },
  heroFade3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: BG,
  },

  organiserStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  logoSquare: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: PURPLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  organiserMiddle: { flex: 1, marginLeft: 10 },
  organiserName: { fontSize: 13, fontWeight: '700', color: PURPLE },
  organiserSub: { fontSize: 11, color: PURPLE, marginTop: 2 },
  viewLink: { color: PURPLE, fontSize: 10, fontWeight: '700' },

  content: { paddingHorizontal: 16 },

  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PURPLE,
    marginTop: 14,
    marginBottom: 12,
    lineHeight: 26,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: { marginLeft: 10, flex: 1 },
  metaLabel: { fontSize: 10, color: PURPLE, marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: '700', color: PURPLE },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 14,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PURPLE,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 12.5,
    color: PURPLE,
    lineHeight: 21,
  },

  subscribeBanner: {
    backgroundColor: '#E8F5EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8F5EE',
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
  },
  subscribeText: {
    fontSize: 12,
    color: '#1A5C35',
    lineHeight: 18,
    marginBottom: 8,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    gap: 8,
  },
  shareEventPaperBtn: {
    flex: 1,
    borderColor: PURPLE,
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  shareEventPaperContent: { paddingVertical: 4 },
  shareEventPaperLabel: { fontSize: 13, fontWeight: '700' },
  joinPaperBtn: {
    flex: 1,
    borderRadius: 10,
  },
  subscribeNowPaperBtn: {
    borderRadius: 8,
  },
  subscribeNowPaperLabel: { fontSize: 13, fontWeight: '700' },

  organiserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscribedChip: {
    backgroundColor: '#E1F5EE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subscribedChipText: {
    color: '#0F6E56',
    fontSize: 9,
    fontWeight: '700',
  },

  successStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E1F5EE',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TEAL,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  successIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TEAL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTextWrap: { flex: 1 },
  successTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F6E56',
  },
  successSub: {
    fontSize: 11,
    color: '#3d7a66',
    marginTop: 2,
  },

  // Loading / error
  skeletonBlock: {
    height: 16,
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    width: '80%',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorSub: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  goBackBtn: { borderRadius: 10 },
});
