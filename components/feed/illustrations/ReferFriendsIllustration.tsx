import React from 'react';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

export default function ReferFriendsIllustration({ width = '100%', height = 160 }: Props) {
  // background dot grid
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
      accessibilityLabel="Illustration of two friends connected by a referral envelope with bonus points floating up"
    >
      {dots.map((d, i) => (
        <Circle key={`dot-${i}`} cx={d.cx} cy={d.cy} r={2} fill="#fff" opacity={0.1} />
      ))}

      {/* Bonus points bubbles rising */}
      <G>
        <Rect x={82} y={28} width={36} height={16} rx={8} fill="#fff" fillOpacity={0.28} />
        <SvgText x={100} y={39} fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">+50 pts</SvgText>

        <Rect x={88} y={10} width={30} height={13} rx={6.5} fill="#fff" fillOpacity={0.16} />
        <SvgText x={103} y={20} fontSize={7.5} fill="#fff" textAnchor="middle" fontWeight="bold">+50 pts</SvgText>
      </G>

      {/* Connection dashed curve */}
      <Path d="M 73 78 Q 100 60 127 78" stroke="#fff" strokeOpacity={0.85} strokeWidth={2} strokeDasharray="5 4" fill="none" />

      {/* Envelope at midpoint */}
      <G>
        <Rect x={91} y={60} width={18} height={14} rx={2.5} fill="#fff" />
        <Path d="M 91 60 L 100 68 L 109 60 Z" fill="#A7F3D0" />
      </G>

      {/* Left person (referrer) */}
      <G>
        <Circle cx={55} cy={62} r={16} fill="#fff" fillOpacity={0.95} />
        <Rect x={37} y={80} width={36} height={28} rx={10} fill="#fff" fillOpacity={0.95} />
        {/* badge */}
        <Circle cx={70} cy={50} r={9} fill="#FCD34D" stroke="#fff" strokeWidth={1.5} />
        <SvgText x={70} y={54} fontSize={10} fill="#92400E" textAnchor="middle" fontWeight="bold">★</SvgText>
      </G>

      {/* Right person (referred) - slightly smaller */}
      <G transform="translate(0 6) scale(0.88) translate(20 0)">
        <Circle cx={145} cy={62} r={16} fill="#fff" fillOpacity={0.85} />
        <Rect x={127} y={80} width={36} height={28} rx={10} fill="#fff" fillOpacity={0.85} />
      </G>
    </Svg>
  );
}
