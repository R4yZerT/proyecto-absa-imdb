/**
 * Gráfico de barras horizontales para los Top Aspectos.
 * Permite hacer clic en una barra para filtrar el resto del dashboard.
 * Incluye tooltip personalizado de alto contraste para modo oscuro.
 */
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/**
 * Tooltip personalizado con texto blanco sobre fondo oscuro
 * para garantizar legibilidad perfecta en modo oscuro.
 */
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-900 px-4 py-3 shadow-xl">
      <p className="mb-1 text-sm font-semibold text-white">{p.aspect_lemma}</p>
      <div className="space-y-0.5 text-xs text-slate-200">
        <p>
          <span className="font-medium text-slate-400">Total:</span>{' '}
          {p.count}
        </p>
        <p>
          <span className="font-medium text-emerald-400">Positivos:</span>{' '}
          +{p.positive_count}
        </p>
        <p>
          <span className="font-medium text-rose-400">Negativos:</span>{' '}
          -{p.negative_count}
        </p>
        {p.neutral_count > 0 && (
          <p>
            <span className="font-medium text-slate-400">Neutros:</span>{' '}
            {p.neutral_count}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AspectBarChart({ data, selectedAspect, onSelect }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Sin datos de aspectos
      </div>
    );
  }

  const palette = [
    '#6366f1',
    '#8b5cf6',
    '#ec4899',
    '#f43f5e',
    '#f97316',
    '#eab308',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#a855f7',
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        Top Aspectos
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
          onClick={(state) => {
            if (state && state.activePayload) {
              onSelect(state.activePayload[0].payload.aspect_lemma);
            }
          }}
          className="cursor-pointer"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="aspect_lemma"
            type="category"
            width={100}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  selectedAspect === entry.aspect_lemma
                    ? '#f43f5e'
                    : palette[index % palette.length]
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {selectedAspect && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded bg-accent/10 px-2 py-1 text-accent">
            {selectedAspect}
          </span>
          <button
            onClick={() => onSelect(null)}
            className="underline hover:text-rose-500"
          >
            Limpiar filtro
          </button>
        </div>
      )}
    </div>
  );
}
