import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CATEGORY_LABELS, type ComplaintCategory } from '@civitrace/shared';
import { AXIS_TICK, CHART_COLOR, GRID_COLOR, TOOLTIP_STYLE } from './chart-theme';

type Props = { data: { category: ComplaintCategory; count: number }[] };

export function CategoryChart({ data }: Props) {
  const rows = data.map((d) => ({ label: CATEGORY_LABELS[d.category], count: d.count }));

  return (
    <div className="h-72" role="img" aria-label="Complaints by category">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: '#f1f5f9' }}
            formatter={(value) => [value, 'Complaints']}
          />
          <Bar dataKey="count" fill={CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}