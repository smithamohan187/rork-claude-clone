import React from 'react';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

export default function InviteFriendsIllustration({ width = '100%', height = 160 }: Props) {
  const dots: { cx: number; cy: number }[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      dots.push({ cx: 15 + col * 32, cy: 12 + row * 38 });
    }
  }

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration of inviting trusted friends to your network"
    >
      {dots.map((d, i) => (
        <Circle key={`dot-${i}`} cx={d.cx} cy={d.cy} r={2} fill="#fff" opacity={0.1} />
      ))}

      {/* network connections (dashed lines from center person to others) */}
      <Path d="M 100 78 L 50 50" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 3" />
      <Path d="M 100 78 L 155 48" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 3" />
      <Path d="M 100 78 L 45 118" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 3" />
      <Path d="M 100 78 L 160 118" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 3" />

      {/* satellite friends */}
      {[
        { cx: 50, cy: 50 },
        { cx: 155, cy: 48 },
        { cx: 45, cy: 118 },
        { cx: 160, cy: 118 },
      ].map((p, i) => (
        <G key={`f-${i}`}>
          <Circle cx={p.cx} cy={p.cy} r={10} fill="#fff" fillOpacity={0.92} />
          <Rect x={p.cx - 11} y={p.cy + 10} width={22} height={16} rx={6} fill="#fff" fillOpacity={0.92} />
        </G>
      ))}

      {/* central person (you) */}
      <G>
        <Circle cx={100} cy={72} r={18} fill="#fff" />
        <Rect x={78} y={92} width={44} height={32} rx={12} fill="#fff" />
      </G>

      {/* plus badge */}
      <G>
        <Circle cx={124} cy={56} r={12} fill="#34D399" stroke="#fff" strokeWidth={2} />
        <SvgText x={124} y={61} fontSize={16} fill="#fff" textAnchor="middle" fontWeight="bold">+</SvgText>
      </G>

      {/* trust shield small */}
      <G>
        <Path d="M 28 22 L 36 22 L 36 30 Q 36 36 32 38 Q 28 36 28 30 Z" fill="#FCD34D" />
        <SvgText x={32} y={33} fontSize={7} fill="#92400E" textAnchor="middle" fontWeight="bold">✓</SvgText>
      </G>
    </Svg>
  );
}
