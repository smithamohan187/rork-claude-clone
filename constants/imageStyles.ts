export interface AIImageStyle {
  id: string;
  name: string;
  gradient: readonly [string, string];
  promptModifier: string;
}

export const AI_IMAGE_STYLES: AIImageStyle[] = [
  {
    id: 'vibrant',
    name: 'Vibrant Pop',
    gradient: ['#FF6B6B', '#FFE66D'] as const,
    promptModifier: 'vibrant pop art style, bold colors, high contrast',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    gradient: ['#F5F5F5', '#BDBDBD'] as const,
    promptModifier: 'clean minimalist design, white space, simple geometric shapes',
  },
  {
    id: 'neon',
    name: 'Neon Glow',
    gradient: ['#0F0F0F', '#39FF14'] as const,
    promptModifier: 'neon glow cyberpunk aesthetic, dark background, bright neon accents',
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    gradient: ['#A8EDEA', '#FED6E3'] as const,
    promptModifier: 'soft watercolor painting, pastel tones, artistic brushstroke',
  },
  {
    id: 'retro',
    name: 'Retro Vintage',
    gradient: ['#D4A574', '#8B4513'] as const,
    promptModifier:
      'retro vintage poster style, warm tones, aged texture, classic typography feel',
  },
  {
    id: 'corporate',
    name: 'Corporate Pro',
    gradient: ['#1565C0', '#42A5F5'] as const,
    promptModifier: 'professional corporate style, clean blue tones, business photography',
  },
  {
    id: 'festive',
    name: 'Festive',
    gradient: ['#FF9A00', '#FF0080'] as const,
    promptModifier: 'festive celebration style, colorful confetti, party atmosphere',
  },
];
