import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS_TICK, CHART_COLOR, GRID_COLOR, TOOLTIP_STYLE } from './chart-theme';

type Props = { data: { bucket: string; count: number }[] };

export function AgingChart({ data }: Props) {
  return (
    <div className="h-64" role="img" aria-label="Open complaints by age">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="bucket" tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: '#f1f5f9' }}
            formatter={(value) => [value, 'Open complaints']}
          />
          <Bar dataKey="count" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}