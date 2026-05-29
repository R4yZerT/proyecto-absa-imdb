/**
 * Mini grafico de barras para la distribucion de confianza del modelo.
 * Paleta cinematografica con acentos dorados.
 */
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-2xl backdrop-blur-sm">
      <p className="text-xs font-semibold text-white">{p.bin_label}</p>
      <p className="text-[11px] text-slate-300">{p.count} aspectos</p>
    </div>
  );
}

export default function ConfidenceChart({ data, loading }) {
  if (loading) {
    return (
      <div className="card-cinema p-4">
        <div className="mb-3 h-4 w-40 animate-pulse-subtle rounded bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 animate-pulse-subtle rounded bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }

  const items = data || [];

  // Paleta armonica: escala del indigo marca al dorado
  const colors = ['#4338ca', '#5b4fcf', '#7e6ad4', '#a18cd9', '#d4af37'];

  return (
    <div className="card-cinema p-4 flex flex-col h-full">
      <h3 className="label-caps mb-3">Distribucion de Confianza</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={items} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="bin_label"
              tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#a1a1aa', fontFamily: 'DM Sans, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {items.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
