import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Animated,
  Platform,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Surface, Card, DataTable } from 'react-native-paper';
import Svg, { Rect, Circle, Path, G, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Download,
  Users,
  Eye,
  Zap,
  Gift,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Trophy,
} from 'lucide-react-native';

const PURPLE = '#1A5C35';
const PURPLE_DARK = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const INK = '#1A1730';
const MUTED = '#E8F5EE';
const BORDER = '#EFECF6';
const TEAL = '#0D9488';
const GOLD = '#E5A100';
const CORAL = '#EF5A6F';
const GREEN = '#22C55E';
const RED = '#EF4444';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Range = '7d' | '30d' | '90d';

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
];

interface Metric {
  key: string;
  label: string;
  value: number;
  prevValue: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  format?: (n: number) => string;
}

interface TopOffer {
  id: string;
  name: string;
  views: number;
  shares: number;
  redemptions: number;
}

function seed(n: number): number {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function buildSeries(days: number, base: number, variance: number, offset: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    const noise = seed(i + offset) * variance;
    const trend = (i / days) * variance * 0.5;
    out.push(Math.max(0, Math.round(base + noise + trend)));
  }
  return out;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function useAnalyticsData(range: Range) {
  return useMemo(() => {
    const days = RANGES.find(r => r.key === range)?.days ?? 30;

    const subscribersSeries = buildSeries(days, 6, 10, 1);
    const prevSubscribersSeries = buildSeries(days, 5, 8, 100);

    const viewsSeries = buildSeries(days, 120, 80, 2);
    const prevViewsSeries = buildSeries(days, 110, 70, 200);

    const pointsSeries = buildSeries(days, 400, 300, 3);
    const prevPointsSeries = buildSeries(days, 380, 250, 300);

    const redemptionsSeries = buildSeries(days, 4, 6, 4);
    const prevRedemptionsSeries = buildSeries(days, 3, 5, 400);

    const metrics: Metric[] = [
      {
        key: 'subs',
        label: 'New Subscribers',
        value: sum(subscribersSeries),
        prevValue: sum(prevSubscribersSeries),
        icon: Users,
        color: PURPLE,
      },
      {
        key: 'views',
        label: 'Offers Viewed',
        value: sum(viewsSeries),
        prevValue: sum(prevViewsSeries),
        icon: Eye,
        color: TEAL,
      },
      {
        key: 'points',
        label: 'Points Awarded',
        value: sum(pointsSeries),
        prevValue: sum(prevPointsSeries),
        icon: Zap,
        color: GOLD,
      },
      {
        key: 'redemptions',
        label: 'Coupons Redeemed',
        value: sum(redemptionsSeries),
        prevValue: sum(prevRedemptionsSeries),
        icon: Gift,
        color: CORAL,
      },
    ];

    const pointsBreakdown = [
      { key: 'welcome', label: 'Welcome', value: Math.round(sum(pointsSeries) * 0.35), color: PURPLE },
      { key: 'referral', label: 'Referral', value: Math.round(sum(pointsSeries) * 0.28), color: TEAL },
      { key: 'sharing', label: 'Sharing', value: Math.round(sum(pointsSeries) * 0.2), color: GOLD },
      { key: 'purchase', label: 'Purchase', value: Math.round(sum(pointsSeries) * 0.17), color: CORAL },
    ];

    const topOffers: TopOffer[] = [
      { id: '1', name: '20% Off First Order', views: 1420, shares: 186, redemptions: 94 },
      { id: '2', name: 'Free Coffee Friday', views: 1180, shares: 142, redemptions: 78 },
      { id: '3', name: 'Buy 1 Get 1 Pastry', views: 940, shares: 98, redemptions: 61 },
      { id: '4', name: 'Happy Hour 4-6 PM', views: 760, shares: 64, redemptions: 42 },
      { id: '5', name: 'Loyalty Member Perk', views: 520, shares: 41, redemptions: 28 },
    ].sort((a, b) => b.redemptions - a.redemptions);

    return {
      days,
      subscribersSeries,
      redemptionsSeries,
      metrics,
      pointsBreakdown,
      topOffers,
    };
  }, [range]);
}

export default function BusinessAnalyticsScreen() {
  const router = useRouter();
  const [range, setRange] = useState<Range>('30d');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const data = useAnalyticsData(range);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    chartAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      Animated.timing(chartAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
    ]).start();
  }, [range, fadeAnim, slideAnim, chartAnim]);

  const handleRangePress = useCallback(
    (r: Range) => {
      if (r === range) return;
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      setRange(r);
      console.log('[Analytics] Range changed:', r);
    },
    [range],
  );

  const handleExport = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert(
      'Export Coming Soon',
      'We\'re polishing up CSV and PDF exports for your analytics. Check back soon!',
      [{ text: 'Got it' }],
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => {
      setRefreshing(false);
      fadeAnim.setValue(0);
      slideAnim.setValue(12);
      chartAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(chartAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
      ]).start();
    }, 600);
  }, [fadeAnim, slideAnim, chartAnim]);

  return (
    <View style={styles.root} testID="business-analytics-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
            hitSlop={12}
            testID="analytics-back"
          >
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Track your growth</Text>
          </View>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={handleExport}
            hitSlop={12}
            testID="analytics-export"
          >
            <Download size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={PURPLE}
            colors={[PURPLE]}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.rangeRow}>
            {RANGES.map((r) => {
              const isActive = r.key === range;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => handleRangePress(r.key)}
                  style={[styles.rangeChip, isActive && styles.rangeChipActive]}
                  testID={`range-chip-${r.key}`}
                >
                  <Text style={[styles.rangeChipText, isActive && styles.rangeChipTextActive]}>
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.metricsGrid}>
            {data.metrics.map((m) => (
              <MetricCard key={m.key} metric={m} />
            ))}
          </View>

          <Surface style={styles.card} elevation={0}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: PURPLE_LIGHT }]}>
                <BarChart3 size={16} color={PURPLE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Subscriber Growth</Text>
                <Text style={styles.cardSubtitle}>
                  {sum(data.subscribersSeries)} new subscribers over last {data.days} days
                </Text>
              </View>
            </View>
            <BarChart series={data.subscribersSeries} progress={chartAnim} />
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFF4E0' }]}>
                <PieIcon size={16} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Points Breakdown</Text>
                <Text style={styles.cardSubtitle}>How subscribers are earning</Text>
              </View>
            </View>
            <View style={styles.donutRow}>
              <DonutChart data={data.pointsBreakdown} progress={chartAnim} />
              <View style={styles.legend}>
                {data.pointsBreakdown.map((seg) => {
                  const total = data.pointsBreakdown.reduce((a, b) => a + b.value, 0);
                  const pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
                  return (
                    <View key={seg.key} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.legendLabel}>{seg.label}</Text>
                        <Text style={styles.legendValue}>{formatNum(seg.value)} pts</Text>
                      </View>
                      <Text style={styles.legendPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFEEF0' }]}>
                <Trophy size={16} color={CORAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Top Offers</Text>
                <Text style={styles.cardSubtitle}>Ranked by redemptions</Text>
              </View>
            </View>
            <DataTable style={styles.dataTable}>
              <DataTable.Header style={styles.dtHeader}>
                <DataTable.Title textStyle={styles.dtHeaderText} style={styles.dtColName}>
                  Offer
                </DataTable.Title>
                <DataTable.Title numeric textStyle={styles.dtHeaderText}>
                  Views
                </DataTable.Title>
                <DataTable.Title numeric textStyle={styles.dtHeaderText}>
                  Shares
                </DataTable.Title>
                <DataTable.Title numeric textStyle={styles.dtHeaderText}>
                  Redeem
                </DataTable.Title>
              </DataTable.Header>
              {data.topOffers.map((o, i) => (
                <DataTable.Row key={o.id} style={[styles.dtRow, i === data.topOffers.length - 1 && styles.dtRowLast]}>
                  <DataTable.Cell textStyle={styles.dtCellName} style={styles.dtColName}>
                    <View style={styles.offerNameWrap}>
                      <View style={[styles.offerRank, i === 0 && styles.offerRankTop]}>
                        <Text style={[styles.offerRankText, i === 0 && styles.offerRankTextTop]}>
                          {i + 1}
                        </Text>
                      </View>
                      <Text style={styles.offerName} numberOfLines={1}>
                        {o.name}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell numeric textStyle={styles.dtCell}>
                    {formatNum(o.views)}
                  </DataTable.Cell>
                  <DataTable.Cell numeric textStyle={styles.dtCell}>
                    {o.shares}
                  </DataTable.Cell>
                  <DataTable.Cell numeric textStyle={[styles.dtCell, styles.dtCellAccent]}>
                    {o.redemptions}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          </Surface>

          <Surface style={styles.card} elevation={0}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#E6F7F3' }]}>
                <Activity size={16} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Redemption Trend</Text>
                <Text style={styles.cardSubtitle}>
                  {sum(data.redemptionsSeries)} redemptions · last {data.days} days
                </Text>
              </View>
            </View>
            <LineChart series={data.redemptionsSeries} progress={chartAnim} />
          </Surface>

          <View style={styles.footerNote}>
            <Sparkles size={12} color={MUTED} />
            <Text style={styles.footerText}>Data updates hourly</Text>
          </View>
          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const delta = metric.prevValue > 0 ? ((metric.value - metric.prevValue) / metric.prevValue) * 100 : 0;
  const isUp = delta >= 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <Card style={styles.metricCard} mode="elevated" elevation={0}>
      <View style={[styles.metricIconWrap, { backgroundColor: metric.color + '15' }]}>
        <Icon size={16} color={metric.color} />
      </View>
      <Text style={styles.metricValue}>{formatNum(metric.value)}</Text>
      <Text style={styles.metricLabel} numberOfLines={1}>
        {metric.label}
      </Text>
      <View style={[styles.trendPill, { backgroundColor: (isUp ? GREEN : RED) + '15' }]}>
        <TrendIcon size={10} color={isUp ? GREEN : RED} />
        <Text style={[styles.trendText, { color: isUp ? GREEN : RED }]}>
          {Math.abs(delta).toFixed(1)}%
        </Text>
      </View>
    </Card>
  );
}

function BarChart({ series, progress }: { series: number[]; progress: Animated.Value }) {
  const width = SCREEN_WIDTH - 64;
  const height = 160;
  const max = Math.max(...series, 1);
  const paddingV = 16;
  const paddingH = 4;

  const maxBars = 30;
  const step = Math.max(1, Math.ceil(series.length / maxBars));
  const bars = series.filter((_, i) => i % step === 0);
  const barSpacing = 3;
  const barWidth = Math.max(4, (width - paddingH * 2 - barSpacing * (bars.length - 1)) / bars.length);

  const [animValue, setAnimValue] = useState<number>(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress]);

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={PURPLE} stopOpacity="1" />
            <Stop offset="1" stopColor={PURPLE} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <Line
            key={i}
            x1={0}
            y1={paddingV + (height - paddingV * 2) * (1 - ratio)}
            x2={width}
            y2={paddingV + (height - paddingV * 2) * (1 - ratio)}
            stroke={BORDER}
            strokeWidth={1}
            strokeDasharray="3,4"
          />
        ))}
        {bars.map((v, i) => {
          const fullH = (v / max) * (height - paddingV * 2);
          const h = fullH * animValue;
          const x = paddingH + i * (barWidth + barSpacing);
          const y = height - paddingV - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              rx={3}
              fill="url(#barGrad)"
            />
          );
        })}
      </Svg>
    </View>
  );
}

function DonutChart({
  data,
  progress,
}: {
  data: { key: string; label: string; value: number; color: string }[];
  progress: Animated.Value;
}) {
  const size = 140;
  const radius = 60;
  const strokeWidth = 22;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((a, b) => a + b.value, 0);

  const [animValue, setAnimValue] = useState<number>(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress]);

  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={PURPLE_FAINT}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <G transform={`translate(${cx} ${cy}) rotate(-90) translate(${-cx} ${-cy})`}>
        {data.map((seg) => {
          const pct = total > 0 ? seg.value / total : 0;
          const length = pct * circumference * animValue;
          const dash = `${length} ${circumference}`;
          const circle = (
            <Circle
              key={seg.key}
              cx={cx}
              cy={cy}
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={dash}
              strokeDashoffset={-offset * animValue}
              strokeLinecap="butt"
            />
          );
          offset += pct * circumference;
          return circle;
        })}
      </G>
      <SvgText
        x={cx}
        y={cy - 2}
        fontSize="18"
        fontWeight="700"
        fill={INK}
        textAnchor="middle"
      >
        {formatNum(total)}
      </SvgText>
      <SvgText
        x={cx}
        y={cy + 14}
        fontSize="10"
        fill={MUTED}
        textAnchor="middle"
      >
        total pts
      </SvgText>
    </Svg>
  );
}

