import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
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

interface PostMediaProps {
  videoUrl: string | null;
  videoType: 'upload' | 'link' | null;
  imageUrl: string | null;
  style: StyleProp<ViewStyle>;
  onImagePress?: () => void;
}

export function PostMedia({ videoUrl, videoType, imageUrl, style, onImagePress }: PostMediaProps) {
  if (videoUrl) {
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
    const image = <Image source={{ uri: imageUrl }} style={style} contentFit="cover" />;
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
});

export default PostMedia;
