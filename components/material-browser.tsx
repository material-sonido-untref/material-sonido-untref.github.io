'use client'

import { useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Loader2,
  Lock,
  RotateCw,
  Search,
  ThumbsUp,
} from 'lucide-react'
import { BotonGoogle } from '@/components/boton-google'
import { SelectorMateria, TODAS } from '@/components/selector-materia'
import { cn } from '@/lib/utils'
import {
  formatearTamano,
  pedirEnlace,
  puedeDescargar,
  TIPOS,
  useRepositorio,
  votarArchivo,
  type Archivo,
  type TipoMaterial,
} from '@/lib/repositorio'
import { useSesion } from '@/lib/sesion'

type FilaArchivo = Archivo & { materia: string }

const ORDENES = [
  { value: 'recientes', label: 'Recientes' },
  { value: 'utiles', label: 'Más útiles' },
] as const
type Orden = (typeof ORDENES)[number]['value']

function compararPorOrden(orden: Orden) {
  return (a: FilaArchivo, b: FilaArchivo) =>
    orden === 'utiles'
      ? b.votos - a.votos || b.descargas - a.descargas || b.fecha.localeCompare(a.fecha)
      : b.fecha.localeCompare(a.fecha)
}

const POR_PAGINA = 10

/** Números de página a mostrar: todos si son pocos; si no, los extremos y los vecinos de la actual. */
function paginasVisibles(actual: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const cercanas = [1, actual - 1, actual, actual + 1, total].filter((n) => n >= 1 && n <= total)
  const unicas = [...new Set(cercanas)].sort((a, b) => a - b)
  const resultado: (number | '…')[] = []
  unicas.forEach((n, i) => {
    if (i > 0 && n - unicas[i - 1] > 1) resultado.push('…')
    resultado.push(n)
  })
  return resultado
}

function Paginacion({
  pagina,
  total,
  cantidad,
  onCambio,
}: {
  pagina: number
  total: number
  cantidad: number
  onCambio: (pagina: number) => void
}) {
  const desde = (pagina - 1) * POR_PAGINA + 1
  const hasta = Math.min(pagina * POR_PAGINA, cantidad)
  const flecha =
    'inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40'

  return (
    <nav
      aria-label="Páginas de material"
      className="flex flex-col items-center gap-3 border-t border-border px-4 py-3 sm:flex-row sm:justify-between"
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        Mostrando {desde}–{hasta} de {cantidad}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onCambio(pagina - 1)}
          disabled={pagina === 1}
          className={cn(flecha, 'text-muted-foreground')}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </button>
        <ol className="hidden items-center gap-1 sm:flex">
          {paginasVisibles(pagina, total).map((n, i) =>
            n === '…' ? (
              <li key={`salto-${i}`} aria-hidden="true" className="px-1 text-sm text-muted-foreground">
                …
              </li>
            ) : (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => onCambio(n)}
                  aria-current={n === pagina ? 'page' : undefined}
                  aria-label={`Página ${n}`}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    n === pagina
                      ? 'bg-primary font-semibold text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {n}
                </button>
              </li>
            ),
          )}
        </ol>
        <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
          {pagina} / {total}
        </span>
        <button
          type="button"
          onClick={() => onCambio(pagina + 1)}
          disabled={pagina === total}
          className={cn(flecha, 'text-muted-foreground')}
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}

