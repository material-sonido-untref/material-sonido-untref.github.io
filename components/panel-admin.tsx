'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Check, Inbox, Loader2, RotateCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { BotonGoogle } from '@/components/boton-google'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  adminCambiarRol,
  adminDatos,
  adminResolver,
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
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es')

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
    <div className="flex flex-col gap-8">
      <Pedidos pendientes={data.pendientes} recargar={() => mutate()} />
      <ListaUsuarios usuarios={data.usuarios} miEmail={miEmail} recargar={() => mutate()} />
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
      <h2
        id="pedidos-title"
        className="flex items-center gap-3 font-display text-3xl font-bold uppercase tracking-wide"
      >
        <Inbox className="size-6 text-primary" aria-hidden="true" />
        Pedidos pendientes
        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-base text-primary tabular-nums">
          {pendientes.length}
        </span>
      </h2>
      {pendientes.length === 0 ? (
        <p className="tarjeta p-5 text-sm text-muted-foreground">
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
      <h2
        id="usuarios-title"
        className="flex items-center gap-3 font-display text-3xl font-bold uppercase tracking-wide"
      >
        <Users className="size-6 text-primary" aria-hidden="true" />
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
