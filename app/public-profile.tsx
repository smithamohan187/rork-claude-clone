import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Divider, ActivityIndicator } from 'react-native-paper';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { getMyReferrals } from '@/api/services/referralService';
import {
  fetchPublicProfile,
  resolveAvatarUrl,
  PublicProfileData,
  MutualBusiness,
} from '@/api/services/profileService';

interface Connection {
  joinedContext: 'touchpoints' | 'business';
  direction: 'joined_via_me' | 'i_joined_via';
  businessName: string | null;
  joinedAt: string; // display-ready
}

const AVATAR_PALETTE = ['#1A5C35', '#0F6E56', '#0F766E', '#1E40AF', '#B45309', '#065F46'];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatMonthYear(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    profileId?: string;
    name?: string;
    joinedContext?: 'touchpoints' | 'business';
    direction?: 'joined_via_me' | 'i_joined_via';
    businessName?: string;
    joinedAt?: string;
    referralCodeUsed?: string;
  }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.profileId) {
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      setProfileError(null);
      try {
        const data = await fetchPublicProfile(params.profileId as string);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.profileId]);

  const displayName = (params.name as string) || profile?.display_name || '';
  const firstName = displayName.split(' ')[0];

  // Fast path: referral context arrived via nav params (e.g. tapped from my-referrals) — no fetch.
  const connectionFromParams: Connection | null = params.joinedContext
    ? {
        joinedContext: params.joinedContext,
        direction: params.direction ?? 'joined_via_me',
        businessName: params.businessName ?? null,
        joinedAt: params.joinedAt ?? '',
      }
    : null;

  // Fallback path: no context was passed (members area, chat, etc.) — check if a real referral
  // connection exists between the viewer and this profile by reusing the existing combined-list
  // query. No new backend endpoint; this is the same call my-referrals itself makes.
  const [connectionFromFetch, setConnectionFromFetch] = useState<Connection | null>(null);

  useEffect(() => {
    if (connectionFromParams || !params.profileId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getMyReferrals('all');
        const match = rows.find((r) => r.profile_id === params.profileId);
        if (!cancelled && match) {
          setConnectionFromFetch({
            joinedContext: match.joined_context,
            direction: match.direction,
            businessName: match.business_name,
            joinedAt: formatDate(match.joined_at),
          });
        }
      } catch (err) {
        if (__DEV__) console.log('[public-profile] connection fallback lookup failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.profileId]);

  const connection = useMemo<Connection | null>(
    () => connectionFromParams ?? connectionFromFetch,
    [connectionFromParams, connectionFromFetch]
  );

  const connectionCopy = useMemo(() => {
    if (!connection) return null;
    const { joinedContext, direction, businessName } = connection;
    if (joinedContext === 'touchpoints') {
      return direction === 'joined_via_me'
        ? 'Joined TouchPoints through your invite'
        : 'You joined through their invite';
    }
    const biz = businessName ?? 'a business';
    return direction === 'joined_via_me'
      ? `Joined ${biz} through your invite`
      : `You joined ${biz} through their invite`;
  }, [connection]);

  const navToBusiness = (businessId: string) => {
    router.push({ pathname: '/business-profile/[id]', params: { id: businessId } } as never);
  };

  const avatarUrl = resolveAvatarUrl(profile?.avatar_url);
  const mutualBusinesses: MutualBusiness[] = profile?.mutual_businesses ?? [];

  return (
    <View style={styles.root} testID="public-profile-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            testID="public-profile-back"
          >
            <ArrowLeft size={22} color="#1A5C35" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>

      {profileLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#1A5C35" />
        </View>
      ) : profileError || !profile ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{profileError ?? 'Profile not found'}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colorForId(profile.profile_id) }]}>
                  <Text style={styles.avatarText}>{initials(displayName)}</Text>
                </View>
              )}
              <View style={styles.heroInfo}>
                <Text style={styles.heroName}>{displayName}</Text>
                <Text style={styles.heroMeta}>
                  Member since {formatMonthYear(profile.member_since)}
                </Text>
                {connection && (
                  <View style={styles.relChip}>
                    <Text style={styles.relChipText}>
                      {connection.direction === 'joined_via_me' ? 'You referred this person' : 'They referred you'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Divider style={styles.heroDivider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>businesses</Text>
                <Text style={styles.statValue}>{profile.businesses_count}</Text>
              </View>
              <View style={styles.statDividerV} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>rewards redeemed</Text>
                <Text style={styles.statValue}>{profile.rewards_redeemed}</Text>
              </View>
            </View>
          </View>

          {connection && connectionCopy && (
            <View style={styles.refStrip} testID="how-youre-connected-card">
              <CheckCircle2 size={18} color="#0F6E56" />
              <View style={styles.refStripText}>
                <Text style={styles.refStripTitle}>{connectionCopy}</Text>
                {!!connection.joinedAt && (
                  <Text style={styles.refStripSub}>Joined {connection.joinedAt}</Text>
                )}
              </View>
            </View>
          )}

          <Text style={styles.sectionLabel}>BUSINESSES IN COMMON</Text>

          {mutualBusinesses.length === 0 ? (
            <Text style={styles.emptyMutual}>No businesses in common yet</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mutualScroll}
            >
              {mutualBusinesses.map((biz) => {
                const logoUrl = resolveAvatarUrl(biz.logo_url);
                return (
                  <TouchableOpacity
                    key={biz.id}
                    style={styles.mutualChip}
                    onPress={() => navToBusiness(biz.id)}
                    testID={`mutual-${biz.id}`}
                  >
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={styles.mutualLogo} />
                    ) : (
                      <View style={[styles.mutualLogo, { backgroundColor: colorForId(biz.id) }]}>
                        <Text style={styles.mutualLogoText}>{initials(biz.name)}</Text>
                      </View>
                    )}
                    <View>
                      <Text style={styles.mutualName}>{biz.name}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.privacyNote}>
            Only mutual connections can view each other&apos;s profile on TouchPoint
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F7FF' },
  safeTop: { backgroundColor: '#F8F7FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8F7FF',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A5C35',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 30 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 13, color: '#1A5C35', textAlign: 'center', paddingHorizontal: 32 },

  heroCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#F8F7FF',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    padding: 20,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '700', color: '#1A5C35' },
  heroMeta: { fontSize: 12, color: '#1A5C35', marginTop: 2 },
  relChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5EE',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 6,
  },
  relChipText: { fontSize: 9, fontWeight: '700', color: '#1A5C35' },
  heroDivider: { marginVertical: 14, backgroundColor: '#E8F5EE' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#1A5C35' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#1A5C35', marginTop: 2 },
  statDividerV: { width: 1, height: 28, backgroundColor: '#E8F5EE' },

  refStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E1F5EE',
    borderWidth: 0.5,
    borderColor: '#9FE1CB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  refStripText: { flex: 1, marginLeft: 10 },
  refStripTitle: { fontSize: 12, color: '#085041', fontWeight: '700', lineHeight: 18 },
  refStripSub: { fontSize: 10, color: '#0F6E56', marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1A5C35',
    marginHorizontal: 16,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  mutualScroll: { paddingHorizontal: 16, gap: 8 },
  mutualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  mutualLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutualLogoText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  mutualName: { fontSize: 11, fontWeight: '700', color: '#1A5C35' },
  emptyMutual: {
    textAlign: 'center',
    fontSize: 12,
    color: '#1A5C35',
    marginHorizontal: 16,
  },

  privacyNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#888780',
    marginHorizontal: 16,
    marginTop: 8,
  },
});
