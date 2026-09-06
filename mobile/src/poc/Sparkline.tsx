import { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

interface SparklineProps {
  values: number[];
  width: number;
  height: number;
  stroke: string;
}

export function Sparkline({ values, width, height, stroke }: SparklineProps) {
  const { line, area } = useMemo(() => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = width / (values.length - 1);
    const pts = values.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    });
    return {
      line: pts.join(' '),
      area: `M0,${height} L${pts.join(' L')} L${width},${height} Z`,
    };
  }, [values, width, height]);

  return (
    <Svg width={width} height={height}>
      <Path d={area} fill={stroke} opacity={0.14} />
      <Path
        d={`M${line.split(' ')[0]} ` + line.split(' ').slice(1).map((p) => `L${p}`).join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}