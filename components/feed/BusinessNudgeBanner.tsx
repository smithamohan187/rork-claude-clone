import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  onDismiss: () => void;
  onSetUpPress: () => void;
}

const APP_PRIMARY_GREEN = '#1A5C35';

export const BusinessNudgeBanner: React.FC<Props> = ({ onDismiss, onSetUpPress }) => {
  return (
    <View style={styles.container}>
      {/* Icon */}
      <MaterialCommunityIcons
        name="store-outline"
        size={26}
        color={APP_PRIMARY_GREEN}
        style={styles.icon}
      />

      {/* Text + CTA */}
      <View style={styles.textWrap}>
        <Text style={styles.heading}>Are you a business owner?</Text>
        <TouchableOpacity onPress={onSetUpPress}>
          <Text style={styles.cta}>Set up your business profile →</Text>
        </TouchableOpacity>
      </View>

      {/* Dismiss X */}
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <MaterialCommunityIcons name="close" size={18} color="#999" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FAF2',
    borderLeftWidth: 4,
    borderLeftColor: APP_PRIMARY_GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  icon: {
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  cta: {
    fontSize: 12,
    color: APP_PRIMARY_GREEN,
    fontWeight: '600' as const,
  },
  dismissBtn: {
    paddingLeft: 8,
  },
});
