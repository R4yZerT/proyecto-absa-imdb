/**
 * Mini gráfico de barras para la distribución de confianza del modelo.
 * Muestra cuántos aspectos caen en cada rango de confianza.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="text-xs font-semibold text-white">{p.bin_label}</p>
      <p className="text-[11px] text-slate-300">{p.count} aspectos</p>
    </div>
  );
}

export default function ConfidenceChart({ data, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
        <div className="mb-3 h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const items = data || [];

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        Distribución de Confianza
      </h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={items} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="bin_label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {items.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
