import React from 'react';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

/**
 * Returns the points string for a 5-point star centered at (cx, cy).
 */

interface Props {
  width?: number | string;
  height?: number | string;
}

const starPoints = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return pts.join(' ');
};

const starPath = (cx: number, cy: number, r: number): string => {
  return `M ${starPoints(cx, cy, r).split(' ').join(' L ')} Z`;
};

export default function EarnPointsIllustration({ width = '100%', height = 160 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration showing a loyalty card with collected stars and floating coins"
    >
      {/* sparkle background dots */}
      <Circle cx={18} cy={20} r={2.5} fill="#fff" opacity={0.4} />
      <Circle cx={185} cy={50} r={2} fill="#fff" opacity={0.5} />
      <Circle cx={40} cy={140} r={3} fill="#fff" opacity={0.35} />
      <Circle cx={175} cy={140} r={2} fill="#fff" opacity={0.4} />
      <Circle cx={100} cy={10} r={2} fill="#fff" opacity={0.5} />
      <Circle cx={12} cy={95} r={3.5} fill="#fff" opacity={0.3} />

      {/* shadow stack behind card */}
      <G transform="rotate(-12 100 75)">
        <Rect x={36} y={38} width={140} height={85} rx={12} fill="#1A5C35" opacity={0.18} />
        <Rect x={33} y={34} width={140} height={85} rx={12} fill="#1A5C35" opacity={0.25} />
        {/* main card */}
        <Rect x={30} y={30} width={140} height={85} rx={12} fill="#fff" fillOpacity={0.22} stroke="#fff" strokeOpacity={0.65} strokeWidth={1} />

        {/* stars row: 3 filled, 1 half, 1 outlined */}
        {[
          { cx: 45, fill: '#fff', op: 1, stroke: undefined as string | undefined },
          { cx: 65, fill: '#fff', op: 1, stroke: undefined },
          { cx: 85, fill: '#fff', op: 1, stroke: undefined },
          { cx: 105, fill: '#fff', op: 0.5, stroke: undefined },
          { cx: 125, fill: 'none', op: 1, stroke: '#fff' },
        ].map((s) => (
          <Path
            key={`star-${s.cx}`}
            d={starPath(s.cx, 52, 6)}
            fill={s.fill}
            fillOpacity={s.op}
            stroke={s.stroke}
            strokeWidth={s.stroke ? 1.2 : 0}
          />
        ))}

        {/* progress bar base */}
        <Rect x={50} y={70} width={100} height={5} rx={2.5} fill="#fff" fillOpacity={0.3} />
        {/* progress fill */}
        <Rect x={50} y={70} width={60} height={5} rx={2.5} fill="#fff" />

        {/* placeholder text lines */}
        <Rect x={50} y={84} width={70} height={6} rx={3} fill="#fff" fillOpacity={0.4} />
        <Rect x={50} y={94} width={50} height={5} rx={2.5} fill="#fff" fillOpacity={0.25} />
      </G>

      {/* Floating coins */}
      {/* Coin 1 - large */}
      <Circle cx={22} cy={45} r={14} fill="#FCD34D" stroke="#F59E0B" strokeWidth={1.5} />
      <SvgText x={22} y={50} fontSize={14} fill="#92400E" textAnchor="middle" fontWeight="bold">★</SvgText>

      {/* Coin 2 - medium */}
      <Circle cx={172} cy={108} r={11} fill="#FCD34D" stroke="#F59E0B" strokeWidth={1.2} />
      <SvgText x={172} y={112} fontSize={11} fill="#92400E" textAnchor="middle" fontWeight="bold">★</SvgText>

      {/* Coin 3 - small */}
      <Circle cx={158} cy={26} r={7} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1} />
    </Svg>
  );
}
