'use client'

import { useMemo, useState } from 'react'
import { ExternalLink, FileText, ImageIcon, Loader2, Lock, RotateCw, Search } from 'lucide-react'
import { BotonGoogle } from '@/components/boton-google'
import { cn } from '@/lib/utils'
import {
  formatearTamano,
  pedirEnlace,
  puedeDescargar,
  TIPOS,
  useMaterias,
  type Archivo,
  type TipoMaterial,
} from '@/lib/repositorio'
import { useSesion } from '@/lib/sesion'

const TODAS = '__todas__'

type FilaArchivo = Archivo & { materia: string }

export function MaterialBrowser() {
  const { data: materias, error, isLoading, mutate } = useMaterias()
  const sesion = useSesion()
  const descargable = sesion.estado === 'conectado' && !!sesion.usuario && puedeDescargar(sesion.usuario.rol)
  const [materiaActiva, setMateriaActiva] = useState(TODAS)
  const [tipo, setTipo] = useState<TipoMaterial | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')

  const filas = useMemo<FilaArchivo[]>(() => {
    if (!materias) return []
    const termino = busqueda.trim().toLocaleLowerCase('es')
    return materias
      .filter((m) => materiaActiva === TODAS || m.nombre === materiaActiva)
      .flatMap((m) => m.archivos.map((a) => ({ ...a, materia: m.nombre })))
      .filter((a) => tipo === 'todos' || a.tipo === tipo)
      .filter(
        (a) =>
          !termino ||
          a.nombre.toLocaleLowerCase('es').includes(termino) ||
          a.materia.toLocaleLowerCase('es').includes(termino),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
  }, [materias, materiaActiva, tipo, busqueda])

  return (
    <section aria-labelledby="buscar-title" className="flex min-w-0 flex-col">
      <h2 id="buscar-title" className="sr-only">
        Buscar material
      </h2>

      <div className="mb-3 flex items-baseline justify-between gap-4">
        <p className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Canales · materias
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Materias"
        className="-mb-px flex gap-1.5 overflow-x-auto pt-1"
      >
        {[TODAS, ...(materias?.map((m) => m.nombre) ?? [])].map((nombre) => {
          const activa = materiaActiva === nombre
          const cantidad =
            nombre === TODAS
              ? materias?.reduce((n, m) => n + m.archivos.length, 0)
              : materias?.find((m) => m.nombre === nombre)?.archivos.length
          return (
            <button
              key={nombre}
              type="button"
              role="tab"
              aria-selected={activa}
              onClick={() => setMateriaActiva(nombre)}
              className={cn(
                'flex shrink-0 flex-col items-center gap-2 rounded-t-md border border-b-0 px-3 pt-2.5 pb-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                activa ? 'border-border bg-card' : 'border-transparent bg-muted/60 hover:bg-muted',
              )}
            >
              <span className="led" data-on={activa} />
              <span
                className={cn(
                  'cinta rounded-[2px] px-2 py-0.5 font-display text-sm font-semibold uppercase tracking-wide whitespace-nowrap transition-opacity',
                  !activa && 'opacity-70',
                )}
              >
                {nombre === TODAS ? 'Todas' : nombre}
              </span>
              <span className="font-display text-xs text-muted-foreground tabular-nums">
                {cantidad ?? '–'}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col rounded-b-xl rounded-tr-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar por nombre o materia</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar: parcial 2023, final, resumen…"
              className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <fieldset className="flex gap-1 rounded-lg bg-muted p-1">
            <legend className="sr-only">Tipo de material</legend>
            {[{ value: 'todos', label: 'Todos' } as const, ...TIPOS].map((t) => (
              <label
                key={t.value}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  tipo === t.value
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="filtro-tipo"
                  value={t.value}
                  checked={tipo === t.value}
                  onChange={() => setTipo(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </fieldset>
        </div>

        <AvisoDescarga />

        <div aria-live="polite" aria-busy={isLoading}>
          {isLoading ? (
            <ListaCargando />
          ) : error ? (
            <div className="flex flex-col items-start gap-3 p-6">
              <p className="text-sm text-destructive">{error.message}</p>
              <button
                type="button"
                onClick={() => mutate()}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <RotateCw className="size-4" aria-hidden="true" />
                Reintentar
              </button>
            </div>
          ) : filas.length === 0 ? (
            <p className="p-6 text-sm leading-relaxed text-muted-foreground">
              {materias && materias.length === 0
                ? 'Todavía no hay materias cargadas en Drive.'
                : 'No hay material que coincida. Si lo tenés, subilo.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {filas.map((a) => (
                <FilaMaterial key={a.clave} archivo={a} descargable={descargable} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

function AvisoDescarga() {
  const { estado, usuario, error } = useSesion()
  if (estado === 'cargando') return null
  if (estado === 'conectado' && usuario) {
    if (puedeDescargar(usuario.rol)) return null
    return (
      <p className="border-b border-border px-4 py-3 text-sm text-destructive">
        Tu cuenta no tiene acceso a las descargas. Si creés que es un error, escribile a un admin.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-muted/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Lock className="size-4 text-muted-foreground" aria-hidden="true" />
          Iniciá sesión con Google para descargar
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          El listado se ve libre. Para abrir los archivos usá tu cuenta de Google.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <BotonGoogle />
    </div>
  )
}

function FilaMaterial({ archivo, descargable }: { archivo: FilaArchivo; descargable: boolean }) {
  const { obtenerToken } = useSesion()
  const [abriendo, setAbriendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const esImagen = archivo.mimeType.startsWith('image/')
  const Icono = esImagen ? ImageIcon : FileText
  const etiquetaTipo = TIPOS.find((t) => t.value === archivo.tipo)?.label ?? 'Otro'

  async function abrir() {
    setError(null)
    let token: string
    try {
      token = obtenerToken()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Iniciá sesión para descargar.')
      return
    }
    // La pestaña se abre ya, dentro del clic: si se abre después de esperar al servidor, el navegador la bloquea.
    const pestana = window.open('', '_blank')
    setAbriendo(true)
    try {
      const url = await pedirEnlace(token, archivo.clave)
      if (pestana) {
        pestana.opener = null
        pestana.location.href = url
      } else {
        window.location.href = url
      }
    } catch (err) {
      pestana?.close()
      setError(err instanceof Error ? err.message : 'No se pudo abrir el archivo.')
    } finally {
      setAbriendo(false)
    }
  }

  const contenido = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icono className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium">{archivo.nombre}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{archivo.materia}</span>
          <span aria-hidden="true">·</span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-display font-semibold uppercase tracking-wide',
              archivo.tipo === 'examen' && 'text-primary',
            )}
          >
            {archivo.tipo === 'examen' && <span className="led size-1.5" data-on="true" />}
            {etiquetaTipo}
          </span>
          {archivo.anio && <span className="tabular-nums">{archivo.anio}</span>}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatearTamano(archivo.tamano)}</span>
        </span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    </>
  )

  if (!descargable) {
    return (
      <li className="flex items-center gap-4 px-4 py-3">
        {contenido}
        <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">(iniciá sesión para descargar)</span>
      </li>
    )
  }

  return (
    <li>
      <button
        type="button"
        onClick={abrir}
        disabled={abriendo}
        className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none disabled:cursor-wait"
      >
        {contenido}
        {abriendo ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
        ) : (
          <ExternalLink
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden="true"
          />
        )}
        <span className="sr-only">(abre en Google Drive)</span>
      </button>
    </li>
  )
}

function ListaCargando() {
  return (
    <ul className="divide-y divide-border" aria-label="Cargando material">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-4 py-3">
          <span className="size-10 animate-pulse rounded-lg bg-muted" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <span className="h-3 w-1/3 animate-pulse rounded bg-muted" />
          </span>
        </li>
      ))}
    </ul>
  )
}
