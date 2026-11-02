'use client'

import { useId, useRef, useState } from 'react'
import { CheckCircle2, FileUp, Loader2 } from 'lucide-react'
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

type Estado =
  | { tipo: 'inactivo' }
  | { tipo: 'subiendo' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'ok'; nombre: string; url: string }

const campoClase =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

export function UploadForm() {
  const { data: materias, mutate } = useMaterias()
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipo, setTipo] = useState<TipoMaterial>('examen')
  const [estado, setEstado] = useState<Estado>({ tipo: 'inactivo' })
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const ids = { materia: useId(), anio: useId(), archivo: useId(), ayuda: useId() }

  function elegirArchivo(file: File | undefined) {
    if (!file) return
    if (!(MIME_PERMITIDOS as readonly string[]).includes(file.type)) {
      setEstado({ tipo: 'error', mensaje: 'Solo se aceptan archivos PDF, JPG o PNG.' })
      return
    }
    if (file.size > MAX_BYTES) {
      setEstado({ tipo: 'error', mensaje: 'El archivo supera los 20 MB.' })
      return
    }
    setArchivo(file)
    setEstado({ tipo: 'inactivo' })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!archivo) {
      setEstado({ tipo: 'error', mensaje: 'Elegí un archivo para subir.' })
      return
    }
    const form = new FormData(e.currentTarget)
    setEstado({ tipo: 'subiendo' })
    try {
      const subido = await subirMaterial({
        materia: String(form.get('materia')),
        tipo,
        anio: Number(form.get('anio')),
        archivo,
        website: String(form.get('website') ?? ''),
      })
      setEstado({ tipo: 'ok', nombre: subido.nombre, url: subido.url })
      setArchivo(null)
      if (inputRef.current) inputRef.current.value = ''
      mutate()
    } catch (err) {
      setEstado({
        tipo: 'error',
        mensaje: err instanceof Error ? err.message : 'No se pudo subir el archivo.',
      })
    }
  }

  const subiendo = estado.tipo === 'subiendo'

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
          PDF, JPG o PNG de hasta 20 MB. Se guarda en el Drive del proyecto.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.materia} className="text-sm font-medium">
            Materia
          </label>
          <select
            id={ids.materia}
            name="materia"
            required
            disabled={!materias?.length}
            defaultValue=""
            className={campoClase}
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
            Archivo
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
              elegirArchivo(e.dataTransfer.files[0])
            }}
            className={cn(
              'relative flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
              arrastrando ? 'border-primary bg-primary/5' : 'border-border',
            )}
          >
            <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
            {archivo ? (
              <p className="flex max-w-full flex-col text-sm">
                <span className="truncate font-medium">{archivo.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatearTamano(archivo.size)}
                </span>
              </p>
            ) : (
              <p id={ids.ayuda} className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-primary">Elegí un archivo</span> o arrastralo acá
              </p>
            )}
            <input
              ref={inputRef}
              id={ids.archivo}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              aria-describedby={ids.ayuda}
              onChange={(e) => elegirArchivo(e.target.files?.[0])}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
        </div>

        <div aria-hidden="true" className="hidden">
          <label>
            No completar
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={subiendo || !materias?.length}
          className="h-10 font-display text-base font-semibold uppercase tracking-wider"
        >
          {subiendo ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Subiendo…
            </>
          ) : (
            'Subir'
          )}
        </Button>

        <div aria-live="polite" className="text-sm leading-relaxed">
          {estado.tipo === 'error' && <p className="text-destructive">{estado.mensaje}</p>}
          {estado.tipo === 'ok' && (
            <p className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Listo, gracias por compartir.{' '}
                <a
                  href={estado.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ver archivo
                </a>
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
