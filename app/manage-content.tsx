import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Surface,
  Button,
  Divider,
  Dialog,
  Portal,
  Paragraph,
  Snackbar,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  Ticket,
  CalendarDays,
  FileText,
  X,
} from 'lucide-react-native';
import {
  useManageContent,
  type ContentItem,
  type ItemStatus,
} from '@/contexts/ManageContentContext';

const PURPLE = '#1A5C35';
const PURPLE_SURFACE = '#F3F0FF';
const BG = '#F6F5FA';
const TEXT_DARK = '#0F1115';
const TEXT_MUTED = '#6B7280';
const BORDER = '#ECECF1';
const DANGER = '#ED4956';
const AMBER = '#F59E0B';
const SUCCESS = '#10B981';
const BLUE = '#3B82F6';

type TabKey = 'offers' | 'events' | 'posts';

const formatLongDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const relativeTime = (iso: string): string => {
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
  } catch {
    return iso;
  }
};

const isExpiredDate = (iso: string): boolean => {
  try {
    const d = new Date(iso).getTime();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today.getTime();
  } catch {
    return false;
  }
};

const getEffectiveStatus = (item: ContentItem): ItemStatus => {
  if (item.type === 'offer' && isExpiredDate(item.valid_until)) return 'expired';
  if (item.type === 'event' && isExpiredDate(item.date)) return 'expired';
  return item.status;
};

const itemTitle = (item: ContentItem): string => {
  if (item.type === 'post') {
    const t = item.text.trim();
    return t.length > 60 ? t.slice(0, 60) + '…' : t;
  }
  return item.title;
};

