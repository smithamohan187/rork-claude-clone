import React from 'react';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

export default function GoodwillRewardsIllustration({ width = '100%', height = 160 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration of two people sharing a gift with coins, representing goodwill referrals and rewards"
    >
      {/* sparkle background */}
      <Circle cx={18} cy={22} r={2.5} fill="#fff" opacity={0.35} />
      <Circle cx={185} cy={30} r={2} fill="#fff" opacity={0.45} />
      <Circle cx={28} cy={140} r={2.5} fill="#fff" opacity={0.3} />
      <Circle cx={180} cy={140} r={2} fill="#fff" opacity={0.4} />
      <Circle cx={100} cy={12} r={2} fill="#fff" opacity={0.5} />

      {/* heart pulse curve between people */}
      <Path d="M 60 60 Q 100 30 140 60" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />

      {/* left person */}
      <G>
        <Circle cx={42} cy={68} r={14} fill="#fff" />
        <Rect x={26} y={84} width={32} height={30} rx={10} fill="#fff" />
      </G>

      {/* right person */}
      <G>
        <Circle cx={158} cy={68} r={14} fill="#fff" />
        <Rect x={142} y={84} width={32} height={30} rx={10} fill="#fff" />
      </G>

      {/* gift box in middle */}
      <G>
        {/* box */}
        <Rect x={80} y={78} width={40} height={36} rx={4} fill="#FCD34D" stroke="#fff" strokeWidth={1.5} />
        {/* vertical ribbon */}
        <Rect x={96} y={78} width={8} height={36} fill="#EF4444" />
        {/* horizontal ribbon */}
        <Rect x={80} y={92} width={40} height={6} fill="#EF4444" />
        {/* lid */}
        <Rect x={76} y={72} width={48} height={10} rx={2} fill="#FBBF24" stroke="#fff" strokeWidth={1.5} />
        <Rect x={96} y={72} width={8} height={10} fill="#EF4444" />
        {/* bow */}
        <Circle cx={94} cy={70} r={5} fill="#EF4444" stroke="#fff" strokeWidth={1} />
        <Circle cx={106} cy={70} r={5} fill="#EF4444" stroke="#fff" strokeWidth={1} />
      </G>

      {/* heart above gift (goodwill) */}
      <G>
        <Path
          d="M 100 52 C 94 47 90 43 90 38 C 90 34 93 32 96 34 C 98 35 100 38 100 38 C 100 38 102 35 104 34 C 107 32 110 34 110 38 C 110 43 106 47 100 52 Z"
          fill="#F472B6"
          stroke="#fff"
          strokeWidth={1.5}
        />
      </G>

      {/* coin left */}
      <G>
        <Circle cx={28} cy={36} r={11} fill="#FCD34D" stroke="#F59E0B" strokeWidth={1.4} />
        <SvgText x={28} y={40} fontSize={11} fill="#92400E" textAnchor="middle" fontWeight="bold">★</SvgText>
      </G>

      {/* coin right */}
      <G>
        <Circle cx={172} cy={40} r={9} fill="#FCD34D" stroke="#F59E0B" strokeWidth={1.2} />
        <SvgText x={172} y={44} fontSize={9} fill="#92400E" textAnchor="middle" fontWeight="bold">★</SvgText>
      </G>

      {/* small +pts tag */}
      <G>
        <Rect x={130} y={120} width={42} height={14} rx={7} fill="#fff" fillOpacity={0.92} />
        <SvgText x={151} y={130} fontSize={9} fill="#00B246" textAnchor="middle" fontWeight="bold">+REWARDS</SvgText>
      </G>
    </Svg>
  );
}
