import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-barlow',
})
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-barlow-condensed',
})

export const metadata: Metadata = {
  title: 'Ingeniería de Sonido · De alumnos, para alumnos',
  description:
    'Exámenes, apuntes y resúmenes de Ingeniería de Sonido (UNTREF), subidos por alumnos y ordenados por materia. Gratis, con inicio de sesión de Google.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: `${basePath}/icon-32x32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${basePath}/icono-untref-512.png`, sizes: '512x512', type: 'image/png' },
    ],
    apple: `${basePath}/apple-icon.png`,
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a1120',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
