'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '@/lib/config'
import { iniciarSesion, type Solicitud, type Usuario } from '@/lib/repositorio'

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: {
        client_id: string
        callback: (respuesta: { credential: string }) => void
        auto_select?: boolean
        cancel_on_tap_outside?: boolean
        use_fedcm_for_prompt?: boolean
      }): void
      renderButton(elemento: HTMLElement, opciones: Record<string, unknown>): void
      prompt(): void
      disableAutoSelect(): void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

const SCRIPT_GOOGLE = 'https://accounts.google.com/gsi/client'
const CLAVE_GUARDADO = 'material-sonido:sesion'
// El token de Google dura una hora; se descarta un poco antes para que no venza a mitad de un pedido.
const MARGEN_VENCIMIENTO_MS = 2 * 60 * 1000
export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Volvé a iniciar sesión con Google.'

type Estado = 'cargando' | 'anonimo' | 'conectado'

interface TokenGuardado {
  token: string
  vence: number
}

interface ValorSesion {
  estado: Estado
  usuario: Usuario | null
  solicitud: Solicitud | null
  setSolicitud(solicitud: Solicitud | null): void
  /** Claves de los archivos que la persona marcó como "Me sirvió". */
  misVotos: ReadonlySet<string>
  marcarVoto(clave: string, votado: boolean): void
  /** Claves de los archivos que subió la persona (no los puede votar). */
  misArchivos: ReadonlySet<string>
  error: string | null
  googleListo: boolean
  /** Devuelve un token vigente o tira un error con un mensaje para mostrar. */
  obtenerToken(): string
  cerrarSesion(): void
}

const ContextoSesion = createContext<ValorSesion | null>(null)

export function useSesion() {
  const valor = useContext(ContextoSesion)
  if (!valor) throw new Error('useSesion tiene que usarse dentro de <SesionProvider>.')
  return valor
}

function vencimientoDe(token: string) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return Number(JSON.parse(atob(payload)).exp) * 1000
  } catch {
    return 0
  }
}

function estaVigente(guardado: TokenGuardado | null): guardado is TokenGuardado {
  return Boolean(guardado && guardado.vence - MARGEN_VENCIMIENTO_MS > Date.now())
}

function leerGuardado(): TokenGuardado | null {
  try {
    const crudo = localStorage.getItem(CLAVE_GUARDADO)
    return crudo ? (JSON.parse(crudo) as TokenGuardado) : null
  } catch {
    return null
  }
}

function escribirGuardado(valor: TokenGuardado | null) {
  try {
    if (valor) localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(valor))
    else localStorage.removeItem(CLAVE_GUARDADO)
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura hasta recargar la página.
  }
}

function cargarScriptGoogle(alCargar: () => void) {
  if (window.google?.accounts) {
    alCargar()
    return
  }
  let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_GOOGLE}"]`)
  if (!script) {
    script = document.createElement('script')
    script.src = SCRIPT_GOOGLE
    script.async = true
    document.head.appendChild(script)
  }
  script.addEventListener('load', alCargar, { once: true })
}

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [misVotos, setMisVotos] = useState<ReadonlySet<string>>(new Set())
  const [misArchivos, setMisArchivos] = useState<ReadonlySet<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [googleListo, setGoogleListo] = useState(false)
  const tokenRef = useRef<TokenGuardado | null>(null)

  const olvidarSesion = useCallback(() => {
    tokenRef.current = null
    escribirGuardado(null)
    setUsuario(null)
    setSolicitud(null)
    setMisVotos(new Set())
    setMisArchivos(new Set())
    setEstado('anonimo')
  }, [])

  const conectar = useCallback(
    async (guardado: TokenGuardado) => {
      tokenRef.current = guardado
      setEstado('cargando')
      setError(null)
      try {
        const datos = await iniciarSesion(guardado.token)
        escribirGuardado(guardado)
        setUsuario(datos.usuario)
        setSolicitud(datos.solicitud)
        setMisVotos(new Set(datos.misVotos))
        setMisArchivos(new Set(datos.misArchivos))
        setEstado('conectado')
      } catch (err) {
        olvidarSesion()
        setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
      }
    },
    [olvidarSesion],
  )

  useEffect(() => {
    const guardado = leerGuardado()
    if (estaVigente(guardado)) conectar(guardado)
    else {
      escribirGuardado(null)
      setEstado('anonimo')
    }

    if (!GOOGLE_CLIENT_ID) return
    cargarScriptGoogle(() => {
      const google = window.google
      if (!google) return
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => conectar({ token: credential, vence: vencimientoDe(credential) }),
        auto_select: true,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      })
      setGoogleListo(true)
      // Quien ya entró antes vuelve a entrar solo; a los demás Google les ofrece hacerlo.
      if (!estaVigente(guardado)) google.accounts.id.prompt()
    })
  }, [conectar])

  const obtenerToken = useCallback(() => {
    const guardado = tokenRef.current
    if (estaVigente(guardado)) return guardado.token
    olvidarSesion()
    setError(MENSAJE_SESION_VENCIDA)
    window.google?.accounts.id.prompt()
    throw new Error(MENSAJE_SESION_VENCIDA)
  }, [olvidarSesion])

  const marcarVoto = useCallback((clave: string, votado: boolean) => {
    setMisVotos((prev) => {
      const nuevo = new Set(prev)
      if (votado) nuevo.add(clave)
      else nuevo.delete(clave)
      return nuevo
    })
  }, [])

  const cerrarSesion = useCallback(() => {
    window.google?.accounts.id.disableAutoSelect()
    olvidarSesion()
    setError(null)
  }, [olvidarSesion])

  const valor = useMemo<ValorSesion>(
    () => ({
      estado,
      usuario,
      solicitud,
      setSolicitud,
      misVotos,
      marcarVoto,
      misArchivos,
      error,
      googleListo,
      obtenerToken,
      cerrarSesion,
    }),
    [estado, usuario, solicitud, misVotos, marcarVoto, misArchivos, error, googleListo, obtenerToken, cerrarSesion],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
