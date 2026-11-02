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

export interface Archivo {
  id: string
  nombre: string
  url: string
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

type Respuesta<T> = ({ ok: true } & T) | { ok: false; error: string }

async function fetchMaterias(url: string): Promise<Materia[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo conectar con el repositorio.')
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

export interface DatosSubida {
  materia: string
  tipo: TipoMaterial
  anio: number
  archivo: File
  website: string
}

export async function subirMaterial({ archivo, ...campos }: DatosSubida) {
  const data = await leerComoBase64(archivo)
  // text/plain evita el preflight CORS, que Apps Script no responde.
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      ...campos,
      nombre: archivo.name,
      mimeType: archivo.type,
      data,
    }),
  })
  if (!res.ok) throw new Error('No se pudo conectar con el repositorio.')
  const json = (await res.json()) as Respuesta<{ archivo: Pick<Archivo, 'id' | 'nombre' | 'url'> }>
  if (!json.ok) throw new Error(json.error)
  return json.archivo
}

export function formatearTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
