/**
 * Lista de los adjetivos descriptivos mas frecuentes.
 * Estetica cinematografica con ranking estilizado y badges de sentimiento.
 */
export default function TopWordsList({ data, loading }) {
  if (loading) {
    return (
      <div className="card-cinema p-4">
        <div className="mb-3 h-4 w-32 animate-pulse-subtle rounded bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-8 animate-pulse-subtle rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  const items = data?.slice(0, 10) || [];

  return (
    <div className="card-cinema p-4">
      <h3 className="label-caps mb-3">Top Adjetivos</h3>
      <ul className="flex-1 space-y-1 overflow-y-auto">
        {items.map((item, index) => (
          <li
            key={item.word}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="flex items-center gap-3">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                index === 0
                  ? 'bg-yellow-400/20 text-yellow-700 ring-1 ring-yellow-400/30 dark:bg-yellow-400/15 dark:text-yellow-300'
                  : index === 1
                  ? 'bg-slate-300 text-slate-800 ring-1 ring-slate-400/30 dark:bg-slate-400 dark:text-white'
                  : index === 2
                  ? 'bg-amber-700/20 text-amber-900 ring-1 ring-amber-700/30 dark:bg-amber-600/15 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
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
                    ? 'text-red-600 dark:text-red-400'
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
