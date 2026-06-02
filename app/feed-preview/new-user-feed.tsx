import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import HomeFeedScreen from '@/app/(tabs)/feed';
import FeedPreviewBoundary from '@/components/FeedPreviewBoundary';

export default function NewUserFeedPreview() {
  const router = useRouter();

  return (
    <View style={styles.root} testID="new-user-feed-preview">
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backBtn}
            testID="new-user-feed-back"
          >
            <ArrowLeft size={22} color="#1A1D2E" />
          </TouchableOpacity>
          <Text style={styles.title}>New User Feed</Text>
          <View style={styles.backBtn} />
        </View>
      </SafeAreaView>
      <View style={styles.content}>
        <FeedPreviewBoundary>
          <HomeFeedScreen />
        </FeedPreviewBoundary>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  headerSafe: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE0F0',
    ...Platform.select({
      ios: { shadowColor: '#1A1D2E', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
      default: {},
    }),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#1A1D2E', letterSpacing: -0.2 },
  content: { flex: 1 },
});
