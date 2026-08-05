import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import type { BusinessAnalytics } from '@/api/services/analyticsService';

type SummaryKey = keyof BusinessAnalytics['summary'];

const METRIC_LABELS: Record<SummaryKey, string> = {
  new_subscribers: 'New Subscribers',
  offers_shared: 'Offers Shared',
  points_awarded: 'Points Awarded',
  coupons_redeemed: 'Coupons Redeemed',
};

const SUMMARY_KEYS = Object.keys(METRIC_LABELS) as SummaryKey[];

function csvEscape(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildCsv(analytics: BusinessAnalytics): string {
  const lines: string[] = [];
  lines.push(`Business Analytics - last ${analytics.period} days`);
  lines.push('');
  lines.push('Summary Metric,Value,Change %');
  for (const key of SUMMARY_KEYS) {
    const m = analytics.summary[key];
    lines.push(`${csvEscape(METRIC_LABELS[key])},${m.value},${m.changePct.toFixed(1)}`);
  }

  lines.push('');
  lines.push('Subscriber Growth');
  lines.push('Date,New Subscribers');
  for (const p of analytics.subscriberGrowth) lines.push(`${p.date},${p.count}`);

  lines.push('');
  lines.push('Redemption Trend');
  lines.push('Date,Redemptions');
  for (const p of analytics.redemptionTrend) lines.push(`${p.date},${p.count}`);

  lines.push('');
  lines.push('Points Breakdown');
  lines.push('Category,Points');
  for (const seg of analytics.pointsBreakdown) lines.push(`${csvEscape(seg.label)},${seg.value}`);

  lines.push('');
  lines.push('Top Shared Offers');
  lines.push('Offer,Shares');
  for (const o of analytics.topSharedOffers) lines.push(`${csvEscape(o.name)},${o.shares}`);

  return lines.join('\n');
}

function seriesRowsHtml(series: { date: string; count: number }[]): string {
  return series.map((p) => `<tr><td>${p.date}</td><td>${p.count}</td></tr>`).join('');
}

function buildHtml(analytics: BusinessAnalytics): string {
  const metricRows = SUMMARY_KEYS.map((key) => {
    const m = analytics.summary[key];
    const sign = m.changePct >= 0 ? '+' : '';
    return `<tr><td>${METRIC_LABELS[key]}</td><td>${m.value}</td><td>${sign}${m.changePct.toFixed(1)}%</td></tr>`;
  }).join('');

  const breakdownRows = analytics.pointsBreakdown
    .map((seg) => `<tr><td>${seg.label}</td><td>${seg.value}</td></tr>`)
    .join('');

  const offerRows = analytics.topSharedOffers
    .map((o) => `<tr><td>${o.name}</td><td>${o.shares}</td></tr>`)
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1A1730; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin-top: 28px; margin-bottom: 8px; border-bottom: 1px solid #EFECF6; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #F0F0F0; }
          th { color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.4px; }
          .subtitle { color: #6B7280; font-size: 12px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h1>Business Analytics</h1>
        <div class="subtitle">Last ${analytics.period} days</div>

        <h2>Summary</h2>
        <table><thead><tr><th>Metric</th><th>Value</th><th>Change</th></tr></thead>
          <tbody>${metricRows}</tbody></table>

        <h2>Subscriber Growth</h2>
        <table><thead><tr><th>Date</th><th>New Subscribers</th></tr></thead>
          <tbody>${seriesRowsHtml(analytics.subscriberGrowth)}</tbody></table>

        <h2>Redemption Trend</h2>
        <table><thead><tr><th>Date</th><th>Redemptions</th></tr></thead>
          <tbody>${seriesRowsHtml(analytics.redemptionTrend)}</tbody></table>

        <h2>Points Breakdown</h2>
        <table><thead><tr><th>Category</th><th>Points</th></tr></thead>
          <tbody>${breakdownRows || '<tr><td colspan="2">No points awarded in this period.</td></tr>'}</tbody></table>

        <h2>Top Shared Offers</h2>
        <table><thead><tr><th>Offer</th><th>Shares</th></tr></thead>
          <tbody>${offerRows || '<tr><td colspan="2">No offer shares in this period.</td></tr>'}</tbody></table>
      </body>
    </html>
  `;
}

export async function exportAnalyticsCsv(analytics: BusinessAnalytics): Promise<void> {
  const csv = buildCsv(analytics);
  const filename = `analytics-${analytics.period}d-${Date.now()}.csv`;

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Analytics CSV' });
  }
}

export async function exportAnalyticsPdf(analytics: BusinessAnalytics): Promise<void> {
  const html = buildHtml(analytics);

  if (Platform.OS === 'web') {
    // expo-print doesn't support printToFileAsync on web — printAsync opens the
    // browser's native print dialog, where "Save as PDF" is a destination option.
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export Analytics PDF' });
  }
}
