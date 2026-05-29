/**
 * Lista paginada de reseñas con filtros aplicados.
 * Muestra skeleton rows durante la carga y maneja errores gracefully.
 */
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

export default function ReviewList({ data, loading, error, skip, limit, onPageChange }) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-8 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
        <AlertTriangle size={32} />
        <p className="font-medium">Error al cargar reseñas</p>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  const reviews = data?.items || [];
  const total = data?.total || 0;
  const hasPrev = skip > 0;
  const hasNext = skip + limit < total;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          Reseñas filtradas
        </h3>
        <span className="text-xs text-slate-400">{total} resultados</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : (
        <>
          <div className="max-h-96 overflow-y-auto pr-1">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {reviews.map((review) => (
                <li key={review.id} className="py-4">
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    {review.review_text.length > 200
                      ? review.review_text.slice(0, 200) + '...'
                      : review.review_text}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        review.original_sentiment === 'positivo' || review.original_sentiment === 'positive'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : review.original_sentiment === 'negativo' || review.original_sentiment === 'negative'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {review.original_sentiment}
                    </span>
                    <span className="text-xs text-slate-400">ID: {review.id}</span>
                  </div>
                </li>
              ))}
              {reviews.length === 0 && (
                <li className="py-8 text-center text-sm text-slate-400">
                  No se encontraron reseñas para los filtros seleccionados.
                </li>
              )}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => onPageChange(skip - limit)}
              disabled={!hasPrev}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="text-xs text-slate-400">
              Página {Math.floor(skip / limit) + 1} de {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => onPageChange(skip + limit)}
              disabled={!hasNext}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
