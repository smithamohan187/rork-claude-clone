import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  MessageCircle,
  Share2,
} from 'lucide-react-native';
import LikeButton from '@/components/feed/LikeButton';
import CommentSheet from '@/components/feed/CommentSheet';
import {
  ActivityIndicator,
  Button,
  Chip,
  Snackbar,
  Surface,
} from 'react-native-paper';
import { fetchPostById, type Post } from '@/api/services/postsService';
import { fetchBusinessProfile, type BusinessProfile } from '@/api/services/businessProfileService';

const PURPLE = '#1A5C35';
const LIGHT_PURPLE = '#E8F5EE';

type Business = {
  id: string;
  business_name: string;
  logo_url: string | null;
  category: string | null;
  city: string | null;
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export default function ViewPostScreen() {
  const params = useLocalSearchParams<{ postId?: string; businessId?: string }>();
  const postId = typeof params.postId === 'string' ? params.postId : '';
  const paramBizId = typeof params.businessId === 'string' ? params.businessId : '';
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');
  const [sharing, setSharing] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!postId) {
      setError(true);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const postData = await fetchPostById(postId);
      setPost(postData);
      const bizId = paramBizId || postData.business_id;
      const bizData: BusinessProfile = await fetchBusinessProfile(bizId);
      setBusiness({
        id: bizData.id,
        business_name: bizData.name,
        logo_url: bizData.logo_url,
        category: bizData.category_name,
        city: bizData.city,
      });
    } catch (e) {
      if (__DEV__) console.log('[ViewPost] fetch error', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [postId, paramBizId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleShare = useCallback(async () => {
    if (sharing || !post || !business) return;
    setSharing(true);
    try {
      const message = `Check out this post from ${business.business_name}: ${post.title}`;
      await Share.share({ message });
      setSnackbarText('Post shared');
      setSnackbarVisible(true);
    } catch (e) {
      if (__DEV__) console.log('[ViewPost] share error', e);
    } finally {
      setSharing(false);
    }
  }, [sharing, post, business]);

  const isActive = useMemo(() => post?.is_active ?? false, [post]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.skeletonHero} />
        <View style={styles.skeletonBlock} />
        <View style={[styles.skeletonBlock, { width: '60%' }]} />
        <View style={[styles.skeletonBlock, { width: '90%' }]} />
        <View style={[styles.skeletonBlock, { width: '80%' }]} />
        <View style={styles.skeletonCenter}>
          <ActivityIndicator color={PURPLE} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !post) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Post not available</Text>
        <Text style={styles.errorSub}>This post may have been removed or is no longer accessible.</Text>
        <Button mode="contained" buttonColor={PURPLE} onPress={() => router.back()} style={styles.goBackBtn}>
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="view-post-scroll"
      >
        {/* HERO — image if available, solid colour fallback */}
        <View style={styles.heroWrap}>
          {post.image_url ? (
            <>
              <Image
                source={{ uri: post.image_url }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.55)']}
                style={styles.heroGradient}
              />
            </>
          ) : (
            <View style={[styles.heroImage, { backgroundColor: PURPLE }]} />
          )}

          <SafeAreaView edges={['top']} style={styles.heroOverlay} pointerEvents="box-none">
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backBtn}
                testID="view-post-back"
              >
                <ArrowLeft size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* BUSINESS STRIP */}
        {business ? (
          <Surface style={styles.bizStrip} elevation={1}>
            <View style={styles.bizLogoWrap}>
              {business.logo_url ? (
                <Image source={{ uri: business.logo_url }} style={styles.bizLogo} />
              ) : (
                <View style={[styles.bizLogo, styles.bizLogoFallback]}>
                  <Text style={styles.bizLogoLetter}>
                    {business.business_name?.charAt(0)?.toUpperCase() ?? 'B'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.bizInfo}>
              <Text style={styles.bizName} numberOfLines={1}>
                {business.business_name}
              </Text>
              <View style={styles.bizMetaRow}>
                {business.category ? (
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{business.category}</Text>
                  </View>
                ) : null}
                {business.city ? (
                  <Text style={styles.cityText}>{business.city}</Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push(`/business-profile/${business.id}` as never)}
              testID="view-business-link"
            >
              <Text style={styles.viewBiz}>View Business</Text>
            </TouchableOpacity>
          </Surface>
        ) : null}

        {/* CONTENT */}
        <View style={styles.contentWrap}>
          <Text style={styles.title}>{post.title}</Text>

          <View style={styles.metaRow}>
            <Calendar size={16} color={PURPLE} />
            <Text style={styles.metaText}>{formatDate(post.created_at)}</Text>
            <Chip
              compact
              style={isActive ? styles.activeChip : styles.inactiveChip}
              textStyle={isActive ? styles.activeChipText : styles.inactiveChipText}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Chip>
          </View>

          <Text style={styles.body}>{post.content}</Text>

          <View style={styles.engagementRow}>
            <LikeButton
              contentType="post"
              contentId={post.id}
              initialLikeCount={post.like_count ?? 0}
              initialHasLiked={post.liked_by_me ?? false}
              isOwner={post.is_owner ?? false}
            />
            <TouchableOpacity style={styles.commentBtn} onPress={() => setCommentOpen(true)} hitSlop={8} testID="view-post-comment-btn">
              <MessageCircle size={18} color="#6B7280" />
              <Text style={styles.commentCount}>{post.comment_count ?? 0}</Text>
            </TouchableOpacity>
            <CommentSheet
              visible={commentOpen}
              contentType="post"
              contentId={post.id}
              initialCommentCount={post.comment_count ?? 0}
              onClose={() => setCommentOpen(false)}
            />
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM BAR */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBarWrap}>
        <View style={styles.bottomBar}>
          <Button
            mode="outlined"
            textColor={PURPLE}
            onPress={handleShare}
            loading={sharing}
            disabled={sharing}
            style={styles.shareBtn}
            contentStyle={styles.btnContent}
            icon={() => <Share2 size={18} color={PURPLE} />}
            testID="share-post-btn"
          >
            Share Post
          </Button>
        </View>
      </SafeAreaView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={styles.snackbar}
      >
        {snackbarText}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 120 },
  heroWrap: { width: '100%', height: 240, backgroundColor: '#E5E7EB' },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizStrip: {
    marginHorizontal: 16,
    marginTop: -24,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bizLogoWrap: {},
  bizLogo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6' },
  bizLogoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: LIGHT_PURPLE },
  bizLogoLetter: { color: PURPLE, fontWeight: '800', fontSize: 16 },
  bizInfo: { flex: 1 },
  bizName: { fontWeight: '700', fontSize: 15, color: '#111827' },
  bizMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  categoryChip: {
    backgroundColor: LIGHT_PURPLE,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryChipText: { color: PURPLE, fontSize: 11, fontWeight: '600' },
  cityText: { color: '#6B7280', fontSize: 12 },
  viewBiz: { color: PURPLE, fontWeight: '600', fontSize: 13 },
  contentWrap: { paddingHorizontal: 20, paddingTop: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 28 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  metaText: { color: '#374151', fontSize: 13, fontWeight: '500', flex: 1 },
  activeChip: { backgroundColor: LIGHT_PURPLE },
  activeChipText: { color: PURPLE, fontWeight: '700', fontSize: 11 },
  inactiveChip: { backgroundColor: '#F3F4F6' },
  inactiveChipText: { color: '#6B7280', fontWeight: '700', fontSize: 11 },
  body: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
  },
  commentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  bottomBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shareBtn: { borderColor: PURPLE, borderRadius: 10, borderWidth: 1.5 },
  btnContent: { height: 46 },
  snackbar: { marginBottom: 100 },
  skeletonHero: { width: '100%', height: 240, backgroundColor: '#EEF2F7' },
  skeletonBlock: {
    height: 16,
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    width: '80%',
  },
  skeletonCenter: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorSub: { color: '#6B7280', fontSize: 14, textAlign: 'center', marginBottom: 24 },
  goBackBtn: { borderRadius: 10 },
});
