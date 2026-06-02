import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal, Portal, Snackbar } from 'react-native-paper';

import type { FeedItem } from '@/hooks/usePersonalisedFeed';
import { getFullFeedPayload } from '@/services/fullFeedStore';
import { pickFeedImage } from '@/constants/feedImages';
import { BrandedShareGrid } from '@/components/feed/BrandedShareGrid';
import { ReferralPickerModal, type ReferralPickerSendResult } from '@/components/ReferralPickerModal';
import type { OfferSharePayload } from '@/contexts/ReferralChatContext';

interface MockComment {
  id: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  createdAt: number;
  likes: number;
  liked: boolean;
}

interface ItemSocialState {
  liked: boolean;
  likeCount: number;
  saved: boolean;
  comments: MockComment[];
}

const TYPE_COLORS = {
  offer: { bg: '#10B981', label: 'Offer' },
  event: { bg: '#3B82F6', label: 'Event' },
  update: { bg: '#00B246', label: 'Update' },
} as const;

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function buildSeedComments(itemId: string): MockComment[] {
  const base = itemId.charCodeAt(0) || 1;
  const seeds: { name: string; initials: string; color: string; text: string }[] = [
    { name: 'Aarav', initials: 'AA', color: '#1A5C35', text: 'This looks amazing — adding to my list!' },
    { name: 'Maya', initials: 'MA', color: '#EC4899', text: 'Was just there last week, highly recommend 🙌' },
    { name: 'Devon', initials: 'DE', color: '#10B981', text: 'Anyone going on the weekend?' },
  ];
  return seeds.slice(0, (base % 3) + 1).map((s, i) => ({
    id: `${itemId}-seed-${i}`,
    authorName: s.name,
    authorInitials: s.initials,
    authorColor: s.color,
    text: s.text,
    createdAt: Date.now() - (i + 1) * 1000 * 60 * 47,
    likes: (base + i) % 9,
    liked: false,
  }));
}

