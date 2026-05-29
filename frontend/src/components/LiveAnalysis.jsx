/**
 * Módulo de análisis ABSA en vivo.
 * Permite escribir un comentario y ver la clasificación de aspectos
 * y sentimientos en tiempo real, con el mismo nivel de detalle que
 * el módulo de reseñas.
 */
import { useState, useCallback } from 'react';
import { Send, Sparkles, AlertTriangle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000, // análisis en vivo puede tardar más
});

export default function LiveAnalysis() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await apiClient.post('/analyze', { text: text.trim() });
      setResult(response.data);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error desconocido al analizar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAnalyze();
    }
  };

  const sentimentConfig = {
    positivo: {
      label: 'Positivo',
      bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      icon: ThumbsUp,
      ring: 'ring-emerald-500',
    },
    negativo: {
      label: 'Negativo',
      bg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      icon: ThumbsDown,
      ring: 'ring-rose-500',
    },

    error: {
      label: 'Error',
      bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      icon: AlertTriangle,
      ring: 'ring-amber-500',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Análisis en Vivo
          </h2>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Escribe un comentario de película en español y obtén la clasificación ABSA en tiempo real:
          aspectos detectados, adjetivos asociados, sentimiento y confianza del modelo.
        </p>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: La actuación del protagonista fue impresionante, aunque la trama se volvió un poco confusa al final..."
            className="min-h-[140px] w-full resize-y rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-accent focus:ring-1 focus:ring-accent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-600"
            maxLength={5000}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {text.length}/5000 · Ctrl+Enter para analizar
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Analizar
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="space-y-6">
          {/* Sentimiento global */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Sentimiento Global
            </h3>
            {(() => {
              const cfg = sentimentConfig[result.overall_sentiment] || sentimentConfig.positivo;
              const Icon = cfg.icon;
              return (
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${cfg.bg} ${cfg.ring}`}
                  >
                    <Icon size={14} />
                    {cfg.label}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Basado en {result.aspects.length} aspecto{result.aspects.length !== 1 ? 's' : ''} detectado
                    {result.aspects.length !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Texto analizado */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Texto Analizado
            </h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {result.text}
            </p>
          </div>

          {/* Aspectos detectados */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Aspectos Detectados ({result.aspects.length})
            </h3>
            {result.aspects.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No se detectaron aspectos en el texto proporcionado.
              </p>
            ) : (
              <div className="space-y-3">
                {result.aspects.map((a, idx) => {
                  const cfg = sentimentConfig[a.sentiment_label] || sentimentConfig.positivo;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={`${a.aspect_lemma}-${idx}`}
                      className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 transition hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {a.aspect_lemma}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {a.fragmento}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${cfg.bg} ${cfg.ring}`}
                        >
                          <Icon size={10} />
                          {cfg.label}
                        </span>
                        <span className="rounded bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {a.adjetivo}
                        </span>
                        <span
                          className="text-[10px] font-bold tabular-nums"
                          title="Confianza del modelo"
                        >
                          {(a.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumen por sentimiento */}
          {result.aspects.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Distribución de Sentimientos
              </h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(
                  result.aspects.reduce((acc, a) => {
                    acc[a.sentiment_label] = (acc[a.sentiment_label] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([sent, count]) => {
                  const cfg = sentimentConfig[sent] || sentimentConfig.positivo;
                  const pct = Math.round((count / result.aspects.length) * 100);
                  return (
                    <div key={sent} className="flex items-center gap-2">
                      <span className={`inline-block h-3 w-3 rounded-full ${sent === 'positivo' ? 'bg-emerald-500' : sent === 'negativo' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                      <span className="text-sm capitalize text-slate-700 dark:text-slate-300">
                        {cfg.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
