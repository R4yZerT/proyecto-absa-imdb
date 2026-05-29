/**
 * Gráfico de dona para la distribución de sentimientos.
 * Muestra la distribución global o la de un aspecto seleccionado.
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = {
  positivo: '#10b981',
  negativo: '#f43f5e',
};

export default function SentimentDonut({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Sin datos de distribución
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.sentiment_label,
    value: d.count,
    pct: d.pct,
  }));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#cbd5e1'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              color: '#f8fafc',
              fontSize: 12,
            }}
            formatter={(value, name, props) => [`${value} (${props?.payload?.pct}%)`, name]}
          />
          <Legend verticalAlign="bottom" height={30} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
