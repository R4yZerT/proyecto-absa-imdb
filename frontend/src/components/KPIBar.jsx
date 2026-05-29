/**
 * Barra de KPIs superiores con cards de metricas globales.
 * Estetica cinematografica con iconos, bordes sutiles y glow dorado.
 */
import { Film, MessageSquare, ThumbsUp, ThumbsDown, BadgeCheck } from 'lucide-react';

function KpiCard({ icon: Icon, label, value, colorClass, index }) {
  return (
    <div className="card-cinema p-5 animate-fade-in" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="label-caps mb-0.5">{label}</p>
          <p className="title-display text-3xl text-slate-900 dark:text-white">{value}</p>
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
            className="h-24 animate-pulse-subtle rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </div>
    );
  }

  const kpiItems = [
    {
      icon: Film,
      label: 'Reseñas',
      value: summary.total_reviews.toLocaleString(),
      colorClass: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
    },
    {
      icon: MessageSquare,
      label: 'Aspectos',
      value: summary.total_aspects.toLocaleString(),
      colorClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400',
    },
    {
      icon: ThumbsUp,
      label: 'Positivo',
      value: `${summary.positive_pct}%`,
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    {
      icon: ThumbsDown,
      label: 'Negativo',
      value: `${summary.negative_pct}%`,
      colorClass: 'bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-600 dark:from-red-500/25 dark:to-red-600/15 dark:text-red-400',
    },
    {
      icon: BadgeCheck,
      label: 'Confianza',
      value: summary.avg_confidence != null ? `${(Number(summary.avg_confidence) * 100).toFixed(1)}%` : 'N/A',
      colorClass: 'bg-gold/10 text-gold dark:bg-gold/15 dark:text-gold-light',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {kpiItems.map((item, i) => (
        <KpiCard key={item.label} {...item} index={i} />
      ))}
    </div>
  );
}
