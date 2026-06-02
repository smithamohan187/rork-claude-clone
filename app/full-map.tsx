import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  FlatList,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MapPin, Store, Navigation, Footprints, Minus, Plus, ChevronDown, Crosshair, Search, X, Check, Compass } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { businessLocations, neighborhoods, searchableLocations } from '@/mocks/data';
import type { BusinessLocation, SearchableLocation } from '@/mocks/data';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const RADIUS_OPTIONS = [1, 2, 5, 10, 20, 50];

const PIN_POSITIONS: { top: `${number}%`; left: `${number}%` }[] = [
  { top: '12%', left: '15%' },
  { top: '50%', left: '72%' },
  { top: '20%', left: '68%' },
  { top: '70%', left: '22%' },
  { top: '32%', left: '52%' },
  { top: '62%', left: '48%' },
  { top: '15%', left: '40%' },
  { top: '75%', left: '62%' },
  { top: '42%', left: '12%' },
  { top: '8%', left: '58%' },
  { top: '58%', left: '35%' },
  { top: '28%', left: '25%' },
];

export default function FullMapScreen() {
  const router = useRouter();
  const [searchRadius, setSearchRadius] = useState<number>(5);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('all');
  const [currentLocation, setCurrentLocation] = useState<SearchableLocation>(searchableLocations[0]);
  const [locationModalVisible, setLocationModalVisible] = useState<boolean>(false);
  const [locationSearch, setLocationSearch] = useState<string>('');
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessLocation | null>(null);

  const nearbyBusinesses = useMemo(() => {
    let filtered = businessLocations.filter(b => b.distanceMiles <= searchRadius);
    if (selectedNeighborhood !== 'all') {
      const hoodName = neighborhoods.find(n => n.id === selectedNeighborhood)?.name;
      filtered = filtered.filter(b => b.neighborhood === hoodName);
    }
    return filtered.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }, [selectedNeighborhood, searchRadius]);

  const filteredSearchLocations = useMemo(() => {
    if (!locationSearch.trim()) return searchableLocations;
    const q = locationSearch.toLowerCase().trim();
    return searchableLocations.filter(l => l.name.toLowerCase().includes(q) || l.subtitle.toLowerCase().includes(q));
  }, [locationSearch]);

  const radiusPercent = useMemo(() => {
    const maxR = RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1];
    const fraction = searchRadius / maxR;
    return Math.max(20, Math.min(90, fraction * 90));
  }, [searchRadius]);

  const decreaseRadius = useCallback(() => {
    const idx = RADIUS_OPTIONS.indexOf(searchRadius);
    if (idx > 0) setSearchRadius(RADIUS_OPTIONS[idx - 1]);
  }, [searchRadius]);

  const increaseRadius = useCallback(() => {
    const idx = RADIUS_OPTIONS.indexOf(searchRadius);
    if (idx < RADIUS_OPTIONS.length - 1) setSearchRadius(RADIUS_OPTIONS[idx + 1]);
  }, [searchRadius]);

  const selectLocation = useCallback((loc: SearchableLocation) => {
    setCurrentLocation(loc);
    setLocationModalVisible(false);
    setLocationSearch('');
    console.log('Full map: Location changed to:', loc.name);
  }, []);

  const useCurrentLocation = useCallback(() => {
    setCurrentLocation(searchableLocations[0]);
    setLocationModalVisible(false);
    setLocationSearch('');
  }, []);

  const onBusinessPress = useCallback((biz: BusinessLocation) => {
    setSelectedBusiness(prev => prev?.id === biz.id ? null : biz);
  }, []);

  const navigateToBusiness = useCallback((businessId: string) => {
    router.push(`/business/${businessId}` as never);
  }, [router]);

  return (
    <View style={s.root}>
      <View style={s.mapArea}>
        <View style={s.mapBg}>
          <View style={s.mapGrid}>
            {[0, 1, 2, 3, 4, 5, 6].map((row) => (
              <View key={`row-${row}`} style={s.mapGridRow}>
                {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                  <View key={`cell-${row}-${col}`} style={[s.mapGridCell, (row + col) % 3 === 0 && s.mapGridCellAlt]} />
                ))}
              </View>
            ))}
          </View>

          <View style={[s.mapPark, { top: '6%', left: '65%', width: 70, height: 55 }]} />
          <View style={[s.mapPark, { top: '55%', left: '5%', width: 55, height: 45 }]} />
          <View style={[s.mapParkSmall, { top: '18%', left: '85%', width: 35, height: 28 }]} />
          <View style={[s.mapParkSmall, { top: '78%', left: '75%', width: 40, height: 30 }]} />

          <View style={[s.mapWater, { top: '72%', left: '50%', width: 90, height: 35 }]} />
          <View style={[s.mapWaterSmall, { top: '78%', left: '42%', width: 30, height: 20 }]} />
          <View style={[s.mapWater, { top: '3%', left: '8%', width: 50, height: 25 }]} />

          <View style={[s.mapBlock, { top: '12%', left: '10%', width: 55, height: 40 }]} />
          <View style={[s.mapBlock, { top: '35%', left: '48%', width: 45, height: 32 }]} />
          <View style={[s.mapBlockAlt, { top: '65%', left: '28%', width: 50, height: 30 }]} />
          <View style={[s.mapBlockAlt, { top: '10%', left: '40%', width: 38, height: 26 }]} />
          <View style={[s.mapBlock, { top: '45%', left: '78%', width: 42, height: 28 }]} />
          <View style={[s.mapBlockAlt, { top: '85%', left: '15%', width: 48, height: 24 }]} />

          <View style={s.mapOverlay} />

          <View style={[s.streetMain, { top: '25%', left: '3%', width: '94%', height: 3.5 }]} />
          <View style={[s.streetMain, { top: '50%', left: '0%', width: '100%', height: 3.5 }]} />
          <View style={[s.streetMain, { top: '75%', left: '5%', width: '90%', height: 3.5 }]} />
          <View style={[s.streetMain, { top: '0%', left: '30%', width: 3.5, height: '100%' }]} />
          <View style={[s.streetMain, { top: '0%', left: '60%', width: 3.5, height: '100%' }]} />

          <View style={[s.street, { top: '15%', left: '8%', width: '55%', height: 2 }]} />
          <View style={[s.street, { top: '38%', left: '18%', width: '70%', height: 2 }]} />
          <View style={[s.street, { top: '62%', left: '3%', width: '50%', height: 2 }]} />
          <View style={[s.street, { top: '85%', left: '12%', width: '80%', height: 2 }]} />
          <View style={[s.street, { top: '5%', left: '18%', width: 2, height: '50%' }]} />
          <View style={[s.street, { top: '8%', left: '45%', width: 2, height: '45%' }]} />
          <View style={[s.street, { top: '35%', left: '78%', width: 2, height: '55%' }]} />
          <View style={[s.street, { top: '55%', left: '88%', width: 2, height: '35%' }]} />
          <View style={[s.streetDiag, { top: '30%', left: '38%', width: '45%', height: 2, transform: [{ rotate: '25deg' }] }]} />
          <View style={[s.streetDiag, { top: '60%', left: '10%', width: '35%', height: 2, transform: [{ rotate: '-15deg' }] }]} />

          <View style={[s.radiusCircle, { width: `${radiusPercent}%`, height: `${radiusPercent * 1.1}%`, top: `${50 - (radiusPercent * 1.1) / 2}%`, left: `${50 - radiusPercent / 2}%` }]} />

          <View style={[s.userDot, { top: '46%', left: '46%' }]}>
            <View style={s.userPulse} />
            <View style={s.userCenter} />
          </View>

          {nearbyBusinesses.slice(0, 12).map((biz, idx) => {
            const pos = PIN_POSITIONS[idx % PIN_POSITIONS.length];
            const isHighlighted = selectedNeighborhood !== 'all' && neighborhoods.find(n => n.id === selectedNeighborhood)?.name === biz.neighborhood;
            const isSelected = selectedBusiness?.id === biz.id;
            return (
              <Pressable key={biz.id} style={[s.mapPin, { top: pos.top, left: pos.left }]} onPress={() => onBusinessPress(biz)}>
                <View style={[s.mapPinHead, isHighlighted && { backgroundColor: '#EF4444', transform: [{ scale: 1.3 }] }, isSelected && { backgroundColor: '#0EA5E9', transform: [{ scale: 1.4 }] }]}>
                  <Store size={10} color="#fff" />
                </View>
                <View style={[s.mapPinLabel, isSelected && { backgroundColor: '#0EA5E9' }]}>
                  <Text style={[s.mapPinName, isSelected && { color: '#fff' }]} numberOfLines={1}>{biz.name.split(' ')[0]}</Text>
                  <Text style={[s.mapPinDist, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>{biz.distance}</Text>
                </View>
              </Pressable>
            );
          })}

          <View style={s.radiusLabel}>
            <Text style={s.radiusLabelText}>{searchRadius} mi radius</Text>
          </View>
        </View>

        <SafeAreaView style={s.topBar} edges={['top']}>
          <Pressable style={s.backBtn} onPress={() => router.back()} testID="full-map-back-btn">
            <ArrowLeft size={20} color={Colors.text} />
          </Pressable>
          <View style={s.topBarTitle}>
            <Compass size={16} color="#0EA5E9" />
            <Text style={s.topBarTitleText}>Hyperlocal Map</Text>
          </View>
          <View style={{ width: 40 }} />
        </SafeAreaView>

        {selectedBusiness && (
          <View style={s.selectedCard}>
            <Pressable style={s.selectedCardContent} onPress={() => navigateToBusiness(selectedBusiness.businessId)}>
              <View style={s.selectedCardLeft}>
                <View style={s.selectedCardIcon}>
                  <Store size={18} color={Colors.navyDark} />
                </View>
                <View style={s.selectedCardInfo}>
                  <Text style={s.selectedCardName}>{selectedBusiness.name}</Text>
                  <Text style={s.selectedCardHood}>{selectedBusiness.neighborhood}</Text>
                  <View style={s.selectedCardMeta}>
                    <Navigation size={10} color="#10B981" />
                    <Text style={s.selectedCardDist}>{selectedBusiness.distance}</Text>
                    <Footprints size={10} color={Colors.textTertiary} />
                    <Text style={s.selectedCardDist}>{selectedBusiness.walkTime}</Text>
                    {selectedBusiness.openNow && (
                      <View style={s.openDot}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' }} />
                        <Text style={s.openText}>Open</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={s.selectedCardArrow}>
                <Text style={s.selectedCardArrowText}>View</Text>
              </View>
            </Pressable>
            <Pressable style={s.selectedCardClose} onPress={() => setSelectedBusiness(null)}>
              <X size={14} color={Colors.textTertiary} />
            </Pressable>
          </View>
        )}
      </View>

      <View style={s.controls}>
        <Pressable style={s.locationBar} onPress={() => setLocationModalVisible(true)}>
          <View style={s.locationBarLeft}>
            <View style={s.locationBarIcon}>
              <MapPin size={14} color="#0EA5E9" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.locationBarLabel}>Search area</Text>
              <Text style={s.locationBarValue} numberOfLines={1}>{currentLocation.name}, {currentLocation.subtitle}</Text>
            </View>
          </View>
          <ChevronDown size={16} color={Colors.textSecondary} />
        </Pressable>

        <View style={s.radiusRow}>
          <Text style={s.radiusRowLabel}>Radius</Text>
          <View style={s.radiusChips}>
            <Pressable onPress={decreaseRadius} style={[s.radiusBtn, searchRadius === RADIUS_OPTIONS[0] && { opacity: 0.4 }]} hitSlop={8}>
              <Minus size={12} color={Colors.navyDark} />
            </Pressable>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable key={r} style={[s.radiusChip, r === searchRadius && s.radiusChipActive]} onPress={() => setSearchRadius(r)}>
                <Text style={[s.radiusChipText, r === searchRadius && s.radiusChipTextActive]}>{r}</Text>
              </Pressable>
            ))}
            <Pressable onPress={increaseRadius} style={[s.radiusBtn, searchRadius === RADIUS_OPTIONS[RADIUS_OPTIONS.length - 1] && { opacity: 0.4 }]} hitSlop={8}>
              <Plus size={12} color={Colors.navyDark} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hoodScroll}>
          <Pressable style={[s.hoodPill, selectedNeighborhood === 'all' && s.hoodPillActive]} onPress={() => setSelectedNeighborhood('all')}>
            <MapPin size={11} color={selectedNeighborhood === 'all' ? '#fff' : Colors.textSecondary} />
            <Text style={[s.hoodPillText, selectedNeighborhood === 'all' && s.hoodPillTextActive]}>All</Text>
          </Pressable>
          {neighborhoods.map((n) => (
            <Pressable key={n.id} style={[s.hoodPill, selectedNeighborhood === n.id && s.hoodPillActive]} onPress={() => setSelectedNeighborhood(n.id)}>
              <View style={[s.hoodDot, { backgroundColor: n.color }]} />
              <Text style={[s.hoodPillText, selectedNeighborhood === n.id && s.hoodPillTextActive]}>{n.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.bizScroll}>
          {nearbyBusinesses.map((biz) => (
            <Pressable key={biz.id} style={[s.bizCard, selectedBusiness?.id === biz.id && s.bizCardActive]} onPress={() => { onBusinessPress(biz); }}>
              <View style={s.bizCardTop}>
                <View style={s.bizCardIcon}>
                  <Store size={12} color={Colors.navyDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.bizCardName} numberOfLines={1}>{biz.name}</Text>
                  <Text style={s.bizCardHood}>{biz.neighborhood}</Text>
                </View>
              </View>
              <View style={s.bizCardMeta}>
                <Navigation size={8} color="#10B981" />
                <Text style={s.bizCardMetaText}>{biz.distance}</Text>
                {biz.openNow && <Text style={s.bizCardOpen}>Open</Text>}
              </View>
            </Pressable>
          ))}
          {nearbyBusinesses.length === 0 && (
            <View style={s.emptyBiz}>
              <MapPin size={16} color={Colors.textTertiary} />
              <Text style={s.emptyBizText}>No businesses in range</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={locationModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setLocationModalVisible(false)}>
        <View style={s.locModalOverlay}>
          <Pressable style={s.locModalBackdrop} onPress={() => setLocationModalVisible(false)} />
          <View style={s.locModalSheet}>
            <View style={s.locModalHandle} />
            <View style={s.locModalHeader}>
              <Text style={s.locModalTitle}>Search area</Text>
              <Pressable onPress={() => setLocationModalVisible(false)} hitSlop={12}>
                <X size={22} color={Colors.text} />
              </Pressable>
            </View>
            <Pressable style={s.locCurrentBtn} onPress={useCurrentLocation}>
              <View style={s.locCurrentIcon}>
                <Crosshair size={18} color="#0EA5E9" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.locCurrentText}>Use current location</Text>
                <Text style={s.locCurrentSub}>Brooklyn Heights, Brooklyn, NY</Text>
              </View>
              {currentLocation.id === 'sl1' && <Check size={18} color="#0EA5E9" />}
            </Pressable>
            <View style={s.locSearchRow}>
              <Search size={16} color={Colors.textTertiary} />
              <TextInput
                style={s.locSearchInput}
                placeholder="Search for a location..."
                placeholderTextColor={Colors.textTertiary}
                value={locationSearch}
                onChangeText={setLocationSearch}
                autoFocus
              />
              {locationSearch.length > 0 && (
                <Pressable onPress={() => setLocationSearch('')} hitSlop={8}>
                  <X size={14} color={Colors.textTertiary} />
                </Pressable>
              )}
            </View>
            <FlatList
              data={filteredSearchLocations}
              keyExtractor={(item) => item.id}
              style={s.locList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = currentLocation.id === item.id;
                return (
                  <Pressable style={[s.locItem, isSelected && s.locItemActive]} onPress={() => selectLocation(item)}>
                    <View style={[s.locItemIcon, isSelected && { backgroundColor: '#E0F2FE' }]}>
                      <MapPin size={14} color={isSelected ? '#0EA5E9' : Colors.textTertiary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.locItemName, isSelected && { color: '#0EA5E9' }]}>{item.name}</Text>
                      <Text style={s.locItemSub}>{item.subtitle}</Text>
                    </View>
                    {isSelected && <Check size={16} color="#0EA5E9" />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={s.locEmpty}>
                  <Text style={s.locEmptyText}>No locations found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapArea: {
    flex: 1,
    position: 'relative' as const,
  },
  mapBg: {
    flex: 1,
    backgroundColor: '#F0F7EE',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  mapGrid: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapGridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mapGridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(160,190,160,0.15)',
  },
  mapGridCellAlt: {
    backgroundColor: 'rgba(200,220,195,0.2)',
  },
  mapPark: {
    position: 'absolute' as const,
    borderRadius: 14,
    backgroundColor: 'rgba(74,172,80,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(74,172,80,0.15)',
  },
  mapParkSmall: {
    position: 'absolute' as const,
    borderRadius: 10,
    backgroundColor: 'rgba(74,172,80,0.18)',
  },
  mapWater: {
    position: 'absolute' as const,
    borderRadius: 16,
    backgroundColor: 'rgba(56,152,216,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(56,152,216,0.12)',
  },
  mapWaterSmall: {
    position: 'absolute' as const,
    borderRadius: 10,
    backgroundColor: 'rgba(56,152,216,0.15)',
  },
  mapBlock: {
    position: 'absolute' as const,
    borderRadius: 6,
    backgroundColor: 'rgba(220,210,195,0.35)',
  },
  mapBlockAlt: {
    position: 'absolute' as const,
    borderRadius: 6,
    backgroundColor: 'rgba(210,200,185,0.3)',
  },
  mapOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245,250,242,0.1)',
  },
  streetMain: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
  },
  street: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 1,
  },
  streetDiag: {
    position: 'absolute' as const,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 1,
  },
  radiusCircle: {
    position: 'absolute' as const,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(59,130,246,0.3)',
    backgroundColor: 'rgba(59,130,246,0.05)',
    borderStyle: 'dashed' as const,
  },
  userDot: {
    position: 'absolute' as const,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPulse: {
    position: 'absolute' as const,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59,130,246,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.1)',
  },
  userCenter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3B82F6',
    borderWidth: 3.5,
    borderColor: '#fff',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  mapPin: {
    position: 'absolute' as const,
    alignItems: 'center',
  },
  mapPinHead: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E74C3C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  mapPinLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mapPinName: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  mapPinDist: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  radiusLabel: {
    position: 'absolute' as const,
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  radiusLabelText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#0369A1',
  },
  topBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topBarTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topBarTitleText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  selectedCard: {
    position: 'absolute' as const,
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  selectedCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  selectedCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCardInfo: {
    flex: 1,
  },
  selectedCardName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  selectedCardHood: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  selectedCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  selectedCardDist: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  openDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  openText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  selectedCardArrow: {
    backgroundColor: Colors.navyDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  selectedCardArrowText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#fff',
  },
  selectedCardClose: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  locationBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  locationBarIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBarLabel: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  locationBarValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 1,
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  radiusRowLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  radiusChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  radiusBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
  },
  radiusChipActive: {
    backgroundColor: Colors.navyDark,
  },
  radiusChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  radiusChipTextActive: {
    color: '#fff',
  },
  hoodScroll: {
    paddingHorizontal: 16,
    gap: 6,
    paddingBottom: 8,
  },
  hoodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    gap: 4,
  },
  hoodPillActive: {
    backgroundColor: Colors.navyDark,
  },
  hoodPillText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  hoodPillTextActive: {
    color: '#fff',
  },
  hoodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  bizScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingTop: 2,
  },
  bizCard: {
    width: 140,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    gap: 5,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  bizCardActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#F0F9FF',
  },
  bizCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  bizCardIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizCardName: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  bizCardHood: {
    fontSize: 9,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  bizCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bizCardMetaText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
  },
  bizCardOpen: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#10B981',
    marginLeft: 'auto',
  },
  emptyBiz: {
    width: 200,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyBizText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
  locModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  locModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  locModalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  locModalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  locModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  locModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  locCurrentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  locCurrentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locCurrentText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  locCurrentSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  locSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 10,
    gap: 8,
  },
  locSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    padding: 0,
  },
  locList: {
    maxHeight: 300,
  },
  locItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  locItemActive: {
    backgroundColor: '#F0F9FF',
  },
  locItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locItemName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  locItemSub: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  locEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  locEmptyText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
  },
});

