import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Tag, Clock, AlertTriangle, ArrowRight } from 'lucide-react-native';
import type { OfferSharePayload } from '@/contexts/ReferralChatContext';

const PRIMARY = '#1A5C35';
const PRIMARY_DARK = '#1A5C35';
const PRIMARY_TINT = '#E8F5EE';
const TEXT_DARK = '#1A5C35';
const TEXT_MUTED = '#1A5C35';
const SURFACE = '#FFFFFF';
const AMBER = '#B45309';
const AMBER_BG = '#FEF3C7';

interface Props {
  payload: OfferSharePayload;
  body: string;
  mine: boolean;
  senderName?: string;
  senderAvatar?: { initials: string; color: string };
  timestamp?: string;
}

function formatEndsLabel(iso?: string): { label: string; expired: boolean } {
  if (!iso) return { label: '', expired: false };
  const end = new Date(iso).getTime();
  if (isNaN(end)) return { label: '', expired: false };
  const now = Date.now();
  if (end <= now) return { label: 'Offer Expired', expired: true };
  const d = new Date(iso);
  return {
    label: `Ends ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
    expired: false,
  };
}

export const OfferShareBubble = React.memo(function OfferShareBubble({
  payload,
  body,
  mine,
  senderName,
  senderAvatar,
  timestamp,
}: Props) {
  const router = useRouter();
  const [imgFailed, setImgFailed] = useState<boolean>(false);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);

  const ends = useMemo(() => formatEndsLabel(payload.validUntil), [payload.validUntil]);

  const handleView = useCallback(() => {
    if (ends.expired) return;
    console.log('[OfferShareBubble] view offer', payload.offerId);
    router.push({
      pathname: '/view-offer',
      params: {
        offerId: payload.offerId,
        businessId: payload.businessId,
        sharedByName: senderName ?? '',
        sharedByInitials: senderAvatar?.initials ?? '',
        sharedByColor: senderAvatar?.color ?? '',
      },
    } as never);
  }, [ends.expired, payload.offerId, payload.businessId, router, senderName, senderAvatar]);

  const businessInitial = payload.businessName?.charAt(0)?.toUpperCase() ?? 'B';

  return (
    <View style={[styles.wrap, mine ? styles.wrapMine : styles.wrapTheirs]}>
      <View style={[styles.intro, mine ? styles.introMine : styles.introTheirs]}>
        <Text style={[styles.introText, mine && styles.introTextMine]} numberOfLines={2}>
          {body}
        </Text>
      </View>

      <View style={[styles.card, mine ? styles.cardMine : styles.cardTheirs]}>
        <View style={styles.heroWrap}>
          {payload.offerImageUrl && !imgFailed ? (
            <Image
              source={{ uri: payload.offerImageUrl }}
              style={styles.hero}
              onError={() => setImgFailed(true)}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[PRIMARY, PRIMARY_DARK]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroFallbackText} numberOfLines={2}>
                {payload.businessName}
              </Text>
            </LinearGradient>
          )}
          {payload.discountLabel ? (
            <View style={styles.discountPill}>
              <Text style={styles.discountPillText}>{payload.discountLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.bizRow}>
          {payload.businessLogoUrl && !logoFailed ? (
            <Image
              source={{ uri: payload.businessLogoUrl }}
              style={styles.bizLogo}
              onError={() => setLogoFailed(true)}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.bizLogo, styles.bizLogoFallback]}>
              <Text style={styles.bizLogoLetter}>{businessInitial}</Text>
            </View>
          )}
          <Text style={styles.bizName} numberOfLines={1}>
            {payload.businessName}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {payload.offerTitle}
          </Text>
          {payload.offerDescription ? (
            <Text style={styles.description} numberOfLines={2}>
              {payload.offerDescription}
            </Text>
          ) : null}
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          {payload.discountLabel ? (
            <View style={styles.metaItem}>
              <Tag size={12} color={PRIMARY} />
              <Text style={styles.metaText} numberOfLines={1}>
                {payload.discountLabel}
              </Text>
            </View>
          ) : null}
          {ends.label ? (
            ends.expired ? (
              <View style={[styles.metaItem, styles.metaItemExpired]}>
                <AlertTriangle size={12} color={AMBER} />
                <Text style={[styles.metaText, styles.metaTextExpired]} numberOfLines={1}>
                  {ends.label}
                </Text>
              </View>
            ) : (
              <View style={styles.metaItem}>
                <Clock size={12} color={TEXT_MUTED} />
                <Text style={[styles.metaText, { color: TEXT_MUTED }]} numberOfLines={1}>
                  {ends.label}
                </Text>
              </View>
            )
          ) : null}
        </View>

        <Pressable
          onPress={handleView}
          disabled={ends.expired}
          style={({ pressed }) => [
            styles.cta,
            ends.expired && styles.ctaDisabled,
            pressed && !ends.expired && styles.ctaPressed,
          ]}
          testID={`offer-share-view-${payload.offerId}`}
        >
          <Text style={styles.ctaText}>
            {ends.expired ? 'Offer Unavailable' : 'View Offer'}
          </Text>
          {!ends.expired ? <ArrowRight size={14} color="#fff" /> : null}
        </Pressable>
      </View>

      {timestamp ? (
        <Text style={[styles.timestamp, mine ? styles.timestampMine : styles.timestampTheirs]}>
          {timestamp}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    maxWidth: '85%',
    marginVertical: 4,
  },
  wrapMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  wrapTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  intro: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 6,
    maxWidth: '100%',
  },
  introMine: {
    backgroundColor: PRIMARY,
    borderBottomRightRadius: 4,
  },
  introTheirs: {
    backgroundColor: SURFACE,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  introText: {
    fontSize: 14,
    color: TEXT_DARK,
    lineHeight: 19,
  },
  introTextMine: {
    color: '#fff',
  },
  card: {
    width: 280,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1A5C35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  cardMine: {
    backgroundColor: '#F4F1FE',
    borderWidth: 1,
    borderColor: '#E8F5EE',
  },
  cardTheirs: {
    backgroundColor: SURFACE,
    borderWidth: 0.5,
    borderColor: '#E8F5EE',
  },
  heroWrap: {
    width: '100%',
    height: 140,
    backgroundColor: PRIMARY_TINT,
    position: 'relative',
  },
  hero: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  heroFallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  discountPill: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: PRIMARY_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  discountPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bizLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PRIMARY_TINT,
  },
  bizLogoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizLogoLetter: {
    color: PRIMARY,
    fontWeight: '800',
    fontSize: 12,
  },
  bizName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_DARK,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8F5EE',
    marginHorizontal: 12,
  },
  body: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_DARK,
    lineHeight: 19,
  },
  description: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemExpired: {
    backgroundColor: AMBER_BG,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
  metaTextExpired: {
    color: AMBER,
  },
  cta: {
    height: 40,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 10,
    marginTop: 0,
    borderRadius: 10,
  },
  ctaDisabled: {
    backgroundColor: '#E8F5EE',
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timestampMine: {
    color: TEXT_MUTED,
  },
  timestampTheirs: {
    color: TEXT_MUTED,
  },
});

export default OfferShareBubble;
