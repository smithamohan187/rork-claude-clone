import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Button, Snackbar, Divider } from 'react-native-paper';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  Calendar,
  Clock,
  MapPin,
  Check,
} from 'lucide-react-native';
import { useSavedBusinesses } from '@/hooks/useSavedBusinesses';
import type { SavedBusinessItem } from '@/api/services/savedBusinessService';
import { useSavedOffers } from '@/hooks/useSavedOffers';
import type { SavedOfferItem } from '@/api/services/savedOfferService';
import { useSavedEvents } from '@/hooks/useSavedEvents';
import type { SavedEventItem } from '@/api/services/savedEventService';
import { useSavedPosts } from '@/hooks/useSavedPosts';
import type { SavedPostItem } from '@/api/services/savedPostService';
import { FileText } from 'lucide-react-native';

type TabKey = 'favourites' | 'offers' | 'events' | 'posts';

interface SavedOffer {
  id: string;
  title: string;
  businessName: string;
  businessInitials: string;
  businessColor: string;
  offerType: 'Discount' | 'Promotion' | 'Flash Sale' | 'Bundle';
  discountPercent: string | null;
  expiresAt: string;
  isExpired: boolean;
}

interface JoinedEvent {
  id: string;
  title: string;
  businessName: string;
  businessInitials: string;
  businessColor: string;
  eventType: 'In Person' | 'Online' | 'Hybrid';
  date: string;
  time: string;
  location: string;
  status: 'upcoming' | 'past';
}


function formatExpiry(isoDate: string | null): string {
  if (!isoDate) return 'No expiry';
  const d = new Date(isoDate);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const isPast = d < new Date();
  return `${isPast ? 'Expired' : 'Expires'} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function toSavedOfferUI(item: SavedOfferItem): SavedOffer {
  const isExpired = item.expires_at ? new Date(item.expires_at) < new Date() : false;
  return {
    id: item.id,
    title: item.title,
    businessName: item.business_name,
    businessInitials: getInitials(item.business_name),
    businessColor: '#1A5C35',
    offerType: 'Discount',
    discountPercent: null,
    expiresAt: formatExpiry(item.expires_at),
    isExpired,
  };
}

const EVENT_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const EVENT_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return `${EVENT_DAYS[d.getDay()]}, ${d.getDate()} ${EVENT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  const min = m < 10 ? `0${m}` : String(m);
  return `${hr}:${min} ${ampm}`;
}

function toSavedEventUI(item: SavedEventItem): JoinedEvent {
  const dbStatus = item.status;
  const uiStatus: JoinedEvent['status'] = (dbStatus === 'upcoming' || dbStatus === 'ongoing') ? 'upcoming' : 'past';
  const timeStr = item.ends_at
    ? `${formatEventTime(item.starts_at)} – ${formatEventTime(item.ends_at)}`
    : formatEventTime(item.starts_at);
  return {
    id: item.id,
    title: item.title,
    businessName: item.business_name,
    businessInitials: getInitials(item.business_name),
    businessColor: '#1A5C35',
    eventType: item.event_type,
    date: formatEventDate(item.starts_at),
    time: timeStr,
    location: item.location ?? '',
    status: uiStatus,
  };
}

const INITIAL_EVENTS: JoinedEvent[] = [
  {
    id: '1',
    title: 'Annual Pastry & Coffee Festival 2025',
    businessName: "Richard's Pastry",
    businessInitials: 'RP',
    businessColor: '#1A5C35',
    eventType: 'In Person',
    date: 'Sunday, 20 April 2025',
    time: '5:00 PM – 9:00 PM',
    location: 'Lulu Mall Food Court, Kochi',
    status: 'upcoming',
  },
  {
    id: '2',
    title: 'Fitness Bootcamp — April Edition',
    businessName: 'Kochi Fitness Hub',
    businessInitials: 'KF',
    businessColor: '#0F6E56',
    eventType: 'In Person',
    date: 'Saturday, 19 April 2025',
    time: '6:00 AM – 8:00 AM',
    location: 'Marine Drive, Kochi',
    status: 'upcoming',
  },
  {
    id: '3',
    title: 'Skincare Masterclass Online',
    businessName: 'The Beauty Lounge',
    businessInitials: 'BL',
    businessColor: '#993556',
    eventType: 'Online',
    date: 'Monday, 10 April 2025',
    time: '7:00 PM – 8:30 PM',
    location: 'Zoom Meeting',
    status: 'past',
  },
];

const MONTHS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

function extractDateBits(date: string): { month: string; day: string } {
  const parts = date.split(',');
  const body = (parts[1] ?? parts[0] ?? '').trim();
  const tokens = body.split(' ').filter(Boolean);
  const day = tokens[0] ?? '';
  const monthWord = (tokens[1] ?? '').toLowerCase();
  const monthIdx = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ].indexOf(monthWord);
  const month = monthIdx >= 0 ? MONTHS[monthIdx] : monthWord.slice(0, 3).toUpperCase();
  return { month, day };
}

