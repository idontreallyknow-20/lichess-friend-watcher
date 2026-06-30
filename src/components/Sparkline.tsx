interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
}

/**
 * Minimal inline SVG line chart of a numeric series. No axes, no analysis,
 * just the shape of recent rating movement. Renders nothing useful below 2
 * points (the caller handles the empty case).
 */
export function Sparkline({ values, width = 320, height = 64 }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / range) * innerH;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath =
    `${linePath} L${points[points.length - 1][0].toFixed(1)},${height - pad} ` +
    `L${points[0][0].toFixed(1)},${height - pad} Z`;

  const rising = values[values.length - 1] >= values[0];
  const stroke = rising ? 'var(--win)' : 'var(--loss)';
  const last = points[points.length - 1];

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Rating trend"
    >
      <path d={areaPath} fill={stroke} opacity={0.12} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={2} />
      <circle cx={last[0]} cy={last[1]} r={3} fill={stroke} />
    </svg>
  );
}
