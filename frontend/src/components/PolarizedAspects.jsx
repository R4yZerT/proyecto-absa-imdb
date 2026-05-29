/**
 * Cards de los aspectos más polarizados (mayor diferencia positivo vs negativo).
 * Ayuda a identificar temas controversiales de las películas.
 */
import { Scale } from 'lucide-react';

export default function PolarizedAspects({ data, loading }) {
  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
        <div className="mb-3 h-4 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const items = data?.slice(0, 5) || [];

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        Aspectos Polarizados
      </h3>
      <ul className="flex-1 space-y-2 overflow-y-auto">
        {items.map((item) => {
          const total = item.positive_count + item.negative_count;
          const posPct = total > 0 ? (item.positive_count / total) * 100 : 0;
          const negPct = total > 0 ? (item.negative_count / total) * 100 : 0;

          return (
            <li
              key={item.aspect_lemma}
              className="rounded-lg border border-slate-100 p-3 transition hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {item.aspect_lemma}
                </span>
                <Scale size={14} className="text-slate-400" />
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span className="text-emerald-500">+{item.positive_count}</span>
                <span>/</span>
                <span className="text-rose-500">-{item.negative_count}</span>
              </div>
              <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${posPct}%` }}
                />
                <div
                  className="bg-rose-500 transition-all"
                  style={{ width: `${negPct}%` }}
                />
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="py-4 text-center text-xs text-slate-400">
            Sin datos disponibles
          </li>
        )}
      </ul>
    </div>
  );
}
