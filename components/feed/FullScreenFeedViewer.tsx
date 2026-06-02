import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal as RNModal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Modal as PaperModal, Portal, Snackbar } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import {
  X,
  ChevronUp,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Tag,
  Calendar,
  MapPin,
} from 'lucide-react-native';

import type { FeedItem } from '@/hooks/usePersonalisedFeed';
import type { BusinessPost } from '@/mocks/posts';
import { usePosts } from '@/contexts/PostsContext';
import { useComments, type CommentItem } from '@/hooks/useComments';
import { CommentSection } from '@/components/feed/CommentSection';
import { SharePostSheet } from '@/components/feed/SharePostSheet';
import { pickFeedImage } from '@/constants/feedImages';
import { formatRelativeTime } from '@/mocks/posts';

export type ViewerEntry =
  | { kind: 'post'; key: string; post: BusinessPost }
  | { kind: 'feed'; key: string; item: FeedItem };

interface Props {
  visible: boolean;
  entries: ViewerEntry[];
  initialIndex: number;
  onClose: () => void;
  onToggleBookmark: (offerId: string) => boolean;
  onToggleInterested: (eventId: string) => boolean;
  onShowToast: (msg: string) => void;
  currentUser: { name: string; initials: string; color: string };
}

const SCREEN = Dimensions.get('window');
const PRIMARY = '#1A5C35';

export function FullScreenFeedViewer({
  visible,
  entries,
  initialIndex,
  onClose,
  onToggleBookmark,
  onToggleInterested,
  onShowToast,
  currentUser,
}: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ViewerEntry> | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(initialIndex);
  const [hintVisible, setHintVisible] = useState<boolean>(true);
  const [hintShown, setHintShown] = useState<boolean>(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;

  const safeInitial = useMemo(
    () => Math.max(0, Math.min(initialIndex, Math.max(0, entries.length - 1))),
    [initialIndex, entries.length],
  );

  useEffect(() => {
    if (visible) {
      setActiveIndex(safeInitial);
      if (!hintShown) {
        setHintVisible(true);
        hintOpacity.setValue(0);
        Animated.sequence([
          Animated.timing(hintOpacity, { toValue: 1, duration: 250, useNativeDriver: Platform.OS !== 'web' }),
          Animated.delay(1500),
          Animated.timing(hintOpacity, { toValue: 0, duration: 400, useNativeDriver: Platform.OS !== 'web' }),
        ]).start(() => {
          setHintVisible(false);
          setHintShown(true);
        });
      }
    }
  }, [visible, safeInitial, hintOpacity, hintShown]);

  const dims = useMemo(() => Dimensions.get('window'), [visible]);
  const SCREEN_W = dims.width;
  const SCREEN_H = dims.height;

  const getItemLayout = useCallback(
    (_: ArrayLike<ViewerEntry> | null | undefined, i: number) => ({
      length: SCREEN_H,
      offset: SCREEN_H * i,
      index: i,
    }),
    [SCREEN_H],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first && typeof first.index === 'number') {
      setActiveIndex(first.index);
    }
  }).current;

  const handleScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      setTimeout(() => {
        listRef.current?.scrollToIndex({ index: info.index, animated: false });
      }, 100);
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ViewerEntry; index: number }) => (
      <ViewerPage
        entry={item}
        active={index === activeIndex}
        screenW={SCREEN_W}
        screenH={SCREEN_H}
        insetTop={insets.top}
        insetBottom={insets.bottom}
        onClose={onClose}
        onToggleBookmark={onToggleBookmark}
        onToggleInterested={onToggleInterested}
        onShowToast={onShowToast}
        currentUser={currentUser}
      />
    ),
    [activeIndex, SCREEN_W, SCREEN_H, insets.top, insets.bottom, onClose, onToggleBookmark, onToggleInterested, onShowToast, currentUser],
  );

  return (
    <RNModal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <FlatList
          ref={listRef}
          data={entries}
          keyExtractor={(it) => it.key}
          renderItem={renderItem}
          pagingEnabled
          snapToInterval={SCREEN_H}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          initialScrollIndex={safeInitial}
          getItemLayout={getItemLayout}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          removeClippedSubviews
          windowSize={3}
          maxToRenderPerBatch={2}
          initialNumToRender={2}
          testID="full-screen-viewer-list"
        />

        {/* Top-left close */}
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          hitSlop={12}
          testID="full-screen-viewer-close"
        >
          <X size={22} color="#fff" strokeWidth={2.4} />
        </Pressable>

        {/* Swipe-up hint (first open only) */}
        {hintVisible && entries.length > 1 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.hint,
              { bottom: insets.bottom + 28, opacity: hintOpacity },
            ]}
          >
            <ChevronUp size={22} color="#fff" />
            <Text style={styles.hintText}>Swipe up</Text>
          </Animated.View>
        ) : null}
      </View>
    </RNModal>
  );
}

