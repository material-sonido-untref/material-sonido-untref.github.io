'use client'

import { useId, useState } from 'react'
import { Clock, Loader2, Send, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { solicitarColaborador, type RolPedido } from '@/lib/repositorio'
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

const TEXTOS: Record<
  RolPedido,
  {
    titulo: string
    ayuda: string
    preguntaMotivo: string
    ejemploMotivo: string
    faltaMotivo: string
    alAprobar: string
    paraReintentar: string
  }
> = {
  colaborador: {
    titulo: 'Quiero subir material',
    ayuda: 'Para subir hay que ser colaborador. Contanos quién sos y les llega un aviso a los admins.',
    preguntaMotivo: '¿Qué material querés subir?',
    ejemploMotivo: 'Ej.: tengo los parciales 2024 de Análisis de Señales y apuntes de Acústica.',
    faltaMotivo: 'Contanos en una frase qué material querés subir.',
    alAprobar: 'Cuando te habiliten te llega un mail y vas a ver acá el formulario para subir.',
    paraReintentar: 'contando un poco más qué material tenés',
  },
  admin: {
    titulo: 'Quiero ser admin',
    ayuda:
      'Los admins aprueban pedidos y administran a los usuarios. Contanos por qué querés sumarte y les llega un aviso.',
    preguntaMotivo: '¿Por qué querés ser admin?',
    ejemploMotivo: 'Ej.: quiero ayudar a revisar lo que se sube de 3.º año.',
    faltaMotivo: 'Contanos en una frase por qué querés ser admin.',
    alAprobar: 'Cuando te aprueben te llega un mail y vas a ver el panel de admin.',
    paraReintentar: 'contando un poco más por qué querés sumarte',
  },
}

/** Pedido para pasar al rol siguiente: muestra el estado del último o el formulario. */
function PedidoDeRol({ pide }: { pide: RolPedido }) {
  const { solicitud: ultima } = useSesion()
  const [reintentando, setReintentando] = useState(false)
  // Los pedidos anteriores al rol "admin" llegan sin "pide": todos eran para colaborador.
  const solicitud = ultima && (ultima.pide ?? 'colaborador') === pide ? ultima : null
  const textos = TEXTOS[pide]

  if (solicitud?.estado === 'pendiente') {
    const fecha = fechaLegible(solicitud.fecha)
    return (
      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        <p className="flex items-center gap-2 font-medium">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          Tu pedido está pendiente
        </p>
        <p className="text-muted-foreground">
          Lo enviaste{fecha && ` el ${fecha}`}. Los admins ya recibieron un aviso. {textos.alAprobar}
        </p>
      </div>
    )
  }

  if (solicitud?.estado === 'rechazada' && !reintentando) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm leading-relaxed">
        <p className="font-medium">Tu pedido anterior no fue aprobado.</p>
        <p className="text-muted-foreground">
          Si querés, podés volver a pedirlo {textos.paraReintentar}.
        </p>
        <Button type="button" variant="outline" onClick={() => setReintentando(true)}>
          Volver a pedir
        </Button>
      </div>
    )
  }

  return <FormularioPedido pide={pide} />
}

/** Lo que ve un lector en lugar del formulario de subida. */
export function PedidoColaborador() {
  return <PedidoDeRol pide="colaborador" />
}

/** Tarjeta para que un colaborador pida ser admin; no se muestra a nadie más. */
export function PedidoAdmin() {
  const { estado, usuario, solicitud } = useSesion()
  const [abierto, setAbierto] = useState(false)
  if (estado !== 'conectado' || usuario?.rol !== 'colaborador') return null
  const hayPedido = solicitud?.pide === 'admin'

  return (
    <section aria-labelledby="pedido-admin-title" className="tarjeta flex flex-col gap-4 p-5">
      <h2
        id="pedido-admin-title"
        className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide"
      >
        <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
        ¿Querés ser admin?
      </h2>
      {abierto || hayPedido ? (
        <PedidoDeRol pide="admin" />
      ) : (
        <div className="flex flex-col items-start gap-3 text-sm leading-relaxed">
          <p className="text-muted-foreground">
            Los admins aprueban pedidos y administran a los usuarios. Si querés sumarte, pedíselo a
            los admins actuales.
          </p>
          <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
            Pedir ser admin
          </Button>
        </div>
      )}
    </section>
  )
}

function FormularioPedido({ pide }: { pide: RolPedido }) {
  const { obtenerToken, setSolicitud } = useSesion()
  const [curso, setCurso] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { curso: useId(), motivo: useId(), ayuda: useId() }
  const textos = TEXTOS[pide]

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!curso.trim()) {
      setError('Contanos qué año o comisión cursás.')
      return
    }
    if (motivo.trim().length < MIN_MOTIVO) {
      setError(textos.faltaMotivo)
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
        <p className="text-sm font-medium">{textos.titulo}</p>
        <p id={ids.ayuda} className="text-sm leading-relaxed text-muted-foreground">
          {textos.ayuda}
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
          {textos.preguntaMotivo}
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
          placeholder={textos.ejemploMotivo}
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
