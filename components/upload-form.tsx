'use client'

import { useId, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Circle, FileUp, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatearTamano,
  MAX_BYTES,
  MIME_PERMITIDOS,
  subirMaterial,
  TIPOS,
  useMaterias,
  type TipoMaterial,
} from '@/lib/repositorio'

const ANIO_ACTUAL = new Date().getFullYear()
const ANIOS = Array.from({ length: ANIO_ACTUAL - 1999 }, (_, i) => ANIO_ACTUAL - i)

const MAX_ARCHIVOS_POR_TANDA = 10

type EstadoItem =
  | { tipo: 'pendiente' }
  | { tipo: 'subiendo' }
  | { tipo: 'error'; mensaje: string; reintentable: boolean }
  | { tipo: 'ok'; url: string }

interface Item {
  clave: string
  archivo: File
  estado: EstadoItem
}

function validarArchivo(file: File): string | null {
  if (!(MIME_PERMITIDOS as readonly string[]).includes(file.type)) {
    return 'Solo se aceptan archivos PDF, JPG o PNG.'
  }
  if (file.size > MAX_BYTES) return 'El archivo supera los 20 MB.'
  if (file.size === 0) return 'El archivo está vacío.'
  return null
}

// Los que fallaron en el servidor (sin conexión, límite por hora) se pueden volver a intentar.
function porSubir(it: Item) {
  return it.estado.tipo === 'pendiente' || (it.estado.tipo === 'error' && it.estado.reintentable)
}

