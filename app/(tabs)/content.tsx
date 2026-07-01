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
import { useRouter, useFocusEffect } from 'expo-router';
import {
  Pencil,
  Plus,
  Trash2,
  Ban,
  CheckCircle2,
  Ticket,
  CalendarDays,
  FileText,
  X,
  XCircle,
} from 'lucide-react-native';
import {
  useManageContent,
  type ContentItem,
  type ItemStatus,
} from '@/contexts/ManageContentContext';
import { useOffers } from '@/hooks/useOffers';
import { type Offer } from '@/api/services/offersService';
import { useEvents } from '@/hooks/useEvents';
import { type Event } from '@/api/services/eventsService';
import { usePosts } from '@/hooks/usePosts';
import { type Post } from '@/api/services/postsService';

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
type OfferFilter = 'active' | 'expired' | 'disabled';
type EventFilter = 'upcoming' | 'past' | 'cancelled';
type PostFilter = 'active' | 'disabled';

const OFFER_FILTERS: { key: OfferFilter; label: string }[] = [
  { key: 'active',   label: 'Active' },
  { key: 'expired',  label: 'Expired' },
  { key: 'disabled', label: 'Disabled' },
];

const EVENT_FILTERS: { key: EventFilter; label: string }[] = [
  { key: 'upcoming',  label: 'Upcoming' },
  { key: 'past',      label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const POST_FILTERS: { key: PostFilter; label: string }[] = [
  { key: 'active',   label: 'Active' },
  { key: 'disabled', label: 'Disabled' },
];

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

const formatDateTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
  if (item.type === 'offer') {
    const offer = item as unknown as Offer;
    if (offer.expires_at && isExpiredDate(offer.expires_at)) return 'expired';
    return offer.effective_status;
  }
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

// Map event effective_status to a display pill
const EVENT_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  upcoming:  { label: 'Upcoming',  color: SUCCESS,    bg: SUCCESS + '15' },
  past:      { label: 'Past',      color: '#6B7280',  bg: '#E5E7EB' },
  cancelled: { label: 'Cancelled', color: DANGER,     bg: DANGER + '15' },
};

export default function ManageContentScreen() {
  const router = useRouter();
  const { updateStatus, removeItem } = useManageContent();
  const [offerFilter, setOfferFilter] = useState<OfferFilter>('active');
  const { offers: realOffers, toggleStatus, removeOffer, refresh: refreshOffers } = useOffers(offerFilter);
  const [eventFilter, setEventFilter] = useState<EventFilter>('upcoming');
  const { events: realEvents, refresh: refreshEvents, cancelEvent: doCancelEvent } = useEvents(eventFilter);
  const [postFilter, setPostFilter] = useState<PostFilter>('active');
  const {
    posts: realPosts,
    toggleStatus: togglePostStatus,
    removePost,
    refresh: refreshPosts,
  } = usePosts(postFilter);

  useFocusEffect(
    useCallback(() => {
      refreshOffers(offerFilter);
      refreshEvents(eventFilter);
      refreshPosts(postFilter);
    }, [refreshOffers, offerFilter, refreshEvents, eventFilter, refreshPosts, postFilter])
  );

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

  const [cancelConfirm, setCancelConfirm] = useState<{
    visible: boolean;
    event: Event | null;
  }>({ visible: false, event: null });

  const [postConfirm, setPostConfirm] = useState<{
    visible: boolean;
    action: 'disable' | 'enable' | 'delete' | null;
    post: Post | null;
  }>({ visible: false, action: null, post: null });

  const tabs = useMemo(
    () => [
      { key: 'offers' as const, label: 'Offers', count: realOffers.length },
      { key: 'events' as const, label: 'Events', count: realEvents.length },
      { key: 'posts'  as const, label: 'Posts',  count: realPosts.length },
    ],
    [realOffers.length, realEvents.length, realPosts.length],
  );

  const items: ContentItem[] = useMemo(() => {
    if (activeTab === 'offers') return realOffers as unknown as ContentItem[];
    if (activeTab === 'events') return realEvents as unknown as ContentItem[];
    return [];
  }, [activeTab, realOffers, realEvents]);

  const handleEditOpen = useCallback(
    (item: ContentItem) => {
      if (item.type === 'offer') router.push(`/edit-offer/${item.id}` as any);
      else if (item.type === 'event') router.push(`/edit-event/${item.id}` as any);
      else router.push(`/edit-content-post/${item.id}` as any);
    },
    [router],
  );

  const handleConfirmAction = useCallback(async () => {
    const { action, item } = confirm;
    if (!item || !action) {
      setConfirm({ visible: false, action: null, item: null });
      return;
    }
    const label = itemTitle(item);
    if (action === 'disable') {
      if (item.type === 'offer') {
        try {
          await toggleStatus(item.id, 'disabled');
          showSnackbar(`${label} disabled`);
        } catch (err: unknown) {
          showSnackbar(err instanceof Error ? err.message : 'Failed to disable offer');
        }
      } else {
        updateStatus(item.id, item.type, 'disabled');
        showSnackbar(`${label} disabled`);
      }
    } else if (action === 'delete') {
      if (item.type === 'offer') {
        try {
          await removeOffer(item.id);
          showSnackbar(`${label} deleted`);
        } catch (err: unknown) {
          showSnackbar(err instanceof Error ? err.message : 'Failed to delete offer');
        }
      } else {
        removeItem(item.id, item.type);
        showSnackbar(`${label} deleted`);
      }
    }
    setConfirm({ visible: false, action: null, item: null });
  }, [confirm, toggleStatus, removeOffer, updateStatus, removeItem, showSnackbar]);

  const handleCancelEvent = useCallback(async () => {
    const { event } = cancelConfirm;
    if (!event) { setCancelConfirm({ visible: false, event: null }); return; }
    try {
      await doCancelEvent(event.id);
      refreshEvents(eventFilter);
      showSnackbar(`"${event.title}" cancelled`);
    } catch (err: unknown) {
      showSnackbar(err instanceof Error ? err.message : 'Failed to cancel event');
    }
    setCancelConfirm({ visible: false, event: null });
  }, [cancelConfirm, doCancelEvent, refreshEvents, eventFilter, showSnackbar]);

  const handlePostConfirmAction = useCallback(async () => {
    const { action, post } = postConfirm;
    if (!post || !action) {
      setPostConfirm({ visible: false, action: null, post: null });
      return;
    }
    if (action === 'disable') {
      try {
        await togglePostStatus(post.id, false);
        showSnackbar(`"${post.title}" disabled`);
      } catch (err: unknown) {
        showSnackbar(err instanceof Error ? err.message : 'Failed to disable post');
      }
    } else if (action === 'enable') {
      try {
        await togglePostStatus(post.id, true);
        showSnackbar(`"${post.title}" enabled`);
      } catch (err: unknown) {
        showSnackbar(err instanceof Error ? err.message : 'Failed to enable post');
      }
    } else if (action === 'delete') {
      try {
        await removePost(post.id);
        showSnackbar(`"${post.title}" deleted`);
      } catch (err: unknown) {
        showSnackbar(err instanceof Error ? err.message : 'Failed to delete post');
      }
    }
    setPostConfirm({ visible: false, action: null, post: null });
  }, [postConfirm, togglePostStatus, removePost, showSnackbar]);

  const renderTypeBadge = (type: ContentItem['type']) => {
    const map: Record<ContentItem['type'], { label: string; color: string; bg: string }> = {
      post:  { label: 'Post',  color: PURPLE,  bg: PURPLE + '14' },
      offer: { label: 'Offer', color: SUCCESS, bg: SUCCESS + '15' },
      event: { label: 'Event', color: BLUE,    bg: BLUE + '15' },
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
      active:   { label: 'Active',   color: SUCCESS,   bg: SUCCESS + '15' },
      disabled: { label: 'Disabled', color: '#6B7280', bg: '#E5E7EB' },
      expired:  { label: 'Expired',  color: DANGER,    bg: DANGER + '15' },
    };
    const s = map[status];
    return (
      <View style={[styles.pill, { backgroundColor: s.bg }]}>
        <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
      </View>
    );
  };

  const renderEventStatusBadge = (effectiveStatus: string) => {
    const s = EVENT_STATUS_MAP[effectiveStatus] ?? EVENT_STATUS_MAP.upcoming;
    return (
      <View style={[styles.pill, { backgroundColor: s.bg }]}>
        <Text style={[styles.pillText, { color: s.color }]}>{s.label}</Text>
      </View>
    );
  };

  const renderPostStatusBadge = (isActive: boolean) => {
    const color = isActive ? SUCCESS : '#6B7280';
    const bg    = isActive ? SUCCESS + '15' : '#E5E7EB';
    const label = isActive ? 'Active' : 'Disabled';
    return (
      <View style={[styles.pill, { backgroundColor: bg }]}>
        <Text style={[styles.pillText, { color }]}>{label}</Text>
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
    if (item.type === 'offer') {
      const expiresAt = (item as unknown as Offer).expires_at;
      return expiresAt ? `Valid until ${formatLongDate(expiresAt)}` : 'No expiry';
    }
    if (item.type === 'event') return `${formatDateTime((item as unknown as Event).starts_at)}`;
    return `Posted ${relativeTime(item.created_at)}`;
  };

  const renderEventLocation = (item: ContentItem): string | null => {
    if (item.type !== 'event') return null;
    return (item as unknown as Event).location ?? null;
  };

  const renderCard = (item: ContentItem) => {
    const isEvent = item.type === 'event';
    const event = isEvent ? (item as unknown as Event) : null;
    const effectiveStatus = isEvent ? event!.effective_status : null;
    const status = !isEvent ? getEffectiveStatus(item) : null;
    const previewLines = item.type === 'post' ? 2 : 1;
    const titleText = item.type === 'post' ? item.text : item.title;
    const descText = item.type === 'post' ? '' : item.description;
    const location = renderEventLocation(item);

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
              {isEvent
                ? renderEventStatusBadge(effectiveStatus!)
                : renderStatusBadge(status!)
              }
            </View>
            {descText ? (
              <Text style={styles.cardDesc} numberOfLines={1}>{descText}</Text>
            ) : null}
            {location ? (
              <Text style={styles.cardDesc} numberOfLines={1}>📍 {location}</Text>
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

          {isEvent ? (
            <>
              {effectiveStatus === 'upcoming' && (
                <>
                  <View style={styles.actionDivider} />
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setCancelConfirm({ visible: true, event: event! })}
                    testID={`cancel-${item.id}`}
                  >
                    <XCircle size={16} color={DANGER} />
                    <Text style={[styles.actionText, { color: DANGER }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
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
                  onPress={async () => {
                    if (item.type === 'offer') {
                      try {
                        await toggleStatus(item.id, 'active');
                        showSnackbar(`${itemTitle(item)} enabled`);
                        refreshOffers();
                      } catch (err: unknown) {
                        showSnackbar(err instanceof Error ? err.message : 'Cannot enable this offer');
                      }
                    } else {
                      updateStatus(item.id, item.type, 'active');
                      showSnackbar(`${itemTitle(item)} enabled`);
                    }
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
            </>
          )}
        </View>
      </Surface>
    );
  };

  const renderPostCard = (post: Post) => (
    <Surface key={post.id} style={styles.card} elevation={1}>
      <View style={styles.cardTop}>
        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Text style={styles.thumbEmoji}>📝</Text>
          </View>
        )}
        <View style={styles.cardTopText}>
          <Text style={styles.cardTitle} numberOfLines={2}>{post.title}</Text>
          <View style={styles.badgeRow}>
            {renderTypeBadge('post')}
            {renderPostStatusBadge(post.is_active)}
          </View>
          {post.content ? (
            <Text style={styles.cardDesc} numberOfLines={2}>{post.content}</Text>
          ) : null}
          <Text style={styles.cardSubtitle}>Posted {relativeTime(post.created_at)}</Text>
        </View>
      </View>

      <Divider style={styles.cardDivider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/edit-post/${post.id}` as any)}
          testID={`edit-post-${post.id}`}
        >
          <Pencil size={16} color={PURPLE} />
          <Text style={[styles.actionText, { color: PURPLE }]}>Edit</Text>
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        {post.is_active ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setPostConfirm({ visible: true, action: 'disable', post })}
            testID={`disable-post-${post.id}`}
          >
            <Ban size={16} color={AMBER} />
            <Text style={[styles.actionText, { color: AMBER }]}>Disable</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setPostConfirm({ visible: true, action: 'enable', post })}
            testID={`enable-post-${post.id}`}
          >
            <CheckCircle2 size={16} color={SUCCESS} />
            <Text style={[styles.actionText, { color: SUCCESS }]}>Enable</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setPostConfirm({ visible: true, action: 'delete', post })}
          testID={`delete-post-${post.id}`}
        >
          <Trash2 size={16} color={DANGER} />
          <Text style={[styles.actionText, { color: DANGER }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Surface>
  );

  const emptyConfig = useMemo(() => {
    if (activeTab === 'offers') return { Icon: Ticket,       label: 'Offers', emoji: '🎟', body: 'Tap ＋ Create Offer to get started.' };
    if (activeTab === 'events') return { Icon: CalendarDays, label: 'Events', emoji: '📅', body: 'Tap ＋ Create Event to get started.' };
    return { Icon: FileText,     label: 'Posts',  emoji: '📝', body: 'Tap ＋ Create Post to get started.' };
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

  const postConfirmCopy = useMemo(() => {
    if (!postConfirm.action) return { title: '', body: '', cta: '', ctaColor: DANGER };
    if (postConfirm.action === 'disable') {
      return { title: 'Disable this post?', body: 'It will no longer be visible to subscribers.', cta: 'Disable', ctaColor: AMBER };
    }
    if (postConfirm.action === 'enable') {
      return { title: 'Enable this post?', body: 'It will become visible to your subscribers.', cta: 'Enable', ctaColor: SUCCESS };
    }
    return { title: 'Delete this post?', body: 'This cannot be undone.', cta: 'Delete', ctaColor: DANGER };
  }, [postConfirm.action]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Content</Text>
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

      <View style={styles.createBtnWrap}>
        {activeTab === 'offers' && (
          <TouchableOpacity
            onPress={() => router.push('/create-offer' as any)}
            style={styles.createOfferLink}
            activeOpacity={0.7}
            testID="create-offer-btn"
          >
            <Plus size={15} color={PURPLE} />
            <Text style={styles.createOfferText}>Create Offer</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'events' && (
          <TouchableOpacity
            onPress={() => router.push('/create-offer?tab=event' as any)}
            style={styles.createOfferLink}
            activeOpacity={0.7}
            testID="create-event-btn"
          >
            <Plus size={15} color={PURPLE} />
            <Text style={styles.createOfferText}>Create Event</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'posts' && (
          <TouchableOpacity
            onPress={() => router.push('/create-offer?tab=post' as any)}
            style={styles.createOfferLink}
            activeOpacity={0.7}
            testID="create-post-btn"
          >
            <Plus size={15} color={PURPLE} />
            <Text style={styles.createOfferText}>Create Post</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'offers' && (
        <View style={styles.filterRow}>
          {OFFER_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                setOfferFilter(f.key);
                refreshOffers(f.key);
              }}
              style={[styles.filterChip, offerFilter === f.key && styles.filterChipActive]}
              testID={`offer-filter-${f.key}`}
            >
              <Text style={[styles.filterChipText, offerFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'events' && (
        <View style={styles.filterRow}>
          {EVENT_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                setEventFilter(f.key);
                refreshEvents(f.key);
              }}
              style={[styles.filterChip, eventFilter === f.key && styles.filterChipActive]}
              testID={`filter-${f.key}`}
            >
              <Text style={[styles.filterChipText, eventFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === 'posts' && (
        <View style={styles.filterRow}>
          {POST_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => {
                setPostFilter(f.key);
                refreshPosts(f.key);
              }}
              style={[styles.filterChip, postFilter === f.key && styles.filterChipActive]}
              testID={`post-filter-${f.key}`}
            >
              <Text style={[styles.filterChipText, postFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'posts' ? (
          realPosts.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={styles.emptyTitle}>No Posts yet</Text>
              <Text style={styles.emptyBody}>Tap ＋ Create Post to get started.</Text>
            </View>
          ) : (
            realPosts.map((p) => renderPostCard(p))
          )
        ) : (
          items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>{emptyConfig.emoji}</Text>
              <Text style={styles.emptyTitle}>No {emptyConfig.label} yet</Text>
              <Text style={styles.emptyBody}>{emptyConfig.body}</Text>
            </View>
          ) : (
            items.map((it) => renderCard(it))
          )
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

      <Portal>
        <Dialog
          visible={cancelConfirm.visible}
          onDismiss={() => setCancelConfirm({ visible: false, event: null })}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Cancel Event</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogBody}>
              Are you sure you want to cancel this event? This cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setCancelConfirm({ visible: false, event: null })}
              textColor={TEXT_MUTED}
            >
              Keep Event
            </Button>
            <Button
              onPress={handleCancelEvent}
              textColor={DANGER}
              testID="cancel-event-confirm"
            >
              Cancel Event
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Portal>
        <Dialog
          visible={postConfirm.visible}
          onDismiss={() => setPostConfirm({ visible: false, action: null, post: null })}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>{postConfirmCopy.title}</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogBody}>{postConfirmCopy.body}</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setPostConfirm({ visible: false, action: null, post: null })}
              textColor={TEXT_MUTED}
            >
              Cancel
            </Button>
            <Button
              onPress={handlePostConfirmAction}
              textColor={postConfirmCopy.ctaColor}
              testID="post-confirm-action"
            >
              {postConfirmCopy.cta}
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
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
    paddingBottom: 16,
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
  createBtnWrap: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  createOfferLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  createOfferText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: PURPLE,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F1F6',
  },
  filterChipActive: {
    backgroundColor: PURPLE,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: TEXT_MUTED,
  },
  filterChipTextActive: {
    color: '#fff',
  },
});
