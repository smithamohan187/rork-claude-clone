import React from 'react';
import Svg, { Circle, Rect, Path, G, Ellipse, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

const sparkle = (cx: number, cy: number, size: number, opacity: number, key: string) => {
  const s = size;
  return (
    <G key={key}>
      <Path d={`M ${cx} ${cy - s} L ${cx + s * 0.25} ${cy} L ${cx} ${cy + s} L ${cx - s * 0.25} ${cy} Z`} fill="#fff" opacity={opacity} />
      <Path d={`M ${cx - s} ${cy} L ${cx} ${cy + s * 0.25} L ${cx + s} ${cy} L ${cx} ${cy - s * 0.25} Z`} fill="#fff" opacity={opacity} />
    </G>
  );
};

const star8Path = (cx: number, cy: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.5;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return `M ${pts.join(' L ')} Z`;
};

export default function RedeemRewardsIllustration({ width = '100%', height = 160 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration of a wrapped gift box with rewards spilling out"
    >
      {/* sparkles behind */}
      {sparkle(35, 40, 7, 0.5, 'sp1')}
      {sparkle(165, 50, 6, 0.4, 'sp2')}
      {sparkle(50, 130, 5, 0.35, 'sp3')}
      {sparkle(155, 130, 7, 0.45, 'sp4')}
      {sparkle(180, 90, 5, 0.3, 'sp5')}

      {/* Reward items popping out */}
      {/* Coffee cup top-left */}
      <G>
        <Rect x={25} y={20} width={20} height={22} rx={4} fill="#FCD34D" />
        <Rect x={25} y={20} width={20} height={3} fill="#F59E0B" />
        <Path d="M 45 26 Q 51 28 51 33 Q 51 38 45 38" stroke="#F59E0B" strokeWidth={2} fill="none" />
        {/* steam */}
        <Path d="M 30 16 Q 32 12 30 8" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} fill="none" />
        <Path d="M 38 16 Q 40 12 38 8" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} fill="none" />
      </G>

      {/* Discount tag top-right */}
      <G>
        <Path d="M 145 16 L 175 16 L 180 26 L 175 36 L 145 36 Z" fill="#34D399" />
        <Circle cx={150} cy={26} r={2.5} fill="#fff" />
        <SvgText x={163} y={30} fontSize={9} fill="#fff" textAnchor="middle" fontWeight="bold">20%</SvgText>
      </G>

      {/* Star burst top-center */}
      <Path d={star8Path(100, 22, 11)} fill="#FDE68A" stroke="#F59E0B" strokeWidth={1} />

      {/* Gift box body */}
      <Rect x={60} y={75} width={80} height={70} rx={6} fill="#fff" fillOpacity={0.94} />
      {/* Box lid */}
      <Rect x={55} y={62} width={90} height={20} rx={5} fill="#fff" />

      {/* Vertical ribbon */}
      <Rect x={97} y={62} width={6} height={83} fill="#00B246" opacity={0.65} />
      {/* Horizontal ribbon on body */}
      <Rect x={60} y={104} width={80} height={6} fill="#00B246" opacity={0.65} />

      {/* Bow loops */}
      <G>
        <Ellipse cx={86} cy={58} rx={11} ry={7} fill="none" stroke="#DB2777" strokeWidth={3} transform="rotate(-25 86 58)" />
        <Ellipse cx={114} cy={58} rx={11} ry={7} fill="none" stroke="#DB2777" strokeWidth={3} transform="rotate(25 114 58)" />
        <Circle cx={100} cy={58} r={4.5} fill="#DB2777" />
      </G>

      {/* Gift tag */}
      <Path d="M 108 58 L 122 50" stroke="#fff" strokeOpacity={0.7} strokeWidth={1} />
      <Rect x={120} y={42} width={20} height={14} rx={3} fill="#fff" fillOpacity={0.95} />
      <SvgText x={130} y={52} fontSize={9} fill="#00B246" textAnchor="middle" fontWeight="bold">✦</SvgText>
    </Svg>
  );
}
