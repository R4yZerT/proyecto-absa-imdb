/**
 * Dashboard principal de ABSA Movie Insights.
 * Layout tipo SaaS con sidebar, KPIs, gráficos interactivos y lista de reseñas.
 * Rediseñado para enfocar el Dashboard en métricas agregadas y mover
 * las reseñas detalladas a una vista dedicada con filtros avanzados.
 */
import { useState, useMemo, useCallback } from 'react';
import { useFetch } from './hooks/useApi';
import Sidebar from './components/Sidebar';
import KPIBar from './components/KPIBar';
import AspectBarChart from './components/AspectBarChart';
import WordCloud from './components/WordCloud';
import TopWordsList from './components/TopWordsList';
import ConfidenceChart from './components/ConfidenceChart';
import PolarizedAspects from './components/PolarizedAspects';
import ReviewList from './components/ReviewList';
import ReviewFilters from './components/ReviewFilters';
import LiveAnalysis from './components/LiveAnalysis';
import ThemeToggle from './components/ThemeToggle';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedAspect, setSelectedAspect] = useState(null);
  const [skip, setSkip] = useState(0);
  const LIMIT = 10;

  // Filtros avanzados para la vista de Reseñas
  const [reviewFilters, setReviewFilters] = useState({
    sentiments: [],
    aspect: '',
    dateFrom: '',
    dateTo: '',
    minConfidence: 0,
  });

  // Datos globales (no dependen del aspecto seleccionado)
  const { data: summary, loading: loadingSummary } = useFetch('/summary');
  const { data: topAspects } = useFetch('/aspects/top', { limit: 10 });
  const { data: wordsData, loading: loadingWords } = useFetch('/words/top', { limit: 60 });

  // Datos adicionales para el dashboard
  const { data: confidenceData, loading: loadingConfidence } = useFetch('/confidence/distribution');
  const { data: polarizedData, loading: loadingPolarized } = useFetch('/aspects/polarized');

  // Lista de aspectos para el dropdown de filtros
  const { data: aspectsList, loading: loadingAspectsList } = useFetch('/aspects/list');

  // Distribución del aspecto seleccionado, o global si no hay selección
  const { data: aspectDist } = useFetch(
    selectedAspect ? `/aspects/${encodeURIComponent(selectedAspect)}/distribution` : null,
    null,
    [selectedAspect]
  );

  // Reviews filtradas por aspecto seleccionado y filtros avanzados
  const reviewParams = useMemo(() => {
    const sentiment =
      reviewFilters.sentiments.length === 1 ? reviewFilters.sentiments[0] : undefined;
    return {
      aspect: reviewFilters.aspect || selectedAspect || undefined,
      sentiment,
      skip,
      limit: LIMIT,
      min_confidence: reviewFilters.minConfidence > 0 ? reviewFilters.minConfidence / 100 : undefined,
      date_from: reviewFilters.dateFrom || undefined,
      date_to: reviewFilters.dateTo || undefined,
    };
  }, [selectedAspect, reviewFilters, skip]);

  const { data: reviewsData, loading: loadingReviews, error: errorReviews } = useFetch(
    '/reviews',
    reviewParams,
    [activeView, selectedAspect, reviewFilters.sentiments.join(','), reviewFilters.aspect, reviewFilters.minConfidence, reviewFilters.dateFrom, reviewFilters.dateTo, skip]
  );

  const handleSelectAspect = (aspect) => {
    setSelectedAspect(aspect);
    setSkip(0);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
    setSkip(0);
  };

  const handleFilterChange = useCallback((newFilters) => {
    setReviewFilters(newFilters);
    setSkip(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setReviewFilters({
      sentiments: [],
      aspect: '',
      dateFrom: '',
      dateTo: '',
      minConfidence: 0,
    });
    setSelectedAspect(null);
    setSkip(0);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-lg font-bold tracking-tight">
            {activeView === 'dashboard'
              ? 'Dashboard'
              : activeView === 'reviews'
              ? 'Reseñas'
              : 'Analizar'}
          </h1>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* VISTA DASHBOARD                                                */}
        {/* ─────────────────────────────────────────────────────────────── */}
        {activeView === 'dashboard' && (
          <div className="flex-1 space-y-6 p-6">
            {/* KPIs */}
            <KPIBar summary={summary} loading={loadingSummary} />

            {/* Gráficos: Top Aspectos + Nube de Palabras */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="flex flex-col">
                <AspectBarChart
                  data={topAspects?.items || []}
                  selectedAspect={selectedAspect}
                  onSelect={handleSelectAspect}
                />
              </div>
              <div className="flex flex-col">
                <WordCloud data={wordsData?.items || []} loading={loadingWords} />
              </div>
            </div>

            {/* Panel de distribución (compacto) cuando se selecciona un aspecto */}
            {selectedAspect && aspectDist && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Distribución de Sentimiento: {selectedAspect}
                </h3>
                <div className="flex flex-wrap gap-4">
                  {aspectDist.distribution.map((d) => {
                    const color =
                      d.sentiment_label === 'positivo'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500';
                    return (
                      <div key={d.sentiment_label} className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 rounded-full ${color}`} />
                        <span className="text-sm capitalize text-slate-700 dark:text-slate-300">
                          {d.sentiment_label}
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {d.count} ({d.pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setSelectedAspect(null)}
                  className="mt-3 text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Limpiar selección
                </button>
              </div>
            )}

            {/* Paneles adicionales: Top Adjetivos + Confianza + Polarización */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="flex flex-col">
                <TopWordsList data={wordsData?.items || []} loading={loadingWords} />
              </div>
              <div className="flex flex-col">
                <ConfidenceChart data={confidenceData?.items || []} loading={loadingConfidence} />
              </div>
              <div className="flex flex-col">
                <PolarizedAspects data={polarizedData?.items || []} loading={loadingPolarized} />
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* VISTA RESEÑAS                                                  */}
        {/* ─────────────────────────────────────────────────────────────── */}
        {activeView === 'reviews' && (
          <div className="flex-1 space-y-6 p-6">
            {/* Controles de filtrado avanzados */}
            <ReviewFilters
              aspects={aspectsList?.items || []}
              filters={reviewFilters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              loadingAspects={loadingAspectsList}
            />

            {/* Indicadores de filtros activos */}
            {(reviewFilters.sentiments.length > 0 || reviewFilters.aspect) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Filtros activos:</span>
                {reviewFilters.sentiments.map((s) => (
                  <span
                    key={s}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                      s === 'positivo'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : s === 'negativo'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {s}
                  </span>
                ))}
                {reviewFilters.aspect && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-medium text-accent">
                    {reviewFilters.aspect}
                  </span>
                )}
              </div>
            )}

            <ReviewList
              data={reviewsData}
              loading={loadingReviews}
              error={errorReviews}
              skip={skip}
              limit={LIMIT}
              onPageChange={setSkip}
            />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* VISTA ANALIZAR EN VIVO                                         */}
        {/* ─────────────────────────────────────────────────────────────── */}
        {activeView === 'analyze' && (
          <div className="flex-1 p-6">
            <LiveAnalysis />
          </div>
        )}
      </main>
    </div>
  );
}
