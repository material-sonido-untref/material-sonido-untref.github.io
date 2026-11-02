import { Upload } from 'lucide-react'
import { SpectrumAnalyzer } from '@/components/spectrum-analyzer'

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <p className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest">
          <span className="led" data-on="true" />
          <span>
            UNTREF <span className="text-muted-foreground">/ Ingeniería de Sonido</span>
          </span>
        </p>
        <a
          href="#subir"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-3 font-display text-sm font-semibold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Upload className="size-4" aria-hidden="true" />
          Subir
        </a>
      </div>

      <div className="mx-auto grid max-w-6xl items-end gap-8 px-4 pt-6 pb-10 md:grid-cols-2 md:pt-10 md:pb-14">
        <div className="flex flex-col gap-4">
          <p className="cinta self-start -rotate-1 rounded-sm px-3 py-1 font-display text-sm font-semibold uppercase tracking-widest">
            Material de estudio
          </p>
          <h1 className="text-balance font-display text-5xl font-bold uppercase leading-none tracking-tight md:text-6xl">
            Parciales, finales y apuntes de la carrera
          </h1>
          <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
            De Análisis de Señales a Acústica de Recintos: lo que circula entre alumnos, ordenado por
            materia. Gratis, sin cuentas y abierto a que subas lo tuyo.
          </p>
        </div>
        <SpectrumAnalyzer />
      </div>
    </header>
  )
}
