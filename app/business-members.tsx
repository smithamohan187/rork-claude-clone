import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { ArrowLeft, Users, MessageCircle, Trash2 } from 'lucide-react-native';
import { useMyBusinessMembers } from '@/hooks/useMyBusinessMembers';
import { useConversations } from '@/hooks/useConversations';
import type { BusinessMember } from '@/api/services/subscriptionService';

const GREEN = '#1A5C35';
const DANGER = '#C0392B';
const TEXT_MUTED = '#6B7280';
const PAGE_BG = '#F0F7F4';
const CARD_BG = '#FFFFFF';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 12;
const CARD_PADDING = 16;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_PADDING * 2 - CARD_GAP) / 2;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatJoined(iso: string): string {
  return 'Joined ' + new Date(iso).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

interface MemberCardProps {
  member: BusinessMember;
  preview: string | null;
  unread: number;
  onRemove: (member: BusinessMember) => void;
  onOpenChat: (member: BusinessMember) => void;
  onOpenProfile: (member: BusinessMember) => void;
}

const MemberCard = React.memo(function MemberCard({
  member,
  preview,
  unread,
  onRemove,
  onOpenChat,
  onOpenProfile,
}: MemberCardProps) {
  const points = (member.current_balance ?? 0).toLocaleString();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onOpenProfile(member)}
        style={styles.cardTapTop}
        testID={`member-profile-${member.profile_id}`}
      >
        <View style={styles.cardAvatarRow}>
          <View style={styles.avatar}>
            {member.avatar_url ? (
              <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarInitials}>{getInitials(member.display_name)}</Text>
            )}
          </View>
        </View>

        <Text style={styles.cardName} numberOfLines={1}>{member.display_name}</Text>
        {member.city ? (
          <Text style={styles.cardCity} numberOfLines={1}>{member.city}</Text>
        ) : null}

        <Text style={styles.cardPoints}>{points} pts</Text>
        <Text style={styles.cardJoined}>{formatJoined(member.subscribed_at)}</Text>
      </TouchableOpacity>

      <Text style={styles.cardPreview} numberOfLines={1}>
        {preview ?? 'Tap to message'}
      </Text>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          hitSlop={8}
          onPress={() => onOpenChat(member)}
          testID={`member-chat-${member.profile_id}`}
        >
          <View>
            <MessageCircle size={18} color={GREEN} />
            {unread > 0 ? (
              <View style={styles.unreadDot}>
                <Text style={styles.unreadDotText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          hitSlop={8}
          onPress={() => onRemove(member)}
        >
          <Trash2 size={18} color={DANGER} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function BusinessMembersScreen() {
  const router = useRouter();
  const { members, isLoading, removeMember } = useMyBusinessMembers();
  const { conversations } = useConversations('business');
  const [pendingRemove, setPendingRemove] = useState<BusinessMember | null>(null);

  // Index the business's member-conversations by the member (other participant)
  // profile id, so each card can show its own preview + unread count.
  const convoByProfile = useMemo(() => {
    const m = new Map<string, (typeof conversations)[number]>();
    conversations.forEach((c) => m.set(c.other_profile_id, c));
    return m;
  }, [conversations]);

  const handleRemovePress = useCallback((member: BusinessMember) => {
    setPendingRemove(member);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    const target = pendingRemove;
    setPendingRemove(null);
    await removeMember(target.profile_id);
  }, [pendingRemove, removeMember]);

  const handleDismiss = useCallback(() => setPendingRemove(null), []);

  const handleOpenProfile = useCallback((member: BusinessMember) => {
    router.push({
      pathname: '/public-profile',
      params: { profileId: member.profile_id, name: member.display_name },
    } as never);
  }, [router]);

  const handleOpenChat = useCallback((member: BusinessMember) => {
    router.push({
      pathname: '/chat-detail/[id]',
      params: {
        id: member.profile_id,
        targetProfileId: member.profile_id,
        type: 'business',
        name: member.display_name,
      },
    } as never);
  }, [router]);

  const renderCard = useCallback(({ item }: { item: BusinessMember }) => {
    const convo = convoByProfile.get(item.profile_id);
    return (
      <MemberCard
        member={item}
        preview={convo?.last_message_body ?? null}
        unread={convo?.unread_count ?? 0}
        onRemove={handleRemovePress}
        onOpenChat={handleOpenChat}
        onOpenProfile={handleOpenProfile}
      />
    );
  }, [convoByProfile, handleRemovePress, handleOpenChat, handleOpenProfile]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyWrap}>
      <Users size={48} color={GREEN} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No members yet</Text>
      <Text style={styles.emptySub}>Subscribers will appear here once they join</Text>
    </View>
  ), []);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.safeTop} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={22} color={GREEN} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Members</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{members.length}</Text>
        </View>
      </View>

      {isLoading && members.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={GREEN} size="large" />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.profile_id}
          renderItem={renderCard}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={members.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Portal>
        <Dialog visible={!!pendingRemove} onDismiss={handleDismiss} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Remove Member</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogBody}>
              Remove {pendingRemove?.display_name} from your subscribers? They can re-subscribe at any time.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismiss} textColor={TEXT_MUTED}>Cancel</Button>
            <Button onPress={handleConfirmRemove} textColor={DANGER}>Remove</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  safeTop: {
    backgroundColor: PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  countBadge: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 32,
    paddingTop: 4,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  columnWrapper: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTapTop: {
    alignItems: 'center',
    width: '100%',
  },
  cardAvatarRow: {
    marginBottom: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  cardCity: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 2,
  },
  cardJoined: {
    fontSize: 10,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  cardPreview: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 10,
    width: '100%',
  },
  unreadDot: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: DANGER,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDotText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    width: '100%',
    justifyContent: 'center',
  },
  actionBtn: {
    padding: 4,
    opacity: 1,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1730',
  },
  dialogBody: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
});
