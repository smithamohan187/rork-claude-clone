import type { FeedItem } from '@/hooks/usePersonalisedFeed';

/**
 * Module-level cache used to pass the (potentially large) feed array
 * to the full-screen feed viewer without serializing through router params.
 */
let cachedItems: FeedItem[] = [];
let cachedIndex: number = 0;

export function setFullFeedPayload(items: FeedItem[], index: number): void {
  cachedItems = items;
  cachedIndex = Math.max(0, Math.min(index, items.length - 1));
}

export function getFullFeedPayload(): { items: FeedItem[]; index: number } {
  return { items: cachedItems, index: cachedIndex };
}

export function clearFullFeedPayload(): void {
  cachedItems = [];
  cachedIndex = 0;
}
