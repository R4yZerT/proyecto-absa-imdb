/**
 * Sidebar cinematografico con navegacion funcional.
 * Se oculta en movil. Estetica "Golden Reel" con bordes sutiles y glow en activo.
 */
import { Film, BarChart3, MessageSquare, Sparkles } from 'lucide-react';

export default function Sidebar({ activeView, onViewChange }) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'reviews', label: 'Reseñas', icon: MessageSquare },
    { key: 'analyze', label: 'Analizar', icon: Sparkles },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:flex">
      {/* Logo area con gradiente sutil */}
      <div className="relative flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold-dark shadow-lg shadow-gold/20">
          <Film size={20} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
        </div>
        <div className="flex flex-col">
          <span className="title-display text-xl leading-none text-slate-800 dark:text-white dark:drop-shadow-[0_0_8px_rgba(212,175,55,0.45)]">
            ABSA Movies
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-gold-light/80">
            Insights
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
          Navegación
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.key;
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onViewChange(item.key)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-gold/10 to-transparent text-gold dark:from-gold/15 dark:text-gold-light'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gold/10 text-gold shadow-sm dark:bg-gold/15 dark:text-gold-light'
                      : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600 dark:bg-slate-900 dark:text-slate-500 dark:group-hover:bg-slate-800 dark:group-hover:text-slate-300'
                  }`}>
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold shadow-sm shadow-gold/40" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer del sidebar con info sutil */}
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gold to-gold-dark opacity-80" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ABSA Engine</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">v1.0.0 &middot; En linea</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
