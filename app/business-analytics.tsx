import React, { useCallback, useRef, useState, useEffect } from 'react';
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
  ActivityIndicator,
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
  Share2,
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
import { useBusinessAnalytics, type Range } from '@/hooks/useBusinessAnalytics';
import { exportAnalyticsCsv, exportAnalyticsPdf } from '@/utils/analyticsExport';

const PURPLE = '#1A5C35';
const PURPLE_DARK = '#1A5C35';
const PURPLE_LIGHT = '#EDE9F6';
const PURPLE_FAINT = '#F7F6FB';
const INK = '#1A1730';
const MUTED = '#6B7280';
const BORDER = '#EFECF6';
const TEAL = '#0D9488';
const GOLD = '#E5A100';
const CORAL = '#EF5A6F';
const GREEN = '#22C55E';
const RED = '#EF4444';

const SCREEN_WIDTH = Dimensions.get('window').width;

const RANGES: { key: Range; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
];

interface Metric {
  key: string;
  label: string;
  value: number;
  changePct: number;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

const BREAKDOWN_COLORS = [PURPLE, TEAL, GOLD, CORAL];

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Picks up to `count` evenly spaced indices from [0, length-1], always including the first and last.
function evenIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length <= count) return Array.from({ length }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / (count - 1)));
}

