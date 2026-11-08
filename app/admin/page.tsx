import type { Metadata } from 'next'
import Link from 'next/link'
import { BarraSuperior } from '@/components/site-header'
import { PanelAdmin } from '@/components/panel-admin'
import { SesionProvider } from '@/lib/sesion'

export const metadata: Metadata = {
  title: 'Panel de admin · Ingeniería de Sonido',
  robots: { index: false, follow: false },
}

export default function Admin() {
  return (
    <SesionProvider>
      <BarraSuperior />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-10">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            ← Volver al material
          </Link>
          <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-tight">
            Panel de admin
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Aprobá pedidos y administrá quién puede subir material o ser admin. Todo queda
            registrado en la planilla del proyecto.
          </p>
        </div>
        <PanelAdmin />
      </main>
    </SesionProvider>
  )
}
