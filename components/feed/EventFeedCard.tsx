import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { getBusinessReferralSettings, normaliseWebsiteUrl } from '@/services/businessReferralRegistry';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { EventFeedItem } from '@/hooks/usePersonalisedFeed';
import { useComments } from '@/hooks/useComments';
import { FeedActionBar } from '@/components/feed/FeedActionBar';
import { CommentSection } from '@/components/feed/CommentSection';
import { SharePostSheet } from '@/components/feed/SharePostSheet';
import { pickFeedImage } from '@/constants/feedImages';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  event: EventFeedItem;
  onPress: () => void;
  onToggleInterested: () => boolean;
  onShowToast: (msg: string) => void;
  activePanel: 'comments' | 'share' | null;
  onOpenPanel: (panel: 'comments' | 'share' | null) => void;
  currentUser: { name: string; initials: string; color: string };
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function easeNext() {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

export const EventFeedCard = React.memo(function EventFeedCard({
  event,
  onPress,
  onToggleInterested,
  onShowToast,
  activePanel,
  onOpenPanel,
  currentUser,
}: Props) {
  const router = useRouter();
  const dateParts = useMemo(() => {
    const d = new Date(event.startDate);
    return { day: d.getDate(), month: MONTHS[d.getMonth()] };
  }, [event.startDate]);

  const [coverFailed, setCoverFailed] = useState<boolean>(false);
  const [saveTooltip, setSaveTooltip] = useState<boolean>(false);
  const coverUri = useMemo(
    () => pickFeedImage(event.id, ['events', event.title, event.venue, event.businessName]),
    [event.id, event.title, event.venue, event.businessName],
  );

  const {
    comments,
    reactionCount,
    hasLiked,
    submitting,
    commentText,
    setCommentText,
    toggleLike,
    submitComment,
  } = useComments(event.id, 'event');

  const handleInterested = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    const now = onToggleInterested();
    onShowToast(now ? 'Added to your events' : 'Removed from your events');
  }, [onToggleInterested, onShowToast]);

  const handleToggleComments = useCallback(() => {
    easeNext();
    onOpenPanel(activePanel === 'comments' ? null : 'comments');
  }, [activePanel, onOpenPanel]);

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
    const query = `?businessId=${encodeURIComponent(event.businessId)}&postId=${encodeURIComponent(event.id)}`;
    router.push(`/my-referrals${query}` as never);
  }, [router, event.businessId, event.id]);

  const handleSubmitComment = useCallback(() => {
    submitComment(currentUser.name, currentUser.initials, currentUser.color).catch((e) =>
      console.log('[Event] comment error', e),
    );
  }, [submitComment, currentUser]);

  const showComments = activePanel === 'comments';
  const showShare = activePanel === 'share';

  return (
    <View style={styles.card} testID={`event-card-${event.id}`}>
      <Pressable onPress={onPress} style={styles.cover}>
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
              color={event.interested ? '#1A5C35' : '#fff'}
              fill={event.interested ? '#1A5C35' : 'transparent'}
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
            <View style={styles.metaRow}>
              <Text style={styles.businessName} numberOfLines={1}>{event.businessName}</Text>
              <View style={styles.upcomingPill}>
                <Text style={styles.upcomingPillText}>UPCOMING</Text>
              </View>
            </View>
            <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
            <View style={styles.venueRow}>
              <MapPin size={12} color="#1A5C35" />
              <Text style={styles.venue} numberOfLines={1}>{event.venue}</Text>
            </View>

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

      <FeedActionBar
        reactionCount={reactionCount}
        hasLiked={hasLiked}
        commentCount={comments.length}
        showComments={showComments}
        showShare={showShare}
        onLike={toggleLike}
        onComment={handleToggleComments}
        onShare={handleToggleShare}
        onRefer={handleRefer}
      />

      {showComments ? (
        <CommentSection
          comments={comments}
          commentText={commentText}
          setCommentText={setCommentText}
          submitting={submitting}
          onSubmit={handleSubmitComment}
          currentUserInitials={currentUser.initials}
          currentUserColor={currentUser.color}
        />
      ) : null}

      <SharePostSheet
        visible={showShare}
        onClose={() => {
          easeNext();
          onOpenPanel(null);
        }}
        onToast={onShowToast}
        postId={event.id}
        postType="event"
        authorName={event.businessName}
        contentPreview={`${event.title}${event.venue ? ` · ${event.venue}` : ''}`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  cover: {
    height: 160,
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
    padding: 14,
  },
  row: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  businessName: {
    flex: 1,
    fontSize: 11,
    color: '#1A5C35',
    fontWeight: '600',
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
    marginTop: 4,
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