export default function FullScreenFeedScreen() {
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { items, index } = useMemo(() => getFullFeedPayload(), []);
  const [activeIndex, setActiveIndex] = useState<number>(index);
  const flatListRef = useRef<FlatList<FeedItem> | null>(null);

  const [socialMap, setSocialMap] = useState<Record<string, ItemSocialState>>(() => {
    const init: Record<string, ItemSocialState> = {};
    items.forEach((it) => {
      const baseLikes = 12 + ((it.id.charCodeAt(0) || 0) % 240);
      init[it.id] = {
        liked: false,
        likeCount: baseLikes,
        saved: it.feedType === 'offer' ? !!it.bookmarked : it.feedType === 'event' ? !!it.interested : false,
        comments: buildSeedComments(it.id),
      };
    });
    return init;
  });

  const [commentSheetOpen, setCommentSheetOpen] = useState<boolean>(false);
  const [shareSheetOpen, setShareSheetOpen] = useState<boolean>(false);
  const [referOpen, setReferOpen] = useState<boolean>(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState<boolean>(false);
  const [commentDraft, setCommentDraft] = useState<string>('');
  const [snack, setSnack] = useState<{ visible: boolean; msg: string }>({ visible: false, msg: '' });

  const showToast = useCallback((msg: string) => setSnack({ visible: true, msg }), []);

  const getItemLayout = useCallback(
    (_: ArrayLike<FeedItem> | null | undefined, i: number) => ({
      length: screenHeight,
      offset: screenHeight * i,
      index: i,
    }),
    [screenHeight],
  );

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      const wait = new Promise((resolve) => setTimeout(resolve, 100));
      wait.then(() => {
        flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
      });
    },
    [],
  );

  useEffect(() => {
    if (index > 0) {
      const t = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      }, 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [index]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number') {
      setActiveIndex(first.index);
    }
  }).current;

  const updateSocial = useCallback(
    (id: string, patch: (s: ItemSocialState) => ItemSocialState) => {
      setSocialMap((prev) => ({ ...prev, [id]: patch(prev[id]) }));
    },
    [],
  );

  const activeItem = items[activeIndex];
  const activeSocial = activeItem ? socialMap[activeItem.id] : undefined;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleLike = useCallback(() => {
    if (!activeItem) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    updateSocial(activeItem.id, (s) => ({
      ...s,
      liked: !s.liked,
      likeCount: s.liked ? Math.max(0, s.likeCount - 1) : s.likeCount + 1,
    }));
  }, [activeItem, updateSocial]);

  const handleSave = useCallback(() => {
    if (!activeItem) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    updateSocial(activeItem.id, (s) => ({ ...s, saved: !s.saved }));
    showToast(socialMap[activeItem.id]?.saved ? 'Removed from saved' : 'Saved');
  }, [activeItem, updateSocial, socialMap, showToast]);

  const handleShare = useCallback(() => {
    setShareSheetOpen(true);
  }, []);

  const handleRefer = useCallback(() => {
    if (!activeItem) return;
    if (activeItem.feedType === 'offer') {
      setReferOpen(true);
      return;
    }
    const query = `?businessId=${encodeURIComponent(activeItem.businessId)}&postId=${encodeURIComponent(activeItem.id)}`;
    router.push(`/my-referrals${query}` as never);
  }, [activeItem, router]);

  const handleReferSent = useCallback(
    (result: ReferralPickerSendResult) => {
      setReferOpen(false);
      if (result.recipientCount === 1 && result.firstRecipientName) {
        showToast(`Offer sent to ${result.firstRecipientName}!`);
      } else {
        showToast(`Offer shared with ${result.recipientCount} people!`);
      }
    },
    [showToast],
  );

  const shareMeta = useMemo(() => {
    if (!activeItem) {
      return { message: '', link: '', subject: '' };
    }
    const typeLabel = activeItem.feedType === 'offer' ? 'Offer' : 'Event';
    const link = `https://touchpoint.app/${activeItem.feedType}/${activeItem.id}`;
    return {
      message: `${activeItem.businessName} has a new ${typeLabel}: ${activeItem.title} — check it out on TouchPoint! ${link}`,
      link,
      subject: `${activeItem.businessName} on TouchPoint`,
    };
  }, [activeItem]);

  const referOffer: OfferSharePayload | null = useMemo(() => {
    if (!activeItem || activeItem.feedType !== 'offer') return null;
    return {
      offerId: activeItem.id,
      businessId: activeItem.businessId,
      businessName: activeItem.businessName,
      businessLogoUrl: activeItem.businessLogo,
      offerTitle: activeItem.title,
      offerDescription: activeItem.description,
      validUntil: activeItem.expiryDate,
      deepLink: `https://touchpoint.app/offer/${activeItem.id}`,
    };
  }, [activeItem]);

  const handleSubmitComment = useCallback(() => {
    if (!activeItem) return;
    const txt = commentDraft.trim();
    if (!txt) return;
    const newC: MockComment = {
      id: `${activeItem.id}-${Date.now()}`,
      authorName: 'You',
      authorInitials: 'YO',
      authorColor: '#1A5C35',
      text: txt,
      createdAt: Date.now(),
      likes: 0,
      liked: false,
    };
    updateSocial(activeItem.id, (s) => ({ ...s, comments: [...s.comments, newC] }));
    setCommentDraft('');
  }, [activeItem, commentDraft, updateSocial]);

  const handleToggleCommentLike = useCallback(
    (commentId: string) => {
      if (!activeItem) return;
      updateSocial(activeItem.id, (s) => ({
        ...s,
        comments: s.comments.map((c) =>
          c.id === commentId
            ? { ...c, liked: !c.liked, likes: c.liked ? Math.max(0, c.likes - 1) : c.likes + 1 }
            : c,
        ),
      }));
    },
    [activeItem, updateSocial],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      StatusBar.setBarStyle('light-content', true);
    }
    return () => {
      if (Platform.OS !== 'web') {
        StatusBar.setBarStyle('default', true);
      }
    };
  }, []);

  if (items.length === 0) {
    return (
      <View style={[styles.root, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.emptyText}>No posts to show.</Text>
        <Pressable onPress={handleBack} style={styles.emptyBtn} testID="full-feed-empty-back">
          <Text style={styles.emptyBtnText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(it) => `${it.feedType}-${it.id}`}
        renderItem={({ item }) => (
          <FullFeedItem
            item={item}
            social={socialMap[item.id]}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            insetTop={insets.top}
            insetBottom={insets.bottom}
          />
        )}
        pagingEnabled
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        initialScrollIndex={index}
        getItemLayout={getItemLayout}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        removeClippedSubviews
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        testID="full-feed-list"
      />

      {/* Top-left back */}
      <Pressable
        onPress={handleBack}
        style={[styles.backBtn, { top: insets.top + 12 }]}
        testID="full-feed-back"
        hitSlop={12}
      >
        <MaterialCommunityIcons name="arrow-left" color="#fff" size={26} />
      </Pressable>

      {/* Right-side action rail */}
      {activeItem && activeSocial ? (
        <View
          style={[
            styles.actionRail,
            { bottom: Math.max(insets.bottom + 80, screenHeight * 0.22) },
          ]}
          pointerEvents="box-none"
        >
          <ActionButton
            icon={activeSocial.liked ? 'thumb-up' : 'thumb-up-outline'}
            label={String(activeSocial.likeCount)}
            tint={activeSocial.liked ? '#1A5C35' : '#fff'}
            onPress={handleLike}
            testID="full-feed-like"
          />
          <ActionButton
            icon="comment-outline"
            label={String(activeSocial.comments.length)}
            tint="#fff"
            onPress={() => setCommentSheetOpen(true)}
            testID="full-feed-comment"
          />
          <ActionButton
            icon="share-variant"
            label="Share"
            tint="#fff"
            onPress={handleShare}
            testID="full-feed-share"
          />
          <ActionButton
            icon="account-plus"
            label="Refer"
            tint="#fff"
            onPress={handleRefer}
            testID="full-feed-refer"
          />
          <ActionButton
            icon={activeSocial.saved ? 'bookmark' : 'bookmark-outline'}
            label="Save"
            tint={activeSocial.saved ? '#FFC107' : '#fff'}
            onPress={handleSave}
            testID="full-feed-save"
          />
          <ActionButton
            icon="dots-vertical"
            label=""
            tint="#fff"
            iconSize={26}
            onPress={() => setMoreSheetOpen(true)}
            testID="full-feed-more"
          />
        </View>
      ) : null}

      {/* Comment sheet */}
      <Portal>
        <Modal
          visible={commentSheetOpen}
          onDismiss={() => setCommentSheetOpen(false)}
          contentContainerStyle={styles.modalSheet}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.commentSheet}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments</Text>
              <Pressable onPress={() => setCommentSheetOpen(false)} hitSlop={12} testID="comment-sheet-close">
                <MaterialCommunityIcons name="close" size={24} color="#1A5C35" />
              </Pressable>
            </View>
            <FlatList
              data={activeSocial?.comments ?? []}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.commentList}
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  <View style={[styles.commentAvatar, { backgroundColor: c.authorColor }]}>
                    <Text style={styles.commentAvatarText}>{c.authorInitials}</Text>
                  </View>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{c.authorName}</Text>
                      <Text style={styles.commentTime}>{relativeTime(c.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                  <Pressable
                    onPress={() => handleToggleCommentLike(c.id)}
                    style={styles.commentLike}
                    hitSlop={8}
                    testID={`comment-like-${c.id}`}
                  >
                    <MaterialCommunityIcons
                      name={c.liked ? 'thumb-up' : 'thumb-up-outline'}
                      size={18}
                      color={c.liked ? '#1A5C35' : '#1A5C35'}
                    />
                    {c.likes > 0 ? <Text style={styles.commentLikeCount}>{c.likes}</Text> : null}
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.commentEmpty}>
                  <Text style={styles.commentEmptyText}>Be the first to comment</Text>
                </View>
              }
            />
            <View style={styles.commentInputRow}>
              <TextInput
                value={commentDraft}
                onChangeText={setCommentDraft}
                placeholder="Add a comment..."
                placeholderTextColor="#E8F5EE"
                style={styles.commentInput}
                returnKeyType="send"
                onSubmitEditing={handleSubmitComment}
                testID="comment-input"
              />
              <Pressable
                onPress={handleSubmitComment}
                disabled={!commentDraft.trim()}
                style={[styles.sendBtn, !commentDraft.trim() ? styles.sendBtnDisabled : null]}
                testID="comment-send"
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color={commentDraft.trim() ? '#fff' : '#E8F5EE'}
                />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Share sheet */}
        <Modal
          visible={shareSheetOpen}
          onDismiss={() => setShareSheetOpen(false)}
          contentContainerStyle={styles.modalSheetSmall}
        >
          <View style={styles.shareSheet}>
            <View style={styles.sheetGrabber} />
            <View style={styles.shareSheetHeader}>
              <Text style={styles.shareSheetTitle}>Share</Text>
              <Pressable onPress={() => setShareSheetOpen(false)} hitSlop={12} testID="share-sheet-close">
                <MaterialCommunityIcons name="close" size={22} color="#1A5C35" />
              </Pressable>
            </View>
            <View style={styles.shareSheetBody}>
              <BrandedShareGrid
                message={shareMeta.message}
                link={shareMeta.link}
                emailSubject={shareMeta.subject}
                onToast={(m) => {
                  setShareSheetOpen(false);
                  showToast(m);
                }}
                testIDPrefix="full-feed-share"
              />
            </View>
          </View>
        </Modal>

        {/* More actions sheet */}
        <Modal
          visible={moreSheetOpen}
          onDismiss={() => setMoreSheetOpen(false)}
          contentContainerStyle={styles.modalSheetSmall}
        >
          <View style={styles.moreSheet}>
            <View style={styles.sheetGrabber} />
            <Pressable
              style={styles.moreRow}
              onPress={() => {
                setMoreSheetOpen(false);
                showToast('Thanks for your feedback');
              }}
              testID="more-report"
            >
              <MaterialCommunityIcons name="flag-outline" size={22} color="#B03A3A" />
              <Text style={[styles.moreText, { color: '#B03A3A' }]}>Report this post</Text>
            </Pressable>
            <Pressable
              style={styles.moreRow}
              onPress={() => {
                setMoreSheetOpen(false);
                showToast('Thanks for your feedback');
              }}
              testID="more-not-interested"
            >
              <MaterialCommunityIcons name="eye-off-outline" size={22} color="#1A5C35" />
              <Text style={styles.moreText}>Not interested</Text>
            </Pressable>
            <Pressable
              style={[styles.moreRow, styles.moreCancel]}
              onPress={() => setMoreSheetOpen(false)}
              testID="more-cancel"
            >
              <Text style={[styles.moreText, { color: '#1A5C35' }]}>Cancel</Text>
            </Pressable>
          </View>
        </Modal>
      </Portal>

      {referOffer ? (
        <ReferralPickerModal
          visible={referOpen}
          onClose={() => setReferOpen(false)}
          offer={referOffer}
          onSent={handleReferSent}
        />
      ) : null}

      <Snackbar
        visible={snack.visible}
        onDismiss={() => setSnack({ visible: false, msg: '' })}
        duration={2200}
        style={styles.snackbar}
      >
        {snack.msg}
      </Snackbar>
    </View>
  );
}

