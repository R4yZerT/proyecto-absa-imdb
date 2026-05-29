/**
 * Gráfico de barras horizontales para los Top Aspectos.
 * Paleta cinematografica con acentos dorados y cobrizos.
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

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-sm">
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
          <span className="font-medium text-crimson">Negativos:</span>{' '}
          -{p.negative_count}
        </p>
      </div>
    </div>
  );
}

export default function AspectBarChart({ data, selectedAspect, onSelect }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Sin datos de aspectos
      </div>
    );
  }

  // Paleta armonica cinematografica: gradiente continuo del indigo marca al dorado.
  // Interpolacion lineal en RGB para una escala cohesiva y profesional.
  function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));
    return `rgb(${r}, ${g}, ${b})`;
  }

  const startColor = '#4338ca'; // Indigo vibrante (marca)
  const endColor   = '#d4af37'; // Dorado cinetico (marca)
  const total = data.length;
  const palette = data.map((_, i) =>
    interpolateColor(startColor, endColor, total > 1 ? i / (total - 1) : 0)
  );

  return (
    <div className="card-cinema p-4">
      <h3 className="label-caps mb-4">Top Aspectos</h3>
      <ResponsiveContainer width="100%" height={420}>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="aspect_lemma"
            type="category"
            width={100}
            tick={{ fontSize: 12, fill: '#a1a1aa', fontFamily: 'DM Sans, sans-serif' }}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={<CustomTooltip />}
          />
          <Bar dataKey="count" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  selectedAspect === entry.aspect_lemma
                    ? '#e63946'
                    : palette[index]
                }
                style={{
                  filter: selectedAspect === entry.aspect_lemma
                    ? 'drop-shadow(0 2px 6px rgba(230,57,70,0.3))'
                    : 'none',
                }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {selectedAspect && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="rounded-lg bg-gold/10 px-2.5 py-1 text-gold ring-1 ring-gold/20">
            {selectedAspect}
          </span>
          <button
            onClick={() => onSelect(null)}
            className="underline transition hover:text-crimson"
          >
            Limpiar filtro
          </button>
        </div>
      )}
    </div>
  );
}
