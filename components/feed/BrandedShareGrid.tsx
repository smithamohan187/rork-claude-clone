import React, { useCallback } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { Mail, Link2 } from 'lucide-react-native';

interface Props {
  message: string;
  link: string;
  emailSubject?: string;
  onToast?: (msg: string) => void;
  testIDPrefix?: string;
}

const LABEL_COLOR = '#1A5C35';

/**
 * Five-channel branded share grid: WhatsApp, Instagram, Facebook, Email, Copy link.
 * Used by every share surface in the app for a consistent, recognizable look.
 */
export const BrandedShareGrid = React.memo(function BrandedShareGrid({
  message,
  link,
  emailSubject,
  onToast,
  testIDPrefix,
}: Props) {
  const handleWhatsApp = useCallback(async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.log('[BrandedShare] whatsapp failed', e);
      onToast?.('WhatsApp is not installed');
    }
  }, [message, onToast]);

  const handleInstagram = useCallback(async () => {
    onToast?.('Opening Instagram…');
    try {
      await Linking.openURL('instagram://');
    } catch (e) {
      console.log('[BrandedShare] instagram failed', e);
      try {
        await Linking.openURL('https://www.instagram.com/');
      } catch {}
    }
  }, [onToast]);

  const handleFacebook = useCallback(async () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}&quote=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.log('[BrandedShare] facebook failed', e);
      onToast?.('Could not open Facebook');
    }
  }, [link, message, onToast]);

  const handleEmail = useCallback(async () => {
    const subject = emailSubject ?? 'Check this out on TouchPoint';
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.log('[BrandedShare] email failed', e);
      onToast?.('Could not open email');
    }
  }, [message, emailSubject, onToast]);

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(link);
      onToast?.('Link copied!');
    } catch (e) {
      console.log('[BrandedShare] copy failed', e);
    }
  }, [link, onToast]);

  return (
    <View style={styles.row} testID={testIDPrefix ?? 'branded-share-grid'}>
      <Pressable
        style={styles.option}
        onPress={handleWhatsApp}
        hitSlop={4}
        testID={`${testIDPrefix ?? 'share'}-whatsapp`}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#25D366' }]}>
          <FontAwesome name="whatsapp" size={26} color="#fff" />
        </View>
        <Text style={styles.label} numberOfLines={1}>WhatsApp</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={handleInstagram}
        hitSlop={4}
        testID={`${testIDPrefix ?? 'share'}-instagram`}
      >
        <LinearGradient
          colors={['#F58529', '#DD2A7B', '#00B246', '#00B246']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <FontAwesome name="instagram" size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.label} numberOfLines={1}>Instagram</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={handleFacebook}
        hitSlop={4}
        testID={`${testIDPrefix ?? 'share'}-facebook`}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#1877F2' }]}>
          <FontAwesome name="facebook" size={22} color="#fff" />
        </View>
        <Text style={styles.label} numberOfLines={1}>Facebook</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={handleEmail}
        hitSlop={4}
        testID={`${testIDPrefix ?? 'share'}-email`}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#475569' }]}>
          <Mail size={22} color="#fff" />
        </View>
        <Text style={styles.label} numberOfLines={1}>Email</Text>
      </Pressable>

      <Pressable
        style={styles.option}
        onPress={handleCopy}
        hitSlop={4}
        testID={`${testIDPrefix ?? 'share'}-copy`}
      >
        <View style={[styles.iconCircle, { backgroundColor: '#1A5C35' }]}>
          <Link2 size={22} color="#fff" />
        </View>
        <Text style={styles.label} numberOfLines={1}>Copy link</Text>
      </Pressable>
    </View>
  );
});

const _platform = Platform.OS;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  option: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: LABEL_COLOR,
    fontWeight: '600',
    textAlign: 'center',
  },
});
