import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageLoadEventData, type ImageStyle } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { Play } from 'lucide-react-native';

// Instagram-style clamp: never let a photo go taller than a 4:5 portrait or
// wider than a 1.91:1 landscape, regardless of its real aspect ratio.
const MIN_ASPECT_RATIO = 4 / 5;
const MAX_ASPECT_RATIO = 1.91;

function clampAspectRatio(width: number, height: number): number {
  if (!width || !height) return MIN_ASPECT_RATIO;
  return Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, width / height));
}

// Matches the embed-id extraction logic used wherever we need a YouTube/Vimeo
// inline player. Returns null for any other platform/link shape, which signals
// the caller to fall back to the tap-to-open-browser card instead.
export function getEmbedVideoUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/i);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

// On web, expo-video's VideoView renders a bare <video> tag and passes the `style` prop
// straight through as CSS with no sizing logic of its own. An absolutely-positioned (or
// otherwise auto-sized) <video> falls back to its native intrinsic pixel resolution instead
// of filling its box, so every usage must merge an explicit, non-auto width/height on top of
// whatever positioning style the caller supplies.
const FILL_STYLE = { width: '100%' as const, height: '100%' as const };

function InlineVideoPlayer({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={[style, FILL_STYLE]} nativeControls contentFit="cover" />;
}

// Non-interactive first-frame preview used in feed cards that open a full-screen
// viewer on tap — mirrors how the image branch below is just a static tap target.
function VideoPreviewFrame({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });
  return <VideoView player={player} style={[style, FILL_STYLE]} nativeControls={false} contentFit="cover" pointerEvents="none" />;
}

interface PostMediaProps {
  videoUrl: string | null;
  videoType: 'upload' | 'link' | null;
  imageUrl: string | null;
  style: StyleProp<ViewStyle>;
  onImagePress?: () => void;
  // 'natural' overrides the caller's fixed aspectRatio once the image loads, clamping to
  // Instagram's 4:5–1.91:1 range instead of cropping every source into one fixed box.
  // Defaults to 'fixed' so existing callers (detail hero, business-profile list) are unaffected.
  aspectRatioMode?: 'fixed' | 'natural';
}

export function PostMedia({ videoUrl, videoType, imageUrl, style, onImagePress, aspectRatioMode = 'fixed' }: PostMediaProps) {
  const [naturalRatio, setNaturalRatio] = useState<number>(MIN_ASPECT_RATIO);
  const handleLoad = (e: ImageLoadEventData) => {
    setNaturalRatio(clampAspectRatio(e.source.width, e.source.height));
  };
  if (videoUrl) {
    // Reels-style: when a full-screen viewer is available (onImagePress provided), the
    // feed card is just a static tap target into it — same as the image branch below —
    // rather than an interactive player competing with that tap.
    if (onImagePress) {
      if (videoType === 'upload') {
        return (
          <TouchableOpacity onPress={onImagePress} activeOpacity={0.85} style={[style, styles.videoPreviewWrap]}>
            <VideoPreviewFrame uri={videoUrl} style={StyleSheet.absoluteFill} />
            <View style={styles.playOverlay}>
              <Play size={36} color="#fff" fill="#fff" />
            </View>
          </TouchableOpacity>
        );
      }
      return (
        <TouchableOpacity activeOpacity={0.85} style={[style, styles.videoFallback]} onPress={onImagePress}>
          <Play size={36} color="#fff" fill="#fff" />
        </TouchableOpacity>
      );
    }

    if (videoType === 'upload') {
      return <InlineVideoPlayer uri={videoUrl} style={style} />;
    }
    const embedUrl = getEmbedVideoUrl(videoUrl);
    if (embedUrl) {
      return <WebView source={{ uri: embedUrl }} style={style} allowsFullscreenVideo />;
    }
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[style, styles.videoFallback]}
        onPress={() => WebBrowser.openBrowserAsync(videoUrl)}
      >
        <Play size={36} color="#fff" fill="#fff" />
      </TouchableOpacity>
    );
  }

  if (imageUrl) {
    const imageStyle = (
      aspectRatioMode === 'natural' ? [style, { aspectRatio: naturalRatio }] : style
    ) as StyleProp<ImageStyle>;
    const image = (
      <Image
        source={{ uri: imageUrl }}
        style={imageStyle}
        contentFit="cover"
        onLoad={aspectRatioMode === 'natural' ? handleLoad : undefined}
      />
    );
    if (onImagePress) {
      return (
        <TouchableOpacity onPress={onImagePress} activeOpacity={0.85}>
          {image}
        </TouchableOpacity>
      );
    }
    return image;
  }

  return null;
}

const styles = StyleSheet.create({
  videoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14241C',
  },
  videoPreviewWrap: {
    overflow: 'hidden',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

export default PostMedia;
