'use client'

import { useState } from 'react'
import { BookOpen, ChevronsUpDown, X } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export const TODAS = '__todas__'

type OpcionMateria = { nombre: string; cantidad: number }

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es')

function filtrarSinAcentos(valor: string, busqueda: string) {
  return normalizar(valor).includes(normalizar(busqueda.trim())) ? 1 : 0
}

function Cantidad({ n, destacada }: { n: number | undefined; destacada?: boolean }) {
  return (
    <span
      className={cn(
        'ml-auto min-w-7 rounded-full px-2 py-0.5 text-center text-xs tabular-nums',
        destacada ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      {n ?? '–'}
      <span className="sr-only"> archivos</span>
    </span>
  )
}

export function SelectorMateria({
  materias,
  valor,
  onCambio,
}: {
  materias: OpcionMateria[] | undefined
  valor: string
  onCambio: (materia: string) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const lista = [...(materias ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  const conMaterial = lista.filter((m) => m.cantidad > 0)
  const sinMaterial = lista.filter((m) => m.cantidad === 0)
  const total = materias?.reduce((n, m) => n + m.cantidad, 0)
  const seleccionada = valor === TODAS ? null : lista.find((m) => m.nombre === valor)

  const elegir = (materia: string) => {
    onCambio(materia)
    setAbierto(false)
  }

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger
          disabled={!materias}
          className={cn(
            'flex h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-3 text-left transition-colors hover:border-primary/60 disabled:opacity-60 sm:w-80',
            seleccionada ? 'border-primary/60' : 'border-border',
          )}
        >
          <BookOpen className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-xs text-muted-foreground">Materia</span>
            <span className="truncate text-sm font-medium">
              {seleccionada ? seleccionada.nombre : 'Todas las materias'}
            </span>
          </span>
          <Cantidad n={seleccionada ? seleccionada.cantidad : total} destacada={!!seleccionada} />
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-(--anchor-width) min-w-72 p-0 sm:w-96">
          <Command filter={filtrarSinAcentos} label="Elegir materia">
            <CommandInput placeholder="Buscar materia…" aria-label="Buscar materia" />
            <CommandList className="max-h-[min(24rem,60vh)]">
              <CommandEmpty>No hay ninguna materia con ese nombre.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="Todas las materias"
                  data-checked={valor === TODAS}
                  onSelect={() => elegir(TODAS)}
                >
                  <span className="flex-1 font-medium">Todas las materias</span>
                  <Cantidad n={total} />
                </CommandItem>
              </CommandGroup>
              {conMaterial.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Con material">
                    {conMaterial.map((m) => (
                      <CommandItem
                        key={m.nombre}
                        value={m.nombre}
                        data-checked={valor === m.nombre}
                        onSelect={() => elegir(m.nombre)}
                      >
                        <span className="min-w-0 flex-1 truncate">{m.nombre}</span>
                        <Cantidad n={m.cantidad} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {sinMaterial.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Sin material todavía">
                    {sinMaterial.map((m) => (
                      <CommandItem
                        key={m.nombre}
                        value={m.nombre}
                        data-checked={valor === m.nombre}
                        onSelect={() => elegir(m.nombre)}
                        className="text-muted-foreground"
                      >
                        <span className="min-w-0 flex-1 truncate">{m.nombre}</span>
                        <Cantidad n={0} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {seleccionada && (
        <button
          type="button"
          onClick={() => onCambio(TODAS)}
          className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Quitar filtro de materia: ver todas</span>
        </button>
      )}
    </div>
  )
}
