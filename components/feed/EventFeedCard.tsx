import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getBusinessReferralSettings, normaliseWebsiteUrl } from '@/services/businessReferralRegistry';
import { Image, type ImageLoadEventData } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { EventFeedItem } from '@/hooks/usePersonalisedFeed';
import { FeedActionBar } from '@/components/feed/FeedActionBar';
import LikersSheet from '@/components/feed/LikersSheet';
import CommentSheet from '@/components/feed/CommentSheet';
import { SharePostSheet } from '@/components/feed/SharePostSheet';
import { ReferOfferSheet } from '@/components/feed/ReferOfferSheet';
import { pickFeedImage } from '@/constants/feedImages';
import { EventHotBadge, EventPriceBadge, EventTagChips, formatEventDate } from '@/components/events/EventExtras';

interface Props {
  event: EventFeedItem;
  onPress: () => void;
  onToggleInterested: () => void;
  onToggleLike: (contentId: string) => void;
  onShowToast: (msg: string) => void;
  activePanel: 'comments' | 'share' | null;
  onOpenPanel: (panel: 'comments' | 'share' | null) => void;
  currentUser: { name: string; initials: string; color: string };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Instagram-style clamp: never let the cover photo go taller than a 4:5 portrait or
// wider than a 1.91:1 landscape, regardless of its real aspect ratio.
const MIN_ASPECT_RATIO = 4 / 5;
const MAX_ASPECT_RATIO = 1.91;

function clampAspectRatio(width: number, height: number): number {
  if (!width || !height) return MIN_ASPECT_RATIO;
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, width / height));
}

