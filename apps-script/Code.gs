/**
 * Backend del repositorio de material.
 * Publicar como Web App: "Ejecutar como: yo" y "Quién tiene acceso: Cualquiera".
 */

const CONFIG = {
  ROOT_FOLDER_ID: 'PEGAR_ID_DE_LA_CARPETA_RAIZ',
  SHEET_ID: 'PEGAR_ID_DE_LA_SHEET_DE_REGISTRO',
  MAX_BYTES: 20 * 1024 * 1024,
  MAX_SUBIDAS_POR_HORA: 60,
  CACHE_SEGUNDOS: 300,
}

const TIPOS = ['examen', 'apunte', 'otro']
const EXTENSIONES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}
const CACHE_KEY = 'listado-v1'

function doGet() {
  try {
    return json({ ok: true, materias: listarMaterias() })
  } catch (err) {
    return json({ ok: false, error: mensaje(err) })
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}')

    // Campo trampa: los humanos no lo ven, los bots lo completan.
    if (body.website) throw new Error('Solicitud inválida.')

    const materia = String(body.materia || '').trim()
    const tipo = String(body.tipo || '')
    const anio = Number(body.anio)
    const mimeType = String(body.mimeType || '')
    const anioActual = new Date().getFullYear()

    if (!materia) throw new Error('Elegí una materia.')
    if (TIPOS.indexOf(tipo) === -1) throw new Error('Tipo de material inválido.')
    if (!Number.isInteger(anio) || anio < 1990 || anio > anioActual) {
      throw new Error('Año inválido.')
    }
    if (!EXTENSIONES[mimeType]) throw new Error('Solo se aceptan PDF, JPG o PNG.')

    const bytes = Utilities.base64Decode(String(body.data || ''))
    if (!bytes.length) throw new Error('El archivo está vacío.')
    if (bytes.length > CONFIG.MAX_BYTES) throw new Error('El archivo supera los 20 MB.')
    if (!coincideFirma(bytes, mimeType)) {
      throw new Error('El contenido del archivo no coincide con su tipo.')
    }

    const lock = LockService.getScriptLock()
    lock.waitLock(20000)
    try {
      verificarLimite()

      const carpeta = buscarMateria(materia)
      const nombre = anio + ' - ' + capitalizar(tipo) + ' - ' + limpiarNombre(body.nombre, mimeType)
      const archivo = carpeta.createFile(Utilities.newBlob(bytes, mimeType, nombre))
      archivo.setDescription(JSON.stringify({ tipo: tipo, anio: anio }))
      archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW)

      SpreadsheetApp.openById(CONFIG.SHEET_ID)
        .getSheets()[0]
        .appendRow([
          new Date(),
          materia,
          tipo,
          anio,
          nombre,
          archivo.getUrl(),
          archivo.getId(),
          bytes.length,
        ])

      CacheService.getScriptCache().remove(CACHE_KEY)

      return json({
        ok: true,
        archivo: { id: archivo.getId(), nombre: nombre, url: archivo.getUrl() },
      })
    } finally {
      lock.releaseLock()
    }
  } catch (err) {
    return json({ ok: false, error: mensaje(err) })
  }
}

function listarMaterias() {
  const cache = CacheService.getScriptCache()
  const enCache = cache.get(CACHE_KEY)
  if (enCache) return JSON.parse(enCache)

  const raiz = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID)
  const materias = []
  const carpetas = raiz.getFolders()

  while (carpetas.hasNext()) {
    const carpeta = carpetas.next()
    if (carpeta.isTrashed()) continue

    const archivos = []
    const it = carpeta.getFiles()
    while (it.hasNext()) {
      const f = it.next()
      if (f.isTrashed()) continue
      let meta = {}
      try {
        meta = JSON.parse(f.getDescription() || '{}')
      } catch (_) {}
      archivos.push({
        id: f.getId(),
        nombre: f.getName(),
        url: f.getUrl(),
        mimeType: f.getMimeType(),
        tamano: f.getSize(),
        fecha: f.getDateCreated().toISOString(),
        tipo: TIPOS.indexOf(meta.tipo) === -1 ? 'otro' : meta.tipo,
        anio: meta.anio || null,
      })
    }
    archivos.sort(function (a, b) {
      return b.fecha.localeCompare(a.fecha)
    })
    materias.push({ nombre: carpeta.getName(), archivos: archivos })
  }

  materias.sort(function (a, b) {
    return a.nombre.localeCompare(b.nombre, 'es')
  })

  try {
    cache.put(CACHE_KEY, JSON.stringify(materias), CONFIG.CACHE_SEGUNDOS)
  } catch (_) {
    // El caché tiene un límite de 100 KB por clave; si se supera, se sirve sin caché.
  }
  return materias
}

function buscarMateria(nombre) {
  const it = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID).getFoldersByName(nombre)
  while (it.hasNext()) {
    const carpeta = it.next()
    if (!carpeta.isTrashed()) return carpeta
  }
  throw new Error('La materia no existe.')
}

function verificarLimite() {
  const cache = CacheService.getScriptCache()
  const clave = 'subidas-' + Utilities.formatDate(new Date(), 'GMT', 'yyyyMMddHH')
  const cantidad = Number(cache.get(clave) || 0)
  if (cantidad >= CONFIG.MAX_SUBIDAS_POR_HORA) {
    throw new Error('Se alcanzó el límite de subidas por hora. Probá más tarde.')
  }
  cache.put(clave, String(cantidad + 1), 3600)
}

function coincideFirma(bytes, mimeType) {
  const b = function (i) {
    return bytes[i] & 0xff
  }
  if (mimeType === 'application/pdf') {
    return b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46
  }
  if (mimeType === 'image/png') {
    return b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47
  }
  if (mimeType === 'image/jpeg') {
    return b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff
  }
  return false
}

function limpiarNombre(nombre, mimeType) {
  const base = String(nombre || 'archivo')
    .replace(/\.[^.]+$/, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
  return (base || 'archivo') + '.' + EXTENSIONES[mimeType]
}

function capitalizar(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function mensaje(err) {
  return (err && err.message) || String(err)
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  )
}
