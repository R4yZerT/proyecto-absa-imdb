/**
 * Dashboard principal de ABSA Movie Insights.
 * Layout tipo SaaS con sidebar, KPIs, graficos interactivos y lista de resenas.
 * Redisenado con estetica cinematografica "Golden Reel".
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

  // Filtros avanzados para la vista de Resenas
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

  // Distribucion del aspecto seleccionado, o global si no hay seleccion
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

  const viewTitle = activeView === 'dashboard'
    ? 'Dashboard'
    : activeView === 'reviews'
    ? 'Reseñas'
    : 'Analizar en Vivo';

  return (
    <div className="flex min-h-screen bg-cinema-base text-slate-900 dark:bg-cinema-dark-base dark:text-slate-100">
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />

      <main className="flex-1 flex flex-col">
        {/* Header cinematografico */}
        <header className="relative flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
          {/* Gradiente sutil decorativo en el header */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="flex items-center gap-3">
            <h1 className="title-display text-2xl text-slate-800 dark:text-white">
              {viewTitle}
            </h1>
            <span className="hidden h-4 w-px bg-slate-300 dark:bg-slate-700 sm:block" />
            <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">
              ABSA Movie Insights
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Contenido con animaciones staggered */}
        {activeView === 'dashboard' && (
          <div className="flex-1 space-y-6 p-4 sm:p-6">
            {/* KPIs */}
            <KPIBar summary={summary} loading={loadingSummary} />

            {/* Graficos: Top Aspectos + Nube de Palabras */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="flex flex-col animate-fade-in animate-fade-in-delay-1">
                <AspectBarChart
                  data={topAspects?.items || []}
                  selectedAspect={selectedAspect}
                  onSelect={handleSelectAspect}
                />
              </div>
              <div className="flex flex-col animate-fade-in animate-fade-in-delay-2">
                <WordCloud data={wordsData?.items || []} loading={loadingWords} />
              </div>
            </div>

            {/* Panel de distribucion cuando se selecciona un aspecto */}
            {selectedAspect && aspectDist && (
              <div className="animate-fade-in animate-fade-in-delay-2 card-cinema p-5">
                <h3 className="label-caps mb-3">
                  Distribucion de Sentimiento: <span className="text-gold">{selectedAspect}</span>
                </h3>
                <div className="flex flex-wrap gap-4">
                  {aspectDist.distribution.map((d) => {
                    const color =
                      d.sentiment_label === 'positivo'
                        ? 'bg-emerald-500'
                        : 'bg-crimson';
                    return (
                      <div key={d.sentiment_label} className="flex items-center gap-2">
                        <span className={`inline-block h-3 w-3 rounded-full ${color}`} />
                        <span className="text-sm capitalize text-slate-600 dark:text-slate-300">
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
                  className="mt-3 text-xs text-slate-400 underline transition hover:text-gold dark:hover:text-gold-light"
                >
                  Limpiar seleccion
                </button>
              </div>
            )}

            {/* Paneles adicionales: Top Adjetivos + Confianza + Polarizacion */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="flex flex-col animate-fade-in animate-fade-in-delay-3">
                <TopWordsList data={wordsData?.items || []} loading={loadingWords} />
              </div>
              <div className="flex flex-col animate-fade-in animate-fade-in-delay-4">
                <ConfidenceChart data={confidenceData?.items || []} loading={loadingConfidence} />
              </div>
              <div className="flex flex-col animate-fade-in animate-fade-in-delay-5">
                <PolarizedAspects data={polarizedData?.items || []} loading={loadingPolarized} />
              </div>
            </div>
          </div>
        )}

        {activeView === 'reviews' && (
          <div className="flex-1 space-y-5 p-4 sm:p-6 animate-fade-in">
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
                        ? 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20'
                        : s === 'negativo'
                        ? 'bg-crimson/10 text-crimson ring-1 ring-crimson/20 dark:bg-crimson/10 dark:text-crimson dark:ring-crimson/20'
                        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
                    }`}
                  >
                    {s}
                  </span>
                ))}
                {reviewFilters.aspect && (
                  <span className="rounded-full bg-gold/10 px-2.5 py-0.5 text-[10px] font-medium text-gold ring-1 ring-gold/20">
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

        {activeView === 'analyze' && (
          <div className="flex-1 p-4 sm:p-6 animate-fade-in">
            <LiveAnalysis />
          </div>
        )}
      </main>
    </div>
  );
}