function easeNext() {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

export const EventFeedCard = React.memo(function EventFeedCard({
  event,
  onPress,
  onToggleInterested,
  onToggleLike,
  onShowToast,
  activePanel,
  onOpenPanel,
  currentUser,
}: Props) {
  const dateParts = useMemo(() => {
    const d = new Date(event.startDate ?? Date.now());
    return { day: d.getDate(), month: MONTHS[d.getMonth()] };
  }, [event.startDate]);

  const [coverFailed, setCoverFailed] = useState<boolean>(false);
  const [coverRatio, setCoverRatio] = useState<number>(MIN_ASPECT_RATIO);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const [referOpen, setReferOpen] = useState<boolean>(false);
  const [saveTooltip, setSaveTooltip] = useState<boolean>(false);
  const [likersOpen, setLikersOpen] = useState<boolean>(false);
  const [commentSheetOpen, setCommentSheetOpen] = useState<boolean>(false);
  const [localCommentCount, setLocalCommentCount] = useState<number>(event.comment_count ?? 0);
  const initials = event.businessName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const coverUri = useMemo(
    () => event.image_url || pickFeedImage(event.id, ['events', event.title, event.venue, event.businessName]),
    [event.image_url, event.id, event.title, event.venue, event.businessName],
  );

  const handleInterested = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    const willBeInterested = !event.interested;
    onToggleInterested();
    onShowToast(willBeInterested ? 'Added to your events' : 'Removed from your events');
  }, [onToggleInterested, onShowToast, event.interested]);

  const handleToggleComments = useCallback(() => {
    setCommentSheetOpen(true);
  }, []);

  const handleToggleShare = useCallback(() => {
    const settings = getBusinessReferralSettings(event.businessId);
    if (!settings.optIn) {
      const url = normaliseWebsiteUrl(settings.website);
      if (!url) {
        onShowToast("This business hasn't set up a website yet.");
        return;
      }
      Linking.openURL(url).catch((e) => {
        console.log('[EventFeedCard] openURL failed', e);
        onShowToast("Couldn't open the business website.");
      });
      return;
    }
    easeNext();
    onOpenPanel(activePanel === 'share' ? null : 'share');
  }, [activePanel, onOpenPanel, event.businessId, onShowToast]);

  const handleRefer = useCallback(() => {
    setReferOpen(true);
  }, []);

  const handleReferShared = useCallback(
    (recipientCount: number) => {
      onShowToast(recipientCount === 1 ? 'Event shared with 1 friend!' : `Event shared with ${recipientCount} friends!`);
    },
    [onShowToast],
  );

  const handleReferError = useCallback(
    (msg: string) => {
      onShowToast(msg);
    },
    [onShowToast],
  );

  const showShare = activePanel === 'share';

  return (
    <View style={styles.card} testID={`event-card-${event.id}`}>
      <View style={styles.header}>
        {logoFailed ? (
          <View style={[styles.logo, styles.logoFallback]}>
            <Text style={styles.logoInitials}>{initials}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: event.businessLogo }}
            style={styles.logo}
            onError={() => setLogoFailed(true)}
            contentFit="cover"
          />
        )}
        <Text style={styles.businessName} numberOfLines={1}>{event.businessName}</Text>
        <View style={styles.upcomingPill}>
          <Text style={styles.upcomingPillText}>UPCOMING</Text>
        </View>
      </View>

      <Pressable onPress={onPress} style={[styles.cover, { aspectRatio: coverRatio }]}>
          {coverFailed ? (
            <LinearGradient
              colors={['#00B246', '#1A5C35']}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Image
              source={{ uri: coverUri }}
              style={StyleSheet.absoluteFill}
              onError={() => setCoverFailed(true)}
              onLoad={(e: ImageLoadEventData) => setCoverRatio(clampAspectRatio(e.source.width, e.source.height))}
              contentFit="cover"
              transition={150}
            />
          )}
          <LinearGradient
            colors={['rgba(26,16,64,0.35)', 'transparent', 'rgba(26,16,64,0.45)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.floatDateBlock}>
            <Text style={styles.floatDateDay}>{dateParts.day}</Text>
            <Text style={styles.floatDateMonth}>{dateParts.month}</Text>
          </View>
          <View style={styles.eventPill}>
            <Text style={styles.eventPillText}>EVENT</Text>
          </View>

          {/* Save bookmark overlay */}
          <TouchableOpacity
            style={styles.saveOverlay}
            onPress={(e) => { e.stopPropagation?.(); handleInterested(); }}
            onLongPress={() => { setSaveTooltip(true); setTimeout(() => setSaveTooltip(false), 1500); }}
            hitSlop={6}
            activeOpacity={0.7}
          >
            <Bookmark
              size={15}
              color={event.interested ? '#E53935' : '#fff'}
              fill={event.interested ? '#E53935' : 'transparent'}
            />
          </TouchableOpacity>
          {saveTooltip ? (
            <View style={styles.saveTooltip} pointerEvents="none">
              <Text style={styles.saveTooltipText}>{event.interested ? 'Saved' : 'Save'}</Text>
            </View>
          ) : null}
      </Pressable>
      <View style={styles.body}>
        <View style={styles.row}>
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            <View style={styles.venueRow}>
              <MapPin size={12} color="#1A5C35" />
              <Text style={styles.venue} numberOfLines={1}>{event.venue}</Text>
            </View>
            <Text style={styles.dateRange}>
              {event.endDate
                ? `${formatEventDate(event.startDate)} – ${formatEventDate(event.endDate)}`
                : formatEventDate(event.startDate)}
            </Text>
            <View style={styles.badgeRow}>
              {event.isHot && <EventHotBadge />}
              <EventPriceBadge isFree={event.isFree} price={event.price} />
            </View>
            <EventTagChips tags={event.tags} />

            <Pressable
              style={[styles.interestedBtn, event.interested && styles.interestedBtnActive]}
              onPress={handleInterested}
              testID={`event-interested-${event.id}`}
            >
              <Text style={[styles.interestedBtnText, event.interested && styles.interestedBtnTextActive]}>
                {event.interested ? '✓ Interested' : 'Interested'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.actionBarWrap}>
        <FeedActionBar
          reactionCount={event.like_count}
          hasLiked={event.liked_by_me}
          isOwner={event.is_owner}
          commentCount={localCommentCount}
          showComments={commentSheetOpen}
          showShare={showShare}
          onLike={() => onToggleLike(event.id)}
          onOpenLikers={() => setLikersOpen(true)}
          onComment={handleToggleComments}
          onShare={handleToggleShare}
          onRefer={handleRefer}
        />
      </View>

      <LikersSheet
        visible={likersOpen}
        contentType="event"
        contentId={event.id}
        likeCount={event.like_count}
        onClose={() => setLikersOpen(false)}
      />

      <CommentSheet
        visible={commentSheetOpen}
        contentType="event"
        contentId={event.id}
        initialCommentCount={localCommentCount}
        onCountChange={setLocalCommentCount}
        onClose={() => setCommentSheetOpen(false)}
      />

      <SharePostSheet
        visible={showShare}
        onClose={() => {
          easeNext();
          onOpenPanel(null);
        }}
        onToast={onShowToast}
        postId={event.id}
        postType="event"
        businessId={event.businessId}
        authorName={event.businessName}
        contentPreview={`${event.title}${event.venue ? ` · ${event.venue}` : ''}`}
      />

      <ReferOfferSheet
        visible={referOpen}
        onClose={() => setReferOpen(false)}
        offer={{
          offerId: event.id,
          businessId: event.businessId,
          businessName: event.businessName,
          businessLogoUrl: event.businessLogo,
          title: event.title,
          contentType: 'event',
        }}
        onShared={handleReferShared}
        onError={handleReferError}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFEF',
  },
  cover: {
    width: '100%',
    backgroundColor: '#EDE9F6',
    position: 'relative',
  },
  floatDateBlock: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 54,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  floatDateDay: {
    color: '#1A5C35',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  floatDateMonth: {
    color: '#1A5C35',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  eventPill: {
    position: 'absolute',
    top: 14,
    right: 12,
    backgroundColor: 'rgba(26,16,64,0.72)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eventPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  body: {
    padding: 12,
  },
  actionBarWrap: {
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9F6',
  },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoInitials: { color: '#1A5C35', fontSize: 11, fontWeight: '800' },
  row: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  businessName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A5C35',
  },
  upcomingPill: {
    backgroundColor: '#E1F5EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  upcomingPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F6E56',
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A5C35',
    lineHeight: 19,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  venue: {
    flex: 1,
    fontSize: 11,
    color: '#1A5C35',
  },
  dateRange: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  interestedBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1A5C35',
    backgroundColor: 'transparent',
  },
  interestedBtnActive: {
    backgroundColor: '#1A5C35',
  },
  interestedBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A5C35',
  },
  interestedBtnTextActive: {
    color: '#fff',
  },
  saveOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  saveTooltip: {
    position: 'absolute',
    top: 42,
    right: 0,
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 11,
  },
  saveTooltipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
