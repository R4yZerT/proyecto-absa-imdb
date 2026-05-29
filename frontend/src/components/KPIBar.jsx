/**
 * Barra de KPIs superiores con cards de métricas globales.
 * Muestra skeleton loaders mientras carga.
 */
import { Film, MessageSquare, ThumbsUp, ThumbsDown, BadgeCheck } from 'lucide-react';

function KpiCard({ icon: Icon, label, value, colorClass }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-850">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function KPIBar({ summary, loading }) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      <KpiCard icon={Film} label="Reseñas" value={summary.total_reviews.toLocaleString()} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
      <KpiCard icon={MessageSquare} label="Aspectos" value={summary.total_aspects.toLocaleString()} colorClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
      <KpiCard icon={ThumbsUp} label="Positivo" value={`${summary.positive_pct}%`} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
      <KpiCard icon={ThumbsDown} label="Negativo" value={`${summary.negative_pct}%`} colorClass="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" />
      <KpiCard icon={BadgeCheck} label="Confianza" value={summary.avg_confidence} colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
    </div>
  );
}
