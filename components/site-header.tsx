import { ArrowDown, Upload } from 'lucide-react'
import { BarraSesion } from '@/components/barra-sesion'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const botonBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold uppercase tracking-wider transition-colors'

export function SiteHeader() {
  return (
    <header>
      <div className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={`${basePath}/icono-untref-96.png`}
              alt="UNTREF"
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-[22%]"
            />
            <p className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-lg font-bold uppercase tracking-wide">
                Ingeniería de Sonido
              </span>
              <span className="text-xs text-muted-foreground">De alumnos, para alumnos</span>
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <BarraSesion />
            <a
              href="#subir"
              className={`${botonBase} h-9 shrink-0 bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90`}
            >
              <Upload className="size-4" aria-hidden="true" />
              Subir
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 md:pt-10">
        <div className="franjas entrada relative overflow-hidden rounded-3xl border border-border">
          <div className="flex flex-col items-start gap-8 px-6 py-12 md:flex-row md:items-center md:justify-between md:px-14 md:py-16">
            <div className="flex max-w-xl flex-col items-start gap-5">
              <p className="cinta rounded-full px-3 py-1 font-display text-sm font-semibold uppercase tracking-widest">
                Material de estudio · UNTREF
              </p>
              <h1 className="text-balance font-display text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-6xl md:text-7xl">
                Ingeniería de Sonido
              </h1>
              <p className="font-display text-2xl font-semibold uppercase tracking-wide text-primary md:text-3xl">
                De alumnos, para alumnos
              </p>
              <p className="max-w-prose text-pretty leading-relaxed text-muted-foreground">
                Parciales, finales y apuntes de la carrera, ordenados por materia. El listado es
                libre y para descargar alcanza con iniciar sesión con Google.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href="#material"
                  className={`${botonBase} h-11 bg-primary px-5 text-base text-primary-foreground hover:bg-primary/90`}
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                  Ver material
                </a>
                <a
                  href="#subir"
                  className={`${botonBase} h-11 border border-foreground/25 bg-background/40 px-5 text-base text-foreground hover:border-foreground/50`}
                >
                  <Upload className="size-4" aria-hidden="true" />
                  Subir material
                </a>
              </div>
            </div>
            <img
              src={`${basePath}/icono-untref-512.png`}
              alt=""
              width={224}
              height={224}
              className="brillo-icono hidden size-56 shrink-0 rounded-[22%] md:block"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