function Segmentado<T extends string>({
  leyenda,
  nombre,
  opciones,
  valor,
  onCambio,
}: {
  leyenda: string
  nombre: string
  opciones: readonly { value: T; label: string }[]
  valor: T
  onCambio: (valor: T) => void
}) {
  return (
    <fieldset className="flex gap-1 rounded-lg bg-muted p-1">
      <legend className="sr-only">{leyenda}</legend>
      {opciones.map((o) => (
        <label
          key={o.value}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
            valor === o.value
              ? 'bg-accent font-medium text-accent-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <input
            type="radio"
            name={nombre}
            value={o.value}
            checked={valor === o.value}
            onChange={() => onCambio(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

export function MaterialBrowser() {
  const { data, error, isLoading, mutate } = useRepositorio()
  const materias = data?.materias
  const sesion = useSesion()
  const descargable = sesion.estado === 'conectado' && !!sesion.usuario && puedeDescargar(sesion.usuario.rol)
  const [materiaActiva, setMateriaActiva] = useState(TODAS)
  const [tipo, setTipo] = useState<TipoMaterial | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState<Orden>('recientes')
  const opcionesMateria = useMemo(
    () => materias?.map((m) => ({ nombre: m.nombre, cantidad: m.archivos.length })),
    [materias],
  )

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
      .sort(compararPorOrden(orden))
  }, [materias, materiaActiva, tipo, busqueda, orden])

  // La página se guarda junto con los filtros que la generaron: si cambia
  // cualquier filtro, se vuelve a la primera (y no a una página vieja si se
  // regresa a un filtro anterior).
  const filtros = [materiaActiva, tipo, busqueda, orden].join('|')
  const [paginado, setPaginado] = useState({ filtros, pagina: 1 })
  if (paginado.filtros !== filtros) setPaginado({ filtros, pagina: 1 })
  const totalPaginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  const pagina = Math.min(paginado.filtros === filtros ? paginado.pagina : 1, totalPaginas)
  const visibles = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const listaRef = useRef<HTMLDivElement>(null)

  function irAPagina(nueva: number) {
    setPaginado({ filtros, pagina: Math.min(Math.max(1, nueva), totalPaginas) })
    const lista = listaRef.current
    if (lista && lista.getBoundingClientRect().top < 0) {
      lista.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section aria-labelledby="buscar-title" className="flex min-w-0 flex-col">
      <h2 id="buscar-title" className="sr-only">
        Buscar material
      </h2>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="font-display text-3xl font-bold uppercase tracking-wide md:text-4xl">
          Material
        </p>
        <SelectorMateria
          materias={opcionesMateria}
          valor={materiaActiva}
          onCambio={setMateriaActiva}
        />
      </div>

      <div ref={listaRef} className="tarjeta flex scroll-mt-4 flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4">
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
          <div className="flex flex-wrap gap-2">
            <Segmentado
              leyenda="Tipo de material"
              nombre="filtro-tipo"
              opciones={[{ value: 'todos', label: 'Todos' } as const, ...TIPOS]}
              valor={tipo}
              onCambio={setTipo}
            />
            <Segmentado
              leyenda="Ordenar por"
              nombre="orden"
              opciones={ORDENES}
              valor={orden}
              onCambio={setOrden}
            />
          </div>
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
            <>
              <ul className="divide-y divide-border">
                {visibles.map((a) => (
                  <FilaMaterial key={a.clave} archivo={a} descargable={descargable} />
                ))}
              </ul>
              {totalPaginas > 1 && (
                <Paginacion
                  pagina={pagina}
                  total={totalPaginas}
                  cantidad={filas.length}
                  onCambio={irAPagina}
                />
              )}
            </>
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
  const { obtenerToken, misVotos, misArchivos, marcarVoto } = useSesion()
  const { mutate } = useRepositorio()
  const [abriendo, setAbriendo] = useState(false)
  const [votando, setVotando] = useState(false)
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

  const votado = misVotos.has(archivo.clave)
  const propio = misArchivos.has(archivo.clave)

  function fijarVotos(votos: number) {
    mutate(
      (actual) =>
        actual && {
          ...actual,
          materias: actual.materias.map((m) => ({
            ...m,
            archivos: m.archivos.map((a) => (a.clave === archivo.clave ? { ...a, votos } : a)),
          })),
        },
      { revalidate: false },
    )
  }

  async function alternarVoto() {
    setError(null)
    const nuevo = !votado
    const anterior = archivo.votos
    // Se muestra el cambio al instante y se corrige si el servidor dice otra cosa.
    marcarVoto(archivo.clave, nuevo)
    fijarVotos(Math.max(0, anterior + (nuevo ? 1 : -1)))
    setVotando(true)
    try {
      const resultado = await votarArchivo(obtenerToken(), archivo.clave, nuevo)
      fijarVotos(resultado.votos)
    } catch (err) {
      marcarVoto(archivo.clave, !nuevo)
      fijarVotos(anterior)
      setError(err instanceof Error ? err.message : 'No se pudo registrar el voto.')
    } finally {
      setVotando(false)
    }
  }

  const contenido = (
    <>
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          archivo.tipo === 'examen' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icono className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="line-clamp-2 font-medium break-words sm:line-clamp-1">{archivo.nombre}</span>
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
          {archivo.autor && (
            <>
              <span aria-hidden="true">·</span>
              <span>por {archivo.autor}</span>
            </>
          )}
          {archivo.descargas > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Download className="size-3" aria-hidden="true" />
                {archivo.descargas}
                <span className="sr-only">{archivo.descargas === 1 ? 'descarga' : 'descargas'}</span>
              </span>
            </>
          )}
        </span>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </span>
    </>
  )

  const etiquetaVotos = `${archivo.votos} ${archivo.votos === 1 ? 'persona dice' : 'personas dicen'} que le sirvió`
  const voto =
    descargable && !propio ? (
      <button
        type="button"
        onClick={alternarVoto}
        disabled={votando}
        aria-pressed={votado}
        aria-label={`Me sirvió. ${etiquetaVotos}`}
        title={votado ? 'Quitar "Me sirvió"' : 'Me sirvió'}
        className={cn(
          'flex shrink-0 items-center gap-1.5 self-center rounded-md border px-2.5 py-1.5 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          votado
            ? 'border-primary/40 bg-primary/10 font-medium text-primary'
            : 'border-border text-muted-foreground hover:text-foreground',
        )}
      >
        <ThumbsUp className={cn('size-4', votado && 'fill-current')} aria-hidden="true" />
        {archivo.votos}
      </button>
    ) : (
      <span
        title={propio ? 'Es tu material' : 'Iniciá sesión para votar'}
        className="flex shrink-0 items-center gap-1.5 self-center px-2.5 py-1.5 text-sm text-muted-foreground tabular-nums"
      >
        <ThumbsUp className="size-4" aria-hidden="true" />
        {archivo.votos}
        <span className="sr-only">{etiquetaVotos}</span>
      </span>
    )

  if (!descargable) {
    return (
      <li className="flex items-center gap-2 pr-2">
        <div className="flex min-w-0 flex-1 items-center gap-4 py-3 pl-4">
          {contenido}
          <Lock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">(iniciá sesión para descargar)</span>
        </div>
        {voto}
      </li>
    )
  }

  return (
    <li className="flex items-center gap-2 pr-2">
      <button
        type="button"
        onClick={abrir}
        disabled={abriendo}
        className="group flex min-w-0 flex-1 items-center gap-4 py-3 pl-4 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none disabled:cursor-wait"
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
      {voto}
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