interface ViewerPageProps {
  entry: ViewerEntry;
  active: boolean;
  screenW: number;
  screenH: number;
  insetTop: number;
  insetBottom: number;
  onClose: () => void;
  onToggleBookmark: (offerId: string) => boolean;
  onToggleInterested: (eventId: string) => boolean;
  onShowToast: (msg: string) => void;
  currentUser: { name: string; initials: string; color: string };
}

const ViewerPage = React.memo(function ViewerPage({
  entry,
  active,
  screenW,
  screenH,
  insetTop,
  insetBottom,
  onToggleBookmark,
  onToggleInterested,
  onShowToast,
  currentUser,
}: ViewerPageProps) {
  if (entry.kind === 'post') {
    return (
      <PostPage
        post={entry.post}
        active={active}
        screenW={screenW}
        screenH={screenH}
        insetTop={insetTop}
        insetBottom={insetBottom}
        onShowToast={onShowToast}
        currentUser={currentUser}
      />
    );
  }
  return (
    <FeedPage
      item={entry.item}
      active={active}
      screenW={screenW}
      screenH={screenH}
      insetTop={insetTop}
      insetBottom={insetBottom}
      onToggleBookmark={onToggleBookmark}
      onToggleInterested={onToggleInterested}
      onShowToast={onShowToast}
      currentUser={currentUser}
    />
  );
});

interface PostPageProps {
  post: BusinessPost;
  active: boolean;
  screenW: number;
  screenH: number;
  insetTop: number;
  insetBottom: number;
  onShowToast: (msg: string) => void;
  currentUser: { name: string; initials: string; color: string };
}

