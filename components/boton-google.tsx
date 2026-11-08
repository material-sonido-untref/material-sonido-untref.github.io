'use client'

import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '@/lib/config'
import { useSesion } from '@/lib/sesion'

interface Props {
  texto?: 'signin_with' | 'continue_with' | 'signin'
  tamano?: 'large' | 'medium' | 'small'
  /** En pantallas angostas usa el texto corto ("Acceder") para no ocupar dos filas. */
  compacto?: boolean
}

const PANTALLA_ANGOSTA = '(max-width: 639px)'

function usePantallaAngosta(activo: boolean) {
  const [angosta, setAngosta] = useState(false)
  useEffect(() => {
    if (!activo) return
    const consulta = window.matchMedia(PANTALLA_ANGOSTA)
    const actualizar = () => setAngosta(consulta.matches)
    actualizar()
    consulta.addEventListener('change', actualizar)
    return () => consulta.removeEventListener('change', actualizar)
  }, [activo])
  return activo && angosta
}

/** El botón lo dibuja Google; acá solo se le reserva el lugar. */
export function BotonGoogle({ texto = 'signin_with', tamano = 'large', compacto = false }: Props) {
  const { googleListo } = useSesion()
  const ref = useRef<HTMLDivElement>(null)
  const corto = usePantallaAngosta(compacto)
  const textoFinal = corto ? 'signin' : texto

  useEffect(() => {
    if (!googleListo || !ref.current) return
    window.google?.accounts.id.renderButton(ref.current, {
      type: 'standard',
      theme: 'outline',
      size: tamano,
      text: textoFinal,
      shape: 'pill',
      locale: 'es',
    })
  }, [googleListo, textoFinal, tamano])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="text-sm text-muted-foreground">El inicio de sesión todavía no está configurado.</p>
    )
  }
  // Google dibuja el botón en un iframe de esquema claro; si el contenedor hereda
  // el esquema oscuro de la página, el navegador le pinta un fondo blanco detrás.
  return (
    <div
      ref={ref}
      style={{ colorScheme: 'light' }}
      className={tamano === 'large' ? 'min-h-10' : 'min-h-8'}
    />
  )
}
