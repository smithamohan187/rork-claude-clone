import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Pressable,
  TextInput,
  Platform,
  Modal,
  Dimensions,
  Linking,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { MessageCircle, Mail, Phone, ExternalLink, Send, X, Search, Check, Star, Share2, MoreHorizontal, Megaphone, Bell, Users, Globe, AtSign, Music, Facebook, ShoppingBag, Gift, User as UserIcon, ChevronRight, UserPlus, MapPin, Flame, Award, TrendingUp, Navigation, Store, Footprints, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Colors } from '@/constants/colors';
import { personalUsers, businessMembers, postLocalData } from '@/mocks/data';
import type { PostLocalData } from '@/mocks/data';
import type { BusinessMember } from '@/mocks/data';
import type { Post, User as UserType } from '@/types';
import { BrandedShareGrid } from '@/components/feed/BrandedShareGrid';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const BANNER_DATA: { id: string; text: string; gradient: [string, string, string]; accent: string; icon: typeof Store }[] = [
  {
    id: '1',
    text: 'All Your Businesses\nAll in One Place',
    gradient: ['#0F2027', '#203A43', '#2C5364'],
    accent: '#00D2FF',
    icon: Store,
  },
  {
    id: '2',
    text: 'Refer & Share Businesses\nfor "Touch" Points and Prizes.\nOr Just Goodwill.',
    gradient: ['#1A1A2E', '#16213E', '#0F3460'],
    accent: '#E94560',
    icon: Gift,
  },
  {
    id: '3',
    text: 'Support Your\nLocal Businesses',
    gradient: ['#134E5E', '#1B4332', '#2D6A4F'],
    accent: '#52B788',
    icon: Heart,
  },
];

interface FriendItem extends UserType {
  selected?: boolean;
}

const CAROUSEL_WIDTH = SCREEN_WIDTH - 24;
const CAROUSEL_HEIGHT = 140;

const EXTENDED_BANNERS = [...BANNER_DATA, ...BANNER_DATA, ...BANNER_DATA];
const TOTAL_WIDTH = BANNER_DATA.length * CAROUSEL_WIDTH;

