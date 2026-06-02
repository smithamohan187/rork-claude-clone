import React from 'react';
import Svg, { Circle, Rect, Path, G, Polygon } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

export default function ExploreBusinessesIllustration({ width = '100%', height = 160 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration of exploring and following local businesses on a map"
    >
      {/* sparkle dots */}
      <Circle cx={18} cy={20} r={2.5} fill="#fff" opacity={0.35} />
      <Circle cx={185} cy={30} r={2} fill="#fff" opacity={0.45} />
      <Circle cx={30} cy={140} r={2.5} fill="#fff" opacity={0.3} />
      <Circle cx={180} cy={140} r={2} fill="#fff" opacity={0.4} />

      {/* map card */}
      <G>
        <Rect x={24} y={30} width={152} height={100} rx={14} fill="#fff" fillOpacity={0.22} stroke="#fff" strokeOpacity={0.6} strokeWidth={1} />
        {/* roads */}
        <Path d="M 30 70 Q 80 50 170 80" stroke="#fff" strokeOpacity={0.55} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M 30 105 Q 90 95 170 115" stroke="#fff" strokeOpacity={0.4} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M 80 32 L 95 128" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
        <Path d="M 135 32 L 130 128" stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} fill="none" />
      </G>

      {/* small storefront blocks */}
      <G>
        <Rect x={45} y={88} width={18} height={14} rx={2} fill="#fff" fillOpacity={0.85} />
        <Rect x={45} y={84} width={18} height={5} rx={1.5} fill="#FCD34D" />
      </G>
      <G>
        <Rect x={148} y={56} width={18} height={14} rx={2} fill="#fff" fillOpacity={0.85} />
        <Rect x={148} y={52} width={18} height={5} rx={1.5} fill="#A7F3D0" />
      </G>

      {/* main location pin */}
      <G>
        <Path
          d="M 105 56 C 105 44 122 44 122 56 C 122 66 113.5 80 113.5 80 C 113.5 80 105 66 105 56 Z"
          fill="#FCD34D"
          stroke="#fff"
          strokeWidth={2}
        />
        <Circle cx={113.5} cy={56} r={5} fill="#fff" />
        <Path d="M 111 56 L 113 58 L 116 54" stroke="#92400E" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>

      {/* compass top-right */}
      <G>
        <Circle cx={158} cy={28} r={14} fill="#fff" fillOpacity={0.95} />
        <Circle cx={158} cy={28} r={14} fill="none" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} />
        <Polygon points="158,18 162,28 158,38 154,28" fill="#EF4444" />
        <Circle cx={158} cy={28} r={2} fill="#fff" />
      </G>

      {/* heart follow badge */}
      <G>
        <Circle cx={42} cy={42} r={11} fill="#F472B6" stroke="#fff" strokeWidth={2} />
        <Path
          d="M 42 47 C 38 44 36 42 36 40 C 36 38 38 37 39.5 38 C 41 39 42 41 42 41 C 42 41 43 39 44.5 38 C 46 37 48 38 48 40 C 48 42 46 44 42 47 Z"
          fill="#fff"
        />
      </G>
    </Svg>
  );
}
