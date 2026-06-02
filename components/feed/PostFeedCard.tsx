import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Modal,
  Platform,
  LayoutAnimation,
  UIManager,
  Linking,
} from 'react-native';
import { getBusinessReferralSettings, normaliseWebsiteUrl } from '@/services/businessReferralRegistry';
import { Image } from 'expo-image';
import { Bookmark, MoreVertical, Edit3, Trash2 } from 'lucide-react-native';
import ExpandableText from '../ExpandableText';
import { useRouter } from 'expo-router';
import { usePosts } from '@/contexts/PostsContext';
import { formatRelativeTime, type BusinessPost } from '@/mocks/posts';
import { FeedActionBar } from '@/components/feed/FeedActionBar';
import { CommentSection } from '@/components/feed/CommentSection';
import { SharePostSheet } from '@/components/feed/SharePostSheet';
import { ReferralPickerModal, type ReferralPickerSendResult } from '@/components/ReferralPickerModal';
import type { OfferSharePayload } from '@/contexts/ReferralChatContext';
import type { CommentItem } from '@/hooks/useComments';

const PURPLE = '#1A5C35';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function easeNext() {
  if (Platform.OS !== 'web') {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }
}

const AVATAR_PALETTE = ['#1A5C35', '#FF7043', '#0F6E56', '#B47700', '#B03A3A', '#00B246'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function initialsForName(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface Props {
  post: BusinessPost;
  showOwnerControls?: boolean;
  onEdit?: (post: BusinessPost) => void;
  onShowToast?: (msg: string) => void;
  activePanel?: 'comments' | 'share' | null;
  onOpenPanel?: (panel: 'comments' | 'share' | null) => void;
  currentUser?: { name: string; initials: string; color: string };
  onImagePress?: () => void;
}

const DEFAULT_USER = { name: 'You', initials: 'YO', color: '#1A5C35' };

export default function PostFeedCard({
  post,
  showOwnerControls = false,
  onEdit,
  onShowToast,
  activePanel = null,
  onOpenPanel,
  currentUser = DEFAULT_USER,
  onImagePress,
}: Props) {
  const router = useRouter();
  const { likedIds, toggleLike, addComment, deletePost } = usePosts();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [referOpen, setReferOpen] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [saveTooltip, setSaveTooltip] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Local fallback when not controlled by parent
  const [localPanel, setLocalPanel] = useState<'comments' | 'share' | null>(null);
  const panel = onOpenPanel ? activePanel : localPanel;

  const setPanel = useCallback((p: 'comments' | 'share' | null) => {
    if (onOpenPanel) onOpenPanel(p);
    else setLocalPanel(p);
  }, [onOpenPanel]);

  const liked = !!likedIds[post.id];

  const commentItems = useMemo<CommentItem[]>(
    () =>
      post.comments.map((c) => ({
        id: c.id,
        author: c.user,
        authorInitials: initialsForName(c.user),
        avatarColor: colorForName(c.user),
        body: c.text,
        createdAt: c.time,
        likeCount: 0,
        isBusinessReply: false,
        parentId: null,
      })),
    [post.comments],
  );

  const handleToggleComments = useCallback(() => {
    easeNext();
    setPanel(panel === 'comments' ? null : 'comments');
  }, [panel, setPanel]);

  const handleToggleShare = useCallback(() => {
    const settings = getBusinessReferralSettings(post.business_id);
    if (!settings.optIn) {
      const url = normaliseWebsiteUrl(settings.website);
      if (!url) {
        onShowToast?.("This business hasn't set up a website yet.");
        return;
      }
      Linking.openURL(url).catch((e) => {
        console.log('[PostFeedCard] openURL failed', e);
        onShowToast?.("Couldn't open the business website.");
      });
      return;
    }
    easeNext();
    setPanel(panel === 'share' ? null : 'share');
  }, [panel, setPanel, post.business_id, onShowToast]);

  const handleRefer = useCallback(() => {
    setReferOpen(true);
  }, []);

  const handleReferSent = useCallback(
    (result: ReferralPickerSendResult) => {
      setReferOpen(false);
      if (result.recipientCount === 1 && result.firstRecipientName) {
        onShowToast?.(`Post sent to ${result.firstRecipientName}!`);
      } else {
        onShowToast?.(`Post shared with ${result.recipientCount} people!`);
      }
    },
    [onShowToast],
  );

  const handleSave = useCallback(() => {
    setSaved((prev) => {
      const next = !prev;
      onShowToast?.(next ? 'Saved to bookmarks' : 'Removed from bookmarks');
      return next;
    });
  }, [onShowToast]);

  const handleSubmitComment = useCallback(async () => {
    const body = commentText.trim();
    if (!body) return;
    setSubmitting(true);
    addComment(post.id, body);
    setCommentText('');
    try {
      await new Promise((r) => setTimeout(r, 200));
    } finally {
      setSubmitting(false);
    }
  }, [commentText, addComment, post.id]);

  const handleEdit = useCallback(() => {
    setMenuOpen(false);
    onEdit?.(post);
  }, [onEdit, post]);

  const handleDelete = useCallback(() => {
    setMenuOpen(false);
    setConfirmDelete(true);
  }, []);

  const confirmDeletion = useCallback(() => {
    setConfirmDelete(false);
    deletePost(post.id);
    onShowToast?.('Post deleted');
  }, [deletePost, post.id, onShowToast]);

  const _router = router;

  const showComments = panel === 'comments';
  const showShare = panel === 'share';

  return (
    <View style={styles.card} testID={`post-card-${post.id}`}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={{ uri: post.business_logo }} style={styles.logo} contentFit="cover" />
        <View style={styles.headText}>
          <Text style={styles.name} numberOfLines={1}>{post.business_name}</Text>
          <Text style={styles.time}>{formatRelativeTime(post.created_at)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Post</Text>
        </View>
      </View>

      {/* Owner ⋮ menu — pinned top-right with surface pill */}
      {showOwnerControls ? (
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          style={styles.menuBtn}
          hitSlop={10}
          testID={`post-menu-${post.id}`}
          activeOpacity={0.7}
        >
          <MoreVertical size={18} color="#1A5C35" />
        </TouchableOpacity>
      ) : null}

      {/* Body */}
      {post.text ? (
        <ExpandableText text={post.text} />
      ) : null}

      {post.image_url ? (
        <TouchableOpacity onPress={onImagePress} activeOpacity={0.85} style={styles.imageWrap}>
          <Image source={{ uri: post.image_url }} style={styles.image} contentFit="cover" />
          <TouchableOpacity
            style={styles.saveOverlay}
            onPress={(e) => { e.stopPropagation?.(); handleSave(); }}
            onLongPress={() => { setSaveTooltip(true); setTimeout(() => setSaveTooltip(false), 1500); }}
            hitSlop={6}
            activeOpacity={0.7}
          >
            <Bookmark size={15} color={saved ? '#1A5C35' : '#fff'} fill={saved ? '#1A5C35' : 'transparent'} />
          </TouchableOpacity>
          {saveTooltip ? (
            <View style={[styles.saveTooltip, { top: 40, right: 0 }]} pointerEvents="none">
              <Text style={styles.saveTooltipText}>{saved ? 'Saved' : 'Save'}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      ) : null}

      {/* Engagement row — same as Offer/Event */}
      <FeedActionBar
        reactionCount={post.likes}
        hasLiked={liked}
        commentCount={post.comments.length}
        showComments={showComments}
        showShare={showShare}
        onLike={() => toggleLike(post.id)}
        onComment={handleToggleComments}
        onShare={handleToggleShare}
        onRefer={handleRefer}
      />

      {showComments ? (
        <CommentSection
          comments={commentItems}
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
          setPanel(null);
        }}
        onToast={(m) => onShowToast?.(m)}
        postId={post.id}
        postType="post"
        authorName={post.business_name}
        authorAvatarUrl={post.business_logo}
        contentPreview={post.text ?? ''}
      />

      <ReferralPickerModal
        visible={referOpen}
        onClose={() => setReferOpen(false)}
        offer={{
          offerId: post.id,
          businessId: post.business_id,
          businessName: post.business_name,
          businessLogoUrl: post.business_logo,
          offerTitle: post.business_name,
          offerDescription: post.text,
          offerImageUrl: post.image_url ?? undefined,
          validUntil: post.created_at,
          deepLink: `https://touchpoint.app/post/${post.id}`,
        } as OfferSharePayload}
        onSent={handleReferSent}
      />

      {/* Owner action menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit} testID={`menu-edit-${post.id}`}>
              <Edit3 size={18} color="#1A5C35" />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete} testID={`menu-delete-${post.id}`}>
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Delete this post?</Text>
            <Text style={styles.confirmSub}>This action cannot be undone.</Text>
            <View style={styles.confirmRow}>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmCancel]} onPress={() => setConfirmDelete(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmDelete]} onPress={confirmDeletion}>
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 56,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9F6',
  },
  headText: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A5C35',
  },
  time: {
    fontSize: 12,
    color: '#1A5C35',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#EDE9F6',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  badgeText: {
    color: PURPLE,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  menuBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 5,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1A1A1A',
    marginTop: 12,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 12,
    marginTop: 12,
    backgroundColor: '#EDE9F6',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A5C35',
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#EEE',
    marginHorizontal: 20,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  confirmCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 22,
    width: '100%',
    maxWidth: 360,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A5C35',
  },
  confirmSub: {
    marginTop: 6,
    fontSize: 14,
    color: '#1A5C35',
  },
  confirmRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmCancel: {
    backgroundColor: '#F1EEF7',
  },
  confirmCancelText: {
    color: '#1A5C35',
    fontWeight: '700',
  },
  confirmDelete: {
    backgroundColor: '#EF4444',
  },
  confirmDeleteText: {
    color: '#fff',
    fontWeight: '700',
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