function BannerCarousel() {
  const scrollX = useRef(new Animated.Value(TOTAL_WIDTH)).current;
  const scrollRef = useRef<ScrollView>(null);
  const isPaused = useRef<boolean>(false);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  const startContinuousScroll = useCallback(() => {
    scrollX.stopAnimation((currentVal) => {
      const duration = ((TOTAL_WIDTH * 2 - currentVal) / TOTAL_WIDTH) * 12000;
      animRef.current = Animated.timing(scrollX, {
        toValue: TOTAL_WIDTH * 2,
        duration: Math.max(duration, 500),
        useNativeDriver: true,
        isInteraction: false,
      });
      animRef.current.start(({ finished }) => {
        if (finished && !isPaused.current) {
          scrollX.setValue(0);
          startContinuousScroll();
        }
      });
    });
  }, [scrollX]);

  React.useEffect(() => {
    scrollX.setValue(0);
    startContinuousScroll();
    return () => {
      animRef.current?.stop();
    };
  }, [startContinuousScroll, scrollX]);

  React.useEffect(() => {
    const listenerId = scrollX.addListener(({ value }) => {
      const idx = Math.round((value % TOTAL_WIDTH) / CAROUSEL_WIDTH) % BANNER_DATA.length;
      setActiveIndex(idx);
    });
    return () => scrollX.removeListener(listenerId);
  }, [scrollX]);

  const handleTouchStart = useCallback(() => {
    isPaused.current = true;
    animRef.current?.stop();
  }, []);

  const handleTouchEnd = useCallback(() => {
    isPaused.current = false;
    startContinuousScroll();
  }, [startContinuousScroll]);

  const translateX = scrollX.interpolate({
    inputRange: [0, TOTAL_WIDTH * 3],
    outputRange: [0, -TOTAL_WIDTH * 3],
  });

  return (
    <View style={carouselStyles.container}>
      <View style={{ width: CAROUSEL_WIDTH, overflow: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Animated.View style={{ flexDirection: 'row', transform: [{ translateX }] }}>
          {EXTENDED_BANNERS.map((banner, index) => {
            const IconComp = banner.icon;
            return (
              <LinearGradient
                key={`${banner.id}-${index}`}
                colors={banner.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={carouselStyles.banner}
              >
                <View style={carouselStyles.bannerPattern}>
                  <View style={[carouselStyles.patternCircle, { backgroundColor: banner.accent, opacity: 0.08, top: -20, right: -20, width: 120, height: 120 }]} />
                  <View style={[carouselStyles.patternCircle, { backgroundColor: banner.accent, opacity: 0.05, bottom: -30, left: 40, width: 90, height: 90 }]} />
                  <View style={[carouselStyles.patternCircle, { backgroundColor: '#fff', opacity: 0.04, top: 30, left: -10, width: 60, height: 60 }]} />
                  <View style={[carouselStyles.patternDiamond, { borderColor: banner.accent, opacity: 0.12, top: 10, right: 60 }]} />
                  <View style={[carouselStyles.patternDiamond, { borderColor: '#fff', opacity: 0.06, bottom: 10, left: 20 }]} />
                </View>
                <View style={carouselStyles.bannerContent}>
                  <View style={carouselStyles.bannerTextWrap}>
                    <Text style={carouselStyles.bannerText}>{banner.text}</Text>
                  </View>
                  <View style={[carouselStyles.bannerIconWrap, { backgroundColor: banner.accent + '25' }]}>
                    <IconComp size={30} color={banner.accent} />
                  </View>
                </View>
                <View style={[carouselStyles.bannerAccentBar, { backgroundColor: banner.accent }]} />
              </LinearGradient>
            );
          })}
        </Animated.View>
      </View>
      <View style={carouselStyles.dotsRow}>
        {BANNER_DATA.map((b, i) => (
          <View
            key={b.id}
            style={[
              carouselStyles.dot,
              i === activeIndex ? carouselStyles.dotActive : carouselStyles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const carouselStyles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 4,
    paddingLeft: 12,
  },
  banner: {
    width: CAROUSEL_WIDTH,
    height: CAROUSEL_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  bannerPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternCircle: {
    position: 'absolute' as const,
    borderRadius: 999,
  },
  patternDiamond: {
    position: 'absolute' as const,
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    zIndex: 1,
    flex: 1,
  },
  bannerTextWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#FFD700',
    lineHeight: 19,
    letterSpacing: 0.3,
    textAlign: 'center' as const,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bannerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerAccentBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  dot: {
    borderRadius: 5,
    height: 6,
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.navyDark,
  },
  dotInactive: {
    width: 6,
    backgroundColor: Colors.border,
  },
});

function RecommendSheet({ visible, onClose, postAuthor }: { visible: boolean; onClose: () => void; postAuthor: string }) {
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setSent(false);
      setSelected(new Set());
      setSearch('');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const friends: FriendItem[] = personalUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(() => {
    if (selected.size === 0) return;
    setSent(true);
    console.log('Recommended to:', Array.from(selected));
    setTimeout(() => {
      onClose();
    }, 1200);
  }, [selected, onClose]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={sheetStyles.overlay}>
        <Animated.View style={[sheetStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={sheetStyles.handleBar} />
          <View style={sheetStyles.header}>
            <Text style={sheetStyles.headerTitle}>Recommend</Text>
            <Pressable onPress={onClose} hitSlop={12} style={sheetStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          <View style={sheetStyles.shareChannels}>
            <BrandedShareGrid
              message={`Check out this post by ${postAuthor}! https://touchpoint.app`}
              link={`https://touchpoint.app`}
              emailSubject={`Recommendation from ${postAuthor}`}
              testIDPrefix="recommend-share"
            />
          </View>

          <View style={sheetStyles.divider} />

          <View style={sheetStyles.searchRow}>
            <Search size={16} color={Colors.textTertiary} />
            <TextInput
              style={sheetStyles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor={Colors.textTertiary}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {sent ? (
            <View style={sheetStyles.sentContainer}>
              <View style={sheetStyles.sentCheck}>
                <Check size={28} color={Colors.navyDark} />
              </View>
              <Text style={sheetStyles.sentText}>Recommended!</Text>
              <Text style={sheetStyles.sentSubtext}>
                Sent to {selected.size} friend{selected.size > 1 ? 's' : ''}
              </Text>
            </View>
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              style={sheetStyles.friendsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selected.has(item.id);
                return (
                  <Pressable
                    style={sheetStyles.friendRow}
                    onPress={() => toggleSelect(item.id)}
                  >
                    <Image source={{ uri: item.avatar }} style={sheetStyles.friendAvatar} />
                    <View style={sheetStyles.friendInfo}>
                      <Text style={sheetStyles.friendName}>{item.name}</Text>
                      <Text style={sheetStyles.friendUsername}>@{item.username}</Text>
                    </View>
                    <View style={[
                      sheetStyles.radioOuter,
                      isSelected && sheetStyles.radioOuterSelected,
                    ]}>
                      {isSelected && (
                        <View style={sheetStyles.radioInner} />
                      )}
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <Text style={sheetStyles.emptyText}>No friends found</Text>
              }
            />
          )}

          {!sent && (
            <View style={sheetStyles.footer}>
              <Pressable
                style={[
                  sheetStyles.sendButton,
                  selected.size === 0 && sheetStyles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={selected.size === 0}
              >
                <Send size={18} color={Colors.navyDark} />
                <Text style={sheetStyles.sendButtonText}>
                  {selected.size > 0
                    ? `Send to ${selected.size} friend${selected.size > 1 ? 's' : ''}`
                    : 'Select friends'}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

interface ShareChannelButtonProps {
  icon: 'whatsapp' | 'sms' | 'email' | 'messenger' | 'share' | 'facebook' | 'x' | 'instagram' | 'tiktok';
  label: string;
  color: string;
  bgColor: string;
  onPress: () => void;
}

function ShareChannelButton({ icon, label, color, bgColor, onPress }: ShareChannelButtonProps) {
  const renderIcon = () => {
    switch (icon) {
      case 'whatsapp':
        return <Phone size={22} color={color} />;
      case 'sms':
        return <MessageCircle size={22} color={color} />;
      case 'email':
        return <Mail size={22} color={color} />;
      case 'messenger':
        return <Send size={22} color={color} />;
      case 'share':
        return <ExternalLink size={22} color={color} />;
      case 'facebook':
        return <Facebook size={22} color={color} />;
      case 'x':
        return <AtSign size={22} color={color} />;
      case 'instagram':
        return <Globe size={22} color={color} />;
      case 'tiktok':
        return <Music size={22} color={color} />;
      default:
        return null;
    }
  };

  return (
    <Pressable style={shareChannelStyles.channelBtn} onPress={onPress}>
      <View style={[shareChannelStyles.channelIcon, { backgroundColor: bgColor }]}>
        {renderIcon()}
      </View>
      <Text style={shareChannelStyles.channelLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const shareChannelStyles = StyleSheet.create({
  channelBtn: {
    alignItems: 'center',
    width: 64,
  },
  channelIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  channelLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '400' as const,
    textAlign: 'center' as const,
    letterSpacing: 0.1,
  },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.95,
    minHeight: SCREEN_HEIGHT * 0.78,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 16,
  },
  shareChannels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
  },
  friendsList: {
    flex: 1,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  friendAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  friendUsername: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.accent,
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.accent,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 30,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendButtonText: {
    color: Colors.navyDark,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  sentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  sentCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sentText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  sentSubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.1,
  },
});

function ShareSheet({ visible, onClose, post }: { visible: boolean; onClose: () => void; post: Post }) {
  const [search, setSearch] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sent, setSent] = useState<boolean>(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const shareMessage = `Check out this post by ${post.author.name}: "${post.content.substring(0, 80)}${post.content.length > 80 ? '...' : ''}"\n\nShared via TouchPoint`;

  React.useEffect(() => {
    if (visible) {
      setSent(false);
      setSelected(new Set());
      setSearch('');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  const friends: FriendItem[] = personalUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSendInApp = useCallback(() => {
    if (selected.size === 0) return;
    setSent(true);
    console.log('Shared in-app to:', Array.from(selected));
    setTimeout(() => {
      onClose();
    }, 1200);
  }, [selected, onClose]);

  const openExternalShare = useCallback(async () => {
    try {
      await Share.share({ message: shareMessage });
    } catch (e) {
      console.log('Share error:', e);
    }
  }, [shareMessage]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={shareSheetStyles.overlay}>
        <Animated.View style={[shareSheetStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[shareSheetStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={shareSheetStyles.handleBar} />
          <View style={shareSheetStyles.header}>
            <Text style={shareSheetStyles.headerTitle}>Share Post</Text>
            <Pressable onPress={onClose} hitSlop={12} style={shareSheetStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={shareSheetStyles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={shareSheetStyles.postPreview}>
              <Image source={{ uri: post.author.avatar }} style={shareSheetStyles.previewAvatar} />
              <View style={shareSheetStyles.previewText}>
                <Text style={shareSheetStyles.previewAuthor} numberOfLines={1}>{post.author.name}</Text>
                <Text style={shareSheetStyles.previewContent} numberOfLines={2}>{post.content}</Text>
              </View>
            </View>

            <View style={shareSheetStyles.sectionHeader}>
              <ExternalLink size={14} color={Colors.textSecondary} />
              <Text style={shareSheetStyles.sectionTitle}>Share via social media</Text>
            </View>

            <View style={shareSheetStyles.shareChannels}>
              <BrandedShareGrid
                message={shareMessage}
                link={`https://touchpoint.app/post/${post.id}`}
                emailSubject={`Post from ${post.author.name}`}
                testIDPrefix="post-share"
              />
            </View>

            <View style={shareSheetStyles.divider} />

            <View style={shareSheetStyles.sectionHeader}>
              <Users size={14} color={Colors.textSecondary} />
              <Text style={shareSheetStyles.sectionTitle}>Share with contacts</Text>
            </View>

            <View style={shareSheetStyles.searchRow}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={shareSheetStyles.searchInput}
                placeholder="Search contacts..."
                placeholderTextColor={Colors.textTertiary}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            {sent ? (
              <View style={shareSheetStyles.sentContainer}>
                <View style={shareSheetStyles.sentCheck}>
                  <Check size={28} color={Colors.navyDark} />
                </View>
                <Text style={shareSheetStyles.sentText}>Shared!</Text>
                <Text style={shareSheetStyles.sentSubtext}>
                  Sent to {selected.size} contact{selected.size > 1 ? 's' : ''}
                </Text>
              </View>
            ) : (
              <View>
                {friends.length === 0 ? (
                  <Text style={shareSheetStyles.emptyText}>No contacts found</Text>
                ) : (
                  friends.map((item) => {
                    const isSelected = selected.has(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        style={shareSheetStyles.friendRow}
                        onPress={() => toggleSelect(item.id)}
                      >
                        <Image source={{ uri: item.avatar }} style={shareSheetStyles.friendAvatar} />
                        <View style={shareSheetStyles.friendInfo}>
                          <Text style={shareSheetStyles.friendName}>{item.name}</Text>
                          <Text style={shareSheetStyles.friendUsername}>@{item.username}</Text>
                        </View>
                        <View style={[
                          shareSheetStyles.checkOuter,
                          isSelected && shareSheetStyles.checkOuterSelected,
                        ]}>
                          {isSelected && (
                            <Check size={14} color="#fff" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>

          {!sent && (
            <View style={shareSheetStyles.footer}>
              <Pressable
                style={[
                  shareSheetStyles.sendButton,
                  selected.size === 0 && shareSheetStyles.sendButtonDisabled,
                ]}
                onPress={handleSendInApp}
                disabled={selected.size === 0}
              >
                <Send size={18} color={selected.size > 0 ? Colors.navyDark : Colors.textTertiary} />
                <Text style={[
                  shareSheetStyles.sendButtonText,
                  selected.size === 0 && { color: Colors.textTertiary },
                ]}>
                  {selected.size > 0
                    ? `Share with ${selected.size} contact${selected.size > 1 ? 's' : ''}`
                    : 'Select contacts'}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const shareSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.55,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  scrollContent: {
    flex: 1,
  },
  socialRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 16,
  },
  postPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    gap: 10,
  },
  previewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  previewText: {
    flex: 1,
  },
  previewAuthor: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  previewContent: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  shareChannels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
  },
  friendsList: {
    flex: 1,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  friendUsername: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  checkOuter: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOuterSelected: {
    borderColor: Colors.teal,
    backgroundColor: Colors.teal,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 30,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
  sendButtonText: {
    color: Colors.navyDark,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  sentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  sentCheck: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  sentText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sentSubtext: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});

function MembersSheet({ visible, onClose, businessId, businessName }: { visible: boolean; onClose: () => void; businessId: string; businessName: string }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<BusinessMember | null>(null);

  const members = businessMembers[businessId] || [];
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m => m.name.toLowerCase().includes(q) || m.username.toLowerCase().includes(q));
  }, [members, searchQuery]);

  const activeCount = members.filter(m => m.status === 'active').length;
  const totalPoints = members.reduce((sum, m) => sum + m.points, 0);

  React.useEffect(() => {
    if (visible) {
      setSelectedMember(null);
      setSearchQuery('');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={membersStyles.overlay}>
        <Animated.View style={[membersStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[membersStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={membersStyles.handleBar} />
          <View style={membersStyles.header}>
            {selectedMember ? (
              <Pressable onPress={() => setSelectedMember(null)} hitSlop={12} style={membersStyles.backBtn}>
                <ChevronRight size={20} color={Colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>
            ) : null}
            <Text style={membersStyles.headerTitle}>
              {selectedMember ? selectedMember.name : `Members`}
            </Text>
            <Pressable onPress={onClose} hitSlop={12} style={membersStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          {!selectedMember ? (
            <ScrollView style={membersStyles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={membersStyles.statsRow}>
                <View style={membersStyles.statBox}>
                  <Text style={membersStyles.statNumber}>{members.length}</Text>
                  <Text style={membersStyles.statLabel}>Total</Text>
                </View>
                <View style={membersStyles.statBox}>
                  <Text style={[membersStyles.statNumber, { color: '#10B981' }]}>{activeCount}</Text>
                  <Text style={membersStyles.statLabel}>Active</Text>
                </View>
                <View style={membersStyles.statBox}>
                  <Text style={[membersStyles.statNumber, { color: Colors.accent }]}>{totalPoints.toLocaleString()}</Text>
                  <Text style={membersStyles.statLabel}>Total Pts</Text>
                </View>
              </View>

              <View style={membersStyles.searchRow}>
                <Search size={16} color={Colors.textTertiary} />
                <TextInput
                  style={membersStyles.searchInput}
                  placeholder="Search members..."
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {filteredMembers.length === 0 ? (
                <Text style={membersStyles.emptyText}>No members found</Text>
              ) : (
                filteredMembers.map((member) => (
                  <Pressable
                    key={member.id}
                    style={membersStyles.memberRow}
                    onPress={() => setSelectedMember(member)}
                  >
                    <View style={membersStyles.memberAvatarWrap}>
                      <Image source={{ uri: member.avatar }} style={membersStyles.memberAvatar} />
                      <View style={[
                        membersStyles.statusDot,
                        { backgroundColor: member.status === 'active' ? '#10B981' : '#9CA3AF' },
                      ]} />
                    </View>
                    <View style={membersStyles.memberInfo}>
                      <Text style={membersStyles.memberName}>{member.name}</Text>
                      <Text style={membersStyles.memberUsername}>@{member.username}</Text>
                    </View>
                    <View style={membersStyles.memberMeta}>
                      <Text style={membersStyles.memberPoints}>{member.points} pts</Text>
                      <Text style={membersStyles.memberJoined}>{member.lastVisit}</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.textTertiary} />
                  </Pressable>
                ))
              )}
            </ScrollView>
          ) : (
            <ScrollView style={membersStyles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={membersStyles.detailHeader}>
                <Image source={{ uri: selectedMember.avatar }} style={membersStyles.detailAvatar} />
                <Text style={membersStyles.detailName}>{selectedMember.name}</Text>
                <Text style={membersStyles.detailUsername}>@{selectedMember.username}</Text>
                <View style={[
                  membersStyles.statusBadge,
                  { backgroundColor: selectedMember.status === 'active' ? '#D1FAE5' : '#F3F4F6' },
                ]}>
                  <View style={[
                    membersStyles.statusBadgeDot,
                    { backgroundColor: selectedMember.status === 'active' ? '#10B981' : '#9CA3AF' },
                  ]} />
                  <Text style={[
                    membersStyles.statusBadgeText,
                    { color: selectedMember.status === 'active' ? '#065F46' : '#6B7280' },
                  ]}>
                    {selectedMember.status === 'active' ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <View style={membersStyles.detailStatsRow}>
                <View style={membersStyles.detailStatBox}>
                  <Gift size={18} color={Colors.accent} />
                  <Text style={membersStyles.detailStatValue}>{selectedMember.points}</Text>
                  <Text style={membersStyles.detailStatLabel}>Points</Text>
                </View>
                <View style={membersStyles.detailStatBox}>
                  <ShoppingBag size={18} color="#00B246" />
                  <Text style={membersStyles.detailStatValue}>{selectedMember.totalPurchases}</Text>
                  <Text style={membersStyles.detailStatLabel}>Purchases</Text>
                </View>
                <View style={membersStyles.detailStatBox}>
                  <UserPlus size={18} color="#10B981" />
                  <Text style={membersStyles.detailStatValue}>{selectedMember.joinedAt.split(',')[0]}</Text>
                  <Text style={membersStyles.detailStatLabel}>Joined</Text>
                </View>
              </View>

              <View style={membersStyles.detailSection}>
                <Text style={membersStyles.detailSectionTitle}>Details</Text>
                <View style={membersStyles.detailRow}>
                  <UserIcon size={16} color={Colors.textSecondary} />
                  <Text style={membersStyles.detailLabel}>Last Visit</Text>
                  <Text style={membersStyles.detailValue}>{selectedMember.lastVisit}</Text>
                </View>
                <View style={membersStyles.detailRow}>
                  <Star size={16} color={Colors.textSecondary} />
                  <Text style={membersStyles.detailLabel}>Joined</Text>
                  <Text style={membersStyles.detailValue}>{selectedMember.joinedAt}</Text>
                </View>
                {selectedMember.email && (
                  <View style={membersStyles.detailRow}>
                    <Mail size={16} color={Colors.textSecondary} />
                    <Text style={membersStyles.detailLabel}>Email</Text>
                    <Text style={membersStyles.detailValue}>{selectedMember.email}</Text>
                  </View>
                )}
                {selectedMember.phone && (
                  <View style={membersStyles.detailRow}>
                    <Phone size={16} color={Colors.textSecondary} />
                    <Text style={membersStyles.detailLabel}>Phone</Text>
                    <Text style={membersStyles.detailValue}>{selectedMember.phone}</Text>
                  </View>
                )}
              </View>

              <View style={membersStyles.detailActions}>
                <Pressable
                  style={membersStyles.detailActionBtn}
                  onPress={() => {
                    if (selectedMember.email) {
                      Linking.openURL(`mailto:${selectedMember.email}`).catch(() => {});
                    } else {
                      Alert.alert('No email', 'This member has no email on file.');
                    }
                  }}
                >
                  <Mail size={18} color={Colors.navyDark} />
                  <Text style={membersStyles.detailActionText}>Email</Text>
                </Pressable>
                <Pressable
                  style={membersStyles.detailActionBtn}
                  onPress={() => {
                    if (selectedMember.phone) {
                      Linking.openURL(`tel:${selectedMember.phone}`).catch(() => {});
                    } else {
                      Alert.alert('No phone', 'This member has no phone on file.');
                    }
                  }}
                >
                  <Phone size={18} color={Colors.navyDark} />
                  <Text style={membersStyles.detailActionText}>Call</Text>
                </Pressable>
                <Pressable
                  style={membersStyles.detailActionBtn}
                  onPress={() => {
                    Alert.alert('Message', `Send a message to ${selectedMember.name}`);
                  }}
                >
                  <MessageCircle size={18} color={Colors.navyDark} />
                  <Text style={membersStyles.detailActionText}>Message</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const membersStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 16,
  },
  backBtn: {
    position: 'absolute' as const,
    left: 16,
  },
  scrollContent: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 10,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 30,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  memberAvatarWrap: {
    position: 'relative' as const,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  statusDot: {
    position: 'absolute' as const,
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  memberUsername: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  memberMeta: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  memberPoints: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.accent,
  },
  memberJoined: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  detailHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  detailUsername: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    gap: 5,
  },
  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  detailStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  detailStatBox: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  detailStatValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  detailStatLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  detailSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    flex: 1,
  },
  detailActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 16,
  },
  detailActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  detailActionText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.navyDark,
  },
});

interface CommentItem {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  rating: number;
  createdAt: string;
}

const INITIAL_COMMENTS: CommentItem[] = [
  { id: 'c1', userName: 'Sarah M.', userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', text: 'Great experience, highly recommend!', rating: 5, createdAt: '2h ago' },
  { id: 'c2', userName: 'James K.', userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', text: 'Good service but a bit slow today.', rating: 3, createdAt: '4h ago' },
  { id: 'c3', userName: 'Emily R.', userAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', text: 'Love this place! Always consistent quality.', rating: 4, createdAt: '1d ago' },
];

function CommentsSheet({ visible, onClose, post, comments, onAddComment, averageRating }: {
  visible: boolean;
  onClose: () => void;
  post: Post;
  comments: CommentItem[];
  onAddComment: (text: string, rating: number) => void;
  averageRating: number;
}) {
  const [newComment, setNewComment] = useState<string>('');
  const [newRating, setNewRating] = useState<number>(0);

  React.useEffect(() => {
    if (visible) {
      setNewComment('');
      setNewRating(0);
      console.log('CommentsSheet opened, comments count:', comments.length, 'avg rating:', averageRating);
    }
  }, [visible]);

  const handleStarPress = useCallback((star: number) => {
    setNewRating((prev) => (prev === star ? 0 : star));
    console.log('Star pressed:', star);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!newComment.trim() && newRating === 0) {
      console.log('Submit blocked: no comment and no rating');
      return;
    }
    console.log('Submitting comment - rating:', newRating, 'text:', newComment.trim());
    onAddComment(newComment.trim(), newRating);
    setNewComment('');
    setNewRating(0);
  }, [newComment, newRating, onAddComment]);

  const ratedComments = useMemo(() => comments.filter(c => c.rating > 0), [comments]);

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={commentsSheetStyles.overlay}>
        <Pressable style={commentsSheetStyles.backdrop} onPress={onClose} />
        <View style={commentsSheetStyles.sheet}>
          <View style={commentsSheetStyles.handleBar} />
          <View style={commentsSheetStyles.header}>
            <Text style={commentsSheetStyles.headerTitle}>Comments</Text>
            <Pressable onPress={onClose} hitSlop={12} style={commentsSheetStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          {ratedComments.length > 0 && (
            <View style={commentsSheetStyles.ratingOverview}>
              <View style={commentsSheetStyles.ratingBig}>
                <Text style={commentsSheetStyles.ratingBigNumber}>{averageRating.toFixed(1)}</Text>
                <View style={commentsSheetStyles.ratingBigStars}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      color={s <= Math.round(averageRating) ? '#F59E0B' : Colors.borderLight}
                      fill={s <= Math.round(averageRating) ? '#F59E0B' : 'none'}
                    />
                  ))}
                </View>
                <Text style={commentsSheetStyles.ratingCount}>{ratedComments.length} rating{ratedComments.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
          )}

          <ScrollView style={commentsSheetStyles.commentsList} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {comments.length === 0 ? (
              <View style={commentsSheetStyles.emptyContainer}>
                <MessageCircle size={32} color={Colors.textTertiary} />
                <Text style={commentsSheetStyles.emptyText}>No comments yet</Text>
                <Text style={commentsSheetStyles.emptySubtext}>Be the first to comment and rate!</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={commentsSheetStyles.commentRow}>
                  <Image source={{ uri: c.userAvatar }} style={commentsSheetStyles.commentAvatar} />
                  <View style={commentsSheetStyles.commentContent}>
                    <View style={commentsSheetStyles.commentHeader}>
                      <Text style={commentsSheetStyles.commentName}>{c.userName}</Text>
                      <Text style={commentsSheetStyles.commentTime}>{c.createdAt}</Text>
                    </View>
                    {c.rating > 0 && (
                      <View style={commentsSheetStyles.commentStars}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            size={12}
                            color={s <= c.rating ? '#F59E0B' : Colors.borderLight}
                            fill={s <= c.rating ? '#F59E0B' : 'none'}
                          />
                        ))}
                      </View>
                    )}
                    {c.text ? <Text style={commentsSheetStyles.commentText}>{c.text}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={commentsSheetStyles.inputArea}>
            <View style={commentsSheetStyles.ratingRow}>
              <Text style={commentsSheetStyles.ratingLabel}>Rate:</Text>
              <View style={commentsSheetStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => handleStarPress(star)} hitSlop={4}>
                    <View style={commentsSheetStyles.starTouchable}>
                      <Star
                        size={24}
                        color={star <= newRating ? '#F59E0B' : Colors.textTertiary}
                        fill={star <= newRating ? '#F59E0B' : 'none'}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
              {newRating > 0 && (
                <Pressable onPress={() => setNewRating(0)}>
                  <Text style={commentsSheetStyles.clearRating}>Clear</Text>
                </Pressable>
              )}
            </View>
            <View style={commentsSheetStyles.inputRow}>
              <TextInput
                style={commentsSheetStyles.textInput}
                placeholder="Write a comment..."
                placeholderTextColor={Colors.textTertiary}
                value={newComment}
                onChangeText={setNewComment}
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
                multiline
              />
              <Pressable
                onPress={handleSubmit}
                style={[commentsSheetStyles.sendBtn, (!newComment.trim() && newRating === 0) && { opacity: 0.4 }]}
                disabled={!newComment.trim() && newRating === 0}
              >
                <Send size={18} color={Colors.navyDark} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const commentsSheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    minHeight: SCREEN_HEIGHT * 0.5,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  starTouchable: {
    padding: 2,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 16,
  },
  ratingOverview: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FFFBEB',
  },
  ratingBig: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBigNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#92400E',
  },
  ratingBigStars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingCount: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: '#92400E',
    marginLeft: 4,
  },
  commentsList: {
    flex: 1,
    paddingTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
  },
  commentStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },
  commentText: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.text,
    marginTop: 4,
    lineHeight: 18,
  },
  inputArea: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  clearRating: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.teal,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 6,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 8,
    marginBottom: 2,
  },
});

function PostLocalMeta({ localData }: { localData: PostLocalData | undefined }) {
  if (!localData) return null;
  const loc = localData.businessLocation;
  return (
    <View style={localMetaStyles.container}>
      <View style={localMetaStyles.topRow}>
        <View style={localMetaStyles.locationChip}>
          <MapPin size={11} color="#0EA5E9" />
          <Text style={localMetaStyles.neighborhoodText}>{loc.neighborhood}</Text>
        </View>
        <View style={localMetaStyles.distanceChip}>
          <Navigation size={10} color="#10B981" />
          <Text style={localMetaStyles.distanceText}>{loc.distance}</Text>
        </View>
        <View style={localMetaStyles.walkChip}>
          <Footprints size={10} color={Colors.textTertiary} />
          <Text style={localMetaStyles.walkText}>{loc.walkTime}</Text>
        </View>
        {loc.openNow ? (
          <View style={localMetaStyles.openBadge}>
            <View style={localMetaStyles.openDot} />
            <Text style={localMetaStyles.openText}>Open</Text>
          </View>
        ) : (
          <View style={localMetaStyles.closedBadge}>
            <Text style={localMetaStyles.closedText}>{loc.nextOpen ?? 'Closed'}</Text>
          </View>
        )}
      </View>
      <View style={localMetaStyles.bottomRow}>
        {localData.trendingInArea && (
          <View style={localMetaStyles.trendingBadge}>
            <Flame size={10} color="#EF4444" />
            <Text style={localMetaStyles.trendingText}>Trending in {loc.neighborhood}</Text>
          </View>
        )}
        <View style={localMetaStyles.popularityWrap}>
          <View style={localMetaStyles.popularityBarBg}>
            <View style={[localMetaStyles.popularityBarFill, { width: `${loc.localPopularity}%`, backgroundColor: loc.localPopularity > 90 ? '#10B981' : loc.localPopularity > 80 ? '#F59E0B' : '#94A3B8' }]} />
          </View>
          <Text style={localMetaStyles.popularityText}>{loc.localPopularity}% local</Text>
        </View>
      </View>
      {localData.nearbyDeals.length > 0 && (
        <View style={localMetaStyles.dealsRow}>
          <Gift size={10} color="#F59E0B" />
          <Text style={localMetaStyles.dealsText} numberOfLines={1}>{localData.nearbyDeals[0]}</Text>
        </View>
      )}
      {localData.localHashtags.length > 0 && (
        <View style={localMetaStyles.hashtagsRow}>
          {localData.localHashtags.slice(0, 3).map((tag) => (
            <Text key={tag} style={localMetaStyles.hashtagText}>{tag}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const localMetaStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  neighborhoodText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#0EA5E9',
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#10B981',
  },
  walkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  walkText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  openText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  closedBadge: {
    marginLeft: 'auto',
  },
  closedText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  trendingText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  popularityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  popularityBarBg: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    flex: 1,
    maxWidth: 60,
    overflow: 'hidden',
  },
  popularityBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  popularityText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  dealsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  dealsText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#D97706',
    flex: 1,
  },
  hashtagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  hashtagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#00B246',
    letterSpacing: 0.2,
  },
});

function SocialStatsPopup({ visible, onClose, post, averageRating, commentsCount, ratedCount, onOpenComments }: {
  visible: boolean;
  onClose: () => void;
  post: Post;
  averageRating: number;
  commentsCount: number;
  ratedCount: number;
  onOpenComments: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim]);

  if (!visible) return null;

  const ratingPercentage = averageRating > 0 ? (averageRating / 5) * 100 : 0;
  const ratingColor = averageRating >= 4 ? '#10B981' : averageRating >= 3 ? '#F59E0B' : averageRating >= 1 ? '#EF4444' : '#94A3B8';

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={socialPopupStyles.overlay}>
        <Animated.View style={[socialPopupStyles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[socialPopupStyles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={socialPopupStyles.handleBar} />
          <View style={socialPopupStyles.header}>
            <Text style={socialPopupStyles.headerTitle}>Post Statistics</Text>
            <Pressable onPress={onClose} hitSlop={12} style={socialPopupStyles.closeBtn}>
              <X size={22} color={Colors.text} />
            </Pressable>
          </View>

          <View style={socialPopupStyles.businessRow}>
            <Image source={{ uri: post.author.avatar }} style={socialPopupStyles.businessAvatar} />
            <Text style={socialPopupStyles.businessName} numberOfLines={1}>{post.author.name}</Text>
          </View>

          <View style={socialPopupStyles.statsGrid}>
            <View style={socialPopupStyles.statCard}>
              <View style={[socialPopupStyles.statIconWrap, { backgroundColor: '#FFFBEB' }]}>
                <Star size={20} color="#F59E0B" fill={averageRating > 0 ? '#F59E0B' : 'none'} />
              </View>
              <Text style={socialPopupStyles.statValue}>
                {averageRating > 0 ? averageRating.toFixed(1) : '—'}
              </Text>
              <Text style={socialPopupStyles.statLabel}>Avg Rating</Text>
              {averageRating > 0 && (
                <View style={socialPopupStyles.ratingBarBg}>
                  <View style={[socialPopupStyles.ratingBarFill, { width: `${ratingPercentage}%`, backgroundColor: ratingColor }]} />
                </View>
              )}
              <View style={socialPopupStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    color={s <= Math.round(averageRating) ? '#F59E0B' : Colors.borderLight}
                    fill={s <= Math.round(averageRating) ? '#F59E0B' : 'none'}
                  />
                ))}
              </View>
              {ratedCount > 0 && (
                <Text style={socialPopupStyles.statSubtext}>{ratedCount} rating{ratedCount !== 1 ? 's' : ''}</Text>
              )}
            </View>

            <Pressable style={socialPopupStyles.statCard} onPress={() => { onClose(); setTimeout(onOpenComments, 350); }}>
              <View style={[socialPopupStyles.statIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <MessageCircle size={20} color="#00B246" fill={commentsCount > 0 ? '#00B246' : 'none'} />
              </View>
              <Text style={socialPopupStyles.statValue}>{commentsCount}</Text>
              <Text style={socialPopupStyles.statLabel}>Comments</Text>
              <Text style={socialPopupStyles.statTapHint}>Tap to view</Text>
            </Pressable>

            <View style={socialPopupStyles.statCard}>
              <View style={[socialPopupStyles.statIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <Share2 size={20} color="#10B981" />
              </View>
              <Text style={socialPopupStyles.statValue}>{post.shares}</Text>
              <Text style={socialPopupStyles.statLabel}>Shares</Text>
            </View>
          </View>

          <View style={socialPopupStyles.engagementSection}>
            <Text style={socialPopupStyles.engagementTitle}>Engagement Summary</Text>
            <View style={socialPopupStyles.engagementRow}>
              <View style={socialPopupStyles.engagementItem}>
                <TrendingUp size={14} color="#10B981" />
                <Text style={socialPopupStyles.engagementText}>
                  {commentsCount + post.shares} total interactions
                </Text>
              </View>
              {averageRating >= 4 && (
                <View style={socialPopupStyles.engagementItem}>
                  <Award size={14} color="#F59E0B" />
                  <Text style={socialPopupStyles.engagementText}>Highly rated</Text>
                </View>
              )}
              {post.shares > 5 && (
                <View style={socialPopupStyles.engagementItem}>
                  <Flame size={14} color="#EF4444" />
                  <Text style={socialPopupStyles.engagementText}>Popular post</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const socialPopupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44,58,78,0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  closeBtn: {
    position: 'absolute' as const,
    right: 16,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  businessAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  businessName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  statSubtext: {
    fontSize: 10,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statTapHint: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: '#00B246',
    marginTop: 2,
  },
  ratingBarBg: {
    width: '80%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  engagementSection: {
    marginHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
  },
  engagementTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  engagementRow: {
    gap: 8,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  engagementText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
});

function PostCard({ post, onBusinessPress, onRewardsPress, isBusinessMode, onImagePress }: { post: Post; onBusinessPress: (id: string) => void; onRewardsPress: (id: string) => void; isBusinessMode?: boolean; onImagePress?: (post: Post) => void }) {
  const [comments, setComments] = useState<CommentItem[]>(INITIAL_COMMENTS);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showRecommend, setShowRecommend] = useState<boolean>(false);
  const [showShare, setShowShare] = useState<boolean>(false);
  const [showMembers, setShowMembers] = useState<boolean>(false);
  const [showSocialStats, setShowSocialStats] = useState<boolean>(false);

  const averageRating = useMemo(() => {
    const rated = comments.filter(c => c.rating > 0);
    if (rated.length === 0) return 0;
    return rated.reduce((sum, c) => sum + c.rating, 0) / rated.length;
  }, [comments]);

  const handleAddComment = useCallback((text: string, rating: number) => {
    if (!text && rating === 0) return;
    const newComment: CommentItem = {
      id: `c_${Date.now()}`,
      userName: 'You',
      userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      text,
      rating,
      createdAt: 'Just now',
    };
    setComments(prev => [newComment, ...prev]);
  }, []);

  const isAdmin = post.type === 'admin';

  return (
    <View style={[styles.postCard, isAdmin && styles.adminPostCard]}>
      {isAdmin && (
        <View style={styles.adminPostBanner}>
          <Bell size={12} color="#fff" />
          <Text style={styles.adminPostBannerText}>Admin Announcement</Text>
        </View>
      )}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.authorRow} onPress={() => !isAdmin && onBusinessPress(post.author.id)} activeOpacity={isAdmin ? 1 : 0.6}>
          <Image source={{ uri: post.author.avatar }} style={[styles.avatar, isAdmin && styles.adminAvatar]} />
          <View style={styles.authorInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.authorName}>{post.author.name}</Text>
              {post.type === 'promotion' && (
                <View style={styles.promoBadge}>
                  <Megaphone size={10} color={Colors.navyDark} />
                  <Text style={styles.promoBadgeText}>Promo</Text>
                </View>
              )}
              {post.type === 'announcement' && (
                <View style={[styles.promoBadge, { backgroundColor: Colors.teal }]}>
                  <Bell size={10} color={Colors.surface} />
                  <Text style={[styles.promoBadgeText, { color: Colors.surface }]}>New</Text>
                </View>
              )}
              {post.type === 'admin' && (
                <View style={styles.adminBadge}>
                  <Bell size={10} color="#fff" />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
            <Text style={styles.postTime}>{post.createdAt}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity hitSlop={12}>
          <MoreHorizontal size={20} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>{post.content}</Text>

      {post.image && (
        <Pressable onPress={() => onImagePress?.(post)}>
          <View style={styles.postImageWrap}>
            <Image source={{ uri: post.image }} style={styles.postImage} contentFit="cover" />
          </View>
        </Pressable>
      )}

      {!isBusinessMode && !isAdmin && (
        <PostLocalMeta localData={postLocalData.find(d => d.postId === post.id)} />
      )}

      {!isAdmin && (
        <Pressable
          style={styles.postStats}
          onPress={() => {
            console.log('Social stats tapped for post:', post.id);
            setShowSocialStats(true);
          }}
        >
          <View style={styles.statsLeft}>
            <Star size={12} color="#F59E0B" fill={averageRating > 0 ? '#F59E0B' : 'none'} />
            <Text style={styles.statsText}>
              {averageRating > 0 ? `${averageRating.toFixed(1)}/5` : 'No ratings'}
              {averageRating > 0 ? ` (${comments.filter(c => c.rating > 0).length})` : ''}
            </Text>
          </View>
          <View style={styles.statsRight}>
            <Text style={styles.statsText}>{comments.length} comments · {post.shares} shares</Text>
            <ChevronRight size={14} color={Colors.textTertiary} />
          </View>
        </Pressable>
      )}

      {!isAdmin && (
        !isBusinessMode ? (
          <View style={styles.postActions}>
            <Pressable style={styles.actionBtn} onPress={() => { console.log('Comment button pressed for post:', post.id); setShowComments(true); }}>
              <View style={[styles.actionIconWrap, comments.length > 0 && { backgroundColor: '#EEF2FF' }]}>
                <MessageCircle size={16} color={comments.length > 0 ? '#00B246' : Colors.textSecondary} fill={comments.length > 0 ? '#00B246' : 'none'} />
              </View>
              <Text style={[styles.actionText, comments.length > 0 && { color: '#00B246' }]}>Comment</Text>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={() => { console.log('Refer button pressed for post:', post.id); setShowRecommend(true); }}>
              <View style={[styles.actionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                <UserPlus size={16} color="#10B981" />
              </View>
              <Text style={[styles.actionText, { color: '#10B981' }]}>Refer</Text>
            </Pressable>

            <Pressable style={styles.actionBtn} onPress={() => setShowShare(true)}>
              <View style={styles.actionIconWrap}>
                <Share2 size={16} color={Colors.textSecondary} />
              </View>
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                console.log('Rewards tapped for post:', post.id, 'business:', post.author.id);
                onRewardsPress(post.author.id);
              }}
            >
              <View style={styles.actionIconWrap}>
                <Gift size={16} color={Colors.textSecondary} />
              </View>
              <Text style={styles.actionText}>Rewards</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.postActions}>
            <Pressable
              style={styles.actionBtn}
              onPress={() => {
                console.log('Members tapped for post:', post.id, 'business:', post.author.id);
                setShowMembers(true);
              }}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Users size={16} color="#00B246" />
              </View>
              <Text style={styles.actionText}>Members</Text>
            </Pressable>
          </View>
        )
      )}

      <RecommendSheet
        visible={showRecommend}
        onClose={() => setShowRecommend(false)}
        postAuthor={post.author.name}
      />

      <ShareSheet
        visible={showShare}
        onClose={() => setShowShare(false)}
        post={post}
      />

      <MembersSheet
        visible={showMembers}
        onClose={() => setShowMembers(false)}
        businessId={post.author.id}
        businessName={post.author.name}
      />

      <CommentsSheet
        visible={showComments}
        onClose={() => setShowComments(false)}
        post={post}
        comments={comments}
        onAddComment={handleAddComment}
        averageRating={averageRating}
      />

      <SocialStatsPopup
        visible={showSocialStats}
        onClose={() => setShowSocialStats(false)}
        post={post}
        averageRating={averageRating}
        commentsCount={comments.length}
        ratedCount={comments.filter(c => c.rating > 0).length}
        onOpenComments={() => setShowComments(true)}
      />
    </View>
  );
}

export default PostCard;

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  adminPostCard: {
    borderWidth: 1.5,
    borderColor: '#99F6E4',
    backgroundColor: '#F0FDFA',
  },
  adminPostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    paddingVertical: 6,
    gap: 6,
  },
  adminPostBannerText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D9488',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  adminAvatar: {
    borderWidth: 2,
    borderColor: '#0D9488',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  authorInfo: {
    marginLeft: 10,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  promoBadgeText: {
    color: Colors.textOnDark,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  postTime: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  postContent: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: Colors.text,
    paddingHorizontal: 14,
    paddingBottom: 12,
    letterSpacing: 0.1,
  },
  postImageWrap: {
    position: 'relative' as const,
  },
  postImage: {
    width: '100%',
    height: SCREEN_WIDTH - 24,
  },

  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: '#FAFBFC',
  },
  statsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  postActions: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  actionBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
  },
  actionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapActive: {
    backgroundColor: Colors.accent,
  },
  actionText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});
