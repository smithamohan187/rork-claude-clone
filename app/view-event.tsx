import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Share,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Snackbar, Button } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Calendar,
  MapPin,
  Users,
  Flame,
  Check,
} from 'lucide-react-native';

const PURPLE = '#1A5C35';
const DARK_PURPLE = '#1A5C35';
const BG = '#F8F7FF';
const BORDER = '#E8F5EE';
const MUTED = '#1A5C35';
const TEXT = '#1A5C35';
const TEAL = '#1D9E75';
const AMBER = '#F59E0B';

const eventData = {
  eventTitle: 'Annual Pastry & Coffee Festival 2025',
  businessName: "Richard's Pastry",
  businessCategory: 'Food & Bakery',
  businessCity: 'Kochi',
  eventType: 'In Person',
  isFreeEntry: true,
  date: 'Sunday, 20 April 2025',
  time: '5:00 PM – 9:00 PM',
  location: 'Lulu Mall Food Court, Kochi',
  maxAttendees: 150,
  spotsLeft: 42,
  description:
    'Join us for an evening of freshly baked artisan pastries, specialty coffees, and live music. Meet our master bakers, watch live demonstrations, and enjoy exclusive tasting sessions. This annual event brings together food lovers from across the city for an unforgettable evening.',
  isSubscribed: false,
};

const shareText =
  "Join me at Annual Pastry & Coffee Festival 2025 by Richard's Pastry on Sunday, 20 April 2025 at 5:00 PM \u2013 9:00 PM, Lulu Mall Food Court, Kochi. Check it out on TouchPoint!";

type WebNavigator = {
  share?: (data: { text: string }) => Promise<void>;
  canShare?: (data: { text: string }) => boolean;
};

