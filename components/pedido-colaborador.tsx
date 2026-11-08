'use client'

import { useId, useState } from 'react'
import { Clock, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { solicitarColaborador } from '@/lib/repositorio'
import { useSesion } from '@/lib/sesion'

const MAX_CURSO = 80
const MAX_MOTIVO = 500
const MIN_MOTIVO = 10

const campoClase =
  'w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

const formatoFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' })

function fechaLegible(iso: string) {
  const fecha = new Date(iso)
  return Number.isNaN(fecha.getTime()) ? '' : formatoFecha.format(fecha)
}

/** Lo que ve un lector en lugar del formulario de subida. */
export function PedidoColaborador() {
  const { solicitud } = useSesion()
  const [reintentando, setReintentando] = useState(false)

  if (solicitud?.estado === 'pendiente') {
    const fecha = fechaLegible(solicitud.fecha)
    return (
      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        <p className="flex items-center gap-2 font-medium">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          Tu pedido está pendiente
        </p>
        <p className="text-muted-foreground">
          Lo enviaste{fecha && ` el ${fecha}`}. Los admins ya recibieron un mail y te pueden
          responder a tu correo. Cuando te habiliten, vas a ver acá el formulario para subir
          (recargá la página).
        </p>
      </div>
    )
  }

  if (solicitud?.estado === 'rechazada' && !reintentando) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm leading-relaxed">
        <p className="font-medium">Tu pedido anterior no fue aprobado.</p>
        <p className="text-muted-foreground">
          Si querés, podés volver a pedirlo contando un poco más qué material tenés.
        </p>
        <Button type="button" variant="outline" onClick={() => setReintentando(true)}>
          Volver a pedir
        </Button>
      </div>
    )
  }

  return <FormularioPedido />
}

function FormularioPedido() {
  const { obtenerToken, setSolicitud } = useSesion()
  const [curso, setCurso] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { curso: useId(), motivo: useId(), ayuda: useId() }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!curso.trim()) {
      setError('Contanos qué año o comisión cursás.')
      return
    }
    if (motivo.trim().length < MIN_MOTIVO) {
      setError('Contanos en una frase qué material querés subir.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      setSolicitud(await solicitarColaborador(obtenerToken(), curso.trim(), motivo.trim()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Quiero subir material</p>
        <p id={ids.ayuda} className="text-sm leading-relaxed text-muted-foreground">
          Para subir hay que ser colaborador. Contanos quién sos y les llega un aviso a los admins.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.curso} className="text-sm font-medium">
          Año o comisión que cursás
        </label>
        <input
          id={ids.curso}
          value={curso}
          onChange={(e) => {
            setCurso(e.target.value)
            setError(null)
          }}
          maxLength={MAX_CURSO}
          placeholder="Ej.: 2.º año, comisión A"
          className={`${campoClase} h-10`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.motivo} className="text-sm font-medium">
          ¿Qué material querés subir?
        </label>
        <textarea
          id={ids.motivo}
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value)
            setError(null)
          }}
          maxLength={MAX_MOTIVO}
          rows={3}
          placeholder="Ej.: tengo los parciales 2024 de Análisis de Señales y apuntes de Acústica."
          aria-describedby={ids.ayuda}
          className={`${campoClase} resize-y py-2 leading-relaxed`}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={enviando}
        className="h-11 rounded-full font-display text-base font-semibold uppercase tracking-wider"
      >
        {enviando ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          <>
            <Send aria-hidden="true" />
            Enviar pedido
          </>
        )}
      </Button>

      <div aria-live="polite" className="text-sm">
        {error && <p className="text-destructive">{error}</p>}
      </div>
    </form>
  )
}
