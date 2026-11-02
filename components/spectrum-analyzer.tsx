const BANDAS = 40
const MARCAS = ['20', '100', '1k', '10k', '20k']

// Curva tipo ruido rosa con algo de textura, determinística para que no cambie entre renders.
const NIVELES = Array.from({ length: BANDAS }, (_, i) => {
  const x = i / (BANDAS - 1)
  const tendencia = 0.85 - 0.45 * x
  const textura = 0.18 * Math.sin(i * 1.7) * Math.cos(i * 0.45) + 0.08 * Math.sin(i * 4.1)
  const nivel = Math.min(0.97, Math.max(0.12, tendencia + textura))
  const pico = Math.min(1, nivel + 0.06 + 0.05 * Math.abs(Math.sin(i * 2.3)))
  return { nivel, pico }
})

export function SpectrumAnalyzer() {
  return (
    <figure className="flex flex-col gap-2" aria-hidden="true">
      <div className="flex h-36 items-end gap-0.5 rounded-lg border border-border bg-card p-3 md:h-48 md:gap-1">
        {NIVELES.map(({ nivel, pico }, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <div className="h-0.5 shrink-0 bg-primary" />
            <div className="shrink-0" style={{ height: `${(pico - nivel) * 100}%` }} />
            <div
              className="barra-espectro shrink-0 rounded-t-[1px] bg-muted-foreground/45"
              style={{ height: `${nivel * 100}%`, animationDelay: `${i * 18}ms` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between px-3 font-display text-xs uppercase tracking-wider text-muted-foreground tabular-nums">
        {MARCAS.map((m) => (
          <span key={m}>{m === '20k' ? '20 kHz' : m === '20' ? '20 Hz' : m}</span>
        ))}
      </figcaption>
    </figure>
  )
}
