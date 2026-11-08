import Link from 'next/link'
import { APPS_SCRIPT_URL } from '@/lib/config'
import { MaterialBrowser } from '@/components/material-browser'
import { PedidoAdmin } from '@/components/pedido-colaborador'
import { RankingAportantes } from '@/components/ranking-aportantes'
import { SetupNotice } from '@/components/setup-notice'
import { SiteHeader } from '@/components/site-header'
import { UploadForm } from '@/components/upload-form'
import { SesionProvider } from '@/lib/sesion'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

export default function Page() {
  const configurado = Boolean(APPS_SCRIPT_URL)

  return (
    <SesionProvider>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        {configurado ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div id="material" className="min-w-0 scroll-mt-24">
              <MaterialBrowser />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <UploadForm />
              <PedidoAdmin />
              <RankingAportantes />
            </div>
          </div>
        ) : (
          <SetupNotice />
        )}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start">
          <img
            src={`${basePath}/icono-untref-96.png`}
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-[22%]"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Proyecto independiente hecho por y para alumnos de Ingeniería de Sonido. No es un sitio
            oficial de la Universidad Nacional de Tres de Febrero. Archivos alojados en Google
            Drive. Usamos tu cuenta de Google solo para saber quién descarga y quién sube; tu mail
            no se publica.{' '}
            <Link
              href="/privacidad/"
              className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
            >
              Política de privacidad
            </Link>
          </p>
        </div>
      </footer>
    </SesionProvider>
  )
}