export default function BusinessAnalyticsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);

  const { data: analytics, loading, error, range, setRange, refresh } = useBusinessAnalytics();

  const metrics: Metric[] | null = analytics
    ? [
        {
          key: 'subs',
          label: 'New Subscribers',
          value: analytics.summary.new_subscribers.value,
          changePct: analytics.summary.new_subscribers.changePct,
          icon: Users,
          color: PURPLE,
        },
        {
          key: 'shares',
          label: 'Offers Shared',
          value: analytics.summary.offers_shared.value,
          changePct: analytics.summary.offers_shared.changePct,
          icon: Share2,
          color: TEAL,
        },
        {
          key: 'points',
          label: 'Points Awarded',
          value: analytics.summary.points_awarded.value,
          changePct: analytics.summary.points_awarded.changePct,
          icon: Zap,
          color: GOLD,
        },
        {
          key: 'redemptions',
          label: 'Coupons Redeemed',
          value: analytics.summary.coupons_redeemed.value,
          changePct: analytics.summary.coupons_redeemed.changePct,
          icon: Gift,
          color: CORAL,
        },
      ]
    : null;

  const subscriberGrowth = analytics?.subscriberGrowth ?? [];
  const redemptionTrend = analytics?.redemptionTrend ?? [];
  const pointsBreakdown = (analytics?.pointsBreakdown ?? []).map((seg, i) => ({
    key: seg.label,
    label: seg.label,
    value: seg.value,
    color: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
  }));
  const topSharedOffers = analytics?.topSharedOffers ?? [];

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const chartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // On web, RefreshControl wrapping this ScrollView freezes JS-driven Animated timings
    // started on mount/prop-change (they report {finished:false} within a frame and never
    // advance), which would otherwise leave the whole screen permanently invisible at its
    // initial opacity:0/translateY:12 values. Skip the animation on web and render at rest.
    if (Platform.OS === 'web') {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      chartAnim.setValue(1);
      return;
    }
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
      if (__DEV__) console.log('[Analytics] Range changed:', r);
    },
    [range],
  );

  const runExport = useCallback(
    async (format: 'csv' | 'pdf') => {
      if (!analytics) return;
      setExporting(true);
      try {
        if (format === 'csv') await exportAnalyticsCsv(analytics);
        else await exportAnalyticsPdf(analytics);
      } catch (err: unknown) {
        Alert.alert('Export failed', err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setExporting(false);
      }
    },
    [analytics],
  );

  const handleExport = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!analytics) {
      Alert.alert('Nothing to export yet', 'Wait for your analytics to finish loading, then try again.');
      return;
    }
    Alert.alert('Export Analytics', `Last ${analytics.period} days`, [
      { text: 'Export CSV', onPress: () => runExport('csv') },
      { text: 'Export PDF', onPress: () => runExport('pdf') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [analytics, runExport]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await refresh();
    setRefreshing(false);
    if (Platform.OS === 'web') {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      chartAnim.setValue(1);
      return;
    }
    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    chartAnim.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(chartAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
    ]).start();
  }, [fadeAnim, slideAnim, chartAnim, refresh]);

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
            disabled={exporting}
            testID="analytics-export"
          >
            {exporting ? <ActivityIndicator size="small" color="#fff" /> : <Download size={18} color="#fff" />}
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

          {loading && !analytics ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={PURPLE} />
              <Text style={styles.loadingText}>Loading analytics…</Text>
            </View>
          ) : error && !analytics ? (
            <View style={styles.loadingWrap}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => refresh()}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.metricsGrid}>
                {metrics!.map((m) => (
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
                      {metrics![0].value} new subscribers over last {analytics!.period} days
                    </Text>
                  </View>
                </View>
                <BarChart data={subscriberGrowth} progress={chartAnim} />
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
                {pointsBreakdown.length === 0 ? (
                  <Text style={styles.emptyText}>No points awarded in this period yet.</Text>
                ) : (
                  <View style={styles.donutRow}>
                    <DonutChart data={pointsBreakdown} progress={chartAnim} />
                    <View style={styles.legend}>
                      {pointsBreakdown.map((seg) => {
                        const total = pointsBreakdown.reduce((a, b) => a + b.value, 0);
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
                )}
              </Surface>

              <Surface style={styles.card} elevation={0}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: '#FFEEF0' }]}>
                    <Trophy size={16} color={CORAL} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Top Shared Offers</Text>
                    <Text style={styles.cardSubtitle}>Ranked by shares</Text>
                  </View>
                </View>
                {topSharedOffers.length === 0 ? (
                  <Text style={styles.emptyText}>No offer shares in this period yet.</Text>
                ) : (
                  <DataTable style={styles.dataTable}>
                    <DataTable.Header style={styles.dtHeader}>
                      <DataTable.Title textStyle={styles.dtHeaderText} style={styles.dtColName}>
                        Offer
                      </DataTable.Title>
                      <DataTable.Title numeric textStyle={styles.dtHeaderText}>
                        Shares
                      </DataTable.Title>
                    </DataTable.Header>
                    {topSharedOffers.map((o, i) => (
                      <DataTable.Row key={o.id} style={[styles.dtRow, i === topSharedOffers.length - 1 && styles.dtRowLast]}>
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
                        <DataTable.Cell numeric textStyle={[styles.dtCell, styles.dtCellAccent]}>
                          {o.shares}
                        </DataTable.Cell>
                      </DataTable.Row>
                    ))}
                  </DataTable>
                )}
              </Surface>

              <Surface style={styles.card} elevation={0}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: '#E6F7F3' }]}>
                    <Activity size={16} color={TEAL} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Redemption Trend</Text>
                    <Text style={styles.cardSubtitle}>
                      {metrics![3].value} redemptions · last {analytics!.period} days
                    </Text>
                  </View>
                </View>
                <LineChart data={redemptionTrend} progress={chartAnim} />
              </Surface>

              <View style={styles.footerNote}>
                <Sparkles size={12} color={MUTED} />
                <Text style={styles.footerText}>Data updates hourly</Text>
              </View>
            </>
          )}
          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const Icon = metric.icon;
  const delta = metric.changePct;
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

