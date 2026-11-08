'use client'

import { ThumbsUp, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRepositorio } from '@/lib/repositorio'

export function RankingAportantes() {
  const { data, isLoading } = useRepositorio()
  const ranking = data?.ranking ?? []

  return (
    <section aria-labelledby="ranking-title" className="tarjeta flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2
          id="ranking-title"
          className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide"
        >
          <Trophy className="size-5 text-primary" aria-hidden="true" />
          Top aportantes
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          3 puntos por archivo subido y 1 por cada “Me sirvió” que recibe.
        </p>
      </div>

      {isLoading ? (
        <ul className="flex flex-col gap-2" aria-label="Cargando ranking">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-9 animate-pulse rounded-lg bg-muted" />
          ))}
        </ul>
      ) : ranking.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Todavía no hay aportes con nombre. ¡Subí algo y aparecé primero!
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {ranking.map((a, i) => (
            <li
              key={`${a.nombre}-${i}`}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2 py-2 text-sm',
                i === 0 && 'bg-primary/10 ring-1 ring-primary/30',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold tabular-nums',
                  i === 0
                    ? 'bg-primary text-primary-foreground shadow-[0_0_12px] shadow-primary/60'
                    : i < 3
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{a.nombre}</span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                {a.archivos} {a.archivos === 1 ? 'archivo' : 'archivos'} · {a.votos}
                <ThumbsUp className="size-3" aria-hidden="true" />
                <span className="sr-only">{a.votos === 1 ? 'voto' : 'votos'}</span>
              </span>
              <span className="w-10 shrink-0 text-right font-display text-base font-bold tabular-nums">
                {a.puntos}
                <span className="sr-only"> puntos</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
