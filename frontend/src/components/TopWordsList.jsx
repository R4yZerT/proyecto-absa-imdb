/**
 * Lista de los adjetivos descriptivos más frecuentes.
 * Muestra palabra, frecuencia y sentimiento dominante en formato tabla limpio.
 */
export default function TopWordsList({ data, loading }) {
  if (loading) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const items = data?.slice(0, 10) || [];

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        Top Adjetivos
      </h3>
      <ul className="flex-1 space-y-1.5 overflow-y-auto">
        {items.map((item, index) => (
          <li
            key={item.word}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {index + 1}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {item.word}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-medium ${
                  item.sentiment === 'positivo'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : item.sentiment === 'negativo'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.sentiment}
              </span>
              <span className="min-w-[2rem] text-right text-xs font-bold text-slate-900 dark:text-white">
                {item.frequency}
              </span>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="py-4 text-center text-xs text-slate-400">
            Sin datos disponibles
          </li>
        )}
      </ul>
    </div>
  );
}