function BarChart({ data, progress }: { data: { date: string; count: number }[]; progress: Animated.Value }) {
  const width = SCREEN_WIDTH - 64;
  const height = 180;
  const leftPad = 28;
  const topPad = 10;
  const bottomPad = 22;
  const chartWidth = width - leftPad;
  const chartHeight = height - topPad - bottomPad;

  const max = Math.max(...data.map((d) => d.count), 1);

  const maxBars = 30;
  const step = Math.max(1, Math.ceil(data.length / maxBars));
  const bars = data.filter((_, i) => i % step === 0);
  const barSpacing = 3;
  const barWidth = Math.max(4, (chartWidth - barSpacing * (bars.length - 1)) / Math.max(1, bars.length));

  const [animValue, setAnimValue] = useState<number>(() => (progress as unknown as { __getValue(): number }).__getValue());
  useEffect(() => {
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xLabelIndices = evenIndices(bars.length, 4);

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={PURPLE} stopOpacity="1" />
            <Stop offset="1" stopColor={PURPLE} stopOpacity="0.45" />
          </LinearGradient>
        </Defs>
        {yTicks.map((ratio, i) => {
          const y = topPad + chartHeight * (1 - ratio);
          return (
            <G key={i}>
              <Line
                x1={leftPad}
                y1={y}
                x2={width}
                y2={y}
                stroke={BORDER}
                strokeWidth={1}
                strokeDasharray="3,4"
              />
              <SvgText x={leftPad - 6} y={y + 3} fontSize="9" fill={MUTED} textAnchor="end">
                {formatNum(Math.round(max * ratio))}
              </SvgText>
            </G>
          );
        })}
        {bars.map((bar, i) => {
          const fullH = (bar.count / max) * chartHeight;
          const h = fullH * animValue;
          const x = leftPad + i * (barWidth + barSpacing);
          const y = topPad + chartHeight - h;
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
        {xLabelIndices.map((i) => {
          const bar = bars[i];
          if (!bar) return null;
          const x = leftPad + i * (barWidth + barSpacing) + barWidth / 2;
          return (
            <SvgText key={i} x={x} y={height - 6} fontSize="9" fill={MUTED} textAnchor="middle">
              {formatDateShort(bar.date)}
            </SvgText>
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

  const [animValue, setAnimValue] = useState<number>(() => (progress as unknown as { __getValue(): number }).__getValue());
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

function LineChart({ data, progress }: { data: { date: string; count: number }[]; progress: Animated.Value }) {
  const width = SCREEN_WIDTH - 64;
  const height = 180;
  const leftPad = 28;
  const topPad = 16;
  const bottomPad = 24;
  const chartWidth = width - leftPad;
  const chartHeight = height - topPad - bottomPad;

  const counts = data.map((d) => d.count);
  const max = Math.max(...counts, 1);
  const min = Math.min(...counts, 0);

  const maxPoints = 40;
  const step = Math.max(1, Math.ceil(data.length / maxPoints));
  const points = data.filter((_, i) => i % step === 0);

  const [animValue, setAnimValue] = useState<number>(() => (progress as unknown as { __getValue(): number }).__getValue());
  useEffect(() => {
    const id = progress.addListener(({ value }) => setAnimValue(value));
    return () => progress.removeListener(id);
  }, [progress]);

  const stepX = chartWidth / Math.max(1, points.length - 1);
  const getY = (v: number) => {
    const norm = (v - min) / Math.max(1, max - min);
    return topPad + (1 - norm) * chartHeight;
  };
  const getX = (i: number) => leftPad + i * stepX;

  const visibleCount = Math.max(2, Math.round(points.length * animValue));
  const visible = points.slice(0, visibleCount);

  const pathD = visible
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.count)}`)
    .join(' ');

  const lastX = getX(visible.length - 1);
  const areaD = `${pathD} L ${lastX} ${topPad + chartHeight} L ${leftPad} ${topPad + chartHeight} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xLabelIndices = evenIndices(points.length, 4);

  return (
    <View style={styles.chartWrap}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={TEAL} stopOpacity="0.28" />
            <Stop offset="1" stopColor={TEAL} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {yTicks.map((ratio, i) => {
          const y = topPad + chartHeight * (1 - ratio);
          const value = Math.round(min + (max - min) * ratio);
          return (
            <G key={i}>
              <Line
                x1={leftPad}
                y1={y}
                x2={width}
                y2={y}
                stroke={BORDER}
                strokeWidth={1}
                strokeDasharray="3,4"
              />
              <SvgText x={leftPad - 6} y={y + 3} fontSize="9" fill={MUTED} textAnchor="end">
                {formatNum(value)}
              </SvgText>
            </G>
          );
        })}
        <Path d={areaD} fill="url(#lineGrad)" />
        <Path d={pathD} stroke={TEAL} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {visible.length > 0 && (
          <Circle
            cx={lastX}
            cy={getY(visible[visible.length - 1].count)}
            r={5}
            fill="#fff"
            stroke={TEAL}
            strokeWidth={2.5}
          />
        )}
        {xLabelIndices.map((i) => {
          const p = points[i];
          if (!p) return null;
          return (
            <SvgText key={i} x={getX(i)} y={height - 6} fontSize="9" fill={MUTED} textAnchor="middle">
              {formatDateShort(p.date)}
            </SvgText>
          );
        })}
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

  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 13, color: MUTED },
  errorText: { fontSize: 13, color: RED, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PURPLE,
  },
  retryBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  emptyText: { fontSize: 12.5, color: MUTED, textAlign: 'center', paddingVertical: 12 },

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
    minHeight: 40,
  },
  dtHeaderText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
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
