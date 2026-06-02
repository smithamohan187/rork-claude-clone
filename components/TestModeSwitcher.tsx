import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Image,
  Dimensions,
} from 'react-native';
import { FlaskConical, X, ChevronRight, RotateCcw } from 'lucide-react-native';
import { Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TestModeSwitcher() {
  const { switchTestUser, testUserIndex, testUsers, resetAllData } = useAuth();
  const [expanded, setExpanded] = useState<boolean>(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    if (!expanded) pulse.start();
    return () => pulse.stop();
  }, [expanded, pulseAnim]);

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(expandAnim, {
      toValue,
      friction: 8,
      tension: 65,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const handleSelectUser = (index: number) => {
    switchTestUser(index);
    setTimeout(() => {
      Animated.spring(expandAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: false,
      }).start();
      setExpanded(false);
    }, 200);
  };

  const panelWidth = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, Math.min(SCREEN_WIDTH - 32, 300)],
  });

  const panelHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [48, 320],
  });

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [0, 0, 1],
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            height: panelHeight,
          },
        ]}
      >
        {!expanded && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={styles.fabButton}
              onPress={toggleExpanded}
              activeOpacity={0.8}
              testID="test-mode-fab"
            >
              <FlaskConical size={22} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {expanded && (
          <Animated.View style={[styles.expandedContent, { opacity: contentOpacity }]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <FlaskConical size={16} color="#F59E0B" />
                <Text style={styles.headerTitle}>Test Mode</Text>
              </View>
              <TouchableOpacity onPress={toggleExpanded} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.userList}>
              {testUsers.map((user, index) => {
                const isActive = index === testUserIndex;
                return (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userRow, isActive && styles.userRowActive]}
                    onPress={() => handleSelectUser(index)}
                    activeOpacity={0.7}
                    testID={`test-user-${user.username}`}
                  >
                    <Image source={{ uri: user.avatar }} style={styles.avatar} />
                    <View style={styles.userInfo}>
                      <Text style={[styles.userName, isActive && styles.userNameActive]}>
                        {user.name}
                      </Text>
                      <Text style={styles.userHandle}>@{user.username}</Text>
                    </View>
                    {isActive ? (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    ) : (
                      <ChevronRight size={16} color="#64748B" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                Alert.alert(
                  'Reset All Data',
                  'This will clear all app data and return to defaults. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Reset',
                      style: 'destructive',
                      onPress: () => {
                        resetAllData();
                        toggleExpanded();
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
              testID="test-mode-reset"
            >
              <RotateCcw size={14} color="#EF4444" />
              <Text style={styles.resetButtonText}>Reset All Data</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    zIndex: 9999,
    elevation: 9999,
  },
  panel: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
  },
  expandedContent: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#F59E0B',
    letterSpacing: 0.3,
  },
  userList: {
    gap: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  userRowActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#E2E8F0',
  },
  userNameActive: {
    color: '#F59E0B',
  },
  userHandle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  activeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#F59E0B',
  },
  resetButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
});