function PostPage({
  post,
  screenW,
  screenH,
  insetTop,
  insetBottom,
  onShowToast,
  currentUser,
}: PostPageProps) {
  const { likedIds, toggleLike, addComment } = usePosts();
  const liked = !!likedIds[post.id];
  const [saved, setSaved] = useState<boolean>(false);
  const [commentOpen, setCommentOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const commentItems = useMemo<CommentItem[]>(
    () =>
      post.comments.map((c) => ({
        id: c.id,
        author: c.user,
        authorInitials: initialsFor(c.user),
        avatarColor: colorFor(c.user),
        body: c.text,
        createdAt: c.time,
        likeCount: 0,
        isBusinessReply: false,
        parentId: null,
      })),
    [post.comments],
  );

  const handleSubmit = useCallback(async () => {
    const txt = commentText.trim();
    if (!txt) return;
    setSubmitting(true);
    addComment(post.id, txt);
    setCommentText('');
    await new Promise((r) => setTimeout(r, 200));
    setSubmitting(false);
  }, [commentText, addComment, post.id]);

  const handleSave = useCallback(() => {
    setSaved((p) => {
      const next = !p;
      onShowToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
      return next;
    });
  }, [onShowToast]);

  const description = post.text ?? '';
  const coverUri = post.image_url;

  return (
    <PageShell
      screenW={screenW}
      screenH={screenH}
      insetTop={insetTop}
      coverUri={coverUri ?? undefined}
      logoUri={post.business_logo}
      typeLabel="Post"
      typeColor="#00B246"
    >
      {/* Right action rail */}
      <ActionRail insetBottom={insetBottom}>
        <RailButton
          icon={<ThumbsUp size={26} color={liked ? PRIMARY : '#fff'} fill={liked ? PRIMARY : 'transparent'} />}
          label={String(post.likes)}
          active={liked}
          onPress={() => {
            haptic();
            toggleLike(post.id);
          }}
          testID="viewer-post-like"
        />
        <RailButton
          icon={<MessageCircle size={26} color="#fff" />}
          label={String(post.comments.length)}
          onPress={() => setCommentOpen(true)}
          testID="viewer-post-comment"
        />
        <RailButton
          icon={<Share2 size={26} color="#fff" />}
          label="Share"
          onPress={() => setShareOpen(true)}
          testID="viewer-post-share"
        />
        <RailButton
          icon={<Bookmark size={26} color={saved ? PRIMARY : '#fff'} fill={saved ? PRIMARY : 'transparent'} />}
          label={saved ? 'Saved' : 'Save'}
          active={saved}
          onPress={handleSave}
          testID="viewer-post-save"
        />
        <RailButton
          icon={<MoreHorizontal size={26} color="#fff" />}
          label=""
          onPress={() => setMoreOpen(true)}
          testID="viewer-post-more"
        />
      </ActionRail>

      {/* Bottom info */}
      <BottomPanel
        insetBottom={insetBottom}
        logoUri={post.business_logo}
        businessName={post.business_name}
        timestamp={formatRelativeTime(post.created_at)}
        title={null}
        body={description}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        chips={null}
        cta={null}
      />

      {/* Comment sheet */}
      <CommentSheet
        visible={commentOpen}
        onClose={() => setCommentOpen(false)}
        comments={commentItems}
        commentText={commentText}
        setCommentText={setCommentText}
        submitting={submitting}
        onSubmit={handleSubmit}
        currentUser={currentUser}
      />

      {/* Share sheet */}
      <SharePostSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onToast={onShowToast}
        postId={post.id}
        postType="post"
        authorName={post.business_name}
        authorAvatarUrl={post.business_logo}
        contentPreview={post.text ?? ''}
      />

      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onToast={onShowToast}
      />
    </PageShell>
  );
}

interface FeedPageProps {
  item: FeedItem;
  active: boolean;
  screenW: number;
  screenH: number;
  insetTop: number;
  insetBottom: number;
  onToggleBookmark: (offerId: string) => boolean;
  onToggleInterested: (eventId: string) => boolean;
  onShowToast: (msg: string) => void;
  currentUser: { name: string; initials: string; color: string };
}

function FeedPage({
  item,
  screenW,
  screenH,
  insetTop,
  insetBottom,
  onToggleBookmark,
  onToggleInterested,
  onShowToast,
  currentUser,
}: FeedPageProps) {
  const isOffer = item.feedType === 'offer';
  const description = isOffer ? item.description : item.venue;

  const {
    comments,
    reactionCount,
    hasLiked,
    submitting,
    commentText,
    setCommentText,
    toggleLike,
    submitComment,
  } = useComments(item.id, item.feedType);

  const [commentOpen, setCommentOpen] = useState<boolean>(false);
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [moreOpen, setMoreOpen] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(false);

  const coverUri = useMemo(
    () => pickFeedImage(item.id, [item.title, description, item.businessName]),
    [item.id, item.title, description, item.businessName],
  );

  const saved = isOffer ? !!item.bookmarked : !!item.interested;

  const handleSave = useCallback(() => {
    haptic();
    if (isOffer) {
      const next = onToggleBookmark(item.id);
      onShowToast(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
    } else {
      const next = onToggleInterested(item.id);
      onShowToast(next ? 'Added to your events' : 'Removed from your events');
    }
  }, [isOffer, item.id, onToggleBookmark, onToggleInterested, onShowToast]);

  const handleSubmitComment = useCallback(() => {
    submitComment(currentUser.name, currentUser.initials, currentUser.color).catch(() => undefined);
  }, [submitComment, currentUser]);

  const handleCTA = useCallback(() => {
    haptic();
    if (isOffer) {
      onShowToast('Offer added to your coupons');
    } else {
      const next = onToggleInterested(item.id);
      onShowToast(next ? 'Added to your events' : 'Removed from your events');
    }
  }, [isOffer, item.id, onToggleInterested, onShowToast]);

  const typeColor = isOffer ? '#FF7043' : '#3B82F6';
  const typeLabel = isOffer ? 'Offer' : 'Event';

  const chips = useMemo(() => {
    if (isOffer) {
      return [
        {
          key: 'expiry',
          icon: <Tag size={13} color="#7A4F00" />,
          label: `Valid until ${formatDate(item.expiryDate)}`,
          tone: 'amber' as const,
        },
      ];
    }
    return [
      {
        key: 'date',
        icon: <Calendar size={13} color="#fff" />,
        label: formatDate(item.startDate),
        tone: 'glass' as const,
      },
      {
        key: 'venue',
        icon: <MapPin size={13} color="#fff" />,
        label: item.venue,
        tone: 'glass' as const,
      },
    ];
  }, [isOffer, item]);

  const timestamp = formatRelativeTime(item.createdAt);

  return (
    <PageShell
      screenW={screenW}
      screenH={screenH}
      insetTop={insetTop}
      coverUri={coverUri}
      logoUri={item.businessLogo}
      typeLabel={typeLabel}
      typeColor={typeColor}
    >
      <ActionRail insetBottom={insetBottom}>
        <RailButton
          icon={<ThumbsUp size={26} color={hasLiked ? PRIMARY : '#fff'} fill={hasLiked ? PRIMARY : 'transparent'} />}
          label={String(reactionCount)}
          active={hasLiked}
          onPress={() => {
            haptic();
            toggleLike();
          }}
          testID="viewer-feed-like"
        />
        <RailButton
          icon={<MessageCircle size={26} color="#fff" />}
          label={String(comments.length)}
          onPress={() => setCommentOpen(true)}
          testID="viewer-feed-comment"
        />
        <RailButton
          icon={<Share2 size={26} color="#fff" />}
          label="Share"
          onPress={() => setShareOpen(true)}
          testID="viewer-feed-share"
        />
        <RailButton
          icon={<Bookmark size={26} color={saved ? PRIMARY : '#fff'} fill={saved ? PRIMARY : 'transparent'} />}
          label={saved ? 'Saved' : 'Save'}
          active={saved}
          onPress={handleSave}
          testID="viewer-feed-save"
        />
        <RailButton
          icon={<MoreHorizontal size={26} color="#fff" />}
          label=""
          onPress={() => setMoreOpen(true)}
          testID="viewer-feed-more"
        />
      </ActionRail>

      <BottomPanel
        insetBottom={insetBottom}
        logoUri={item.businessLogo}
        businessName={item.businessName}
        timestamp={timestamp}
        title={item.title}
        body={description}
        expanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        chips={chips}
        cta={
          isOffer
            ? { label: 'Redeem Now', variant: 'filled', onPress: handleCTA }
            : { label: item.interested ? '✓ Interested' : 'Interested', variant: 'outlined', onPress: handleCTA }
        }
      />

      <CommentSheet
        visible={commentOpen}
        onClose={() => setCommentOpen(false)}
        comments={comments}
        commentText={commentText}
        setCommentText={setCommentText}
        submitting={submitting}
        onSubmit={handleSubmitComment}
        currentUser={currentUser}
      />

      <SharePostSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onToast={onShowToast}
        postId={item.id}
        postType={item.feedType}
        authorName={item.businessName}
        authorAvatarUrl={item.businessLogo}
        contentPreview={`${item.title}${description ? ` — ${description}` : ''}`}
      />

      <MoreSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onToast={onShowToast}
      />
    </PageShell>
  );
}

interface PageShellProps {
  screenW: number;
  screenH: number;
  insetTop: number;
  coverUri?: string;
  logoUri?: string;
  typeLabel: string;
  typeColor: string;
  children: React.ReactNode;
}

function PageShell({
  screenW,
  screenH,
  insetTop,
  coverUri,
  logoUri,
  typeLabel,
  typeColor,
  children,
}: PageShellProps) {
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const showImage = !!coverUri && !imgFailed;
  return (
    <View style={[styles.page, { width: screenW, height: screenH }]}>
      {showImage ? (
        <Image
          source={{ uri: coverUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setImgFailed(true)}
          transition={150}
        />
      ) : (
        <>
          <LinearGradient
            colors={['#1A5C35', '#1A5C35', '#1A5C35']}
            style={StyleSheet.absoluteFill}
          />
          {logoUri ? (
            <View style={styles.fallbackLogoWrap} pointerEvents="none">
              <Image
                source={{ uri: logoUri }}
                style={styles.fallbackLogo}
                contentFit="cover"
              />
            </View>
          ) : null}
        </>
      )}

      {/* Top dark scrim */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={[styles.gradTop, { height: Math.max(160, insetTop + 140) }]}
        pointerEvents="none"
      />
      {/* Bottom dark gradient over ~40% */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={[styles.gradBottom, { height: screenH * 0.5 }]}
        pointerEvents="none"
      />

      {/* Type pill top-right */}
      <View style={[styles.typePill, { top: insetTop + 14, backgroundColor: typeColor }]} pointerEvents="none">
        <Text style={styles.typePillText}>{typeLabel.toUpperCase()}</Text>
      </View>

      {children}
    </View>
  );
}

interface ActionRailProps {
  insetBottom: number;
  children: React.ReactNode;
}
function ActionRail({ insetBottom, children }: ActionRailProps) {
  return (
    <View
      style={[styles.rail, { bottom: insetBottom + 220 }]}
      pointerEvents="box-none"
    >
      {children}
    </View>
  );
}

interface RailButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  testID?: string;
}
function RailButton({ icon, label, onPress, active, testID }: RailButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.railBtn} hitSlop={8} testID={testID}>
      <View style={styles.railIconWrap}>{icon}</View>
      {label ? (
        <Text style={[styles.railLabel, active && { color: '#fff' }]}>{label}</Text>
      ) : null}
    </Pressable>
  );
}

interface BottomPanelProps {
  insetBottom: number;
  logoUri?: string;
  businessName: string;
  timestamp: string;
  title: string | null;
  body: string;
  expanded: boolean;
  onToggleExpand: () => void;
  chips: { key: string; icon: React.ReactNode; label: string; tone: 'amber' | 'glass' }[] | null;
  cta: { label: string; variant: 'filled' | 'outlined'; onPress: () => void } | null;
}
function BottomPanel({
  insetBottom,
  logoUri,
  businessName,
  timestamp,
  title,
  body,
  expanded,
  onToggleExpand,
  chips,
  cta,
}: BottomPanelProps) {
  const isLong = body.length > 110;
  return (
    <View
      style={[
        styles.bottomPanel,
        { paddingBottom: insetBottom + 18, bottom: 0 },
      ]}
    >
      <View style={styles.bizRow}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.bizLogo} contentFit="cover" />
        ) : (
          <View style={[styles.bizLogo, { backgroundColor: '#1A5C35' }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.bizName} numberOfLines={1}>
            {businessName}
          </Text>
          {timestamp ? <Text style={styles.bizTime}>{timestamp}</Text> : null}
        </View>
      </View>

      {title ? (
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      ) : null}

      {body ? (
        <Pressable onPress={isLong ? onToggleExpand : undefined}>
          <Text style={styles.body} numberOfLines={expanded ? undefined : 2}>
            {body}
          </Text>
          {isLong && !expanded ? (
            <Text style={styles.moreLink}>Read more</Text>
          ) : null}
        </Pressable>
      ) : null}

      {chips && chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((c) => (
            <View
              key={c.key}
              style={[styles.chip, c.tone === 'amber' ? styles.chipAmber : styles.chipGlass]}
            >
              {c.icon}
              <Text style={c.tone === 'amber' ? styles.chipAmberText : styles.chipGlassText} numberOfLines={1}>
                {c.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {cta ? (
        <Pressable
          onPress={cta.onPress}
          style={[
            styles.ctaBtn,
            cta.variant === 'filled' ? styles.ctaFilled : styles.ctaOutlined,
          ]}
          testID="viewer-cta"
        >
          <Text
            style={[
              styles.ctaText,
              cta.variant === 'outlined' && styles.ctaOutlinedText,
            ]}
          >
            {cta.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface CommentSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: CommentItem[];
  commentText: string;
  setCommentText: (v: string) => void;
  submitting: boolean;
  onSubmit: () => void;
  currentUser: { name: string; initials: string; color: string };
}
function CommentSheet({
  visible,
  onClose,
  comments,
  commentText,
  setCommentText,
  submitting,
  onSubmit,
  currentUser,
}: CommentSheetProps) {
  return (
    <Portal>
      <PaperModal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.sheetWrap}
      >
        <View style={styles.sheetCard}>
          <View style={styles.grabber} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Comments</Text>
            <Pressable onPress={onClose} hitSlop={10} testID="viewer-comment-close">
              <X size={20} color="#1A5C35" />
            </Pressable>
          </View>
          <View style={styles.sheetBody}>
            <CommentSection
              comments={comments}
              commentText={commentText}
              setCommentText={setCommentText}
              submitting={submitting}
              onSubmit={onSubmit}
              currentUserInitials={currentUser.initials}
              currentUserColor={currentUser.color}
            />
          </View>
        </View>
      </PaperModal>
    </Portal>
  );
}

interface MoreSheetProps {
  visible: boolean;
  onClose: () => void;
  onToast: (msg: string) => void;
}
function MoreSheet({ visible, onClose, onToast }: MoreSheetProps) {
  return (
    <Portal>
      <PaperModal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.sheetWrap}
      >
        <View style={styles.sheetCard}>
          <View style={styles.grabber} />
          <Pressable
            style={styles.moreRow}
            onPress={() => {
              onClose();
              onToast('Thanks for your feedback');
            }}
            testID="viewer-more-report"
          >
            <Text style={[styles.moreText, { color: '#B03A3A' }]}>Report this post</Text>
          </Pressable>
          <Pressable
            style={styles.moreRow}
            onPress={() => {
              onClose();
              onToast('Thanks for your feedback');
            }}
            testID="viewer-more-not-interested"
          >
            <Text style={styles.moreText}>Not interested</Text>
          </Pressable>
          <Pressable style={[styles.moreRow, styles.moreCancel]} onPress={onClose}>
            <Text style={[styles.moreText, { color: '#1A5C35' }]}>Cancel</Text>
          </Pressable>
        </View>
      </PaperModal>
    </Portal>
  );
}

function haptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const PALETTE = ['#1A5C35', '#FF7043', '#0F6E56', '#B47700', '#B03A3A', '#00B246'];
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
function initialsFor(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { backgroundColor: '#0a0420', overflow: 'hidden' },
  gradTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  gradBottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  closeBtn: {
    position: 'absolute',
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  typePill: {
    position: 'absolute',
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    zIndex: 5,
  },
  typePillText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

  fallbackLogoWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackLogo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.85,
    backgroundColor: '#1A5C35',
  },

  rail: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 18,
    zIndex: 10,
  },
  railBtn: { alignItems: 'center', justifyContent: 'center' },
  railIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  railLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  bottomPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: 'rgba(0,0,0,0.0)',
    zIndex: 6,
    paddingRight: 92,
  },
  bizRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bizLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A5C35',
  },
  bizName: { color: '#fff', fontSize: 15, fontWeight: '800' },
  bizTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
    marginTop: 2,
  },
  body: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 6,
  },
  moreLink: { color: '#fff', fontWeight: '800', fontSize: 12, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 220,
  },
  chipAmber: { backgroundColor: '#FFD66B' },
  chipAmberText: { color: '#7A4F00', fontWeight: '800', fontSize: 11 },
  chipGlass: { backgroundColor: 'rgba(255,255,255,0.18)' },
  chipGlassText: { color: '#fff', fontWeight: '700', fontSize: 11 },

  ctaBtn: {
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaFilled: { backgroundColor: PRIMARY },
  ctaOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  ctaOutlinedText: { color: '#fff' },

  hint: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  hintText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 2 },

  sheetWrap: {
    backgroundColor: 'transparent',
    margin: 0,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    maxHeight: '80%',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8F5EE',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1A5C35' },
  sheetBody: { paddingHorizontal: 16, paddingBottom: 6 },

  moreRow: {
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  moreText: { fontSize: 15, fontWeight: '700', color: '#1A5C35' },
  moreCancel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8F5EE',
    alignItems: 'center',
    marginTop: 4,
  },
});

const _SCREEN_DIMS = SCREEN;
