'use client'

import { LogOut } from 'lucide-react'
import { BotonGoogle } from '@/components/boton-google'
import { useSesion } from '@/lib/sesion'
import type { Rol } from '@/lib/repositorio'

const ETIQUETA_ROL: Record<Rol, string> = {
  lector: 'Lector',
  colaborador: 'Colaborador',
  admin: 'Admin',
  bloqueado: 'Sin acceso',
}

export function BarraSesion() {
  const { estado, usuario, cerrarSesion } = useSesion()

  if (estado === 'cargando') {
    return <span className="h-8 w-32 animate-pulse rounded-full bg-muted" aria-label="Verificando sesión" />
  }

  if (estado === 'anonimo' || !usuario) {
    return <BotonGoogle tamano="medium" />
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex min-w-0 flex-col items-end text-right leading-tight">
        <span className="max-w-[12rem] truncate text-sm font-medium" title={usuario.email}>
          {usuario.nombre || usuario.email}
        </span>
        <span className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {ETIQUETA_ROL[usuario.rol]}
        </span>
      </div>
      <button
        type="button"
        onClick={cerrarSesion}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Salir
      </button>
    </div>
  )
}