function LineChart({ series, progress }: { series: number[]; progress: Animated.Value }) {
  const width = SCREEN_WIDTH - 64;
  const height = 160;
  const paddingV = 20;
  const paddingH = 8;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);

  const maxPoints = 40;
  const step = Math.max(1, Math.ceil(series.length / maxPoints));
  const points = series.filter((_, i) => i % step === 0);

  const [animValue, setAnimValue] = useState<number>(0);
  useEffect(() => {
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress]);

  const stepX = (width - paddingH * 2) / Math.max(1, points.length - 1);
  const getY = (v: number) => {
    const norm = (v - min) / Math.max(1, max - min);
    return paddingV + (1 - norm) * (height - paddingV * 2);
  };

  const visibleCount = Math.max(2, Math.round(points.length * animValue));
  const visible = points.slice(0, visibleCount);

  const pathD = visible
    .map((v, i) => {
      const x = paddingH + i * stepX;
      const y = getY(v);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const lastX = paddingH + (visible.length - 1) * stepX;
  const areaD = `${pathD} L ${lastX} ${height - paddingV} L ${paddingH} ${height - paddingV} Z`;

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={TEAL} stopOpacity="0.28" />
            <Stop offset="1" stopColor={TEAL} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <Line
            key={i}
            x1={0}
            y1={paddingV + (height - paddingV * 2) * (1 - ratio)}
            x2={width}
            y2={paddingV + (height - paddingV * 2) * (1 - ratio)}
            stroke={BORDER}
            strokeWidth={1}
            strokeDasharray="3,4"
          />
        ))}
        <Path d={areaD} fill="url(#lineGrad)" />
        <Path d={pathD} stroke={TEAL} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {visible.length > 0 && (
          <Circle
            cx={lastX}
            cy={getY(visible[visible.length - 1])}
            r={5}
            fill="#fff"
            stroke={TEAL}
            strokeWidth={2.5}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F5FB' },
  safeTop: { backgroundColor: PURPLE_DARK },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: PURPLE_DARK,
    gap: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },

  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rangeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  rangeChipActive: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
    shadowColor: PURPLE,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  rangeChipText: { fontSize: 13, fontWeight: '600', color: INK },
  rangeChipTextActive: { color: '#fff' },

  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: { fontSize: 22, fontWeight: '800', color: INK, letterSpacing: -0.3 },
  metricLabel: { fontSize: 12, color: MUTED, marginTop: 2 },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
  },
  trendText: { fontSize: 10, fontWeight: '700' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: INK },
  cardSubtitle: { fontSize: 11.5, color: MUTED, marginTop: 1 },

  chartWrap: { alignItems: 'center', marginTop: 4 },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: INK, fontWeight: '600' },
  legendValue: { fontSize: 10.5, color: MUTED, marginTop: 1 },
  legendPct: { fontSize: 12, fontWeight: '700', color: INK },

  dataTable: { backgroundColor: 'transparent' },
  dtHeader: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 0,
    height: 36,
  },
  dtHeaderText: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 },
  dtRow: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingHorizontal: 0,
    minHeight: 48,
  },
  dtRowLast: { borderBottomWidth: 0 },
  dtColName: { flex: 2.2 },
  dtCell: { fontSize: 13, color: INK, fontWeight: '600' },
  dtCellAccent: { color: PURPLE, fontWeight: '800' },
  dtCellName: { fontSize: 13, color: INK, fontWeight: '600' },
  offerNameWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  offerRank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PURPLE_FAINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerRankTop: { backgroundColor: PURPLE },
  offerRankText: { fontSize: 11, fontWeight: '800', color: PURPLE },
  offerRankTextTop: { color: '#fff' },
  offerName: { fontSize: 13, color: INK, fontWeight: '600', flex: 1 },

  footerNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  footerText: { fontSize: 11, color: MUTED },
});
