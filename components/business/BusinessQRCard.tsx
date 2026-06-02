import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ScanLine, Share2, Maximize2 } from 'lucide-react-native';
import QRCodeView from '@/components/coupons/QRCodeView';

const INDIGO = '#00B246';
const PURPLE = '#00B246';
const ACCENT = '#FF7043';
const TEXT_PRIMARY = '#1A1D2E';
const TEXT_SECONDARY = '#5C5F72';
const BORDER = '#DDE0F0';

export const BUSINESS_QR_BASE_URL = 'https://touchpoint.app/b/';

export function buildBusinessQRUrl(businessId: string): string {
  return `${BUSINESS_QR_BASE_URL}${encodeURIComponent(businessId)}`;
}

interface BusinessQRCardProps {
  businessId: string;
  businessName: string;
  businessLogo: string;
  category?: string;
  onExpand?: () => void;
  onShare?: () => void;
  qrSize?: number;
  testID?: string;
}

function BusinessQRCardComponent({
  businessId,
  businessName,
  businessLogo,
  category,
  onExpand,
  onShare,
  qrSize = 200,
  testID,
}: BusinessQRCardProps) {
  const qrValue = buildBusinessQRUrl(businessId);

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.card}>
        <LinearGradient
          colors={[INDIGO, PURPLE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topStripe}
        >
          <View style={styles.stripeLeft}>
            <ScanLine size={14} color="#fff" />
            <Text style={styles.stripeText}>Scan to subscribe</Text>
          </View>
          <Text style={styles.stripeBrand}>TouchPoint</Text>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.qrFrame}>
            <QRCodeView
              value={qrValue}
              size={qrSize}
              color={TEXT_PRIMARY}
              backgroundColor="#FFFFFF"
              logoSize={44}
              logoElement={
                <View style={styles.logoCenterWrap}>
                  <Image
                    source={{ uri: businessLogo }}
                    style={styles.logoCenter}
                    contentFit="cover"
                  />
                </View>
              }
            />
          </View>

          <View style={styles.dashedDivider} />

          <Text style={styles.bizName} numberOfLines={1}>
            {businessName}
          </Text>
          {category ? (
            <View style={styles.catChip}>
              <Text style={styles.catChipText}>{category}</Text>
            </View>
          ) : null}
          <Text style={styles.caption}>
            Point any camera at this code to join
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {onExpand ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimary]}
            activeOpacity={0.85}
            onPress={onExpand}
            testID="qr-expand-btn"
          >
            <Maximize2 size={16} color="#fff" />
            <Text style={styles.actionPrimaryText}>Show large</Text>
          </TouchableOpacity>
        ) : null}
        {onShare ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionAccent]}
            activeOpacity={0.85}
            onPress={onShare}
            testID="qr-share-btn"
          >
            <Share2 size={16} color="#fff" />
            <Text style={styles.actionPrimaryText}>Share QR</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default React.memo(BusinessQRCardComponent);

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
    ...Platform.select({
      ios: {
        shadowColor: INDIGO,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 18,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  topStripe: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  stripeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stripeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  stripeBrand: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
  },
  qrFrame: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#ECEEF8',
  },
  logoCenterWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#fff',
  },
  logoCenter: {
    width: '100%',
    height: '100%',
  },
  dashedDivider: {
    width: '90%',
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D7DBED',
    marginTop: 16,
    marginBottom: 12,
  },
  bizName: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  catChip: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#ECEEF8',
    borderRadius: 999,
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: INDIGO,
    letterSpacing: 0.2,
  },
  caption: {
    marginTop: 10,
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 999,
  },
  actionPrimary: {
    backgroundColor: INDIGO,
  },
  actionAccent: {
    backgroundColor: ACCENT,
  },
  actionPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
