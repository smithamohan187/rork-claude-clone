import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Shield,
  Send,
  Users,
  FileText,
  AlertTriangle,
  Trash2,
  CheckCircle,
  Eye,
  ImagePlus,
  X,
  Megaphone,
  BarChart3,
  Flag,
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { useAdmin } from '@/contexts/AdminContext';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabKey = 'overview' | 'posts' | 'reports' | 'broadcast';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const {
    announcements,
    reports,
    allPosts,
    createAnnouncement,
    removeAnnouncement,
    flagPost,
    removePost,
    approvePost,
    resolveReport,
    totalUsers,
    activePostsCount,
    pendingReports,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [broadcastText, setBroadcastText] = useState<string>('');
  const [broadcastImage, setBroadcastImage] = useState<string>('');
  const [broadcastSent, setBroadcastSent] = useState<boolean>(false);
  const sentAnim = useRef(new Animated.Value(0)).current;

  const handleSendBroadcast = useCallback(() => {
    if (!broadcastText.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to broadcast.');
      return;
    }
    Alert.alert(
      'Send Broadcast',
      'This announcement will be pinned at the top of all user feeds. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            createAnnouncement(broadcastText.trim(), broadcastImage.trim() || undefined);
            setBroadcastText('');
            setBroadcastImage('');
            setBroadcastSent(true);
            Animated.sequence([
              Animated.timing(sentAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
              Animated.delay(1500),
              Animated.timing(sentAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => setBroadcastSent(false));
          },
        },
      ]
    );
  }, [broadcastText, broadcastImage, createAnnouncement, sentAnim]);

  const handleRemovePost = useCallback((postId: string) => {
    Alert.alert('Remove Post', 'This post will be hidden from all feeds. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removePost(postId) },
    ]);
  }, [removePost]);

  const handleFlagPost = useCallback((postId: string) => {
    Alert.alert('Flag Post', 'Flag this post for review?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Flag', onPress: () => flagPost(postId) },
    ]);
  }, [flagPost]);

  React.useEffect(() => {
    if (!isAdmin) {
      console.log('[AdminDashboard] Unauthorized access attempt, redirecting');
      router.replace('/(tabs)/feed' as any);
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: Colors.textTertiary }}>Unauthorized</Text>
      </View>
    );
  }

  const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'posts', label: 'Posts', icon: FileText },
    { key: 'reports', label: 'Reports', icon: Flag },
    { key: 'broadcast', label: 'Broadcast', icon: Megaphone },
  ];

  const renderOverview = () => (
    <View>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#EBF5FF' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#D0E8FF' }]}>
            <Users size={20} color="#2563EB" />
          </View>
          <Text style={[styles.statNumber, { color: '#2563EB' }]}>{totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#D1FAE5' }]}>
            <FileText size={20} color="#16A34A" />
          </View>
          <Text style={[styles.statNumber, { color: '#16A34A' }]}>{activePostsCount}</Text>
          <Text style={styles.statLabel}>Active Posts</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#FFF7ED' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5EE' }]}>
            <AlertTriangle size={20} color="#1A5C35" />
          </View>
          <Text style={[styles.statNumber, { color: '#1A5C35' }]}>{pendingReports}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#E8F5EE' }]}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5EE' }]}>
            <Megaphone size={20} color="#00B246" />
          </View>
          <Text style={[styles.statNumber, { color: '#00B246' }]}>{announcements.length}</Text>
          <Text style={styles.statLabel}>Broadcasts</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Broadcasts</Text>
      {announcements.slice(0, 3).map((a) => (
        <View key={a.id} style={styles.announcementCard}>
          <View style={styles.announcementHeader}>
            <View style={styles.adminBadge}>
              <Shield size={12} color="#fff" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
            <Text style={styles.announcementTime}>{a.createdAt}</Text>
          </View>
          <Text style={styles.announcementContent} numberOfLines={3}>{a.content}</Text>
          {a.image ? (
            <Image source={{ uri: a.image }} style={styles.announcementImage} contentFit="cover" />
          ) : null}
          <View style={styles.announcementStats}>
            <Text style={styles.announcementStatText}>{a.likes} likes</Text>
            <Text style={styles.announcementStatText}>{a.comments} comments</Text>
            <Text style={styles.announcementStatText}>{a.shares} shares</Text>
          </View>
          <Pressable
            style={styles.removeAnnouncementBtn}
            onPress={() => {
              Alert.alert('Remove Broadcast', 'Remove this broadcast from all feeds?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeAnnouncement(a.id) },
              ]);
            }}
          >
            <Trash2 size={14} color={Colors.error} />
            <Text style={styles.removeAnnouncementText}>Remove</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );

  const renderPosts = () => (
    <View>
      <Text style={styles.sectionTitle}>All Posts ({allPosts.length})</Text>
      {allPosts.map((post) => {
        const statusColor =
          post.status === 'removed' ? Colors.error :
          post.status === 'flagged' ? Colors.warning : Colors.success;
        const statusLabel = post.status === 'removed' ? 'Removed' : post.status === 'flagged' ? 'Flagged' : 'Active';

        return (
          <View key={post.id} style={[styles.postMonitorCard, post.status === 'removed' && styles.postRemoved]}>
            <View style={styles.postMonitorHeader}>
              <Image source={{ uri: post.author.avatar }} style={styles.postMonitorAvatar} />
              <View style={styles.postMonitorInfo}>
                <Text style={styles.postMonitorAuthor} numberOfLines={1}>{post.author.name}</Text>
                <Text style={styles.postMonitorTime}>{post.createdAt}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.postMonitorContent} numberOfLines={2}>{post.content}</Text>
            <View style={styles.postMonitorActions}>
              {post.status !== 'removed' && (
                <>
                  <Pressable style={styles.monitorActionBtn} onPress={() => handleFlagPost(post.id)}>
                    <AlertTriangle size={14} color={Colors.warning} />
                    <Text style={[styles.monitorActionText, { color: Colors.warning }]}>Flag</Text>
                  </Pressable>
                  <Pressable style={styles.monitorActionBtn} onPress={() => handleRemovePost(post.id)}>
                    <Trash2 size={14} color={Colors.error} />
                    <Text style={[styles.monitorActionText, { color: Colors.error }]}>Remove</Text>
                  </Pressable>
                </>
              )}
              {post.status === 'flagged' && (
                <Pressable style={styles.monitorActionBtn} onPress={() => approvePost(post.id)}>
                  <CheckCircle size={14} color={Colors.success} />
                  <Text style={[styles.monitorActionText, { color: Colors.success }]}>Approve</Text>
                </Pressable>
              )}
              {post.status === 'removed' && (
                <Pressable style={styles.monitorActionBtn} onPress={() => approvePost(post.id)}>
                  <Eye size={14} color={Colors.teal} />
                  <Text style={[styles.monitorActionText, { color: Colors.teal }]}>Restore</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderReports = () => (
    <View>
      <Text style={styles.sectionTitle}>Reports ({reports.length})</Text>
      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <CheckCircle size={40} color={Colors.success} />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptySubtitle}>No pending reports to review</Text>
        </View>
      ) : (
        reports.map((report) => {
          const statusColor =
            report.status === 'removed' ? Colors.error :
            report.status === 'reviewed' ? Colors.success : Colors.warning;

          return (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={[styles.reportStatusBadge, { backgroundColor: statusColor + '18' }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.reportStatusText, { color: statusColor }]}>
                    {report.status === 'pending' ? 'Pending' : report.status === 'reviewed' ? 'Reviewed' : 'Removed'}
                  </Text>
                </View>
                <Text style={styles.reportTime}>{report.reportedAt}</Text>
              </View>
              <View style={styles.reportPostPreview}>
                <Image source={{ uri: report.post.author.avatar }} style={styles.reportPostAvatar} />
                <View style={styles.reportPostInfo}>
                  <Text style={styles.reportPostAuthor}>{report.post.author.name}</Text>
                  <Text style={styles.reportPostContent} numberOfLines={2}>{report.post.content}</Text>
                </View>
              </View>
              <View style={styles.reportReasonRow}>
                <AlertTriangle size={13} color={Colors.warning} />
                <Text style={styles.reportReason}>{report.reason}</Text>
              </View>
              <Text style={styles.reportedBy}>Reported by {report.reportedBy}</Text>
              {report.status === 'pending' && (
                <View style={styles.reportActions}>
                  <Pressable
                    style={[styles.reportActionBtn, styles.reportDismissBtn]}
                    onPress={() => resolveReport(report.id, 'reviewed')}
                  >
                    <CheckCircle size={14} color={Colors.success} />
                    <Text style={[styles.reportActionText, { color: Colors.success }]}>Dismiss</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.reportActionBtn, styles.reportRemoveBtn]}
                    onPress={() => {
                      resolveReport(report.id, 'removed');
                      removePost(report.postId);
                    }}
                  >
                    <Trash2 size={14} color="#fff" />
                    <Text style={[styles.reportActionText, { color: '#fff' }]}>Remove Post</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const renderBroadcast = () => (
    <View>
      <Text style={styles.sectionTitle}>New Broadcast</Text>
      <View style={styles.broadcastCard}>
        <View style={styles.broadcastHeader}>
          <Shield size={16} color={Colors.teal} />
          <Text style={styles.broadcastLabel}>Send to all users</Text>
        </View>
        <TextInput
          style={styles.broadcastInput}
          placeholder="Type your announcement message..."
          placeholderTextColor={Colors.textTertiary}
          value={broadcastText}
          onChangeText={setBroadcastText}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          testID="broadcast-input"
        />
        <View style={styles.imageUrlRow}>
          <ImagePlus size={16} color={Colors.textSecondary} />
          <TextInput
            style={styles.imageUrlInput}
            placeholder="Image URL (optional)"
            placeholderTextColor={Colors.textTertiary}
            value={broadcastImage}
            onChangeText={setBroadcastImage}
            testID="broadcast-image-input"
          />
          {broadcastImage.length > 0 && (
            <Pressable onPress={() => setBroadcastImage('')} hitSlop={8}>
              <X size={14} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
        {broadcastImage.trim().length > 0 && (
          <Image source={{ uri: broadcastImage }} style={styles.broadcastImagePreview} contentFit="cover" />
        )}
        <Pressable
          style={[styles.sendBroadcastBtn, !broadcastText.trim() && styles.sendBroadcastDisabled]}
          onPress={handleSendBroadcast}
          disabled={!broadcastText.trim()}
          testID="send-broadcast-btn"
        >
          <Send size={16} color={broadcastText.trim() ? '#fff' : Colors.textTertiary} />
          <Text style={[styles.sendBroadcastText, !broadcastText.trim() && { color: Colors.textTertiary }]}>
            Send Broadcast
          </Text>
        </Pressable>
      </View>

      {broadcastSent && (
        <Animated.View style={[styles.sentToast, { opacity: sentAnim, transform: [{ scale: sentAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
          <CheckCircle size={18} color="#fff" />
          <Text style={styles.sentToastText}>Broadcast sent to all users!</Text>
        </Animated.View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Previous Broadcasts</Text>
      {announcements.map((a) => (
        <View key={a.id} style={styles.prevBroadcastCard}>
          <Text style={styles.prevBroadcastContent} numberOfLines={2}>{a.content}</Text>
          <View style={styles.prevBroadcastFooter}>
            <Text style={styles.prevBroadcastTime}>{a.createdAt}</Text>
            <Pressable
              onPress={() => {
                Alert.alert('Remove Broadcast', 'Remove this broadcast?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => removeAnnouncement(a.id) },
                ]);
              }}
              hitSlop={8}
            >
              <Trash2 size={14} color={Colors.error} />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeTop} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ArrowLeft size={22} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Shield size={18} color={Colors.teal} />
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={16} color={isActive ? Colors.teal : Colors.textTertiary} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              {tab.key === 'reports' && pendingReports > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingReports}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'posts' && renderPosts()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'broadcast' && renderBroadcast()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeTop: {
    backgroundColor: '#0D1B2A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0D1B2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: -0.2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#E6FAF5',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.1,
  },
  tabTextActive: {
    color: Colors.teal,
  },
  tabBadge: {
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 2,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    borderRadius: 14,
    padding: 16,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.1,
    marginBottom: 10,
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  announcementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.teal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.3,
  },
  announcementTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  announcementContent: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
    fontWeight: '400' as const,
  },
  announcementImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 10,
  },
  announcementStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  announcementStatText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
  removeAnnouncementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeAnnouncementText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600' as const,
  },
  postMonitorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  postRemoved: {
    opacity: 0.5,
  },
  postMonitorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postMonitorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  postMonitorInfo: {
    flex: 1,
    marginLeft: 10,
  },
  postMonitorAuthor: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  postMonitorTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '400' as const,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  postMonitorContent: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  postMonitorActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  monitorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  monitorActionText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  reportCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reportStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  reportStatusText: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  reportTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '400' as const,
  },
  reportPostPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  reportPostAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  reportPostInfo: {
    flex: 1,
    marginLeft: 8,
  },
  reportPostAuthor: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  reportPostContent: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
    fontWeight: '400' as const,
  },
  reportReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reportReason: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  reportedBy: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '400' as const,
    marginBottom: 10,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  reportDismissBtn: {
    backgroundColor: '#F0FDF4',
  },
  reportRemoveBtn: {
    backgroundColor: Colors.error,
  },
  reportActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    fontWeight: '400' as const,
  },
  broadcastCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  broadcastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  broadcastLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  broadcastInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 100,
    fontWeight: '400' as const,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  imageUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  imageUrlInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    paddingVertical: 0,
    fontWeight: '400' as const,
  },
  broadcastImagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    marginTop: 10,
  },
  sendBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 14,
    gap: 8,
  },
  sendBroadcastDisabled: {
    backgroundColor: Colors.border,
  },
  sendBroadcastText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#fff',
  },
  sentToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.teal,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  sentToastText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  prevBroadcastCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  prevBroadcastContent: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  prevBroadcastFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  prevBroadcastTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500' as const,
  },
});

