/**
 * Sidebar minimalista con navegación funcional.
 * Se oculta en móvil.
 */
import { Film, BarChart3, MessageSquare, Settings } from 'lucide-react';

export default function Sidebar({ activeView, onViewChange }) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'reviews', label: 'Reseñas', icon: MessageSquare },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
        <Film size={24} className="text-accent" />
        <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-white">
          ABSA Movies
        </span>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.key;
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  onClick={() => onViewChange(item.key)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-accent/10 text-accent dark:bg-accent/20'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Settings size={14} />
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
