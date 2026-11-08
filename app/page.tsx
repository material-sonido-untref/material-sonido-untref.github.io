import Link from 'next/link'
import { APPS_SCRIPT_URL } from '@/lib/config'
import { MaterialBrowser } from '@/components/material-browser'
import { SetupNotice } from '@/components/setup-notice'
import { SiteHeader } from '@/components/site-header'
import { UploadForm } from '@/components/upload-form'
import { SesionProvider } from '@/lib/sesion'

export default function Page() {
  const configurado = Boolean(APPS_SCRIPT_URL)

  return (
    <SesionProvider>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        {configurado ? (
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <MaterialBrowser />
            <div className="lg:sticky lg:top-6">
              <UploadForm />
            </div>
          </div>
        ) : (
          <SetupNotice />
        )}
      </main>
      <footer className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-muted-foreground">
          Proyecto independiente hecho por y para alumnos de Ingeniería de Sonido. No es un sitio
          oficial de la Universidad Nacional de Tres de Febrero. Archivos alojados en Google Drive.
          Usamos tu cuenta de Google solo para saber quién descarga y quién sube; tu mail no se
          publica.{' '}
          <Link href="/privacidad/" className="underline underline-offset-4 hover:text-foreground">
            Política de privacidad
          </Link>
        </p>
      </footer>
    </SesionProvider>
  )
}
