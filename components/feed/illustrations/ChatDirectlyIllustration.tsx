import React from 'react';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

export default function ChatDirectlyIllustration({ width = '100%', height = 160 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration of a chat conversation between a user and a business"
    >
      {/* Concentric signal arcs top-right */}
      <Path d="M 200 20 A 15 15 0 0 0 170 20" stroke="#fff" strokeOpacity={0.18} strokeWidth={1.5} fill="none" />
      <Path d="M 210 20 A 25 25 0 0 0 160 20" stroke="#fff" strokeOpacity={0.13} strokeWidth={1.5} fill="none" />
      <Path d="M 220 20 A 35 35 0 0 0 150 20" stroke="#fff" strokeOpacity={0.09} strokeWidth={1.5} fill="none" />

      {/* Business avatar */}
      <Circle cx={12} cy={42} r={8} fill="#FCD34D" />
      <SvgText x={12} y={46} fontSize={9} fill="#92400E" textAnchor="middle" fontWeight="bold">B</SvgText>

      {/* Business message bubble (left) */}
      <G>
        <Rect x={22} y={28} width={108} height={36} rx={12} fill="#fff" fillOpacity={0.96} />
        {/* tail */}
        <Path d="M 22 56 L 17 64 L 28 60 Z" fill="#fff" fillOpacity={0.96} />
        <Rect x={31} y={38} width={78} height={5} rx={2.5} fill="#1a1a1a" opacity={0.3} />
        <Rect x={31} y={48} width={55} height={4.5} rx={2.25} fill="#1a1a1a" opacity={0.2} />
      </G>

      {/* Typing indicator small bubble */}
      <G>
        <Rect x={22} y={72} width={42} height={18} rx={9} fill="#fff" fillOpacity={0.42} />
        <Circle cx={32} cy={81} r={2.5} fill="#fff" />
        <Circle cx={41} cy={81} r={2.5} fill="#fff" fillOpacity={0.7} />
        <Circle cx={50} cy={81} r={2.5} fill="#fff" fillOpacity={0.45} />
      </G>

      {/* User reply bubble (right) */}
      <G>
        <Rect x={70} y={102} width={108} height={36} rx={12} fill="#1A5C35" />
        <Path d="M 178 130 L 184 138 L 172 134 Z" fill="#1A5C35" />
        <Rect x={79} y={112} width={75} height={5} rx={2.5} fill="#fff" fillOpacity={0.65} />
        <Rect x={79} y={122} width={50} height={4.5} rx={2.25} fill="#fff" fillOpacity={0.42} />
      </G>
    </Svg>
  );
}
