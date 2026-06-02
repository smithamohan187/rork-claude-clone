import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Share2, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { SubscribedBusiness } from '@/hooks/usePersonalisedFeed';
import { SharePostSheet } from '@/components/feed/SharePostSheet';
import { StarRatingDisplay } from '@/components/ratings/StarRatingDisplay';
import { pickFeedImage } from '@/constants/feedImages';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
  business: SubscribedBusiness;
  onSubscribe: () => void;
  onViewProfile: () => void;
  activePanel: 'share' | null;
  onOpenPanel: (panel: 'share' | null) => void;
  onShowToast: (msg: string) => void;
}

function easeNext() {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

export const DiscoveryCard = React.memo(function DiscoveryCard({
  business,
  onSubscribe,
  onViewProfile,
  activePanel,
  onOpenPanel,
  onShowToast,
}: Props) {
  const [failed, setFailed] = useState<boolean>(false);
  const [coverFailed, setCoverFailed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const coverUri = useMemo(
    () => pickFeedImage(business.id, [business.category, business.name, business.bio]),
    [business.id, business.category, business.name, business.bio],
  );

  const initials = business.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const handleSubscribe = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    setLoading(true);
    onSubscribe();
  }, [onSubscribe]);

  const toggleShare = useCallback(() => {
    easeNext();
    onOpenPanel(activePanel === 'share' ? null : 'share');
  }, [activePanel, onOpenPanel]);

  return (
    <View style={styles.card} testID={`discovery-card-${business.id}`}>
      <View style={styles.cover}>
        {coverFailed ? (
          <LinearGradient
            colors={[business.categoryColor, '#1A5C35']}
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
          colors={['rgba(26,16,64,0.15)', 'rgba(26,16,64,0.55)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.suggestPill}>
          <Text style={styles.suggestPillText}>YOU MIGHT LIKE</Text>
        </View>
        <Pressable onPress={toggleShare} hitSlop={8} style={styles.shareBtnOverlay} testID={`discovery-share-${business.id}`}>
          <Share2 size={14} color={'#fff'} />
          <Text style={styles.shareTextOverlay}>Share</Text>
        </Pressable>
        <View style={styles.logoWrap}>
          {failed ? (
            <View style={[styles.logoOverlay, { backgroundColor: business.categoryColor }]}>
              <Text style={styles.logoInitials}>{initials}</Text>
            </View>
          ) : (
            <Image
              source={{ uri: business.logoUrl }}
              style={styles.logoOverlay}
              onError={() => setFailed(true)}
              contentFit="cover"
            />
          )}
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{business.name}</Text>
          <View style={[styles.categoryChip, { backgroundColor: business.categoryColor + '22' }]}>
            <Text style={[styles.categoryChipText, { color: business.categoryColor }]}>{business.category}</Text>
          </View>
          <Text style={styles.bio} numberOfLines={1}>{business.bio}</Text>
          <View style={styles.subsRow}>
            <Users size={11} color="#1A5C35" />
            <Text style={styles.subsText}>{business.subscriberCount.toLocaleString()} subscribers</Text>
          </View>
          <View style={styles.ratingRow}>
            <StarRatingDisplay
              averageRating={(business as unknown as { averageRating?: number }).averageRating ?? 4.2}
              ratingCount={(business as unknown as { ratingCount?: number }).ratingCount ?? 0}
              size="small"
              showCount={true}
            />
          </View>
        </View>
      </View>

      <View style={styles.actionsWrap}>
      <View style={styles.actions}>
        <Pressable
          style={[styles.subscribeBtn, loading && styles.subscribeBtnLoading]}
          onPress={handleSubscribe}
          disabled={loading}
          testID={`discovery-subscribe-${business.id}`}
        >
          <Text style={styles.subscribeBtnText}>{loading ? 'Subscribed' : 'Subscribe'}</Text>
        </Pressable>
        <Pressable style={styles.viewBtn} onPress={onViewProfile} hitSlop={8}>
          <Text style={styles.viewBtnText}>View Profile →</Text>
        </Pressable>
      </View>
      </View>

      <SharePostSheet
        visible={activePanel === 'share'}
        onClose={() => {
          easeNext();
          onOpenPanel(null);
        }}
        onToast={onShowToast}
        postId={business.id}
        postType="broadcast"
        authorName={business.name}
        authorAvatarUrl={business.logoUrl}
        contentPreview={business.bio ?? ''}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F7F6FB',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  cover: {
    height: 140,
    width: '100%',
    backgroundColor: '#EDE9F6',
    position: 'relative',
  },
  suggestPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  suggestPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#1A5C35',
  },
  shareBtnOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(26,16,64,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  shareTextOverlay: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  logoWrap: {
    position: 'absolute',
    bottom: -22,
    left: 14,
    padding: 3,
    borderRadius: 32,
    backgroundColor: '#F7F6FB',
  },
  logoOverlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE9F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingTop: 30,
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  actionsWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  topLabel: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#1A5C35',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shareText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A5C35',
  },
  shareTextActive: {
    color: '#1A5C35',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  logoInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  info: { flex: 1 },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A5C35',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 4,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bio: {
    fontSize: 12,
    color: '#1A5C35',
    marginTop: 6,
  },
  subsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  subsText: {
    fontSize: 11,
    color: '#1A5C35',
  },
  ratingRow: {
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  subscribeBtn: {
    backgroundColor: '#1A5C35',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
  },
  subscribeBtnLoading: { opacity: 0.7 },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  viewBtn: {},
  viewBtnText: {
    color: '#1A5C35',
    fontSize: 12,
    fontWeight: '700',
  },
});