function claveDe(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

const campoClase =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

export function UploadForm() {
  const { data: materias, mutate } = useMaterias()
  const [items, setItems] = useState<Item[]>([])
  const [tipo, setTipo] = useState<TipoMaterial>('examen')
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [materia, setMateria] = useState('')
  const [faltaMateria, setFaltaMateria] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const materiaRef = useRef<HTMLSelectElement>(null)
  const ids = {
    materia: useId(),
    materiaError: useId(),
    anio: useId(),
    archivo: useId(),
    ayuda: useId(),
  }

  function pedirMateria() {
    setFaltaMateria(true)
    materiaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    materiaRef.current?.focus({ preventScroll: true })
  }

  function actualizarItem(clave: string, estado: EstadoItem) {
    setItems((prev) => prev.map((it) => (it.clave === clave ? { ...it, estado } : it)))
  }

  function agregarArchivos(lista: FileList | null | undefined) {
    if (!lista?.length || subiendo) return
    // Lo ya subido se descarta al elegir una tanda nueva.
    const actuales = items.filter((it) => it.estado.tipo !== 'ok')
    const claves = new Set(actuales.map((it) => it.clave))
    const nuevos: Item[] = []
    for (const file of Array.from(lista)) {
      const clave = claveDe(file)
      if (claves.has(clave)) continue
      claves.add(clave)
      const error = validarArchivo(file)
      nuevos.push({
        clave,
        archivo: file,
        estado: error
          ? { tipo: 'error', mensaje: error, reintentable: false }
          : { tipo: 'pendiente' },
      })
    }
    const todos = [...actuales, ...nuevos]
    if (todos.length > MAX_ARCHIVOS_POR_TANDA) {
      setAviso(`Podés subir hasta ${MAX_ARCHIVOS_POR_TANDA} archivos por vez.`)
      setItems(todos.slice(0, MAX_ARCHIVOS_POR_TANDA))
    } else {
      setAviso(null)
      setItems(todos)
    }
    if (inputRef.current) inputRef.current.value = ''
    if (!materia && nuevos.some((it) => it.estado.tipo === 'pendiente')) pedirMateria()
  }

  function quitarItem(clave: string) {
    setItems((prev) => prev.filter((it) => it.clave !== clave))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const aSubir = items.filter(porSubir)
    if (!aSubir.length) {
      setAviso('Elegí al menos un archivo para subir.')
      return
    }
    if (!materia) {
      pedirMateria()
      return
    }
    const form = new FormData(e.currentTarget)
    const anio = Number(form.get('anio'))
    const website = String(form.get('website') ?? '')

    setAviso(null)
    setSubiendo(true)
    let subidos = 0
    // De a uno: Apps Script procesa las subidas en fila y así cada archivo muestra su propio resultado.
    for (const it of aSubir) {
      actualizarItem(it.clave, { tipo: 'subiendo' })
      try {
        const subido = await subirMaterial({ materia, tipo, anio, archivo: it.archivo, website })
        actualizarItem(it.clave, { tipo: 'ok', url: subido.url })
        subidos++
      } catch (err) {
        actualizarItem(it.clave, {
          tipo: 'error',
          mensaje: err instanceof Error ? err.message : 'No se pudo subir el archivo.',
          reintentable: true,
        })
      }
    }
    setSubiendo(false)
    if (subidos > 0) mutate()
  }

  const pendientes = items.filter(porSubir).length
  const subidosOk = items.filter((it) => it.estado.tipo === 'ok').length

  return (
    <section
      id="subir"
      aria-labelledby="subir-title"
      className="flex scroll-mt-6 flex-col gap-5 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="subir-title"
          className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide"
        >
          <span className="led" data-on={subiendo} />
          Subir material
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          PDF, JPG o PNG de hasta 20 MB cada uno, hasta {MAX_ARCHIVOS_POR_TANDA} por vez. Se guardan en
          el Drive del proyecto.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.materia} className="text-sm font-medium">
            Materia
          </label>
          <select
            ref={materiaRef}
            id={ids.materia}
            name="materia"
            required
            disabled={!materias?.length || subiendo}
            value={materia}
            onChange={(e) => {
              setMateria(e.target.value)
              setFaltaMateria(false)
            }}
            aria-invalid={faltaMateria}
            aria-describedby={faltaMateria ? ids.materiaError : undefined}
            className={cn(
              campoClase,
              faltaMateria && 'border-destructive ring-3 ring-destructive/30',
            )}
          >
            <option value="" disabled>
              {materias ? 'Elegí una materia' : 'Cargando materias…'}
            </option>
            {materias?.map((m) => (
              <option key={m.nombre} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
          {faltaMateria && (
            <p id={ids.materiaError} role="alert" className="text-sm text-destructive">
              Elegí la materia a la que pertenecen los archivos.
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {TIPOS.map((t) => (
              <label
                key={t.value}
                className={cn(
                  'cursor-pointer rounded-md py-1.5 text-center text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                  tipo === t.value
                    ? 'bg-card font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <input
                  type="radio"
                  name="tipo"
                  value={t.value}
                  checked={tipo === t.value}
                  onChange={() => setTipo(t.value)}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.anio} className="text-sm font-medium">
            Año
          </label>
          <select id={ids.anio} name="anio" defaultValue={ANIO_ACTUAL} className={campoClase}>
            {ANIOS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.archivo} className="text-sm font-medium">
            Archivos
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setArrastrando(true)
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault()
              setArrastrando(false)
              agregarArchivos(e.dataTransfer.files)
            }}
            className={cn(
              'relative flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              arrastrando ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
            <p id={ids.ayuda} className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-primary">Elegí uno o varios archivos</span> o
              arrastralos acá
            </p>
            <input
              ref={inputRef}
              id={ids.archivo}
              type="file"
              multiple
              disabled={subiendo}
              accept="application/pdf,image/jpeg,image/png"
              aria-describedby={ids.ayuda}
              onChange={(e) => agregarArchivos(e.target.files)}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </div>

        {items.length > 0 && (
          <ul className="flex flex-col gap-1.5" aria-label="Archivos elegidos">
            {items.map((it) => (
              <li
                key={it.clave}
                className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <IconoEstado estado={it.estado} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{it.archivo.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatearTamano(it.archivo.size)}
                  </span>
                  {it.estado.tipo === 'error' && (
                    <span className="text-xs text-destructive">{it.estado.mensaje}</span>
                  )}
                  {it.estado.tipo === 'ok' && (
                    <a
                      href={it.estado.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Ver archivo
                    </a>
                  )}
                </div>
                {!subiendo && it.estado.tipo !== 'ok' && (
                  <button
                    type="button"
                    onClick={() => quitarItem(it.clave)}
                    aria-label={`Quitar ${it.archivo.name}`}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div aria-hidden="true" className="hidden">
          <label>
            No completar
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={subiendo || !materias?.length || pendientes === 0}
          className="h-10 font-display text-base font-semibold uppercase tracking-wider"
        >
          {subiendo ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Subiendo…
            </>
          ) : items.some((it) => it.estado.tipo === 'error' && it.estado.reintentable) ? (
            'Reintentar'
          ) : pendientes > 1 ? (
            `Subir ${pendientes} archivos`
          ) : (
            'Subir'
          )}
        </Button>

        <div aria-live="polite" className="text-sm leading-relaxed">
          {aviso && <p className="text-destructive">{aviso}</p>}
          {!subiendo && subidosOk > 0 && (
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
              <span>
                {subidosOk === 1
                  ? 'Listo, se subió 1 archivo. Gracias por compartir.'
                  : `Listo, se subieron ${subidosOk} archivos. Gracias por compartir.`}
              </span>
            </p>
          )}
        </div>
      </form>

      <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        Las subidas quedan registradas y los administradores eliminan lo que no corresponda. No
        subas material con datos personales.
      </p>
    </section>
  )
}

function IconoEstado({ estado }: { estado: EstadoItem }) {
  const clase = 'mt-0.5 size-4 shrink-0'
  switch (estado.tipo) {
    case 'subiendo':
      return <Loader2 className={cn(clase, 'animate-spin text-primary')} aria-label="Subiendo" />
    case 'ok':
      return <CheckCircle2 className={cn(clase, 'text-emerald-500')} aria-label="Subido" />
    case 'error':
      return <AlertCircle className={cn(clase, 'text-destructive')} aria-label="Error" />
    default:
      return <Circle className={cn(clase, 'text-muted-foreground')} aria-label="Pendiente" />
  }
}
