import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de privacidad · Material de Ingeniería de Sonido',
  description: 'Qué datos usa el repositorio de material de Ingeniería de Sonido y para qué.',
}

const CONTACTO = 'ingenieriaensonidountref@gmail.com'

export default function Privacidad() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 md:py-14">
      <Link
        href="/"
        className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        ← Volver al material
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight">
          Política de privacidad
        </h1>
        <p className="text-sm text-muted-foreground">Última actualización: noviembre de 2026</p>
      </header>

      <Seccion titulo="Quiénes somos">
        <p>
          Este sitio es un proyecto independiente hecho por y para alumnos de Ingeniería de Sonido.
          No es un sitio oficial de la Universidad Nacional de Tres de Febrero. Lo administra un
          grupo de alumnos voluntarios.
        </p>
      </Seccion>

      <Seccion titulo="Qué datos usamos">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong>Al iniciar sesión con Google:</strong> tu mail y tu nombre, tal como figuran en
            tu cuenta de Google. No recibimos tu contraseña ni ningún otro dato de tu cuenta.
          </li>
          <li>
            <strong>Tu rol en el sitio</strong> (lector, colaborador o admin), la fecha en que
            entraste por primera vez y la última vez que iniciaste sesión.
          </li>
          <li>
            <strong>Al subir material:</strong> el archivo, la materia, el tipo, el año, la fecha y
            el mail de quien lo subió.
          </li>
          <li>
            <strong>Votos y descargas:</strong> qué archivos marcaste como “Me sirvió” y cuáles
            abriste. En el sitio solo se muestran los totales, nunca quién votó o descargó.
          </li>
          <li>
            <strong>En tu navegador:</strong> guardamos la sesión de Google para que no tengas que
            iniciarla en cada visita. Se borra al tocar “Salir”. No usamos cookies de publicidad
            ni herramientas de seguimiento.
          </li>
        </ul>
      </Seccion>

      <Seccion titulo="Para qué los usamos">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Saber quién puede descargar y quién puede subir material.</li>
          <li>Poder contactar o dar de baja a quien suba algo que no corresponde.</li>
          <li>Llevar un registro de lo que se sube al repositorio.</li>
        </ul>
        <p>
          No vendemos ni compartimos tus datos con nadie, y tu mail no se muestra en el sitio. Si
          subís material, al lado de cada archivo y en el ranking de aportantes aparece tu nombre
          abreviado (por ejemplo, “Enzo R.”).
        </p>
      </Seccion>

      <Seccion titulo="Dónde se guardan y quién los ve">
        <p>
          Los datos y los archivos se guardan en Google Drive y Google Sheets, en la cuenta de
          Google del proyecto. Solo los administradores del sitio pueden ver la lista de usuarios y
          el registro de subidas. El material que se sube queda visible para los usuarios con sesión
          iniciada.
        </p>
      </Seccion>

      <Seccion titulo="Tus derechos">
        <p>
          Podés pedir que borremos tus datos o el material que subiste escribiendo a{' '}
          <a
            href={`mailto:${CONTACTO}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {CONTACTO}
          </a>
          . Respondemos a la brevedad.
        </p>
      </Seccion>
    </main>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta flex flex-col gap-3 p-6 leading-relaxed">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">{titulo}</h2>
      {children}
    </section>
  )
}
