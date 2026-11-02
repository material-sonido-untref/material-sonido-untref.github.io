export function SetupNotice() {
  return (
    <section
      aria-labelledby="setup-title"
      className="flex flex-col gap-4 rounded-lg border border-dashed border-border bg-card p-6 md:p-8"
    >
      <h2
        id="setup-title"
        className="flex items-center gap-2 font-display text-2xl font-bold uppercase tracking-wide"
      >
        <span className="led" data-on="false" />
        Sin señal del backend
      </h2>
      <p className="max-w-prose leading-relaxed text-muted-foreground">
        Publicá el backend de Apps Script como Web App y cargá su URL (la que termina en{' '}
        <code className="font-mono text-sm text-foreground">/exec</code>) en la variable de entorno{' '}
        <code className="font-mono text-sm text-foreground">NEXT_PUBLIC_APPS_SCRIPT_URL</code>.
      </p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed text-muted-foreground">
        <li>Creá la carpeta raíz en Drive con una subcarpeta por materia.</li>
        <li>Creá una Google Sheet vacía para el registro de subidas.</li>
        <li>Implementá el backend siguiendo el contrato descripto en el README.</li>
        <li>{'Implementar → Nueva implementación → Web App ("Ejecutar como: yo", acceso "Cualquiera").'}</li>
      </ol>
    </section>
  )
}
