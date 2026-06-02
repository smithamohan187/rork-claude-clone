import React from 'react';
import Svg, { Circle, Rect, Path, G, Text as SvgText } from 'react-native-svg';

interface Props {
  width?: number | string;
  height?: number | string;
}

export default function EngageTrustIllustration({ width = '100%', height = 160 }: Props) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 200 160"
      accessibilityLabel="Illustration of a customer and a business engaging with a handshake and a five-star trust rating"
    >
      {/* sparkle background */}
      <Circle cx={20} cy={22} r={2.5} fill="#fff" opacity={0.35} />
      <Circle cx={185} cy={40} r={2} fill="#fff" opacity={0.45} />
      <Circle cx={28} cy={138} r={2.5} fill="#fff" opacity={0.3} />
      <Circle cx={178} cy={142} r={2} fill="#fff" opacity={0.4} />

      {/* storefront on the right */}
      <G>
        <Rect x={128} y={70} width={48} height={52} rx={4} fill="#fff" fillOpacity={0.9} />
        <Path d="M 124 70 L 180 70 L 174 56 L 130 56 Z" fill="#fff" fillOpacity={0.75} />
        {/* awning stripes */}
        <Path d="M 138 56 L 134 70" stroke="#F472B6" strokeOpacity={0.85} strokeWidth={2} />
        <Path d="M 152 56 L 150 70" stroke="#F472B6" strokeOpacity={0.85} strokeWidth={2} />
        <Path d="M 166 56 L 168 70" stroke="#F472B6" strokeOpacity={0.85} strokeWidth={2} />
        {/* door */}
        <Rect x={146} y={92} width={12} height={30} rx={2} fill="#92400E" fillOpacity={0.7} />
        {/* window */}
        <Rect x={133} y={80} width={10} height={9} rx={1.5} fill="#A7F3D0" />
        <Rect x={161} y={80} width={10} height={9} rx={1.5} fill="#A7F3D0" />
      </G>

      {/* person on the left */}
      <G>
        <Circle cx={48} cy={70} r={15} fill="#fff" />
        <Rect x={30} y={86} width={36} height={32} rx={10} fill="#fff" />
      </G>

      {/* handshake in the middle */}
      <G>
        <Circle cx={100} cy={92} r={20} fill="#fff" fillOpacity={0.18} />
        <Path
          d="M 78 92 L 92 86 L 100 92 L 108 86 L 122 92 L 116 100 L 108 98 L 100 102 L 92 98 L 84 100 Z"
          fill="#FCD34D"
          stroke="#fff"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </G>

      {/* five-star rating bubble above */}
      <G>
        <Rect x={62} y={20} width={76} height={22} rx={11} fill="#fff" />
        {[0, 1, 2, 3, 4].map((i) => (
          <SvgText
            key={`star-${i}`}
            x={74 + i * 13}
            y={36}
            fontSize={12}
            fill="#F59E0B"
            textAnchor="middle"
            fontWeight="bold"
          >
            ★
          </SvgText>
        ))}
      </G>

      {/* speech bubble small */}
      <G>
        <Rect x={150} y={22} width={28} height={20} rx={10} fill="#fff" fillOpacity={0.92} />
        <Path d="M 158 40 L 156 46 L 164 40 Z" fill="#fff" fillOpacity={0.92} />
        <Circle cx={158} cy={32} r={1.6} fill="#00B246" />
        <Circle cx={164} cy={32} r={1.6} fill="#00B246" />
        <Circle cx={170} cy={32} r={1.6} fill="#00B246" />
      </G>
    </Svg>
  );
}
