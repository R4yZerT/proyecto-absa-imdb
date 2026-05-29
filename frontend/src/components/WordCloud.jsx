/**
 * Nube de palabras (Word Cloud) personalizada en SVG.
 * Estetica cinematografica con tipografia DM Sans y colores dorados/emerald/crimson.
 */
import { useMemo } from 'react';

const SENTIMENT_COLORS = {
  positivo: '#4ade80', // emerald-400
  negativo: '#ef4444', // red-500
};

function layoutWords(words, width, height) {
  const placed = [];
  const padding = 4;
  const sorted = [...words].sort((a, b) => b.fontSize - a.fontSize);

  for (const word of sorted) {
    const approxW = word.text.length * word.fontSize * 0.62;
    const approxH = word.fontSize * 1.2;
    const halfW = approxW / 2;
    const halfH = approxH / 2;

    let best = null;
    let angle = 0;
    const step = 0.25;
    let radius = 2;
    const maxIter = 2500;

    for (let i = 0; i < maxIter; i++) {
      const cx = width / 2 + radius * Math.cos(angle);
      const cy = height / 2 + radius * Math.sin(angle) * 0.65;
      const rect = {
        x: cx - halfW,
        y: cy - halfH,
        w: approxW + padding,
        h: approxH + padding,
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
      radius += 0.8;
    }

    if (!best) {
      for (let gy = halfH; gy < height - halfH; gy += approxH + padding) {
        for (let gx = halfW; gx < width - halfW; gx += approxW + padding) {
          const rect = {
            x: gx - halfW,
            y: gy - halfH,
            w: approxW + padding,
            h: approxH + padding,
          };
          if (!placed.some((p) => intersects(rect, p))) {
            best = { ...word, x: gx, y: gy };
            placed.push(rect);
            break;
          }
        }
        if (best) break;
      }
    }

    if (best) {
      word.x = best.x;
      word.y = best.y;
    }
  }

  return words.filter((w) => w.x != null && w.y != null);
}

function intersects(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

export default function WordCloud({ data, loading }) {
  const width = 600;
  const height = 420;

  const words = useMemo(() => {
    if (!data || data.length === 0) return [];

    const maxFreq = Math.max(...data.map((d) => d.frequency));
    const minFreq = Math.min(...data.map((d) => d.frequency));
    const freqRange = maxFreq - minFreq || 1;

    const baseWords = data.map((d) => {
      const normalized = (d.frequency - minFreq) / freqRange;
      const fontSize = 18 + normalized * 54;
      return {
        text: d.word,
        fontSize,
        sentiment: d.sentiment || 'positivo',
        frequency: d.frequency,
      };
    });

    return layoutWords(baseWords, width, height);
  }, [data]);

  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
        <span className="text-sm text-slate-400">Cargando nube de palabras...</span>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Sin datos para la nube de palabras
      </div>
    );
  }

  return (
    <div className="card-cinema p-4">
      <h3 className="label-caps mb-2">Nube de Palabras</h3>
      <div className="flex flex-1 items-center justify-center">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
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
              fill={SENTIMENT_COLORS[word.sentiment] || SENTIMENT_COLORS.positivo}
              className="cursor-default select-none transition-opacity duration-300 hover:opacity-70"
              style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
              }}
            >
              {word.text}
            </text>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Positivo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500 dark:bg-red-400" />
          Negativo
        </span>
      </div>
    </div>
  );
}
