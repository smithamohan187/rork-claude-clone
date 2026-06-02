import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, Linking, Platform, Pressable, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import { getBusinessReferralSettings, normaliseWebsiteUrl } from '@/services/businessReferralRegistry';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { OfferFeedItem } from '@/hooks/usePersonalisedFeed';
import { useComments } from '@/hooks/useComments';
import { FeedActionBar } from '@/components/feed/FeedActionBar';
import { CommentSection } from '@/components/feed/CommentSection';
import { SharePostSheet } from '@/components/feed/SharePostSheet';
import { ReferralPickerModal, type ReferralPickerSendResult } from '@/components/ReferralPickerModal';
import type { OfferSharePayload } from '@/contexts/ReferralChatContext';
import { pickFeedImage } from '@/constants/feedImages';
import ExpandableText from '../ExpandableText';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  offer: OfferFeedItem;
  onPress: () => void;
  onToggleBookmark: () => boolean;
  onShowToast: (msg: string) => void;
  activePanel: 'comments' | 'share' | null;
  onOpenPanel: (panel: 'comments' | 'share' | null) => void;
  currentUser: { name: string; initials: string; color: string };
}

function easeNext() {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

export const OfferFeedCard = React.memo(function OfferFeedCard({
  offer,
  onPress,
  onToggleBookmark,
  onShowToast,
  activePanel,
  onOpenPanel,
  currentUser,
}: Props) {
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const [referOpen, setReferOpen] = useState<boolean>(false);
  const [saveTooltip, setSaveTooltip] = useState<boolean>(false);
  const {
    comments,
    reactionCount,
    hasLiked,
    submitting,
    commentText,
    setCommentText,
    toggleLike,
    submitComment,
  } = useComments(offer.id, 'offer');

  const expiryInfo = useMemo(() => {
    const now = new Date();
    const exp = new Date(offer.expiryDate);
    const diffMs = exp.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const urgent = days < 3;
    return {
      label: days === 0 ? 'Expires today' : `Expires in ${days} day${days === 1 ? '' : 's'}`,
      urgent,
    };
  }, [offer.expiryDate]);

  const handleBookmark = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    const now = onToggleBookmark();
    onShowToast(now ? 'Saved to bookmarks' : 'Removed from bookmarks');
  }, [onToggleBookmark, onShowToast]);

  const initials = offer.businessName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const [coverFailed, setCoverFailed] = useState<boolean>(false);
  const coverUri = useMemo(
    () => pickFeedImage(offer.id, [offer.title, offer.description, offer.businessName]),
    [offer.id, offer.title, offer.description, offer.businessName],
  );

  const handleToggleComments = useCallback(() => {
    easeNext();
    onOpenPanel(activePanel === 'comments' ? null : 'comments');
  }, [activePanel, onOpenPanel]);

  const handleToggleShare = useCallback(() => {
    const settings = getBusinessReferralSettings(offer.businessId);
    if (!settings.optIn) {
      const url = normaliseWebsiteUrl(settings.website);
      if (!url) {
        onShowToast("This business hasn't set up a website yet.");
        return;
      }
      Linking.openURL(url).catch((e) => {
        console.log('[OfferFeedCard] openURL failed', e);
        onShowToast("Couldn't open the business website.");
      });
      return;
    }
    easeNext();
    onOpenPanel(activePanel === 'share' ? null : 'share');
  }, [activePanel, onOpenPanel, offer.businessId, onShowToast]);

  const handleRefer = useCallback(() => {
    setReferOpen(true);
  }, []);

  const handleReferSent = useCallback(
    (result: ReferralPickerSendResult) => {
      setReferOpen(false);
      if (result.recipientCount === 1 && result.firstRecipientName) {
        onShowToast(`Offer sent to ${result.firstRecipientName}!`);
      } else {
        onShowToast(`Offer shared with ${result.recipientCount} people!`);
      }
    },
    [onShowToast],
  );

  const handleSubmitComment = useCallback(() => {
    submitComment(currentUser.name, currentUser.initials, currentUser.color).catch((e) =>
      console.log('[Offer] comment error', e),
    );
  }, [submitComment, currentUser]);

  const showComments = activePanel === 'comments';
  const showShare = activePanel === 'share';

  return (
    <View style={styles.card} testID={`offer-card-${offer.id}`}>
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
            colors={['transparent', 'rgba(26,16,64,0.55)']}
            style={styles.coverGradient}
          />
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>OFFER</Text>
          </View>

          {/* Save bookmark overlay */}
          <TouchableOpacity
            style={styles.saveOverlay}
            onPress={(e) => { e.stopPropagation?.(); handleBookmark(); }}
            onLongPress={() => { setSaveTooltip(true); setTimeout(() => setSaveTooltip(false), 1500); }}
            hitSlop={6}
            activeOpacity={0.7}
          >
            <Bookmark
              size={15}
              color={offer.bookmarked ? '#1A5C35' : '#fff'}
              fill={offer.bookmarked ? '#1A5C35' : 'transparent'}
            />
          </TouchableOpacity>
          {saveTooltip ? (
            <View style={styles.saveTooltip} pointerEvents="none">
              <Text style={styles.saveTooltipText}>{offer.bookmarked ? 'Saved' : 'Save'}</Text>
            </View>
          ) : null}
      </Pressable>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          {logoFailed ? (
            <View style={[styles.logo, styles.logoFallback]}>
              <Text style={styles.logoInitials}>{initials}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: offer.businessLogo }}
              style={styles.logo}
              onError={() => setLogoFailed(true)}
              contentFit="cover"
            />
          )}
          <Text style={styles.businessName} numberOfLines={1}>{offer.businessName}</Text>
          <View style={styles.offerPill}>
            <Text style={styles.offerPillText}>OFFER</Text>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>{offer.title}</Text>
        <ExpandableText text={offer.description} />

        <View style={styles.footerRow}>
          <View style={[styles.expiryChip, expiryInfo.urgent ? styles.expiryChipUrgent : styles.expiryChipOk]}>
            <Text style={[styles.expiryChipText, expiryInfo.urgent ? styles.expiryChipTextUrgent : styles.expiryChipTextOk]}>
              {expiryInfo.label}
            </Text>
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

      <ReferralPickerModal
        visible={referOpen}
        onClose={() => setReferOpen(false)}
        offer={{
          offerId: offer.id,
          businessId: offer.businessId,
          businessName: offer.businessName,
          businessLogoUrl: offer.businessLogo,
          offerTitle: offer.title,
          offerDescription: offer.description,
          offerImageUrl: coverFailed ? undefined : coverUri,
          validUntil: offer.expiryDate,
          deepLink: `https://touchpoint.app/offer/${offer.id}`,
        } as OfferSharePayload}
        onSent={handleReferSent}
      />

      <SharePostSheet
        visible={showShare}
        onClose={() => {
          easeNext();
          onOpenPanel(null);
        }}
        onToast={onShowToast}
        postId={offer.id}
        postType="offer"
        authorName={offer.businessName}
        authorAvatarUrl={offer.businessLogo}
        contentPreview={`${offer.title}${offer.description ? ` — ${offer.description}` : ''}`}
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
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF7043',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#FF7043',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  body: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EDE9F6',
  },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoInitials: { color: '#1A5C35', fontSize: 11, fontWeight: '800' },
  businessName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1A5C35',
  },
  offerPill: {
    backgroundColor: '#FFF8E7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offerPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B47700',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A5C35',
    marginTop: 10,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1A1A1A',
    marginTop: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  expiryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  expiryChipOk: { backgroundColor: '#E1F5EE' },
  expiryChipUrgent: { backgroundColor: '#FDE7E7' },
  expiryChipText: { fontSize: 10, fontWeight: '700' },
  expiryChipTextOk: { color: '#0F6E56' },
  expiryChipTextUrgent: { color: '#B03A3A' },
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
