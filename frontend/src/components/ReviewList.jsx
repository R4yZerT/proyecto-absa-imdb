/**
 * Lista paginada de resenas con detalles expandibles.
 * Estetica cinematografica con cards refinadas y transiciones suaves.
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
          <div key={i} className="h-6 animate-pulse-subtle rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (aspects.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
      <p className="label-caps mb-2">
        Aspectos detectados ({aspects.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {aspects.map((a, idx) => (
          <span
            key={`${a.aspect_lemma}-${idx}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur-sm ${
              a.sentiment_label === 'positivo'
                ? 'bg-emerald-500/8 text-emerald-700 ring-1 ring-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
                : a.sentiment_label === 'negativo'
                ? 'bg-gradient-to-br from-red-500/12 to-red-600/8 text-red-700 ring-1 ring-red-500/15 dark:from-red-500/15 dark:to-red-600/10 dark:text-red-400 dark:ring-red-500/20'
                : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-crimson/20 bg-crimson/5 p-8 text-crimson dark:border-crimson/20 dark:bg-crimson/5">
        <AlertTriangle size={32} />
        <p className="font-medium">Error al cargar resenas</p>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  const reviews = data?.items || [];
  const total = data?.total || 0;
  const hasPrev = skip > 0;
  const hasNext = skip + limit < total;

  return (
    <div className="card-cinema p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="label-caps">Resenas filtradas</h3>
        <span className="text-xs text-slate-400">{total} resultados</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse-subtle rounded-xl bg-slate-100 dark:bg-slate-800"
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
                  <li key={review.id} className="py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30 rounded-lg px-2 -mx-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {review.review_text}
                      </p>
                      <button
                        onClick={() => toggleExpand(review.id)}
                        className="mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                        aria-label={isExpanded ? 'Colapsar detalles' : 'Expandir detalles'}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span className="hidden sm:inline">Detalles</span>
                      </button>
                    </div>
                    {(() => {
                      const sentimentLower = (review.original_sentiment || '').toString().toLowerCase();
                      const isPos = sentimentLower === 'positivo' || sentimentLower === 'positive';
                      const isNeg = sentimentLower === 'negativo' || sentimentLower === 'negative';
                      return (
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isPos
                                ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
                                : isNeg
                                ? 'bg-gradient-to-br from-red-500/15 to-red-600/10 text-red-700 ring-1 ring-red-500/20 dark:from-red-500/20 dark:to-red-600/15 dark:text-red-400 dark:ring-red-500/25'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
                            }`}
                          >
                            {review.original_sentiment}
                          </span>
                          <span className="text-xs text-slate-400">ID: {review.id}</span>
                        </div>
                      );
                    })()}
                    {isExpanded && <ReviewAspects reviewId={review.id} />}
                  </li>
                );
              })}
              {reviews.length === 0 && (
                <li className="py-8 text-center text-sm text-slate-400">
                  No se encontraron resenas para los filtros seleccionados.
                </li>
              )}
            </ul>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              onClick={() => onPageChange(skip - limit)}
              disabled={!hasPrev}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <span className="text-xs text-slate-400">
              Pagina {Math.floor(skip / limit) + 1} de {Math.ceil(total / limit) || 1}
            </span>
            <button
              onClick={() => onPageChange(skip + limit)}
              disabled={!hasNext}
              className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Siguiente <ChevronRight size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
