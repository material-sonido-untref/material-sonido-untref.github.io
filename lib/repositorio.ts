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

async function fetchMaterias(url: string): Promise<Materia[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(ERROR_CONEXION)
  const data = (await res.json()) as Respuesta<{ materias: Materia[] }>
  if (!data.ok) throw new Error(data.error)
  return data.materias
}

export function useMaterias() {
  return useSWR(APPS_SCRIPT_URL || null, fetchMaterias, {
    revalidateOnFocus: false,
  })
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
  const { usuario, solicitud } = await enviar<{ usuario: Usuario; solicitud: Solicitud | null }>({
    accion: 'sesion',
    token,
  })
  return { usuario, solicitud }
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
