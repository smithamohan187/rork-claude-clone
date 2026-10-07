import React from 'react';
import { TouchableOpacity, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageStyle } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { Play } from 'lucide-react-native';

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

function InlineVideoPlayer({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={style} nativeControls contentFit="cover" />;
}

// Non-interactive first-frame preview used in feed cards that open a full-screen
// viewer on tap — mirrors how the image branch below is just a static tap target.
function VideoPreviewFrame({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = true;
    p.pause();
  });
  return <VideoView player={player} style={style} nativeControls={false} contentFit="cover" pointerEvents="none" />;
}

interface PostMediaProps {
  videoUrl: string | null;
  videoType: 'upload' | 'link' | null;
  imageUrl: string | null;
  style: StyleProp<ViewStyle>;
  onImagePress?: () => void;
}

export function PostMedia({ videoUrl, videoType, imageUrl, style, onImagePress }: PostMediaProps) {
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
    const image = (
      <Image source={{ uri: imageUrl }} style={style as StyleProp<ImageStyle>} contentFit="cover" />
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
