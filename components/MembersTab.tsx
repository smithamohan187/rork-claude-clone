import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Portal, Dialog, Button, Paragraph } from 'react-native-paper';
import { Users, Trash2 } from 'lucide-react-native';
import { useBusinessMembers } from '@/hooks/useBusinessMembers';
import EmptyState from '@/components/ui/EmptyState';
import type { BusinessMember } from '@/api/services/subscriptionService';

const GREEN = '#1A5C35';
const DANGER = '#C0392B';
const TEXT_MUTED = '#6B7280';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

interface MemberRowProps {
  member: BusinessMember;
  onViewProfile: (member: BusinessMember) => void;
  onRemove: (member: BusinessMember) => void;
}

const MemberRow = React.memo(function MemberRow({ member, onViewProfile, onRemove }: MemberRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => onViewProfile(member)}
    >
      <View style={styles.avatar}>
        {member.avatar_url ? (
          <Image source={{ uri: member.avatar_url }} style={styles.avatarImage} contentFit="cover" />
        ) : (
          <Text style={styles.avatarInitials}>{getInitials(member.display_name)}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{member.display_name}</Text>
        <Text style={styles.since}>Member since {formatMemberSince(member.subscribed_at)}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        hitSlop={8}
        onPress={() => onRemove(member)}
      >
        <Trash2 size={18} color={DANGER} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

interface Props {
  businessId: string;
  onShowSnack: (msg: string) => void;
}

export default function MembersTab({ businessId, onShowSnack }: Props) {
  const router = useRouter();
  const { members, isLoading, removeMember } = useBusinessMembers(businessId);
  const [pendingRemove, setPendingRemove] = useState<BusinessMember | null>(null);

  const handleViewProfile = useCallback((member: BusinessMember) => {
    router.push({
      pathname: '/public-profile',
      params: { profileId: member.profile_id, name: member.display_name },
    } as never);
  }, [router]);

  const handleRemovePress = useCallback((member: BusinessMember) => {
    setPendingRemove(member);
  }, []);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    const target = pendingRemove;
    setPendingRemove(null);
    await removeMember(target.profile_id);
    onShowSnack('Member removed');
  }, [pendingRemove, removeMember, onShowSnack]);

  const handleDismiss = useCallback(() => setPendingRemove(null), []);

  if (isLoading && members.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(m) => m.profile_id}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            onViewProfile={handleViewProfile}
            onRemove={handleRemovePress}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={40} color={GREEN} strokeWidth={1.5} />}
            title="No members yet"
            subtitle="Subscribers will appear here"
          />
        }
        contentContainerStyle={members.length === 0 ? styles.emptyContainer : styles.listContent}
      />

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
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1730',
    marginBottom: 2,
  },
  since: {
    fontSize: 12,
    color: TEXT_MUTED,
  },
  removeBtn: {
    padding: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
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
