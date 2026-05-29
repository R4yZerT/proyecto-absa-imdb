/**
 * Nube de palabras (Word Cloud) personalizada en SVG.
 * Muestra adjetivos descriptivos frecuentes; el tamaño refleja la frecuencia
 * y el color refleja el sentimiento dominante (verde=positivo, rojo=negativo, gris=neutral).
 * Diseñada para modo oscuro con alto contraste.
 */
import { useMemo } from 'react';

const SENTIMENT_COLORS = {
  positivo: '#10b981', // emerald-500
  negativo: '#f43f5e', // rose-500
  neutral: '#94a3b8',  // slate-400
};

/**
 * Algoritmo simple de colocación en espiral para evitar solapamientos.
 * Coloca las palabras de mayor a menor frecuencia.
 */
function layoutWords(words, width, height) {
  const placed = [];
  for (const word of words) {
    let best = null;
    let angle = 0;
    const step = 0.5; // paso angular
    const radiusStep = 2;
    let radius = 0;

    const maxIter = 800;
    const approxW = word.text.length * word.fontSize * 0.55;
    const approxH = word.fontSize * 1.1;

    for (let i = 0; i < maxIter; i++) {
      const cx = width / 2 + radius * Math.cos(angle);
      const cy = height / 2 + radius * Math.sin(angle) * 0.7;
      const rect = {
        x: cx - approxW / 2,
        y: cy - approxH / 2,
        w: approxW,
        h: approxH,
      };

      const fits =
        rect.x >= 0 &&
        rect.x + rect.w <= width &&
        rect.y >= 0 &&
        rect.y + rect.h <= height;

      if (fits && !placed.some((p) => intersects(rect, p))) {
        best = { ...word, x: cx, y: cy };
        placed.push(rect);
        break;
      }

      angle += step;
      radius += radiusStep * 0.15;
    }

    if (!best) {
      // Fallback: colocar en posición aleatoria si no cabe en espiral
      best = {
        ...word,
        x: width / 2 + (Math.random() - 0.5) * width * 0.8,
        y: height / 2 + (Math.random() - 0.5) * height * 0.8,
      };
    }

    word.x = best.x;
    word.y = best.y;
  }

  return words;
}

function intersects(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export default function WordCloud({ data, loading }) {
  const width = 500;
  const height = 320;

  const words = useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxFreq = Math.max(...data.map((d) => d.frequency));
    const minFreq = Math.min(...data.map((d) => d.frequency));
    const freqRange = maxFreq - minFreq || 1;

    const baseWords = data.map((d) => {
      const normalized = (d.frequency - minFreq) / freqRange;
      const fontSize = 12 + normalized * 36; // entre 12px y 48px
      return {
        text: d.word,
        fontSize,
        sentiment: d.sentiment || 'neutral',
        frequency: d.frequency,
      };
    });

    return layoutWords(baseWords, width, height);
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
        <span className="text-sm text-slate-400">Cargando nube de palabras...</span>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Sin datos para la nube de palabras
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-850">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        Nube de Palabras
      </h3>
      <div className="flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ maxHeight: height }}
        >
          <rect width={width} height={height} fill="transparent" />
          {words.map((word, i) => (
            <text
              key={`${word.text}-${i}`}
              x={word.x}
              y={word.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={word.fontSize}
              fontWeight={word.fontSize > 30 ? 700 : 500}
              fill={SENTIMENT_COLORS[word.sentiment] || SENTIMENT_COLORS.neutral}
              className="transition-opacity duration-300 hover:opacity-80 cursor-default select-none"
              style={{
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {word.text}
            </text>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Positivo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
          Negativo
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
          Neutral
        </span>
      </div>
    </div>
  );
}
