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
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 flex-col items-end text-right leading-tight">
        <span className="max-w-[9rem] truncate text-sm font-medium sm:max-w-[12rem]" title={usuario.email}>
          {usuario.nombre || usuario.email}
        </span>
        <span className="font-display text-xs font-semibold uppercase tracking-wider text-primary">
          {ETIQUETA_ROL[usuario.rol]}
        </span>
      </div>
      <button
        type="button"
        onClick={cerrarSesion}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground sm:px-3"
      >
        <LogOut className="size-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Salir</span>
      </button>
    </div>
  )
}
