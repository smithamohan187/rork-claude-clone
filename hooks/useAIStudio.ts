import { useCallback, useState } from 'react';
import { GEMINI_API_KEY } from '@/constants/env';
import type { AIImageStyle } from '@/constants/imageStyles';

export type AIContentType = 'offer' | 'event' | 'post';

export type AIEngine = 'gemini' | 'pollinations';

export interface AIGeneratedText {
  title: string;
  body: string;
  hashtags: string[];
  emoji_summary: string;
  engine: AIEngine;
}

export interface AIStudioHistoryItem {
  id: string;
  type: AIContentType;
  title: string;
  body: string;
  imageUrl: string;
  styleId: string;
  status: 'draft' | 'published';
  createdAt: string;
}

const TIMEOUT_MS = 30000;

const getFriendlyError = (err: Error): string => {
  const msg = err.message || '';
  if (msg.includes('API_KEY_INVALID')) return 'Invalid Gemini API key. Check your configuration.';
  if (msg.includes('RATE_LIMIT_EXCEEDED') || msg.includes('429'))
    return 'Too many requests. Please wait a moment and try again.';
  if (msg.includes('timed out') || msg.includes('AbortError'))
    return 'Request timed out. Check your connection.';
  return msg || 'Generation failed. Try again.';
};

interface RawAIText {
  title: string;
  body: string;
  hashtags: string[];
  emoji_summary: string;
}

const tryGemini = async (
  draftText: string,
  contentType: AIContentType,
  businessName: string,
): Promise<RawAIText> => {
  const prompt = `You are a marketing copywriter for a local business app called TouchPoint.
Generate polished promotional content for a business named "${businessName}".
Content type: ${contentType}
Business rough draft: ${draftText}
Tone: Professional yet friendly, suitable for a local business promotion.
Respond ONLY with a valid JSON object — no markdown, no backticks, no explanation:
{
  "title": "short catchy headline (max 10 words)",
  "body": "engaging promotional text (60-120 words)",
  "hashtags": ["tag1", "tag2", "tag3"],
  "emoji_summary": "2-3 relevant emojis"
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          },
        }),
      },
    );

    clearTimeout(timeout);

    if (response.status === 429 || response.status === 403) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(`QUOTA_EXCEEDED: ${errBody?.error?.message || response.status}`);
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Gemini error ${response.status}`);
    }

    const data = await response.json();
    const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty Gemini response');

    const cleaned = rawText.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      body: typeof parsed.body === 'string' ? parsed.body : '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      emoji_summary: typeof parsed.emoji_summary === 'string' ? parsed.emoji_summary : '',
    };
  } finally {
    clearTimeout(timeout);
  }
};

const tryPollinations = async (
  draftText: string,
  contentType: AIContentType,
  businessName: string,
): Promise<RawAIText> => {
  const systemPrompt = `You are a marketing copywriter for a local business app called TouchPoint.
Generate polished promotional content for a business named "${businessName}".
Always respond ONLY with a JSON object — no markdown, no backticks:
{
  "title": "short catchy headline (max 10 words)",
  "body": "engaging promotional text (60-120 words)",
  "hashtags": ["tag1", "tag2", "tag3"],
  "emoji_summary": "2-3 relevant emojis"
}`;

  const userPrompt = `Content type: ${contentType}. Business rough draft: ${draftText}. Tone: Professional yet friendly.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'openai',
        jsonMode: true,
        seed: Math.floor(Math.random() * 99999),
      }),
    });

    if (!response.ok) throw new Error(`Pollinations error ${response.status}`);

    const text = await response.text();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      body: typeof parsed.body === 'string' ? parsed.body : '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
      emoji_summary: typeof parsed.emoji_summary === 'string' ? parsed.emoji_summary : '',
    };
  } finally {
    clearTimeout(timeout);
  }
};

export const generateText = async (
  draftText: string,
  contentType: AIContentType,
  businessName: string,
): Promise<AIGeneratedText> => {
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE') {
    try {
      const result = await tryGemini(draftText, contentType, businessName);
      return { ...result, engine: 'gemini' };
    } catch (err: unknown) {
      const e = err as Error;
      console.warn('[AIStudio] Gemini failed, falling back to Pollinations:', e?.message);
    }
  }

  try {
    const result = await tryPollinations(draftText, contentType, businessName);
    return { ...result, engine: 'pollinations' };
  } catch (err: unknown) {
    const e = err as Error;
    if (e.name === 'AbortError') throw new Error('Text generation timed out. Please try again.');
    throw new Error(getFriendlyError(e));
  }
};

/** @deprecated Use generateText which includes automatic fallback. */
export const generateTextWithGemini = generateText;

export const buildPollinationsImageUrl = (
  title: string,
  draftText: string,
  style: AIImageStyle,
  businessName: string,
  seed?: number,
): string => {
  const safeSeed = seed ?? Math.floor(Math.random() * 99999);
  const prompt = encodeURIComponent(
    `${title || draftText}, ${style.promptModifier}, promotional marketing image for ${businessName}, professional quality, no text overlays, high resolution`,
  );
  return `https://image.pollinations.ai/prompt/${prompt}?width=800&height=450&nologo=true&seed=${safeSeed}`;
};

