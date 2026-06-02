import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import qrcode from 'qrcode-generator';

interface QRCodeViewProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  logoSize?: number;
  logoElement?: React.ReactNode;
}

function QRCodeViewComponent({
  value,
  size = 220,
  color = '#0F172A',
  backgroundColor = '#FFFFFF',
  logoSize = 48,
  logoElement,
}: QRCodeViewProps) {
  const modules = useMemo(() => {
    const qr = qrcode(0, 'H');
    qr.addData(value || ' ');
    qr.make();
    const count = qr.getModuleCount();
    const grid: boolean[][] = [];
    for (let r = 0; r < count; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c));
      }
      grid.push(row);
    }
    return grid;
  }, [value]);

  const count = modules.length;
  const cellSize = size / count;

  const logoCoverCount = logoElement
    ? Math.ceil(logoSize / cellSize) + 2
    : 0;
  const logoStart = logoElement ? Math.floor((count - logoCoverCount) / 2) : 0;
  const logoEnd = logoStart + logoCoverCount;

  const rects: React.ReactNode[] = [];
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!modules[r][c]) continue;
      if (
        logoElement &&
        r >= logoStart &&
        r < logoEnd &&
        c >= logoStart &&
        c < logoEnd
      ) {
        continue;
      }
      rects.push(
        <Rect
          key={`${r}-${c}`}
          x={c * cellSize}
          y={r * cellSize}
          width={cellSize + 0.5}
          height={cellSize + 0.5}
          fill={color}
        />
      );
    }
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>{rects}</G>
      </Svg>
      {logoElement ? (
        <View
          style={{
            position: 'absolute',
            width: logoSize,
            height: logoSize,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor,
            borderRadius: 8,
          }}
        >
          {logoElement}
        </View>
      ) : null}
    </View>
  );
}

export default React.memo(QRCodeViewComponent);
