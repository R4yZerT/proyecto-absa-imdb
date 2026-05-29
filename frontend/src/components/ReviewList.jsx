/**
 * Lista paginada de reseñas con detalles expandibles.
 * Muestra texto completo, aspectos detectados con confianza, y paginación.
 */
import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFetch } from '../hooks/useApi';

function ReviewAspects({ reviewId }) {
  const { data, loading } = useFetch(`/reviews/${reviewId}/aspects`);
  const aspects = data?.items || [];

  if (loading) {
    return (
      <div className="mt-3 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (aspects.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Aspectos detectados ({aspects.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {aspects.map((a, idx) => (
          <span
            key={`${a.aspect_lemma}-${idx}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              a.sentiment_label === 'positivo'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800'
                : a.sentiment_label === 'negativo'
                ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-800'
                : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400'
            }`}
            title={`Confianza: ${(a.confidence * 100).toFixed(1)}%`}
          >
            {a.sentiment_label === 'positivo' ? (
              <ThumbsUp size={10} />
            ) : a.sentiment_label === 'negativo' ? (
              <ThumbsDown size={10} />
            ) : null}
            <span>{a.aspect_lemma}</span>
            <span className="text-[9px] opacity-70">{a.adjetivo}</span>
            <span className="text-[9px] font-bold opacity-60">
              {(a.confidence * 100).toFixed(0)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReviewList({ data, loading, error, skip, limit, onPageChange }) {
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
          <div className="max-h-[32rem] overflow-y-auto pr-1">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {reviews.map((review) => {
                const isExpanded = expandedIds.has(review.id);
                return (
                  <li key={review.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {review.review_text}
                      </p>
                      <button
                        onClick={() => toggleExpand(review.id)}
                        className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        aria-label={isExpanded ? 'Colapsar detalles' : 'Expandir detalles'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Detalles
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          review.original_sentiment === 'positivo' || review.original_sentiment === 'positive'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        }`}
                      >
                        {review.original_sentiment}
                      </span>
                      <span className="text-xs text-slate-400">ID: {review.id}</span>
                    </div>
                    {isExpanded && <ReviewAspects reviewId={review.id} />}
                  </li>
                );
              })}
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