function getOfferBadgeColors(type: SavedOffer['offerType']): { bg: string; text: string } {
  switch (type) {
    case 'Discount':
      return { bg: '#E1F5EE', text: '#0F6E56' };
    case 'Promotion':
      return { bg: '#E8F5EE', text: '#1A5C35' };
    case 'Flash Sale':
      return { bg: '#FCEBEB', text: '#A32D2D' };
    case 'Bundle':
      return { bg: '#FAEEDA', text: '#854F0B' };
  }
}

function getEventTypeColors(type: JoinedEvent['eventType']): { bg: string; text: string } {
  switch (type) {
    case 'In Person':
      return { bg: '#E1F5EE', text: '#0F6E56' };
    case 'Online':
      return { bg: '#E8F5EE', text: '#1A5C35' };
    case 'Hybrid':
      return { bg: '#FAEEDA', text: '#854F0B' };
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SavedActivityScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('favourites');
  const { businesses, isLoading, unsave } = useSavedBusinesses();
  const { offers: savedOffers, isLoading: offersLoading, remove: removeSavedOffer } = useSavedOffers();
  const { events: savedEvents, isLoading: eventsLoading } = useSavedEvents();
  const { posts: savedPosts, isLoading: postsLoading, remove: removePost } = useSavedPosts();
  const [snackVisible, setSnackVisible] = useState<boolean>(false);
  const [snackMsg, setSnackMsg] = useState<string>('');

  const showSnack = (msg: string) => {
    setSnackMsg(msg);
    setSnackVisible(true);
  };

  const handleRemoveFavourite = useCallback((id: string) => {
    unsave(id);
    showSnack('Removed from favourites');
  }, [unsave]);

  const handleRemoveOffer = useCallback((id: string) => {
    removeSavedOffer(id);
    showSnack('Removed from saved');
  }, [removeSavedOffer]);

  const handleRemovePost = useCallback((id: string) => {
    removePost(id);
    showSnack('Removed from saved');
  }, [removePost]);

  const tabs: { key: TabKey; label: string; icon: typeof Heart }[] = [
    { key: 'favourites', label: 'Favourites', icon: Heart },
    { key: 'offers', label: 'Saved Offers', icon: Bookmark },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'posts', label: 'Posts', icon: FileText },
  ];

  const mappedEvents = savedEvents.map(toSavedEventUI);
  const upcomingEvents = mappedEvents.filter((e) => e.status === 'upcoming');
  const pastEvents = mappedEvents.filter((e) => e.status === 'past');

  return (
    <View style={styles.root} testID="saved-activity-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="back-btn"
          >
            <ArrowLeft size={22} color="#1A5C35" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bookmarks</Text>
          <View style={styles.backBtn} />
        </View>

        <View style={styles.tabBar}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(t.key)}
                testID={`tab-${t.key}`}
              >
                <Icon
                  size={13}
                  color={active ? '#ffffff' : '#888780'}
                  fill={active && t.key === 'favourites' ? '#ffffff' : 'transparent'}
                />
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {activeTab === 'favourites' && (
        isLoading && businesses.length === 0
          ? <ActivityIndicator style={{ marginTop: 60 }} color="#1A5C35" />
          : <FavouritesTab
              items={businesses}
              onRemove={handleRemoveFavourite}
              onView={(id) => router.push(`/business-profile/${id}` as never)}
              onExplore={() => router.back()}
            />
      )}

      {activeTab === 'offers' && (
        offersLoading && savedOffers.length === 0
          ? <ActivityIndicator style={{ marginTop: 60 }} color="#1A5C35" />
          : <OffersTab
              items={savedOffers.map(toSavedOfferUI)}
              onRemove={handleRemoveOffer}
              onView={(id) =>
                router.push({ pathname: '/view-offer', params: { offerId: id } } as never)
              }
              onExplore={() => router.back()}
            />
      )}

      {activeTab === 'events' && (
        eventsLoading && savedEvents.length === 0
          ? <ActivityIndicator style={{ marginTop: 60 }} color="#1A5C35" />
          : <EventsTab
              upcoming={upcomingEvents}
              past={pastEvents}
              onView={(id) =>
                router.push({ pathname: '/view-event', params: { eventId: id } } as never)
              }
              onExplore={() => router.back()}
            />
      )}

      {activeTab === 'posts' && (
        postsLoading && savedPosts.length === 0
          ? <ActivityIndicator style={{ marginTop: 60 }} color="#1A5C35" />
          : <PostsTab
              items={savedPosts}
              onRemove={handleRemovePost}
              onExplore={() => router.back()}
            />
      )}

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={2000}
        style={styles.snackbar}
        wrapperStyle={styles.snackbarWrapper}
      >
        {snackMsg}
      </Snackbar>
    </View>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

function formatSubscriberCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

interface FavouritesTabProps {
  items: SavedBusinessItem[];
  onRemove: (id: string) => void;
  onView: (id: string) => void;
  onExplore: () => void;
}

function FavouritesTab({ items, onRemove, onView, onExplore }: FavouritesTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={40} color="#E8F5EE" />}
        title="No favourites yet"
        subtitle="Tap the heart on any business page to save it here"
        ctaLabel="Explore Businesses"
        onCta={onExplore}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const meta = [item.category_name, item.city].filter(Boolean).join(' · ');
        return (
          <View style={styles.card} testID={`fav-${item.id}`}>
            <View style={styles.row}>
              {item.logo_url ? (
                <Image
                  source={{ uri: item.logo_url }}
                  style={styles.logoSquare}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.logoSquare, { backgroundColor: '#1A5C35' }]}>
                  <Text style={styles.logoInitials}>{getInitials(item.name)}</Text>
                </View>
              )}
              <View style={styles.rowCenter}>
                <Text style={styles.bizName} numberOfLines={1}>{item.name}</Text>
                {!!meta && <Text style={styles.muted}>{meta}</Text>}
                {item.avg_rating != null && (
                  <Text style={styles.muted}>★ {Number(item.avg_rating).toFixed(1)}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => onRemove(item.id)}
                hitSlop={10}
                testID={`remove-fav-${item.id}`}
              >
                <Heart size={20} color="#E24B4A" fill="#E24B4A" />
              </TouchableOpacity>
            </View>
            <Divider style={styles.innerDivider} />
            <View style={styles.rowBetween}>
              <Text style={styles.smallMuted}>
                {formatSubscriberCount(item.subscriber_count)} subscribers
              </Text>
              <TouchableOpacity onPress={() => onView(item.id)}>
                <Text style={styles.viewLink}>View Business →</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

interface OffersTabProps {
  items: SavedOffer[];
  onRemove: (id: string) => void;
  onView: (id: string) => void;
  onExplore: () => void;
}

function OffersTab({ items, onRemove, onView, onExplore }: OffersTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark size={40} color="#E8F5EE" />}
        title="No saved offers"
        subtitle="Tap the bookmark on any offer to save it for later"
        ctaLabel="Explore Offers"
        onCta={onExplore}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => {
        const badge = getOfferBadgeColors(item.offerType);
        return (
          <View
            style={[
              styles.card,
              item.isExpired && styles.cardExpired,
            ]}
            testID={`offer-${item.id}`}
          >
            {item.isExpired && (
              <Text style={styles.expiredWatermark}>EXPIRED</Text>
            )}
            <View style={styles.rowStart}>
              <View
                style={[
                  styles.logoCircle,
                  { backgroundColor: item.businessColor },
                ]}
              >
                <Text style={styles.logoCircleText}>{item.businessInitials}</Text>
              </View>
              <View style={styles.offerCenter}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: badge.bg },
                  ]}
                >
                  <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                    {item.offerType}
                  </Text>
                </View>
                <Text style={styles.offerTitle}>{item.title}</Text>
                <Text style={styles.muted}>{item.businessName}</Text>
                {item.discountPercent && (
                  <View style={styles.discountPill}>
                    <Text style={styles.discountPillText}>
                      {item.discountPercent} OFF
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.offerRight}>
                <TouchableOpacity
                  onPress={() => onRemove(item.id)}
                  hitSlop={10}
                  testID={`remove-offer-${item.id}`}
                >
                  <Bookmark size={18} color="#1A5C35" fill="#1A5C35" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.offerFooter}>
              <View style={styles.footerLeft}>
                <Calendar
                  size={10}
                  color={item.isExpired ? '#E24B4A' : '#1A5C35'}
                />
                <Text
                  style={[
                    styles.expiryText,
                    item.isExpired && styles.expiryTextExpired,
                  ]}
                >
                  {item.expiresAt}
                </Text>
              </View>
              {item.isExpired ? (
                <Text style={styles.offerEnded}>Offer ended</Text>
              ) : (
                <TouchableOpacity onPress={() => onView(item.id)}>
                  <Text style={styles.viewLink}>View Offer →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

interface EventsTabProps {
  upcoming: JoinedEvent[];
  past: JoinedEvent[];
  onView: (id: string) => void;
  onExplore: () => void;
}

function EventsTab({ upcoming, past, onView, onExplore }: EventsTabProps) {
  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={40} color="#E8F5EE" />}
        title="No events yet"
        subtitle="Events you show interest in will appear here"
        ctaLabel="Explore Businesses"
        onCta={onExplore}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.listContent}>
      {upcoming.length > 0 && (
        <>
          <Text style={styles.groupLabelPurple}>UPCOMING</Text>
          {upcoming.map((item) => (
            <EventCard key={item.id} item={item} onView={onView} />
          ))}
        </>
      )}
      {past.length > 0 && (
        <>
          <Text style={styles.groupLabelMuted}>PAST EVENTS</Text>
          {past.map((item) => (
            <EventCard key={item.id} item={item} onView={onView} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

interface EventCardProps {
  item: JoinedEvent;
  onView: (id: string) => void;
}

function EventCard({ item, onView }: EventCardProps) {
  const isPast = item.status === 'past';
  const typeColors = getEventTypeColors(item.eventType);
  const dateBits = extractDateBits(item.date);

  return (
    <View
      style={[
        styles.card,
        isPast && styles.cardPast,
      ]}
      testID={`event-${item.id}`}
    >
      <View style={styles.rowStart}>
        <View
          style={[
            styles.dateBlock,
            { backgroundColor: hexWithAlpha(item.businessColor, 0.15) },
          ]}
        >
          <Text style={[styles.dateMonth, { color: item.businessColor }]}>
            {dateBits.month}
          </Text>
          <Text style={[styles.dateDay, { color: item.businessColor }]}>
            {dateBits.day}
          </Text>
        </View>
        <View style={styles.eventCenter}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: typeColors.bg },
            ]}
          >
            <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>
              {item.eventType}
            </Text>
          </View>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <View style={styles.bizLine}>
            <View
              style={[
                styles.tinyCircle,
                { backgroundColor: item.businessColor },
              ]}
            >
              <Text style={styles.tinyCircleText}>
                {item.businessInitials.charAt(0)}
              </Text>
            </View>
            <Text style={styles.muted}>{item.businessName}</Text>
          </View>
        </View>
        <View>
          {isPast ? (
            <View style={styles.chipGray}>
              <Text style={styles.chipGrayText}>Attended</Text>
            </View>
          ) : (
            <View style={[styles.chip, styles.chipTeal]}>
              <Text style={styles.chipTealText}>Upcoming</Text>
            </View>
          )}
        </View>
      </View>
      <Divider style={styles.innerDivider} />
      <View style={styles.rowBetween}>
        <View style={styles.eventMeta}>
          <View style={styles.metaRow}>
            <Clock size={10} color="#1A5C35" />
            <Text style={styles.metaText}>{item.time}</Text>
          </View>
          <View style={styles.metaRow}>
            <MapPin size={10} color="#1A5C35" />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => onView(item.id)}>
          <Text style={styles.viewLink}>View Event →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface PostsTabProps {
  items: SavedPostItem[];
  onRemove: (id: string) => void;
  onExplore: () => void;
}

function PostsTab({ items, onRemove, onExplore }: PostsTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText size={40} color="#E8F5EE" />}
        title="No saved posts"
        subtitle="Tap the bookmark on any post to save it here"
        ctaLabel="Explore Feed"
        onCta={onExplore}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item }) => (
        <View style={styles.card} testID={`post-${item.id}`}>
          <View style={styles.rowStart}>
            {item.business_logo ? (
              <Image
                source={{ uri: item.business_logo }}
                style={styles.logoSquare}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.logoSquare, { backgroundColor: '#1A5C35' }]}>
                <Text style={styles.logoInitials}>{getInitials(item.business_name)}</Text>
              </View>
            )}
            <View style={[styles.offerCenter, { marginLeft: 10 }]}>
              <View style={[styles.typeBadge, { backgroundColor: '#E8F5EE' }]}>
                <Text style={[styles.typeBadgeText, { color: '#1A5C35' }]}>Post</Text>
              </View>
              <Text style={styles.offerTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.muted}>{item.business_name}</Text>
              {!!item.content && (
                <Text style={styles.postContentPreview} numberOfLines={2}>{item.content}</Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              hitSlop={10}
              style={{ paddingLeft: 8 }}
              testID={`remove-post-${item.id}`}
            >
              <Bookmark size={18} color="#1A5C35" fill="#1A5C35" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCta: () => void;
}

function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      <Button
        mode="contained"
        onPress={onCta}
        buttonColor="#1A5C35"
        style={styles.emptyBtn}
      >
        {ctaLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  safeTop: {
    backgroundColor: '#F8F7FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A5C35',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1EFE8',
    borderRadius: 24,
    padding: 4,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  tabPillActive: {
    backgroundColor: '#1A5C35',
  },
  tabText: {
    fontSize: 12,
    color: '#888780',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingVertical: 4,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 16,
    position: 'relative',
  },
  cardExpired: {
    opacity: 0.7,
    borderColor: '#f0efed',
  },
  cardPast: {
    opacity: 0.75,
    borderColor: '#f0efed',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  rowCenter: {
    flex: 1,
    marginLeft: 12,
  },
  logoSquare: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitials: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircleText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  bizName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A5C35',
  },
  muted: {
    fontSize: 11,
    color: '#1A5C35',
    marginTop: 2,
  },
  smallMuted: {
    fontSize: 11,
    color: '#1A5C35',
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  chipTeal: {
    backgroundColor: '#E1F5EE',
  },
  chipTealText: {
    color: '#0F6E56',
    fontSize: 9,
    fontWeight: '700',
  },
  chipPurple: {
    backgroundColor: '#E8F5EE',
  },
  chipPurpleText: {
    color: '#1A5C35',
    fontSize: 9,
    fontWeight: '700',
  },
  chipGray: {
    backgroundColor: '#F1EFE8',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chipGrayText: {
    color: '#5F5E5A',
    fontSize: 9,
  },
  innerDivider: {
    marginTop: 10,
    backgroundColor: '#E8F5EE',
    height: 0.5,
  },
  viewLink: {
    fontSize: 11,
    color: '#1A5C35',
    fontWeight: '700',
  },
  expiredWatermark: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 10,
    fontWeight: '700',
    color: '#E24B4A',
    letterSpacing: 1,
  },
  offerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  offerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  offerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A5C35',
    lineHeight: 18,
  },
  discountPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E24B4A',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  discountPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#E8F5EE',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expiryText: {
    fontSize: 10,
    color: '#1A5C35',
  },
  expiryTextExpired: {
    color: '#E24B4A',
  },
  offerEnded: {
    fontSize: 10,
    color: '#A32D2D',
  },
  groupLabelPurple: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A5C35',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  groupLabelMuted: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A5C35',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  dateBlock: {
    width: 50,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateDay: {
    fontSize: 20,
    fontWeight: '700',
  },
  eventCenter: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A5C35',
    lineHeight: 18,
  },
  bizLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  tinyCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tinyCircleText: {
    color: '#ffffff',
    fontSize: 6,
    fontWeight: '700',
  },
  eventMeta: {
    flexDirection: 'column',
    gap: 3,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: '#1A5C35',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 40,
  },
  emptyIconWrap: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A5C35',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#1A5C35',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  emptyBtn: {
    borderRadius: 10,
  },
  snackbar: {
    backgroundColor: '#1A5C35',
  },
  snackbarWrapper: {
    bottom: 20,
  },
  postContentPreview: {
    fontSize: 11,
    color: '#888780',
    marginTop: 3,
    lineHeight: 15,
  },
});