export default function ManageContentScreen() {
  const router = useRouter();
  const { offers, events, posts, updateStatus, removeItem } = useManageContent();
  const [activeTab, setActiveTab] = useState<TabKey>('offers');

  const [snackbar, setSnackbar] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const showSnackbar = useCallback((message: string) => {
    setSnackbar({ visible: true, message });
  }, []);

  const [confirm, setConfirm] = useState<{
    visible: boolean;
    action: 'disable' | 'delete' | null;
    item: ContentItem | null;
  }>({ visible: false, action: null, item: null });

  const tabs = useMemo(
    () => [
      { key: 'offers' as const, label: 'Offers', count: offers.length },
      { key: 'events' as const, label: 'Events', count: events.length },
      { key: 'posts' as const, label: 'Posts', count: posts.length },
    ],
    [offers.length, events.length, posts.length],
  );

  const items: ContentItem[] = useMemo(() => {
    if (activeTab === 'offers') return offers;
    if (activeTab === 'events') return events;
    return posts;
  }, [activeTab, offers, events, posts]);

  const handleEditOpen = useCallback(
    (item: ContentItem) => {
      if (item.type === 'offer') router.push(`/edit-offer/${item.id}` as any);
      else if (item.type === 'event') router.push(`/edit-event/${item.id}` as any);
      else router.push(`/edit-content-post/${item.id}` as any);
    },
    [router],
  );

  const handleConfirmAction = useCallback(() => {
    const { action, item } = confirm;
    if (!item || !action) {
      setConfirm({ visible: false, action: null, item: null });
      return;
    }
    const label = itemTitle(item);
    if (action === 'disable') {
      updateStatus(item.id, item.type, 'disabled');
      showSnackbar(`${label} disabled`);
    } else if (action === 'delete') {
      removeItem(item.id, item.type);
      showSnackbar(`${label} deleted`);
    }
    setConfirm({ visible: false, action: null, item: null });
  }, [confirm, updateStatus, removeItem, showSnackbar]);

  const renderTypeBadge = (type: ContentItem['type']) => {
    const map: Record<ContentItem['type'], { label: string; color: string; bg: string }> = {
      post: { label: 'Post', color: PURPLE, bg: PURPLE + '14' },
      offer: { label: 'Offer', color: SUCCESS, bg: SUCCESS + '15' },
      event: { label: 'Event', color: BLUE, bg: BLUE + '15' },
    };
    const t = map[type];
    return (
      <View style={[styles.pill, { backgroundColor: t.bg }]}>
        <Text style={[styles.pillText, { color: t.color }]}>{t.label}</Text>
      </View>
    );
  };

  const renderStatusBadge = (status: ItemStatus) => {
    const map: Record<ItemStatus, { label: string; color: string; bg: string }> = {
      active: { label: 'Active', color: SUCCESS, bg: SUCCESS + '15' },
      disabled: { label: 'Disabled', color: '#6B7280', bg: '#E5E7EB' },
      expired: { label: 'Expired', color: DANGER, bg: DANGER + '15' },
    };
    const s = map[status];
    return (
      <View style={[styles.pill, { backgroundColor: s.bg }]}>
        <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
      </View>
    );
  };

  const renderThumbnail = (item: ContentItem) => {
    if (item.image_url) {
      return <Image source={{ uri: item.image_url }} style={styles.thumb} />;
    }
    const emoji = item.type === 'post' ? '📝' : item.type === 'offer' ? '🎟' : '📅';
    return (
      <View style={[styles.thumb, styles.thumbPlaceholder]}>
        <Text style={styles.thumbEmoji}>{emoji}</Text>
      </View>
    );
  };

  const renderSubtitle = (item: ContentItem): string => {
    if (item.type === 'offer') return `Valid until ${formatLongDate(item.valid_until)}`;
    if (item.type === 'event') return `Date: ${formatLongDate(item.date)}`;
    return `Posted ${relativeTime(item.created_at)}`;
  };

  const renderCard = (item: ContentItem) => {
    const status = getEffectiveStatus(item);
    const previewLines = item.type === 'post' ? 2 : 1;
    const titleText = item.type === 'post' ? item.text : item.title;
    const descText = item.type === 'post' ? '' : item.description;

    return (
      <Surface key={item.id} style={styles.card} elevation={1}>
        <View style={styles.cardTop}>
          {renderThumbnail(item)}
          <View style={styles.cardTopText}>
            <Text style={styles.cardTitle} numberOfLines={previewLines}>
              {titleText}
            </Text>
            <View style={styles.badgeRow}>
              {renderTypeBadge(item.type)}
              {renderStatusBadge(status)}
            </View>
            {descText ? (
              <Text style={styles.cardDesc} numberOfLines={1}>
                {descText}
              </Text>
            ) : null}
            <Text style={styles.cardSubtitle}>{renderSubtitle(item)}</Text>
          </View>
        </View>

        <Divider style={styles.cardDivider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleEditOpen(item)}
            testID={`edit-${item.id}`}
          >
            <Pencil size={16} color={PURPLE} />
            <Text style={[styles.actionText, { color: PURPLE }]}>Edit</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          {status === 'expired' ? (
            <View style={styles.actionBtn}>
              <Text style={styles.expiredLabel}>Expired</Text>
            </View>
          ) : status === 'active' ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setConfirm({ visible: true, action: 'disable', item })}
              testID={`disable-${item.id}`}
            >
              <Ban size={16} color={AMBER} />
              <Text style={[styles.actionText, { color: AMBER }]}>Disable</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                updateStatus(item.id, item.type, 'active');
                showSnackbar(`${itemTitle(item)} enabled`);
              }}
              testID={`enable-${item.id}`}
            >
              <CheckCircle2 size={16} color={SUCCESS} />
              <Text style={[styles.actionText, { color: SUCCESS }]}>Enable</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setConfirm({ visible: true, action: 'delete', item })}
            testID={`delete-${item.id}`}
          >
            <Trash2 size={16} color={DANGER} />
            <Text style={[styles.actionText, { color: DANGER }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  const emptyConfig = useMemo(() => {
    if (activeTab === 'offers')
      return { Icon: Ticket, label: 'Offers', emoji: '🎟' };
    if (activeTab === 'events')
      return { Icon: CalendarDays, label: 'Events', emoji: '📅' };
    return { Icon: FileText, label: 'Posts', emoji: '📝' };
  }, [activeTab]);

  const confirmCopy = useMemo(() => {
    if (!confirm.item || !confirm.action) return { title: '', body: '', cta: '' };
    const typeLabel = confirm.item.type;
    if (confirm.action === 'disable') {
      return {
        title: `Disable this ${typeLabel}?`,
        body: `It will no longer be visible to subscribers.`,
        cta: 'Disable',
      };
    }
    return {
      title: `Delete this ${typeLabel}?`,
      body: 'This cannot be undone.',
      cta: 'Delete',
    };
  }, [confirm]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          testID="manage-content-back"
        >
          <ArrowLeft size={22} color={TEXT_DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Content</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.tabBar}>
        {tabs.map((t) => {
          const active = t.key === activeTab;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tab, active && styles.tabActive]}
              testID={`tab-${t.key}`}
            >
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t.label} ({t.count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>{emptyConfig.emoji}</Text>
            <Text style={styles.emptyTitle}>No {emptyConfig.label} yet</Text>
            <Text style={styles.emptyBody}>Create your first one from the dashboard.</Text>
          </View>
        ) : (
          items.map((it) => renderCard(it))
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={confirm.visible}
          onDismiss={() => setConfirm({ visible: false, action: null, item: null })}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{confirmCopy.title}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogBody}>{confirmCopy.body}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setConfirm({ visible: false, action: null, item: null })}
              textColor={TEXT_MUTED}
            >
              Cancel
            </Button>
            <Button
              onPress={handleConfirmAction}
              textColor={confirm.action === 'delete' ? DANGER : AMBER}
              testID="confirm-action"
            >
              {confirmCopy.cta}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        action={{
          label: '',
          icon: () => <X size={16} color="#fff" />,
          onPress: () => setSnackbar({ visible: false, message: '' }),
        }}
      >
        {snackbar.message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F1F6',
  },
  tabActive: {
    backgroundColor: PURPLE_SURFACE,
    borderWidth: 1,
    borderColor: PURPLE + '40',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
  },
  tabLabelActive: {
    color: PURPLE,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  cardTopText: {
    flex: 1,
    minWidth: 0,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: PURPLE_SURFACE,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: TEXT_DARK,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  cardDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  cardDivider: {
    marginVertical: 10,
    backgroundColor: BORDER,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  actionDivider: {
    width: 1,
    height: 18,
    backgroundColor: BORDER,
  },
  expiredLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
    fontStyle: 'italic' as const,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: TEXT_DARK,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center' as const,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: TEXT_DARK,
  },
  dialogBody: {
    fontSize: 14,
    color: TEXT_MUTED,
  },
});
