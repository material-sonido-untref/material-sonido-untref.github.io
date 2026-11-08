'use client'

import useSWR from 'swr'
import { APPS_SCRIPT_URL } from '@/lib/config'

export const MAX_BYTES = 20 * 1024 * 1024
export const MIME_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'] as const

export const TIPOS = [
  { value: 'examen', label: 'Examen' },
  { value: 'apunte', label: 'Apunte' },
  { value: 'otro', label: 'Otro' },
] as const

export type TipoMaterial = (typeof TIPOS)[number]['value']

/** Lo que ve cualquiera en el listado: el enlace se pide aparte, con sesión. */
export interface Archivo {
  clave: string
  nombre: string
  mimeType: string
  tamano: number
  fecha: string
  tipo: TipoMaterial
  anio: number | null
  votos: number
  descargas: number
  /** Nombre abreviado de quien lo subió ("Enzo R."); null si se cargó a mano en Drive. */
  autor: string | null
}

export interface Aportante {
  nombre: string
  archivos: number
  votos: number
  puntos: number
}

export interface Repositorio {
  materias: Materia[]
  ranking: Aportante[]
}

export interface Materia {
  nombre: string
  archivos: Archivo[]
}

export type Rol = 'lector' | 'colaborador' | 'admin' | 'bloqueado'

export interface Usuario {
  email: string
  nombre: string
  rol: Rol
}

/** Pedido para ser colaborador; solo llega si está pendiente o fue rechazado. */
export interface Solicitud {
  estado: 'pendiente' | 'rechazada'
  fecha: string
}

export function puedeDescargar(rol: Rol) {
  return rol === 'lector' || rol === 'colaborador' || rol === 'admin'
}

export function puedeSubir(rol: Rol) {
  return rol === 'colaborador' || rol === 'admin'
}

type Respuesta<T> = ({ ok: true } & T) | { ok: false; error: string }

const ERROR_CONEXION = 'No se pudo conectar con el repositorio.'

async function fetchRepositorio(url: string): Promise<Repositorio> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(ERROR_CONEXION)
  const data = (await res.json()) as Respuesta<Repositorio>
  if (!data.ok) throw new Error(data.error)
  return { materias: data.materias, ranking: data.ranking ?? [] }
}

/** Listado, votos y ranking vienen juntos; los dos hooks comparten la misma caché. */
export function useRepositorio() {
  return useSWR(APPS_SCRIPT_URL || null, fetchRepositorio, {
    revalidateOnFocus: false,
  })
}

export function useMaterias() {
  const { data, ...resto } = useRepositorio()
  return { ...resto, data: data?.materias }
}

function leerComoBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const resultado = String(reader.result)
      resolve(resultado.slice(resultado.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

async function enviar<T>(cuerpo: Record<string, unknown>): Promise<T> {
  let res: Response
  try {
    // text/plain evita el preflight CORS, que Apps Script no responde.
    res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(cuerpo),
    })
  } catch {
    throw new Error(ERROR_CONEXION)
  }
  if (!res.ok) throw new Error(ERROR_CONEXION)
  const json = (await res.json()) as Respuesta<T>
  if (!json.ok) throw new Error(json.error)
  return json
}

export async function iniciarSesion(token: string) {
  const datos = await enviar<{
    usuario: Usuario
    solicitud: Solicitud | null
    misVotos?: string[]
    misArchivos?: string[]
  }>({ accion: 'sesion', token })
  return {
    usuario: datos.usuario,
    solicitud: datos.solicitud,
    misVotos: datos.misVotos ?? [],
    misArchivos: datos.misArchivos ?? [],
  }
}

export async function votarArchivo(token: string, clave: string, voto: boolean) {
  return enviar<{ votado: boolean; votos: number }>({ accion: 'votar', token, clave, voto })
}

export async function solicitarColaborador(token: string, curso: string, motivo: string) {
  const { solicitud } = await enviar<{ solicitud: Solicitud }>({
    accion: 'solicitar',
    token,
    curso,
    motivo,
  })
  return solicitud
}

export async function pedirEnlace(token: string, clave: string) {
  const { url } = await enviar<{ url: string }>({ accion: 'enlace', token, clave })
  return url
}

export interface DatosSubida {
  token: string
  materia: string
  tipo: TipoMaterial
  anio: number
  archivo: File
  website: string
}

export async function subirMaterial({ archivo, ...campos }: DatosSubida) {
  const data = await leerComoBase64(archivo)
  const { archivo: subido } = await enviar<{ archivo: { id: string; nombre: string; url: string } }>({
    accion: 'subir',
    ...campos,
    nombre: archivo.name,
    mimeType: archivo.type,
    data,
  })
  return subido
}

export function formatearTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
