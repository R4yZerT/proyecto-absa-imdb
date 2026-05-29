/**
 * Modulo de analisis ABSA en vivo.
 * Estetica cinematografica con textarea refinada, boton dorado y cards de resultados.
 */
import { useState, useCallback } from 'react';
import { Send, Sparkles, AlertTriangle, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
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
      bg: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
      icon: ThumbsUp,
      ring: 'ring-emerald-500/20',
    },
    negativo: {
      label: 'Negativo',
      bg: 'bg-gradient-to-br from-red-500/15 to-red-600/10 text-red-700 dark:from-red-500/20 dark:to-red-600/15 dark:text-red-400',
      icon: ThumbsDown,
      ring: 'ring-red-500/20 dark:ring-red-400/25',
    },
    error: {
      label: 'Error',
      bg: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
      icon: AlertTriangle,
      ring: 'ring-amber-500/20',
    },
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="card-cinema p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10">
            <Sparkles size={16} className="text-gold" />
          </div>
          <h2 className="label-caps">Analisis en Vivo</h2>
        </div>
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          Escribe un comentario de pelicula en espanol y obten la clasificacion ABSA en tiempo real:
          aspectos detectados, adjetivos asociados, sentimiento y confianza del modelo.
        </p>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: La actuacion del protagonista fue impresionante, aunque la trama se volvio un poco confusa al final..."
            className="min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-gold focus:ring-1 focus:ring-gold/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-600"
            maxLength={5000}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {text.length}/5000 · Ctrl+Enter para analizar
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-lg shadow-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
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
        <div className="flex items-center gap-3 rounded-xl border border-crimson/20 bg-crimson/5 p-5 text-crimson">
          <AlertTriangle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Resultados */}
      {result && (
        <div className="space-y-5 animate-fade-in">
          {/* Sentimiento global */}
          <div className="card-cinema p-5">
            <h3 className="label-caps mb-3">Sentimiento Global</h3>
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
          <div className="card-cinema p-5">
            <h3 className="label-caps mb-3">Texto Analizado</h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {result.text}
            </p>
          </div>

          {/* Aspectos detectados */}
          <div className="card-cinema p-5">
            <h3 className="label-caps mb-3">Aspectos Detectados ({result.aspects.length})</h3>
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
                      className="flex flex-col gap-2 rounded-xl border border-slate-100 p-3 transition hover:border-slate-200 dark:border-slate-800 dark:hover:border-slate-700 sm:flex-row sm:items-center sm:justify-between"
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
                        <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {a.adjetivo}
                        </span>
                        <span
                          className="text-[10px] font-bold tabular-nums text-gold"
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
            <div className="card-cinema p-5">
              <h3 className="label-caps mb-3">Distribucion de Sentimientos</h3>
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
                      <span className={`inline-block h-3 w-3 rounded-full ${sent === 'positivo' ? 'bg-emerald-500' : sent === 'negativo' ? 'bg-red-500 dark:bg-red-400' : 'bg-slate-400'}`} />
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
