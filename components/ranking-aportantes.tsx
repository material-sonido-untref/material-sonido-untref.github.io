'use client'

import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRepositorio } from '@/lib/repositorio'

export function RankingAportantes() {
  const { data, isLoading } = useRepositorio()
  const ranking = data?.ranking ?? []

  return (
    <section
      aria-labelledby="ranking-title"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="ranking-title"
          className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide"
        >
          <Trophy className="size-5 text-primary" aria-hidden="true" />
          Top aportantes
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          3 puntos por archivo subido y 1 por cada “Me sirvió” que recibe.
        </p>
      </div>

      {isLoading ? (
        <ul className="flex flex-col gap-2" aria-label="Cargando ranking">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="h-5 animate-pulse rounded bg-muted" />
          ))}
        </ul>
      ) : ranking.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Todavía no hay aportes con nombre. ¡Subí algo y aparecé primero!
        </p>
      ) : (
        <ol className="flex flex-col gap-1">
          {ranking.map((a, i) => (
            <li key={`${a.nombre}-${i}`} className="flex items-center gap-3 rounded-md px-1 py-1.5 text-sm">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold tabular-nums',
                  i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{a.nombre}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {a.archivos} {a.archivos === 1 ? 'archivo' : 'archivos'} · {a.votos} 👍
              </span>
              <span className="w-12 shrink-0 text-right font-display font-semibold tabular-nums">
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
