import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, Heart, ShoppingCart, MessageCircle } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { products } from '@/mocks/data';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>Product not found</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: product.image }} style={styles.image} contentFit="cover" />
          <SafeAreaView edges={['top']} style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={22} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn}>
              <Heart size={22} color={Colors.coral} />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <Text style={styles.category}>{product.category}</Text>
          <Text style={styles.title}>{product.title}</Text>

          <View style={styles.ratingRow}>
            <Star size={16} color={Colors.accent} fill={Colors.accent} />
            <Text style={styles.rating}>{product.rating}</Text>
            <Text style={styles.reviews}>({product.reviews} reviews)</Text>
          </View>

          <Text style={styles.price}>${product.price.toFixed(2)}</Text>

          <Text style={styles.descTitle}>Description</Text>
          <Text style={styles.desc}>{product.description}</Text>

          <View style={styles.sellerCard}>
            <Image source={{ uri: product.seller.avatar }} style={styles.sellerAvatar} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              <Text style={styles.sellerUsername}>@{product.seller.username}</Text>
            </View>
            <TouchableOpacity style={styles.msgSellerBtn}>
              <MessageCircle size={18} color={Colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomInner}>
          <View>
            <Text style={styles.bottomPriceLabel}>Price</Text>
            <Text style={styles.bottomPrice}>${product.price.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.addToCartBtn} activeOpacity={0.8}>
            <ShoppingCart size={18} color={Colors.navyDark} />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 320,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  category: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.navyMid,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 6,
    letterSpacing: -0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  reviews: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.1,
  },
  price: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 14,
    letterSpacing: -0.3,
  },
  descTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 20,
    letterSpacing: 0,
  },
  desc: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: Colors.textSecondary,
    marginTop: 6,
    letterSpacing: 0.1,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
    padding: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  sellerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  sellerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0,
  },
  sellerUsername: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    marginTop: 1,
    letterSpacing: 0.1,
  },
  msgSellerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  bottomInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottomPriceLabel: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textTertiary,
    letterSpacing: 0.1,
  },
  bottomPrice: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addToCartText: {
    color: Colors.textOnDark,
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
});