interface UseAIStudioState {
  isGenerating: boolean;
  isRegeneratingText: boolean;
  isRegeneratingImage: boolean;
  generatedText: AIGeneratedText | null;
  imageUrl: string | null;
  error: string | null;
}

const initialMockHistory: AIStudioHistoryItem[] = [
  {
    id: 'ai-1',
    type: 'offer',
    title: 'Weekend Coffee Bliss',
    body: 'Enjoy 20% off all hand-crafted brews this weekend, exclusive for loyalty members. Sip, smile, repeat.',
    imageUrl: 'https://picsum.photos/seed/ai1/800/450',
    styleId: 'vibrant',
    status: 'published',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'ai-2',
    type: 'event',
    title: 'Live Jazz Friday',
    body: 'An intimate evening with local jazz trio. Doors 8pm, free entry before 8:30pm. Reserve your spot.',
    imageUrl: 'https://picsum.photos/seed/ai2/800/450',
    styleId: 'retro',
    status: 'draft',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

let historyStore: AIStudioHistoryItem[] = [...initialMockHistory];

export const getAIStudioHistory = (): AIStudioHistoryItem[] => [...historyStore];

export const useAIStudio = (businessName: string) => {
  const [state, setState] = useState<UseAIStudioState>({
    isGenerating: false,
    isRegeneratingText: false,
    isRegeneratingImage: false,
    generatedText: null,
    imageUrl: null,
    error: null,
  });

  const generate = useCallback(
    async (
      draftText: string,
      contentType: AIContentType,
      style: AIImageStyle,
    ): Promise<void> => {
      if (!draftText.trim()) return;
      setState((s) => ({ ...s, isGenerating: true, error: null }));
      try {
        const text = await generateText(draftText, contentType, businessName);
        const url = buildPollinationsImageUrl(text.title, draftText, style, businessName);
        setState((s) => ({
          ...s,
          generatedText: text,
          imageUrl: url,
          isGenerating: false,
        }));
      } catch (err: unknown) {
        const e = err as Error;
        console.log('[AIStudio] generate error', e?.message);
        setState((s) => ({
          ...s,
          isGenerating: false,
          error: getFriendlyError(e),
        }));
      }
    },
    [businessName],
  );

  const regenerateText = useCallback(
    async (draftText: string, contentType: AIContentType): Promise<void> => {
      setState((s) => ({ ...s, isRegeneratingText: true, error: null }));
      try {
        const text = await generateText(draftText, contentType, businessName);
        setState((s) => ({ ...s, generatedText: text, isRegeneratingText: false }));
      } catch (err: unknown) {
        const e = err as Error;
        setState((s) => ({
          ...s,
          isRegeneratingText: false,
          error: getFriendlyError(e),
        }));
      }
    },
    [businessName],
  );

  const regenerateImage = useCallback(
    (draftText: string, style: AIImageStyle): void => {
      setState((s) => ({ ...s, isRegeneratingImage: true }));
      const url = buildPollinationsImageUrl(
        state.generatedText?.title || '',
        draftText,
        style,
        businessName,
      );
      setState((s) => ({ ...s, imageUrl: url, isRegeneratingImage: false }));
    },
    [businessName, state.generatedText?.title],
  );

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      isRegeneratingText: false,
      isRegeneratingImage: false,
      generatedText: null,
      imageUrl: null,
      error: null,
    });
  }, []);

  const saveToHistory = useCallback(
    (item: Omit<AIStudioHistoryItem, 'id' | 'createdAt'>): AIStudioHistoryItem => {
      const entry: AIStudioHistoryItem = {
        ...item,
        id: `ai-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      historyStore = [entry, ...historyStore];
      return entry;
    },
    [],
  );

  return {
    ...state,
    generate,
    regenerateText,
    regenerateImage,
    reset,
    saveToHistory,
  };
};
