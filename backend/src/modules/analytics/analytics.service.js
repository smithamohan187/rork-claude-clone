// analytics.service.js — business logic for the business analytics summary/charts.
const analyticsModel = require('./analytics.model');

const PERIOD_DAYS = { 7: 7, 30: 30, 90: 90 };

const POINTS_TYPE_LABELS = {
  earn_welcome: 'Welcome',
  earn_referral: 'Referral',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

// Fills every day in [startDate, endDate) with 0, then overlays the real counts.
function zeroFillSeries(rows, startDate, endDate) {
  const byDay = new Map(rows.map((r) => [toDateKey(new Date(r.day)), r.count]));
  const series = [];
  for (let t = startDate.getTime(); t < endDate.getTime(); t += DAY_MS) {
    const key = toDateKey(new Date(t));
    series.push({ date: key, count: byDay.get(key) ?? 0 });
  }
  return series;
}

function percentChange(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function mapPointsBreakdown(rows) {
  const buckets = new Map();
  for (const row of rows) {
    const label = POINTS_TYPE_LABELS[row.type] || 'Other';
    buckets.set(label, (buckets.get(label) ?? 0) + row.total);
  }
  return Array.from(buckets, ([label, value]) => ({ label, value }));
}

async function getAnalytics(userId, periodParam) {
  const businessId = await analyticsModel.getBusinessIdByUserId(userId);
  if (!businessId) throw Object.assign(new Error('Business not found'), { status: 404 });

  const days = PERIOD_DAYS[periodParam] ?? 30;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * DAY_MS);
  const prevEndDate = startDate;
  const prevStartDate = new Date(startDate.getTime() - days * DAY_MS);

  const [current, previous, redemptionTrendRows, subscriberGrowthRows, pointsBreakdownRows, topSharedOffersRows] =
    await Promise.all([
      analyticsModel.getSummaryCounts(businessId, startDate, endDate),
      analyticsModel.getSummaryCounts(businessId, prevStartDate, prevEndDate),
      analyticsModel.getRedemptionTrend(businessId, startDate, endDate),
      analyticsModel.getSubscriberGrowth(businessId, startDate, endDate),
      analyticsModel.getPointsBreakdown(businessId, startDate, endDate),
      analyticsModel.getTopSharedOffers(businessId, startDate, endDate, 5),
    ]);

  const metricKeys = ['new_subscribers', 'offers_shared', 'points_awarded', 'coupons_redeemed'];
  const summary = Object.fromEntries(
    metricKeys.map((key) => [
      key,
      { value: current[key], changePct: percentChange(current[key], previous[key]) },
    ])
  );

  return {
    period: days,
    summary,
    redemptionTrend: zeroFillSeries(redemptionTrendRows, startDate, endDate),
    subscriberGrowth: zeroFillSeries(subscriberGrowthRows, startDate, endDate),
    pointsBreakdown: mapPointsBreakdown(pointsBreakdownRows),
    topSharedOffers: topSharedOffersRows.map((r) => ({
      id: r.id,
      name: r.title,
      shares: r.share_count,
    })),
  };
}

module.exports = { getAnalytics };
