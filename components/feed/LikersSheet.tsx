import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { getLikers, type LikerProfile, type ContentType } from '@/api/services/likesService';

const PRIMARY = '#1A5C35';
const PAGE_SIZE = 20;

interface Props {
  visible: boolean;
  contentType: ContentType;
  contentId: string;
  likeCount: number;
  onClose: () => void;
}

export default function LikersSheet({ visible, contentType, contentId, likeCount, onClose }: Props) {
  const [likers, setLikers] = useState<LikerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLikers([]);
    setOffset(0);
    setHasMore(true);
    setLoading(true);
    getLikers(contentType, contentId, PAGE_SIZE, 0)
      .then((rows) => {
        setLikers(rows);
        setHasMore(rows.length === PAGE_SIZE);
        setOffset(PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, contentType, contentId]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setLoading(true);
    getLikers(contentType, contentId, PAGE_SIZE, offset)
      .then((rows) => {
        setLikers((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
        setOffset((o) => o + PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasMore, loading, contentType, contentId, offset]);

  const renderItem = useCallback(({ item }: { item: LikerProfile }) => (
    <View style={styles.row}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>{item.display_name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <Text style={styles.name}>{item.display_name}</Text>
    </View>
  ), []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>
            {likeCount === 1 ? '1 Like' : `${likeCount} Likes`}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={10}>
            <X size={22} color={PRIMARY} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={likers}
          keyExtractor={(item) => item.profile_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loading ? <ActivityIndicator color={PRIMARY} style={styles.spinner} /> : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No likes yet</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    maxHeight: '75%',
    minHeight: '40%',
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: PRIMARY,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F1EEF7',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9F6',
    marginRight: 12,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: PRIMARY,
    fontWeight: '700',
    fontSize: 15,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  spinner: {
    padding: 16,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    color: PRIMARY,
    fontSize: 14,
  },
});
