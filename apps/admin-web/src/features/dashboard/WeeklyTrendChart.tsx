import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatShortDate } from '@/lib/format';
import { AXIS_TICK, CHART_COLOR, GRID_COLOR, TOOLTIP_STYLE } from './chart-theme';

type Props = { data: { weekStart: string; count: number }[] };

export function WeeklyTrendChart({ data }: Props) {
  const rows = data.map((d) => ({ label: `Week of ${formatShortDate(d.weekStart)}`, short: formatShortDate(d.weekStart), count: d.count }));

  return (
    <div className="h-64" role="img" aria-label="Complaints received per week, last 12 weeks">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} vertical={false} />
          <XAxis dataKey="short" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
            formatter={(value) => [value, 'Complaints']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={CHART_COLOR}
            strokeWidth={2}
            dot={{ r: 3, fill: CHART_COLOR, strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}