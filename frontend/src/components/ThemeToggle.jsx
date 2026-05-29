/**
 * Boton para alternar entre modo oscuro y claro.
 * Persiste preferencia en localStorage. Estetica cinematografica.
 */
import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

function getInitialDark() {
  if (typeof window === 'undefined') return false;
  const saved = localStorage.getItem('theme');
  if (saved) return saved === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(getInitialDark);

  const toggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  return (
    <button
      onClick={toggle}
      className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:border-gold/30 hover:bg-slate-50 hover:text-gold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-gold/30 dark:hover:bg-slate-800 dark:hover:text-gold-light"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      <span className="transition-transform duration-300 group-hover:rotate-12">
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </span>
      {/* Glow sutil en hover */}
      <span className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, rgba(212,175,55,0.08), transparent 70%)'
            : 'radial-gradient(circle at center, rgba(212,175,55,0.05), transparent 70%)'
        }}
      />
    </button>
  );
}
