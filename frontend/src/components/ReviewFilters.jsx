/**
 * Controles de filtrado avanzados para la vista de Reseñas.
 * Incluye filtros por sentimiento, rango de fechas, aspecto específico y nivel de confianza.
 */
import { Filter, X, Lock } from 'lucide-react';

const SENTIMENTS = [
  { key: 'positivo', label: 'Positivo', color: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { key: 'neutral', label: 'Neutral', color: 'bg-slate-400', ring: 'ring-slate-400', disabled: true },
  { key: 'negativo', label: 'Negativo', color: 'bg-rose-500', ring: 'ring-rose-500' },
];

export default function ReviewFilters({
  aspects = [],
  filters,
  onChange,
  onClear,
  loadingAspects,
}) {
  const toggleSentiment = (sentiment) => {
    const next = filters.sentiments.includes(sentiment)
      ? filters.sentiments.filter((s) => s !== sentiment)
      : [...filters.sentiments, sentiment];
    onChange({ ...filters, sentiments: next });
  };

  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const hasActiveFilters =
    filters.sentiments.length > 0 ||
    filters.aspect ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.minConfidence > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500 dark:text-slate-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            Filtros
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-rose-500 dark:text-slate-400"
          >
            <X size={12} />
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {/* Filtro por Sentimiento */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Sentimiento
          </label>
          <div className="flex flex-wrap gap-2">
            {SENTIMENTS.map((s) => {
              const active = filters.sentiments.includes(s.key);
              if (s.disabled) {
                return (
                  <button
                    key={s.key}
                    disabled
                    className="flex cursor-not-allowed items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-400 opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                    title="No hay datos neutrales en el dataset"
                  >
                    <span className={`inline-block h-2 w-2 rounded-full ${s.color} opacity-50`} />
                    {s.label}
                  </button>
                );
              }
              return (
                <button
                  key={s.key}
                  onClick={() => toggleSentiment(s.key)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? `border-transparent bg-slate-800 text-white ring-1 ${s.ring} dark:bg-slate-700`
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro por Aspecto */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Aspecto
          </label>
          <select
            value={filters.aspect}
            onChange={(e) => handleChange('aspect', e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Todos los aspectos</option>
            {loadingAspects && <option disabled>Cargando...</option>}
            {aspects.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Rango de Fechas — deshabilitado visualmente */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-400 dark:text-slate-500">
            Rango de Fechas
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <Lock
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300"
              />
            </div>
            <span className="text-xs text-slate-300">-</span>
            <div className="relative flex-1">
              <input
                type="date"
                disabled
                className="w-full cursor-not-allowed rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-400 outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <Lock
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300"
              />
            </div>
          </div>
          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
            Próximamente: el dataset no contiene fechas.
          </p>
        </div>

        {/* Filtro por Confianza Mínima */}
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Confianza Mínima:{' '}
            <span className="font-bold text-slate-700 dark:text-slate-200">
              {filters.minConfidence}%
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minConfidence}
            onChange={(e) => handleChange('minConfidence', Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-accent dark:bg-slate-700"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