export default function ViewEventScreen() {
  const router = useRouter();
  const businessId = 'biz-001';
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [subscribeLoading, setSubscribeLoading] = useState<boolean>(false);

  const handleSubscribe = () => {
    console.log('handleSubscribe pressed');
    setSubscribeLoading(true);
    setTimeout(() => {
      setSubscribeLoading(false);
      setIsSubscribed(true);
      setSnackMsg(
        "You are now subscribed to Richard's Pastry! You earned 50 welcome points."
      );
      setSnackVisible(true);
    }, 1500);
  };

  const handleShareIcon = async () => {
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as { navigator?: WebNavigator }).navigator;
        if (
          nav?.share &&
          nav.canShare &&
          nav.canShare({ text: shareText })
        ) {
          await nav.share({ text: shareText });
          setSnackMsg('Event shared!');
          setSnackVisible(true);
        } else {
          await Clipboard.setStringAsync(shareText);
          setSnackMsg('Link copied to clipboard!');
          setSnackVisible(true);
        }
      } else {
        const result = await Share.share({ message: shareText });
        if (result.action === Share.sharedAction) {
          setSnackMsg('Event shared!');
          setSnackVisible(true);
        }
      }
    } catch (error) {
      console.log('handleShareIcon error', error);
      await Clipboard.setStringAsync(shareText);
      setSnackMsg('Link copied to clipboard!');
      setSnackVisible(true);
    }
  };

  const handleShareEvent = async () => {
    try {
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as { navigator?: WebNavigator }).navigator;
        if (
          nav?.share &&
          nav.canShare &&
          nav.canShare({ text: shareText })
        ) {
          await nav.share({ text: shareText });
          setSnackMsg('Event shared! Subscribe to earn sharing points.');
          setSnackVisible(true);
        } else {
          await Clipboard.setStringAsync(shareText);
          setSnackMsg('Link copied to clipboard!');
          setSnackVisible(true);
        }
      } else {
        const result = await Share.share({ message: shareText });
        if (result.action === Share.sharedAction) {
          setSnackMsg('Event shared! Subscribe to earn sharing points.');
          setSnackVisible(true);
        }
      }
    } catch (error) {
      console.log('handleShareEvent error', error);
      await Clipboard.setStringAsync(shareText);
      setSnackMsg('Link copied to clipboard!');
      setSnackVisible(true);
    }
  };

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
            <View style={[styles.pill, styles.pillTeal]}>
              <Text style={styles.pillText}>{eventData.eventType}</Text>
            </View>
            {eventData.isFreeEntry && (
              <View style={[styles.pill, styles.pillWhite]}>
                <Text style={styles.pillText}>Free Entry</Text>
              </View>
            )}
          </View>

          {/* Fade overlay bottom */}
          <View style={styles.heroFade1} />
          <View style={styles.heroFade2} />
          <View style={styles.heroFade3} />
        </View>

        {/* ORGANISER STRIP */}
        <View style={styles.organiserStrip}>
          <View style={styles.logoSquare}>
            <Text style={styles.logoText}>RP</Text>
          </View>
          <View style={styles.organiserMiddle}>
            <View style={styles.organiserNameRow}>
              <Text style={styles.organiserName} numberOfLines={1}>
                {eventData.businessName}
              </Text>
              {isSubscribed && (
                <View style={styles.subscribedChip} testID="subscribed-chip">
                  <Text style={styles.subscribedChipText}>Subscribed ✓</Text>
                </View>
              )}
            </View>
            <Text style={styles.organiserSub} numberOfLines={1}>
              {eventData.businessCategory} · {eventData.businessCity}
            </Text>
          </View>
          <TouchableOpacity
            testID="view-organiser"
            onPress={() =>
              router.push({
                pathname: '/business-profile/[id]',
                params: { id: businessId },
              })
            }
          >
            <Text style={styles.viewLink}>View →</Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <Text style={styles.eventTitle}>{eventData.eventTitle}</Text>

          {/* META */}
          <View style={styles.metaRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5EE' }]}>
              <Calendar size={16} color={PURPLE} strokeWidth={2} />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Date & time</Text>
              <Text style={styles.metaValue}>
                {eventData.date} · {eventData.time}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.iconBox, { backgroundColor: '#E1F5EE' }]}>
              <MapPin size={16} color={TEAL} strokeWidth={2} />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{eventData.location}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.iconBox, { backgroundColor: '#FAEEDA' }]}>
              <Users size={16} color="#B45309" strokeWidth={2} />
            </View>
            <View style={styles.metaText}>
              <Text style={styles.metaLabel}>Capacity</Text>
              <Text style={styles.metaValue}>
                {eventData.maxAttendees} attendees
              </Text>
            </View>
          </View>

          {/* SPOTS LEFT STRIP */}
          <View style={styles.spotsStrip}>
            <Flame size={14} color={AMBER} strokeWidth={2.2} />
            <Text style={styles.spotsText}>
              Only {eventData.spotsLeft} spots remaining — register early!
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ABOUT */}
          <Text style={styles.sectionLabel}>ABOUT THIS EVENT</Text>
          <Text style={styles.bodyText}>{eventData.description}</Text>

          <View style={styles.divider} />

          {/* WHAT TO EXPECT */}
          <Text style={styles.sectionLabel}>WHAT TO EXPECT</Text>

          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: PURPLE }]} />
            <Text style={styles.bulletText}>
              Live pastry-making demonstration
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: TEAL }]} />
            <Text style={styles.bulletText}>
              Specialty coffee tasting station
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: AMBER }]} />
            <Text style={styles.bulletText}>
              Live acoustic music from 6 PM
            </Text>
          </View>

          {/* SUBSCRIBE BANNER / SUCCESS STRIP */}
          {!isSubscribed ? (
            <View style={styles.subscribeBanner}>
              <Text style={styles.subscribeText}>
                Subscribe to {eventData.businessName} to get exclusive access to
                events like this and earn reward points.
              </Text>
              <Button
                mode="contained"
                onPress={handleSubscribe}
                loading={subscribeLoading}
                disabled={subscribeLoading}
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
                  You are subscribed to {eventData.businessName}
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
            loading={subscribeLoading}
            disabled={subscribeLoading}
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
        style={{ backgroundColor: DARK_PURPLE }}
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
    backgroundColor: DARK_PURPLE,
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
  pillTeal: { backgroundColor: TEAL },
  pillWhite: { backgroundColor: 'rgba(255,255,255,0.22)' },
  pillText: { color: '#fff', fontSize: 10, fontWeight: '600' },

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
  organiserName: { fontSize: 13, fontWeight: '700', color: DARK_PURPLE },
  organiserSub: { fontSize: 11, color: MUTED, marginTop: 2 },
  viewLink: { color: PURPLE, fontSize: 10, fontWeight: '700' },

  content: { paddingHorizontal: 16 },

  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DARK_PURPLE,
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
  metaLabel: { fontSize: 10, color: MUTED, marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: '700', color: DARK_PURPLE },

  spotsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AMBER,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  spotsText: { fontSize: 11, color: '#92400E', fontWeight: '500', flex: 1 },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 14,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: MUTED,
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 12.5,
    color: TEXT,
    lineHeight: 21,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
  bulletText: { fontSize: 12.5, color: TEXT },

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
  subscribeBtn: {
    backgroundColor: PURPLE,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  subscribeBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

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
  bottomBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  shareEventBtn: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    backgroundColor: 'transparent',
  },
  shareEventText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
  shareEventPaperBtn: {
    flex: 1,
    borderColor: PURPLE,
    borderWidth: 1.5,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  shareEventPaperContent: { paddingVertical: 4 },
  shareEventPaperLabel: { fontSize: 13, fontWeight: '700' },
  joinBtn: { backgroundColor: PURPLE },
  joinBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
});