interface ActionButtonProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  tint: string;
  onPress: () => void;
  iconSize?: number;
  testID?: string;
}

function ActionButton({ icon, label, tint, onPress, iconSize, testID }: ActionButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.actionBtn} hitSlop={8} testID={testID}>
      <MaterialCommunityIcons name={icon} size={iconSize ?? 30} color={tint} />
      {label ? <Text style={[styles.actionLabel, { color: tint }]}>{label}</Text> : null}
    </Pressable>
  );
}

interface FullFeedItemProps {
  item: FeedItem;
  social: ItemSocialState | undefined;
  screenWidth: number;
  screenHeight: number;
  insetTop: number;
  insetBottom: number;
}

const FullFeedItem = React.memo(function FullFeedItem({
  item,
  screenWidth,
  screenHeight,
  insetTop,
  insetBottom,
}: FullFeedItemProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [imageFailed, setImageFailed] = useState<boolean>(false);
  const description =
    item.feedType === 'offer' ? item.description : `${item.venue}`;
  const coverUri = useMemo(
    () => pickFeedImage(item.id, [item.title, description, item.businessName]),
    [item.id, item.title, description, item.businessName],
  );
  const initials = item.businessName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const typeKey: keyof typeof TYPE_COLORS = item.feedType === 'offer' ? 'offer' : 'event';
  const typeMeta = TYPE_COLORS[typeKey];

  return (
    <View
      style={[
        styles.itemRoot,
        { width: screenWidth, height: screenHeight },
      ]}
    >
      {imageFailed ? (
        <LinearGradient
          colors={['#1A5C35', '#1A5C35']}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          onError={() => setImageFailed(true)}
          resizeMode="cover"
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        style={[styles.gradTop, { height: Math.max(160, insetTop + 140) }]}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[styles.gradBottom, { height: screenHeight * 0.55 }]}
      />

      {/* Top-right business chip */}
      <View
        style={[
          styles.topRight,
          { top: insetTop + 12, maxWidth: screenWidth * 0.6 },
        ]}
        pointerEvents="none"
      >
        <View style={styles.bizPillRow}>
          <Image
            source={{ uri: item.businessLogo }}
            style={styles.bizAvatar}
          />
          <Text style={styles.bizName} numberOfLines={1}>
            {item.businessName}
          </Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
          <Text style={styles.typeBadgeText}>{typeMeta.label}</Text>
        </View>
      </View>

      {/* Bottom content */}
      <View style={[styles.bottomBlock, { bottom: insetBottom + 96 }]}>
        <View style={styles.bottomBizRow}>
          <View style={[styles.bizAvatarLg, { backgroundColor: '#1A5C35' }]}>
            {item.businessLogo ? (
              <Image source={{ uri: item.businessLogo }} style={styles.bizAvatarLg} />
            ) : (
              <Text style={styles.bizAvatarLgText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.bottomBizName}>{item.businessName}</Text>
        </View>
        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Pressable onPress={() => setExpanded((v) => !v)}>
          <Text
            style={styles.itemDesc}
            numberOfLines={expanded ? undefined : 3}
          >
            {description}
            {!expanded && description.length > 110 ? (
              <Text style={styles.moreTxt}>  more</Text>
            ) : null}
          </Text>
        </Pressable>

        {item.feedType === 'offer' ? (
          <View style={styles.metaRow}>
            <View style={styles.amberPill}>
              <MaterialCommunityIcons name="tag" size={13} color="#7A4F00" />
              <Text style={styles.amberPillText}>
                Offer · expires {formatEventDate(item.expiryDate)}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="calendar" size={14} color="#fff" />
              <Text style={styles.metaChipText}>{formatEventDate(item.startDate)}</Text>
            </View>
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
              <Text style={styles.metaChipText} numberOfLines={1}>
                {item.venue}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#fff', fontSize: 16, marginBottom: 16 },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#1A5C35',
  },
  emptyBtnText: { color: '#fff', fontWeight: '700' },

  itemRoot: {
    backgroundColor: '#0a0420',
    overflow: 'hidden',
  },
  gradTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  gradBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },

  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  topRight: {
    position: 'absolute',
    right: 16,
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 5,
  },
  bizPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bizAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A5C35',
  },
  bizName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 140,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  bottomBlock: {
    position: 'absolute',
    left: 16,
    right: 90,
    gap: 8,
    zIndex: 5,
  },
  bottomBizRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bizAvatarLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bizAvatarLgText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  bottomBizName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  itemTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
    marginTop: 2,
  },
  itemDesc: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 19,
  },
  moreTxt: { color: '#fff', fontWeight: '700' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  amberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD66B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  amberPillText: { color: '#7A4F00', fontWeight: '800', fontSize: 11 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 200,
  },
  metaChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  actionRail: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 18,
    zIndex: 10,
  },
  actionBtn: { alignItems: 'center', justifyContent: 'center' },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  modalSheet: {
    backgroundColor: 'transparent',
    margin: 0,
    justifyContent: 'flex-end',
  },
  modalSheetSmall: {
    backgroundColor: 'transparent',
    margin: 0,
    justifyContent: 'flex-end',
  },
  commentSheet: {
    height: '70%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8F5EE',
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1A5C35' },
  sheetGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8F5EE',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },

  commentList: { padding: 16, paddingBottom: 24 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  commentBody: { flex: 1 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontSize: 13, fontWeight: '800', color: '#1A5C35' },
  commentTime: { fontSize: 11, color: '#E8F5EE' },
  commentText: { fontSize: 14, color: '#1A5C35', marginTop: 2, lineHeight: 19 },
  commentLike: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  commentLikeCount: { fontSize: 10, color: '#1A5C35', marginTop: 2 },
  commentEmpty: { paddingVertical: 40, alignItems: 'center' },
  commentEmptyText: { color: '#E8F5EE', fontSize: 13 },

  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8F5EE',
    backgroundColor: '#fff',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F2FB',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 8,
    fontSize: 14,
    color: '#1A5C35',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A5C35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#E8F5EE' },

  shareSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
  },
  shareSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 14,
  },
  shareSheetTitle: { fontSize: 17, fontWeight: '800', color: '#1A5C35' },
  shareSheetBody: { paddingTop: 4, paddingBottom: 8 },
  moreSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  moreText: { fontSize: 15, fontWeight: '700', color: '#1A5C35' },
  moreCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8F5EE',
    justifyContent: 'center',
    marginTop: 4,
  },
  snackbar: { marginBottom: 24 },
});
