'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  Check,
  HardDrive,
  Inbox,
  Loader2,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { BotonGoogle } from '@/components/boton-google'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  adminCambiarRol,
  adminDatos,
  adminEliminar,
  adminResolver,
  formatearTamano,
  useRepositorio,
  type Archivo,
  type EspacioDrive,
  type PedidoPendiente,
  type Rol,
  type UsuarioAdmin,
} from '@/lib/repositorio'
import { useSesion } from '@/lib/sesion'

const ROLES: { value: Rol; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'lector', label: 'Lector' },
  { value: 'bloqueado', label: 'Bloqueado' },
]
const ETIQUETA: Record<Rol, string> = {
  admin: 'Admin',
  colaborador: 'Colaborador',
  lector: 'Lector',
  bloqueado: 'Bloqueado',
}
const ORDEN_ROL: Record<Rol, number> = { admin: 0, colaborador: 1, lector: 2, bloqueado: 3 }
const POR_TANDA = 25
const POR_TANDA_ARCHIVOS = 20

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function fecha(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : formatoFecha.format(d)
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')

export function PanelAdmin() {
  const { estado, usuario } = useSesion()

  if (estado === 'cargando') {
    return <p className="text-sm text-muted-foreground">Verificando tu sesión…</p>
  }
  if (estado === 'anonimo' || !usuario) {
    return (
      <Aviso titulo="Iniciá sesión">
        <p>El panel es solo para admins. Iniciá sesión con tu cuenta de Google.</p>
        <BotonGoogle />
      </Aviso>
    )
  }
  if (usuario.rol !== 'admin') {
    return (
      <Aviso titulo="Solo para admins">
        <p>Tu cuenta no tiene permiso para ver el panel de admin.</p>
        <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
          ← Volver al material
        </Link>
      </Aviso>
    )
  }
  return <Contenido miEmail={usuario.email} />
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta flex flex-col items-start gap-3 p-6 text-sm leading-relaxed text-muted-foreground">
      <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-foreground">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function Contenido({ miEmail }: { miEmail: string }) {
  const { obtenerToken } = useSesion()
  const { data, error, isLoading, mutate } = useSWR(
    ['admin-datos', miEmail],
    () => adminDatos(obtenerToken()),
    { revalidateOnFocus: false },
  )

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando el panel…</p>
  if (error || !data) {
    return (
      <Aviso titulo="No se pudo cargar">
        <p className="text-destructive">{error?.message ?? 'Probá de nuevo en un rato.'}</p>
        <Button type="button" variant="outline" onClick={() => mutate()}>
          <RotateCw aria-hidden="true" />
          Reintentar
        </Button>
      </Aviso>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {data.espacio && <ResumenEspacio espacio={data.espacio} />}
      <Secciones datos={data} miEmail={miEmail} recargar={() => mutate()} />
    </div>
  )
}

function Secciones({
  datos,
  miEmail,
  recargar,
}: {
  datos: Awaited<ReturnType<typeof adminDatos>>
  miEmail: string
  recargar: () => void
}) {
  const { data: repositorio } = useRepositorio()
  const [pestana, setPestana] = useState<Pestana>('solicitudes')

  // La pestaña queda en la dirección (#usuarios, …) para que recargar no la pierda.
  useEffect(() => setPestana(pestanaInicial()), [])
  // En el celular la barra de pestañas se desplaza: la activa tiene que quedar a la vista.
  useEffect(() => {
    document
      .getElementById(`pestana-${pestana}`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [pestana])
  function cambiar(nueva: Pestana) {
    setPestana(nueva)
    try {
      window.history.replaceState(null, '', `#${nueva}`)
    } catch {
      // Sin acceso al historial, la pestaña simplemente no se recuerda.
    }
  }

  const archivos = useMemo(
    () =>
      repositorio?.materias.flatMap((m) => m.archivos.map((a) => ({ ...a, materia: m.nombre }))) ??
      [],
    [repositorio],
  )
  const porMateria = datos.espacio?.porMateria ?? []

  return (
    <div className="flex flex-col gap-5">
      <Pestanas
        actual={pestana}
        onCambio={cambiar}
        opciones={[
          {
            value: 'solicitudes',
            label: 'Solicitudes',
            cantidad: datos.pendientes.length,
            destacar: datos.pendientes.length > 0,
          },
          { value: 'usuarios', label: 'Usuarios', cantidad: datos.usuarios.length },
          { value: 'archivos', label: 'Archivos', cantidad: archivos.length },
          { value: 'materias', label: 'Por materia' },
        ]}
      />
      <PanelDePestana pestana="solicitudes" actual={pestana}>
        <Pedidos pendientes={datos.pendientes} recargar={recargar} />
      </PanelDePestana>
      <PanelDePestana pestana="usuarios" actual={pestana}>
        <ListaUsuarios usuarios={datos.usuarios} miEmail={miEmail} recargar={recargar} />
      </PanelDePestana>
      <PanelDePestana pestana="archivos" actual={pestana}>
        <ArchivosAdmin archivos={archivos} recargarPanel={recargar} />
      </PanelDePestana>
      <PanelDePestana pestana="materias" actual={pestana}>
        <PorMateria porMateria={porMateria} />
      </PanelDePestana>
    </div>
  )
}

function Pedidos({
  pendientes,
  recargar,
}: {
  pendientes: PedidoPendiente[]
  recargar: () => void
}) {
  return (
    <section aria-labelledby="pedidos-title" className="flex flex-col gap-4">
      <h2 id="pedidos-title" className="sr-only">
        Pedidos pendientes: {pendientes.length}
      </h2>
      {pendientes.length === 0 ? (
        <p className="tarjeta p-5 text-sm text-muted-foreground">
          <Inbox className="mb-2 size-5 text-primary" aria-hidden="true" />
          No hay pedidos para revisar. Cuando alguien pida ser colaborador o admin, te llega un mail
          y aparece acá.
        </p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {pendientes.map((p) => (
            <TarjetaPedido key={`${p.email}-${p.pide}`} pedido={p} recargar={recargar} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TarjetaPedido({ pedido, recargar }: { pedido: PedidoPendiente; recargar: () => void }) {
  const { obtenerToken } = useSesion()
  const [enviando, setEnviando] = useState<'aprobar' | 'rechazar' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const quien = pedido.nombre || pedido.email

  async function resolver(decision: 'aprobar' | 'rechazar') {
    if (
      decision === 'aprobar' &&
      pedido.pide === 'admin' &&
      !window.confirm(
        `¿Hacer admin a ${quien}? Va a poder aprobar pedidos y cambiarle el rol a cualquiera.`,
      )
    ) {
      return
    }
    setError(null)
    setEnviando(decision)
    try {
      await adminResolver(obtenerToken(), pedido.email, decision)
      recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
      setEnviando(null)
    }
  }

  return (
    <li className="tarjeta flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{quien}</span>
          <span className="truncate text-xs text-muted-foreground">{pedido.email}</span>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 font-display text-xs font-semibold uppercase tracking-wider',
            pedido.pide === 'admin'
              ? 'bg-primary text-primary-foreground'
              : 'bg-primary/15 text-primary',
          )}
        >
          Pide: {ETIQUETA[pedido.pide]}
        </span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Curso</dt>
        <dd>{pedido.curso || '—'}</dd>
        <dt className="text-muted-foreground">Hoy es</dt>
        <dd>{ETIQUETA[pedido.rolActual]}</dd>
        <dt className="text-muted-foreground">Fecha</dt>
        <dd>{fecha(pedido.fecha)}</dd>
      </dl>
      <p className="rounded-lg bg-muted/60 p-3 text-sm leading-relaxed whitespace-pre-line">
        {pedido.motivo}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => resolver('aprobar')} disabled={enviando !== null}>
          {enviando === 'aprobar' ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Aprobar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => resolver('rechazar')}
          disabled={enviando !== null}
        >
          {enviando === 'rechazar' ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <X aria-hidden="true" />
          )}
          Rechazar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">A {quien} le llega un mail con tu respuesta.</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  )
}

function porcentaje(parte: number, total: number) {
  return total > 0 ? Math.min(100, (parte / total) * 100) : 0
}

function Barra({ valor, alerta = false }: { valor: number; alerta?: boolean }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div
        className={cn('h-full rounded-full', alerta ? 'bg-destructive' : 'bg-primary')}
        style={{ width: `${Math.max(valor, valor > 0 ? 1 : 0)}%` }}
      />
    </div>
  )
}

/** Siempre visible arriba de las pestañas: cuánto se usa de la cuenta y del repositorio. */
function ResumenEspacio({ espacio }: { espacio: EspacioDrive }) {
  const { usadoCuenta, limiteCuenta, usadoRepositorio } = espacio
  const usoCuenta = limiteCuenta ? porcentaje(usadoCuenta, limiteCuenta) : null

  return (
    <section aria-labelledby="espacio-title" className="tarjeta flex flex-col gap-4 p-5">
      <h2 id="espacio-title" className="sr-only">
        Espacio en Drive
      </h2>
      <div className="grid gap-5 md:grid-cols-2 md:gap-8">
        <div className="flex flex-col gap-2">
          <p className="flex items-baseline justify-between gap-3">
            <span className="flex items-center gap-2 font-medium">
              <HardDrive className="size-4 text-primary" aria-hidden="true" />
              Cuenta de Google del proyecto
            </span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {formatearTamano(usadoCuenta)}
              {limiteCuenta && ` de ${formatearTamano(limiteCuenta)}`}
            </span>
          </p>
          {usoCuenta !== null && (
            <>
              <Barra valor={usoCuenta} alerta={usoCuenta >= 85} />
              <p
                className={cn(
                  'text-sm tabular-nums',
                  usoCuenta >= 85 ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {usoCuenta.toFixed(1)} % usado
                {usoCuenta >= 85 && ' — conviene liberar espacio'}
              </p>
            </>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <p className="flex items-baseline justify-between gap-3">
            <span className="font-medium">Material del repositorio</span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {formatearTamano(usadoRepositorio)}
            </span>
          </p>
          {limiteCuenta && <Barra valor={porcentaje(usadoRepositorio, limiteCuenta)} />}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        El espacio de la cuenta lo comparten Drive, Gmail y Fotos. Lo eliminado sigue ocupando lugar
        hasta que se vacía la papelera de Drive (o pasan 30 días).
      </p>
    </section>
  )
}

type Pestana = 'solicitudes' | 'usuarios' | 'archivos' | 'materias'
const PESTANAS: Pestana[] = ['solicitudes', 'usuarios', 'archivos', 'materias']

function pestanaInicial(): Pestana {
  if (typeof window === 'undefined') return 'solicitudes'
  const hash = window.location.hash.replace('#', '') as Pestana
  return PESTANAS.includes(hash) ? hash : 'solicitudes'
}

function Pestanas({
  actual,
  onCambio,
  opciones,
}: {
  actual: Pestana
  onCambio: (pestana: Pestana) => void
  opciones: { value: Pestana; label: string; cantidad?: number; destacar?: boolean }[]
}) {
  // Flechas para moverse entre pestañas, como pide el patrón de pestañas accesibles.
  function onTecla(e: React.KeyboardEvent<HTMLDivElement>) {
    const i = opciones.findIndex((o) => o.value === actual)
    const siguiente =
      e.key === 'ArrowRight'
        ? (i + 1) % opciones.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + opciones.length) % opciones.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? opciones.length - 1
              : -1
    if (siguiente === -1) return
    e.preventDefault()
    onCambio(opciones[siguiente].value)
    document.getElementById(`pestana-${opciones[siguiente].value}`)?.focus()
  }

  return (
    <div
      role="tablist"
      aria-label="Secciones del panel"
      onKeyDown={onTecla}
      className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
    >
      {opciones.map((o) => {
        const activa = o.value === actual
        return (
          <button
            key={o.value}
            id={`pestana-${o.value}`}
            type="button"
            role="tab"
            aria-selected={activa}
            aria-controls={`panel-${o.value}`}
            tabIndex={activa ? 0 : -1}
            onClick={() => onCambio(o.value)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-wider whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              activa
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {o.label}
            {o.cantidad !== undefined && (
              <span
                className={cn(
                  'min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums',
                  activa
                    ? 'bg-primary-foreground/20'
                    : o.destacar
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted',
                )}
              >
                {o.cantidad}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PanelDePestana({
  pestana,
  actual,
  children,
}: {
  pestana: Pestana
  actual: Pestana
  children: React.ReactNode
}) {
  if (pestana !== actual) return null
  return (
    <div
      role="tabpanel"
      id={`panel-${pestana}`}
      aria-labelledby={`pestana-${pestana}`}
      tabIndex={0}
      className="focus-visible:outline-none"
    >
      {children}
    </div>
  )
}

type ArchivoConMateria = Archivo & { materia: string }

/** Todos los archivos, del más pesado al más liviano, con buscador. */
function ArchivosAdmin({
  archivos,
  recargarPanel,
}: {
  archivos: ArchivoConMateria[]
  recargarPanel: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [cantidad, setCantidad] = useState(POR_TANDA_ARCHIVOS)

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return archivos
      .filter((a) => !termino || normalizar(`${a.nombre} ${a.materia}`).includes(termino))
      .sort((a, b) => b.tamano - a.tamano)
  }, [archivos, busqueda])
  const pesoFiltrado = filtrados.reduce((total, a) => total + a.tamano, 0)

  return (
    <section aria-labelledby="archivos-title" className="flex flex-col gap-3">
      <h2 id="archivos-title" className="sr-only">
        Archivos
      </h2>
      <div className="tarjeta flex flex-col overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-4">
          <label className="relative">
            <span className="sr-only">Buscar por nombre o materia</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setCantidad(POR_TANDA_ARCHIVOS)
              }}
              placeholder="Buscar por nombre o materia…"
              className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {filtrados.length} {filtrados.length === 1 ? 'archivo' : 'archivos'} ·{' '}
            {formatearTamano(pesoFiltrado)} · ordenados del más pesado al más liviano
          </p>
        </div>
        {filtrados.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            {archivos.length === 0 ? 'Todavía no hay archivos.' : 'No hay archivos que coincidan.'}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtrados.slice(0, cantidad).map((a) => (
              <FilaArchivoAdmin key={a.clave} archivo={a} recargarPanel={recargarPanel} />
            ))}
          </ul>
        )}
        {filtrados.length > cantidad && (
          <div className="border-t border-border p-3 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCantidad((c) => c + POR_TANDA_ARCHIVOS)}
            >
              Mostrar más ({filtrados.length - cantidad})
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

function FilaArchivoAdmin({
  archivo,
  recargarPanel,
}: {
  archivo: ArchivoConMateria
  recargarPanel: () => void
}) {
  const { obtenerToken } = useSesion()
  const { mutate: recargarListado } = useRepositorio()
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function eliminar() {
    if (
      !window.confirm(
        `¿Eliminar "${archivo.nombre}"?\n\nVa a la papelera de Drive: se puede recuperar desde ahí durante 30 días.`,
      )
    ) {
      return
    }
    setError(null)
    setEliminando(true)
    try {
      await adminEliminar(obtenerToken(), archivo.clave)
      recargarPanel()
      await recargarListado()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el archivo.')
      setEliminando(false)
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{archivo.nombre}</span>
        <span className="truncate text-xs text-muted-foreground">
          {archivo.materia} · subido el {fecha(archivo.fecha)}
          {archivo.autor && ` · por ${archivo.autor}`}
        </span>
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {formatearTamano(archivo.tamano)}
      </span>
      <button
        type="button"
        onClick={eliminar}
        disabled={eliminando}
        aria-label={`Eliminar ${archivo.nombre}`}
        title="Eliminar archivo"
        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait"
      >
        {eliminando ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="size-4" aria-hidden="true" />
        )}
      </button>
    </li>
  )
}

/** Desglose de peso por materia; las vacías quedan ocultas hasta que se pidan. */
function PorMateria({ porMateria }: { porMateria: EspacioDrive['porMateria'] }) {
  const [verVacias, setVerVacias] = useState(false)
  const conArchivos = porMateria.filter((m) => m.archivos > 0)
  const vacias = porMateria.filter((m) => m.archivos === 0)
  const mayor = conArchivos[0]?.bytes ?? 0
  const visibles = verVacias ? [...conArchivos, ...vacias] : conArchivos

  return (
    <section aria-labelledby="materias-title" className="tarjeta flex flex-col gap-4 p-5">
      <h2 id="materias-title" className="sr-only">
        Peso por materia
      </h2>
      {visibles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía ninguna materia tiene archivos.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visibles.map((m) => (
            <li key={m.nombre} className="flex flex-col gap-1.5">
              <p className="flex items-baseline justify-between gap-3 text-sm">
                <span
                  className={cn('min-w-0 truncate', m.archivos === 0 && 'text-muted-foreground')}
                >
                  {m.nombre}
                </span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {formatearTamano(m.bytes)} · {m.archivos}{' '}
                  {m.archivos === 1 ? 'archivo' : 'archivos'}
                </span>
              </p>
              {m.archivos > 0 && <Barra valor={porcentaje(m.bytes, mayor)} />}
            </li>
          ))}
        </ul>
      )}
      {vacias.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => setVerVacias((v) => !v)}
          aria-expanded={verVacias}
        >
          {verVacias
            ? 'Ocultar las materias sin archivos'
            : `Mostrar las ${vacias.length} materias sin archivos`}
        </Button>
      )}
    </section>
  )
}

function ListaUsuarios({
  usuarios,
  miEmail,
  recargar,
}: {
  usuarios: UsuarioAdmin[]
  miEmail: string
  recargar: () => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<Rol | 'todos'>('todos')
  const [cantidad, setCantidad] = useState(POR_TANDA)

  const cuenta = useMemo(() => {
    const c: Record<string, number> = { todos: usuarios.length }
    usuarios.forEach((u) => (c[u.rol] = (c[u.rol] ?? 0) + 1))
    return c
  }, [usuarios])

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim())
    return usuarios
      .filter((u) => filtro === 'todos' || u.rol === filtro)
      .filter((u) => !termino || normalizar(`${u.nombre} ${u.email}`).includes(termino))
      .sort(
        (a, b) =>
          ORDEN_ROL[a.rol] - ORDEN_ROL[b.rol] ||
          (a.nombre || a.email).localeCompare(b.nombre || b.email, 'es'),
      )
  }, [usuarios, busqueda, filtro])

  return (
    <section aria-labelledby="usuarios-title" className="flex flex-col gap-4">
      <h2 id="usuarios-title" className="sr-only">
        Usuarios
      </h2>
      <div className="tarjeta flex flex-col overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <label className="relative">
            <span className="sr-only">Buscar por nombre o mail</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setCantidad(POR_TANDA)
              }}
              placeholder="Buscar por nombre o mail…"
              className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <fieldset className="flex flex-wrap gap-1 self-start rounded-lg bg-muted p-1">
            <legend className="sr-only">Filtrar por rol</legend>
            {[{ value: 'todos' as const, label: 'Todos' }, ...ROLES].map((o) => (
              <label
                key={o.value}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  filtro === o.value
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="filtro-rol"
                  value={o.value}
                  checked={filtro === o.value}
                  onChange={() => {
                    setFiltro(o.value)
                    setCantidad(POR_TANDA)
                  }}
                  className="sr-only"
                />
                {o.label}{' '}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {cuenta[o.value] ?? 0}
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        {filtrados.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No hay usuarios que coincidan.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtrados.slice(0, cantidad).map((u) => (
              <FilaUsuario
                key={u.email}
                usuario={u}
                esYo={u.email === miEmail}
                recargar={recargar}
              />
            ))}
          </ul>
        )}
        {filtrados.length > cantidad && (
          <div className="border-t border-border p-3 text-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCantidad((c) => c + POR_TANDA)}
            >
              Mostrar más ({filtrados.length - cantidad})
            </Button>
          </div>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Los cambios de rol se aplican cuando la persona recarga la página. Nadie puede cambiar su
        propio rol: así la web nunca se queda sin admins.
      </p>
    </section>
  )
}

function FilaUsuario({
  usuario,
  esYo,
  recargar,
}: {
  usuario: UsuarioAdmin
  esYo: boolean
  recargar: () => void
}) {
  const { obtenerToken } = useSesion()
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const quien = usuario.nombre || usuario.email

  async function cambiar(rol: Rol) {
    if (rol === usuario.rol) return
    const confirmacion =
      rol === 'admin'
        ? `¿Hacer admin a ${quien}? Va a poder aprobar pedidos y cambiarle el rol a cualquiera.`
        : rol === 'bloqueado'
          ? `¿Bloquear a ${quien}? No va a poder descargar ni subir material.`
          : usuario.rol === 'admin'
            ? `¿Sacarle el rol de admin a ${quien}?`
            : null
    if (confirmacion && !window.confirm(confirmacion)) return
    setError(null)
    setGuardando(true)
    try {
      await adminCambiarRol(obtenerToken(), usuario.email, rol)
      recargar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el rol.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span
        aria-hidden="true"
        className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-muted font-display text-sm font-bold uppercase sm:flex"
      >
        {quien.charAt(0)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">
          {quien}
          {esYo && <span className="ml-1.5 text-xs text-muted-foreground">(vos)</span>}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {usuario.email} · último ingreso {fecha(usuario.ultimoIngreso)}
        </span>
        {error && (
          <span role="alert" className="text-xs text-destructive">
            {error}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {guardando && (
          <Loader2 className="size-4 animate-spin text-primary" aria-label="Guardando" />
        )}
        {esYo ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            {ETIQUETA[usuario.rol]}
          </span>
        ) : (
          <select
            aria-label={`Rol de ${quien}`}
            value={usuario.rol}
            disabled={guardando}
            onChange={(e) => cambiar(e.target.value as Rol)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </li>
  )
}
