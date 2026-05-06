import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query, conTransaccion } from './db.js'
import { crearToken, requiereAutenticacion } from './auth.js'

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

const app = express()
const port = Number(process.env.PORT || 3001)
// Configure CORS: allow explicit origins via CORS_ORIGIN (comma-separated),
// and always allow any localhost origin during development.
const rawCorsOrigins = process.env.CORS_ORIGIN || ''
const corsAllowedOrigins = rawCorsOrigins.split(',').map((s) => s.trim()).filter(Boolean)

function corsOriginChecker(origin, callback) {
  // Allow requests with no origin (server-to-server, curl, etc.)
  if (!origin) return callback(null, true)

  if (corsAllowedOrigins.includes(origin)) return callback(null, true)

  // Allow any localhost or 127.0.0.1 origin (different ports from Vite)
  try {
    const url = new URL(origin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return callback(null, true)
  } catch (e) {
    // ignore parse errors
  }

  return callback(new Error('Not allowed by CORS'))
}

app.use(cors({ origin: corsOriginChecker }))
app.use(express.json({ limit: '8mb' }))

function mapearFilaPerfil(row) {
  if (!row) {
    return null
  }

  return {
    profileId: row.profile_id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    fotoPerfil: row.foto_perfil,
    descripcion: row.descripcion,
    telefono: row.telefono,
    emailPublico: row.email_publico,
    telefonoPublico: row.telefono_publico,
    ciudad: row.ciudad,
    perfilPublico: row.perfil_publico,
    datosRol:
      row.rol === 'arrendador'
        ? {
            nombreComercial: row.nombre_comercial,
            descripcionEmpresa: row.descripcion_empresa,
            web: row.web,
            verEmail: row.ver_email,
            verTelefono: row.ver_telefono,
          }
        : {
            ultimoPisoAlquilado: row.ultimo_piso_alquilado,
            avalistas: row.avalistas,
            rangoPrecioMin: row.rango_precio_min,
            rangoPrecioMax: row.rango_precio_max,
            ubicacionDeseada: row.ubicacion_deseada,
            curriculum: row.curriculum,
            mascotas: row.mascotas,
            fumador: row.fumador,
          },
  }
}

async function cargarPerfilUsuario(client, userId) {
  const result = await client.query(
    `
      SELECT
        u.id AS user_id,
        u.email,
        u.rol,
        u.telefono AS user_telefono,
        u.ciudad AS user_ciudad,
        u.activo,
        p.id AS profile_id,
        p.nombre,
        p.apellidos,
        p.foto_perfil,
        p.descripcion,
        p.telefono,
        p.email_publico,
        p.telefono_publico,
        p.ciudad,
        p.perfil_publico,
        pa.nombre_comercial,
        pa.descripcion_empresa,
        pa.web,
        pa.ver_email,
        pa.ver_telefono,
        pt.ultimo_piso_alquilado,
        pt.avalistas,
        pt.rango_precio_min,
        pt.rango_precio_max,
        pt.ubicacion_deseada,
        pt.curriculum,
        pt.mascotas,
        pt.fumador
      FROM usuarios u
      JOIN perfiles p ON p.usuario_id = u.id
      LEFT JOIN perfiles_arrendador pa ON pa.perfil_id = p.id
      LEFT JOIN perfiles_arrendatario pt ON pt.perfil_id = p.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  )

  if (result.rowCount === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.user_id,
    email: row.email,
    rol: row.rol,
    telefono: row.user_telefono,
    ciudad: row.user_ciudad,
    activo: row.activo,
    perfil: mapearFilaPerfil(row),
  }
}

async function cargarPerfilActual(client, userId) {
  const result = await client.query(
    `
      SELECT u.rol, p.id AS profile_id
      FROM usuarios u
      JOIN perfiles p ON p.usuario_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  )

  return result.rowCount === 0 ? null : result.rows[0]
}

function construirVistaPreviaPerfil(row) {
  return {
    profileId: row.profile_id,
    userId: row.user_id,
    nombre: row.nombre,
    apellidos: row.apellidos,
    fotoPerfil: row.foto_perfil,
    descripcion: row.descripcion,
    ciudad: row.ciudad,
    rol: row.rol,
    datosRol:
      row.rol === 'arrendador'
        ? {
            nombreComercial: row.nombre_comercial,
            descripcionEmpresa: row.descripcion_empresa,
            web: row.web,
            verEmail: row.ver_email,
            verTelefono: row.ver_telefono,
            propertyId: row.property_id,
            propertyTitulo: row.property_titulo,
            propertyCiudad: row.property_ciudad,
            propertyZona: row.property_zona,
            propertyPrecio: row.property_precio,
            propertyHabitaciones: row.property_habitaciones,
            propertyBanos: row.property_banos,
            propertyTipoAlquiler: row.property_tipo_alquiler,
          }
        : {
            ultimoPisoAlquilado: row.ultimo_piso_alquilado,
            avalistas: row.avalistas,
            rangoPrecioMin: row.rango_precio_min,
            rangoPrecioMax: row.rango_precio_max,
            ubicacionDeseada: row.ubicacion_deseada,
            curriculum: row.curriculum,
            mascotas: row.mascotas,
            fumador: row.fumador,
          },
  }
}

function construirResumenCoincidencia(row) {
  return {
    id: row.id,
    estado: row.estado,
    contactoVisible: row.contacto_visible,
    miVoto: row.my_vote ?? row.miVoto ?? row.arrendador_voto ?? row.match_arrendador_voto ?? null,
    suVoto: row.their_vote ?? row.suVoto ?? row.arrendatario_voto ?? row.match_arrendatario_voto ?? null,
    counterpartProfileId: row.counterpart_profile_id,
  }
}

const arrendadoresDemoDeviber = [
  {
    email: 'arrendador.demo1@deviber.local',
    nombre: 'Lucia',
    apellidos: 'Serrano',
    ciudad: 'Madrid',
    telefono: '600100101',
    nombreComercial: 'Deviber Homes Centro',
    descripcionEmpresa: 'Gestion integral de alquiler en zona centro.',
    web: 'https://deviber.local/homes-centro',
  },
  {
    email: 'arrendador.demo2@deviber.local',
    nombre: 'Carlos',
    apellidos: 'Molina',
    ciudad: 'Valencia',
    telefono: '600100102',
    nombreComercial: 'Deviber Costa Living',
    descripcionEmpresa: 'Pisos para larga estancia en barrios residenciales.',
    web: 'https://deviber.local/costa-living',
  },
  {
    email: 'arrendador.demo3@deviber.local',
    nombre: 'Marta',
    apellidos: 'Rios',
    ciudad: 'Sevilla',
    telefono: '600100103',
    nombreComercial: 'Deviber Sur Alquileres',
    descripcionEmpresa: 'Alquiler seguro para estudiantes y profesionales.',
    web: 'https://deviber.local/sur-alquileres',
  },
]

async function asegurarArrendadoresDeviber(client) {
  const totalArrendadoresVisibles = await client.query(
    `
      SELECT COUNT(*)::int AS total
      FROM usuarios u
      JOIN perfiles p ON p.usuario_id = u.id
      JOIN perfiles_arrendador pa ON pa.perfil_id = p.id
      WHERE u.rol = 'arrendador'
    `,
  )

  if ((totalArrendadoresVisibles.rows[0]?.total ?? 0) > 0) {
    return
  }

  for (const demo of arrendadoresDemoDeviber) {
    const hash = await bcrypt.hash('Deviber123!', 10)

    const userResult = await client.query(
      `
        INSERT INTO usuarios (email, contrasena_hash, rol, telefono, ciudad, activo, ultima_conexion)
        VALUES ($1, $2, 'arrendador', $3, $4, TRUE, NOW())
        ON CONFLICT (email) DO UPDATE
          SET rol = 'arrendador',
              telefono = COALESCE(usuarios.telefono, EXCLUDED.telefono),
              ciudad = COALESCE(usuarios.ciudad, EXCLUDED.ciudad)
        RETURNING id
      `,
      [demo.email, hash, demo.telefono, demo.ciudad],
    )

    const userId = userResult.rows[0].id

    const profileResult = await client.query(
      `
        INSERT INTO perfiles (
          usuario_id,
          nombre,
          apellidos,
          descripcion,
          telefono,
          ciudad,
          email_publico,
          telefono_publico,
          perfil_publico,
          fecha_actualizacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, TRUE, NOW())
        ON CONFLICT (usuario_id) DO UPDATE
          SET nombre = COALESCE(perfiles.nombre, EXCLUDED.nombre),
              apellidos = COALESCE(perfiles.apellidos, EXCLUDED.apellidos),
              descripcion = COALESCE(perfiles.descripcion, EXCLUDED.descripcion),
              telefono = COALESCE(perfiles.telefono, EXCLUDED.telefono),
              ciudad = COALESCE(perfiles.ciudad, EXCLUDED.ciudad),
              fecha_actualizacion = NOW()
        RETURNING id
      `,
      [
        userId,
        demo.nombre,
        demo.apellidos,
        `Arrendador verificado de ${demo.nombreComercial}.`,
        demo.telefono,
        demo.ciudad,
      ],
    )

    const profileId = profileResult.rows[0].id

    await client.query(
      `
        INSERT INTO perfiles_arrendador (
          perfil_id,
          nombre_comercial,
          descripcion_empresa,
          web,
          ver_email,
          ver_telefono
        )
        VALUES ($1, $2, $3, $4, TRUE, TRUE)
        ON CONFLICT (perfil_id) DO UPDATE
          SET nombre_comercial = COALESCE(perfiles_arrendador.nombre_comercial, EXCLUDED.nombre_comercial),
              descripcion_empresa = COALESCE(perfiles_arrendador.descripcion_empresa, EXCLUDED.descripcion_empresa),
              web = COALESCE(perfiles_arrendador.web, EXCLUDED.web),
              ver_email = TRUE,
              ver_telefono = TRUE
      `,
      [profileId, demo.nombreComercial, demo.descripcionEmpresa, demo.web],
    )
  }
}

// --- Validation helpers ---
function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== ''
}

function validarPropiedadPayload(body) {
  const errors = []
  const { titulo, ciudad, precio, tipoAlquiler, habitaciones, banos, metrosCuadrados, fotos } = body ?? {}

  if (!isNonEmptyString(titulo)) errors.push('titulo es obligatorio')
  if (!isNonEmptyString(ciudad)) errors.push('ciudad es obligatoria')

  if (precio === undefined || precio === null || Number.isNaN(Number(precio))) {
    errors.push('precio invalido')
  } else if (Number(precio) < 0) {
    errors.push('precio debe ser mayor o igual a 0')
  }

  if (!isNonEmptyString(tipoAlquiler)) errors.push('tipoAlquiler es obligatorio')

  if (habitaciones !== undefined && habitaciones !== null && String(habitaciones) !== '') {
    const h = Number(habitaciones)
    if (!Number.isInteger(h) || h < 0) errors.push('habitaciones invalido')
  }

  if (banos !== undefined && banos !== null && String(banos) !== '') {
    const b = Number(banos)
    if (!Number.isInteger(b) || b < 0) errors.push('banos invalido')
  }

  if (metrosCuadrados !== undefined && metrosCuadrados !== null && String(metrosCuadrados) !== '') {
    const m = Number(metrosCuadrados)
    if (Number.isNaN(m) || m < 0) errors.push('metrosCuadrados invalido')
  }

  if (fotos !== undefined && fotos !== null) {
    if (!Array.isArray(fotos)) {
      errors.push('fotos debe ser un array de URLs')
    } else {
      for (const url of fotos) {
        if (typeof url !== 'string') {
          errors.push('cada foto debe ser una URL (string)')
          break
        }
      }
    }
  }

  return errors
}

function validarRegistroPayload(body) {
  const errors = []
  const { email, password, rol, nombre, apellidos } = body ?? {}
  if (!isNonEmptyString(email) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) errors.push('email invalido')
  if (!isNonEmptyString(password) || String(password).length < 8) errors.push('password demasiado corta (min 8)')
  if (!['arrendador', 'arrendatario'].includes(rol)) errors.push('rol invalido')
  if (!isNonEmptyString(nombre)) errors.push('nombre es obligatorio')
  if (!isNonEmptyString(apellidos)) errors.push('apellidos es obligatorio')
  return errors
}

function validarMePayload(body) {
  const errors = []
  const { nombre, apellidos, telefono, ciudad, fotoPerfil, emailPublico, telefonoPublico, perfilPublico } = body ?? {}
  if (nombre !== undefined && !isNonEmptyString(nombre)) errors.push('nombre invalido')
  if (apellidos !== undefined && !isNonEmptyString(apellidos)) errors.push('apellidos invalidos')
  if (telefono !== undefined && telefono !== null && String(telefono).length > 30) errors.push('telefono demasiado largo')
  if (ciudad !== undefined && ciudad !== null && String(ciudad).length > 120) errors.push('ciudad demasiado larga')
  if (fotoPerfil !== undefined && fotoPerfil !== null && typeof fotoPerfil !== 'string') errors.push('fotoPerfil invalida')
  if (emailPublico !== undefined && typeof emailPublico !== 'boolean') errors.push('emailPublico debe ser booleano')
  if (telefonoPublico !== undefined && typeof telefonoPublico !== 'boolean') errors.push('telefonoPublico debe ser booleano')
  if (perfilPublico !== undefined && typeof perfilPublico !== 'boolean') errors.push('perfilPublico debe ser booleano')
  return errors
}


app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  const {
    email,
    password,
    rol,
    nombre,
    apellidos,
    telefono = null,
    ciudad = null,
    descripcion = null,
    fotoPerfil = null,
    nombreComercial = null,
    descripcionEmpresa = null,
    web = null,
    ultimoPisoAlquilado = null,
    avalistas = null,
    rangoPrecioMin = null,
    rangoPrecioMax = null,
    ubicacionDeseada = null,
    curriculum = null,
    mascotas = null,
    fumador = null,
  } = req.body ?? {}

  // Validate payload
  // Prefer zod validation when available
  try {
    const registerSchema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      rol: z.enum(['arrendador', 'arrendatario']),
      nombre: z.string().min(1),
      apellidos: z.string().min(1),
      telefono: z.string().optional().nullable(),
      ciudad: z.string().optional().nullable(),
      descripcion: z.string().optional().nullable(),
      fotoPerfil: z.string().optional().nullable(),
    })
    registerSchema.parse({ email, password, rol, nombre, apellidos, telefono, ciudad, descripcion, fotoPerfil })
  } catch (err) {
    const details = err && err.errors ? err.errors.map(e => e.message) : ['payload invalido']
    return res.status(400).json({ error: 'Payload invalido', details })
  }

  try {
    const payload = await conTransaccion(async (client) => {
      const existing = await client.query('SELECT id FROM usuarios WHERE email = $1 LIMIT 1', [email])
      if (existing.rowCount > 0) {
        const error = new Error('El email ya esta registrado')
        error.statusCode = 409
        throw error
      }

      const passwordHash = await bcrypt.hash(password, 10)
      const userResult = await client.query(
        `
          INSERT INTO usuarios (email, contrasena_hash, rol, telefono, ciudad)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, email, rol, telefono, ciudad
        `,
        [email, passwordHash, rol, telefono, ciudad],
      )

      const user = userResult.rows[0]
      const profileResult = await client.query(
        `
          INSERT INTO perfiles (
            usuario_id,
            nombre,
            apellidos,
            foto_perfil,
            descripcion,
            telefono,
            ciudad
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `,
        [user.id, nombre, apellidos, fotoPerfil, descripcion, telefono, ciudad],
      )

      const profileId = profileResult.rows[0].id

      if (rol === 'arrendador') {
        await client.query(
          `
            INSERT INTO perfiles_arrendador (
              perfil_id,
              nombre_comercial,
              descripcion_empresa,
              web
            )
            VALUES ($1, $2, $3, $4)
          `,
          [profileId, nombreComercial, descripcionEmpresa, web],
        )
      } else {
        await client.query(
          `
            INSERT INTO perfiles_arrendatario (
              perfil_id,
              ultimo_piso_alquilado,
              avalistas,
              rango_precio_min,
              rango_precio_max,
              ubicacion_deseada,
              curriculum,
              mascotas,
              fumador
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            profileId,
            ultimoPisoAlquilado,
            avalistas,
            rangoPrecioMin,
            rangoPrecioMax,
            ubicacionDeseada,
            curriculum,
            mascotas,
            fumador,
          ],
        )
      }

      const profile = await cargarPerfilUsuario(client, user.id)
      return { user, profile }
    })

    return res.status(201).json({
      token: crearToken(payload.user),
      user: payload.profile,
    })
  } catch (error) {
    console.error('Register error:', error)
    const statusCode = error.statusCode || 500
    return res.status(statusCode).json({ error: error.message || 'No se pudo registrar el usuario' })
  }
})

app.post('/api/auth/iniciar-sesion', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' })
  }

  try {
    const result = await query(
      `
        SELECT id, email, contrasena_hash, rol, activo
        FROM usuarios
        WHERE email = $1
        LIMIT 1
      `,
      [email],
    )

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const user = result.rows[0]

    if (!user.activo) {
      return res.status(403).json({ error: 'Usuario deshabilitado' })
    }

    const isValid = await bcrypt.compare(password, user.contrasena_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    await query('UPDATE usuarios SET ultima_conexion = NOW() WHERE id = $1', [user.id])

    const profile = await cargarPerfilUsuario({ query }, user.id)

    return res.json({
      token: crearToken(user),
      user: profile,
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: error.message || 'No se pudo iniciar sesion' })
  }
})

app.get('/api/me', requiereAutenticacion, async (req, res) => {
  try {
    const profile = await cargarPerfilUsuario({ query }, req.auth.userId)
    if (!profile) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    return res.json({ user: profile })
  } catch {
    return res.status(500).json({ error: 'No se pudo cargar el perfil' })
  }
})

app.put('/api/me', requiereAutenticacion, async (req, res) => {
  const {
    nombre = null,
    apellidos = null,
    telefono = null,
    ciudad = null,
    descripcion = null,
    fotoPerfil = null,
    emailPublico = null,
    telefonoPublico = null,
    perfilPublico = null,
    nombreComercial = null,
    descripcionEmpresa = null,
    web = null,
    ultimoPisoAlquilado = null,
    avalistas = null,
    rangoPrecioMin = null,
    rangoPrecioMax = null,
    ubicacionDeseada = null,
    curriculum = null,
    mascotas = null,
    fumador = null,
  } = req.body ?? {}

  // Convert empty strings to null for numeric fields
  const rangoPrecioMinFinal = rangoPrecioMin === '' ? null : (typeof rangoPrecioMin === 'string' ? Number(rangoPrecioMin) || null : rangoPrecioMin)
  const rangoPrecioMaxFinal = rangoPrecioMax === '' ? null : (typeof rangoPrecioMax === 'string' ? Number(rangoPrecioMax) || null : rangoPrecioMax)

  try {
    console.log('PUT /api/me called by user', req.auth.userId)
    console.log('Incoming payload keys:', Object.keys(req.body || {}))
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: 'Payload vacio. No hay cambios para guardar.' })
    }
    // avoid logging entire images in production, but log presence and size
    if (typeof req.body?.fotoPerfil === 'string') {
      console.log('fotoPerfil length:', req.body.fotoPerfil.length)
    }
    // validate payload early
    const meValidation = validarMePayload(req.body)
    if (meValidation.length > 0) {
      return res.status(400).json({ error: 'Payload invalido', details: meValidation })
    }

    await conTransaccion(async (client) => {
      const current = await client.query(
        `
          SELECT u.rol, p.id AS profile_id
          FROM usuarios u
          JOIN perfiles p ON p.usuario_id = u.id
          WHERE u.id = $1
          LIMIT 1
        `,
        [req.auth.userId],
      )

      if (current.rowCount === 0) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      const { rol, profile_id: profileId } = current.rows[0]

      await client.query(
        `
          UPDATE perfiles
          SET
            nombre = COALESCE($1, nombre),
            apellidos = COALESCE($2, apellidos),
            telefono = COALESCE($3, telefono),
            ciudad = COALESCE($4, ciudad),
            descripcion = COALESCE($5, descripcion),
            foto_perfil = COALESCE($6, foto_perfil),
            email_publico = COALESCE($7, email_publico),
            telefono_publico = COALESCE($8, telefono_publico),
            perfil_publico = COALESCE($9, perfil_publico),
            fecha_actualizacion = NOW()
          WHERE id = $10
        `,
        [nombre, apellidos, telefono, ciudad, descripcion, fotoPerfil, emailPublico, telefonoPublico, perfilPublico, profileId],
      )

      // Verify what was written for debugging
      try {
        const check = await client.query('SELECT foto_perfil FROM perfiles WHERE id = $1 LIMIT 1', [profileId])
        console.log('After UPDATE, foto_perfil length:', check.rowCount > 0 && check.rows[0].foto_perfil ? String(check.rows[0].foto_perfil).length : null)
      } catch (err) {
        console.error('Error al comprobar foto_perfil tras UPDATE', err)
      }

      await client.query(
        `UPDATE usuarios SET telefono = COALESCE($1, telefono), ciudad = COALESCE($2, ciudad) WHERE id = $3`,
        [telefono, ciudad, req.auth.userId],
      )

      if (rol === 'arrendador') {
        await client.query(
          `
            INSERT INTO perfiles_arrendador (perfil_id, nombre_comercial, descripcion_empresa, web)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (perfil_id)
            DO UPDATE SET
              nombre_comercial = COALESCE(EXCLUDED.nombre_comercial, perfiles_arrendador.nombre_comercial),
              descripcion_empresa = COALESCE(EXCLUDED.descripcion_empresa, perfiles_arrendador.descripcion_empresa),
              web = COALESCE(EXCLUDED.web, perfiles_arrendador.web)
          `,
          [profileId, nombreComercial, descripcionEmpresa, web],
        )
      } else {
        await client.query(
          `
            INSERT INTO perfiles_arrendatario (
              perfil_id,
              ultimo_piso_alquilado,
              avalistas,
              rango_precio_min,
              rango_precio_max,
              ubicacion_deseada,
              curriculum,
              mascotas,
              fumador
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (perfil_id)
            DO UPDATE SET
              ultimo_piso_alquilado = COALESCE(EXCLUDED.ultimo_piso_alquilado, perfiles_arrendatario.ultimo_piso_alquilado),
              avalistas = COALESCE(EXCLUDED.avalistas, perfiles_arrendatario.avalistas),
              rango_precio_min = COALESCE(EXCLUDED.rango_precio_min, perfiles_arrendatario.rango_precio_min),
              rango_precio_max = COALESCE(EXCLUDED.rango_precio_max, perfiles_arrendatario.rango_precio_max),
              ubicacion_deseada = COALESCE(EXCLUDED.ubicacion_deseada, perfiles_arrendatario.ubicacion_deseada),
              curriculum = COALESCE(EXCLUDED.curriculum, perfiles_arrendatario.curriculum),
              mascotas = COALESCE(EXCLUDED.mascotas, perfiles_arrendatario.mascotas),
              fumador = COALESCE(EXCLUDED.fumador, perfiles_arrendatario.fumador),
              fecha_actualizacion = NOW()
          `,
          [
            profileId,
            ultimoPisoAlquilado,
            avalistas,
            rangoPrecioMinFinal,
            rangoPrecioMaxFinal,
            ubicacionDeseada,
            curriculum,
            mascotas,
            fumador,
          ],
        )
      }
    })

    const profile = await cargarPerfilUsuario({ query }, req.auth.userId)
    return res.json({ user: profile })
  } catch (error) {
    const statusCode = error.statusCode || 500
    return res.status(statusCode).json({ error: error.message || 'No se pudo actualizar el perfil' })
  }
})

app.get('/api/properties/mine', requiereAutenticacion, async (req, res) => {
  try {
    const result = await conTransaccion(async (client) => {
      const current = await cargarPerfilActual(client, req.auth.userId)

      if (!current) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      if (current.rol !== 'arrendador') {
        const error = new Error('Solo el arrendador puede gestionar pisos')
        error.statusCode = 403
        throw error
      }

      const properties = await client.query(
        `
          SELECT
            p.id,
            p.titulo,
            p.descripcion,
            p.ciudad,
            p.zona,
            p.direccion,
            p.precio,
            p.habitaciones,
            p.banos,
            p.metros_cuadrados,
            p.tipo_alquiler,
            p.amueblado,
            p.disponible,
            p.fecha_publicacion,
            COALESCE(
              json_agg(
                json_build_object('id', f.id, 'url', f.url, 'orden', f.orden)
                ORDER BY f.orden
              ) FILTER (WHERE f.id IS NOT NULL),
              '[]'::json
            ) AS fotos
          FROM propiedades p
          LEFT JOIN propiedad_fotos f ON f.propiedad_id = p.id
          WHERE p.arrendador_perfil_id = $1
          GROUP BY p.id
          ORDER BY p.fecha_publicacion DESC, p.id DESC
        `,
        [current.profile_id],
      )

      return properties.rows
    })

    return res.json({ properties: result })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudieron cargar los pisos' })
  }
})

app.post('/api/properties', requiereAutenticacion, async (req, res) => {
  const {
    titulo,
    descripcion = null,
    ciudad,
    zona = null,
    direccion = null,
    precio,
    habitaciones = null,
    banos = null,
    metrosCuadrados = null,
    tipoAlquiler,
    amueblado = false,
    disponible = true,
    fotos = [],
  } = req.body ?? {}

  if (!titulo || !ciudad || precio === undefined || !tipoAlquiler) {
    return res.status(400).json({ error: 'Faltan campos obligatorios del piso' })
  }

  // Prefer zod validation
  try {
    const propSchema = z.object({
      titulo: z.string().min(1),
      descripcion: z.string().optional().nullable(),
      ciudad: z.string().min(1),
      zona: z.string().optional().nullable(),
      direccion: z.string().optional().nullable(),
      precio: z.preprocess((v) => Number(v), z.number().nonnegative()),
      habitaciones: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().int().nonnegative().optional()),
      banos: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().int().nonnegative().optional()),
      metrosCuadrados: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().nonnegative().optional()),
      tipoAlquiler: z.string().min(1),
      amueblado: z.boolean().optional(),
      disponible: z.boolean().optional(),
      fotos: z.array(z.string()).optional(),
    })

    propSchema.parse(req.body)
  } catch (err) {
    const details = err && err.errors ? err.errors.map(e => e.message) : ['payload invalido']
    return res.status(400).json({ error: 'Payload invalido', details })
  }

  try {
    const property = await conTransaccion(async (client) => {
      const current = await cargarPerfilActual(client, req.auth.userId)

      if (!current) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      if (current.rol !== 'arrendador') {
        const error = new Error('Solo el arrendador puede crear pisos')
        error.statusCode = 403
        throw error
      }

      const inserted = await client.query(
        `
          INSERT INTO propiedades (
            arrendador_perfil_id,
            titulo,
            descripcion,
            ciudad,
            zona,
            direccion,
            precio,
            habitaciones,
            banos,
            metros_cuadrados,
            tipo_alquiler,
            amueblado,
            disponible
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `,
        [
          current.profile_id,
          titulo,
          descripcion,
          ciudad,
          zona,
          direccion,
          precio,
          habitaciones,
          banos,
          metrosCuadrados,
          tipoAlquiler,
          amueblado,
          disponible,
        ],
      )

      const propertyId = inserted.rows[0].id
      if (Array.isArray(fotos) && fotos.length > 0) {
        for (const [index, url] of fotos.entries()) {
          if (typeof url === 'string' && url.trim()) {
            await client.query(
              'INSERT INTO propiedad_fotos (propiedad_id, url, orden) VALUES ($1, $2, $3)',
              [propertyId, url.trim(), index],
            )
          }
        }
      }

      return propertyId
    })

    return res.status(201).json({ id: property })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo crear el piso' })
  }
})

app.put('/api/properties/:id', requiereAutenticacion, async (req, res) => {
  const propertyId = Number(req.params.id)
  if (!Number.isInteger(propertyId)) {
    return res.status(400).json({ error: 'Identificador de piso invalido' })
  }

  const {
    titulo,
    descripcion = null,
    ciudad,
    zona = null,
    direccion = null,
    precio,
    habitaciones = null,
    banos = null,
    metrosCuadrados = null,
    tipoAlquiler,
    amueblado,
    disponible,
    fotos,
  } = req.body ?? {}

  // Prefer zod validation for updates as well
  try {
    const propUpdateSchema = z.object({
      titulo: z.string().min(1).optional(),
      descripcion: z.string().optional().nullable(),
      ciudad: z.string().min(1).optional(),
      zona: z.string().optional().nullable(),
      direccion: z.string().optional().nullable(),
      precio: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().nonnegative().optional()),
      habitaciones: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().int().nonnegative().optional()),
      banos: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().int().nonnegative().optional()),
      metrosCuadrados: z.preprocess((v) => (v === null || v === undefined || v === '' ? undefined : Number(v)), z.number().nonnegative().optional()),
      tipoAlquiler: z.string().min(1).optional(),
      amueblado: z.boolean().optional(),
      disponible: z.boolean().optional(),
      fotos: z.array(z.string()).optional(),
    })

    propUpdateSchema.parse(req.body)
  } catch (err) {
    const details = err && err.errors ? err.errors.map(e => e.message) : ['payload invalido']
    return res.status(400).json({ error: 'Payload invalido', details })
  }

  try {
    await conTransaccion(async (client) => {
      const current = await cargarPerfilActual(client, req.auth.userId)

      if (!current) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      if (current.rol !== 'arrendador') {
        const error = new Error('Solo el arrendador puede editar pisos')
        error.statusCode = 403
        throw error
      }

      const ownership = await client.query(
        'SELECT id FROM propiedades WHERE id = $1 AND arrendador_perfil_id = $2 LIMIT 1',
        [propertyId, current.profile_id],
      )

      if (ownership.rowCount === 0) {
        const error = new Error('Piso no encontrado')
        error.statusCode = 404
        throw error
      }

      await client.query(
        `
          UPDATE propiedades
          SET
            titulo = COALESCE($1, titulo),
            descripcion = COALESCE($2, descripcion),
            ciudad = COALESCE($3, ciudad),
            zona = COALESCE($4, zona),
            direccion = COALESCE($5, direccion),
            precio = COALESCE($6, precio),
            habitaciones = COALESCE($7, habitaciones),
            banos = COALESCE($8, banos),
            metros_cuadrados = COALESCE($9, metros_cuadrados),
            tipo_alquiler = COALESCE($10, tipo_alquiler),
            amueblado = COALESCE($11, amueblado),
            disponible = COALESCE($12, disponible),
            fecha_actualizacion = NOW()
          WHERE id = $13
        `,
        [
          titulo,
          descripcion,
          ciudad,
          zona,
          direccion,
          precio,
          habitaciones,
          banos,
          metrosCuadrados,
          tipoAlquiler,
          amueblado,
          disponible,
          propertyId,
        ],
      )

      if (Array.isArray(fotos)) {
        await client.query('DELETE FROM propiedad_fotos WHERE propiedad_id = $1', [propertyId])

        for (const [index, url] of fotos.entries()) {
          if (typeof url === 'string' && url.trim()) {
            await client.query(
              'INSERT INTO propiedad_fotos (propiedad_id, url, orden) VALUES ($1, $2, $3)',
              [propertyId, url.trim(), index],
            )
          }
        }
      }
    })

    return res.json({ ok: true })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo actualizar el piso' })
  }
})

app.delete('/api/properties/:id', requiereAutenticacion, async (req, res) => {
  const propertyId = Number(req.params.id)
  if (!Number.isInteger(propertyId)) {
    return res.status(400).json({ error: 'Identificador de piso invalido' })
  }

  try {
    await conTransaccion(async (client) => {
      const current = await cargarPerfilActual(client, req.auth.userId)

      if (!current) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      if (current.rol !== 'arrendador') {
        const error = new Error('Solo el arrendador puede borrar pisos')
        error.statusCode = 403
        throw error
      }

      const ownership = await client.query(
        'SELECT id FROM propiedades WHERE id = $1 AND arrendador_perfil_id = $2 LIMIT 1',
        [propertyId, current.profile_id],
      )

      if (ownership.rowCount === 0) {
        const error = new Error('Piso no encontrado')
        error.statusCode = 404
        throw error
      }

      await client.query('DELETE FROM propiedades WHERE id = $1', [propertyId])
    })

    return res.status(204).send()
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo borrar el piso' })
  }
})

app.get('/api/search/suerte', requiereAutenticacion, async (req, res) => {
  try {
    const result = await conTransaccion(async (client) => {
      const current = await client.query(
        `
          SELECT
            u.id AS user_id,
            u.rol,
            p.id AS profile_id,
            p.nombre,
            p.apellidos,
            p.foto_perfil,
            p.descripcion,
            p.ciudad,
            pa.nombre_comercial,
            pa.descripcion_empresa,
            pa.web,
            pa.ver_email,
            pa.ver_telefono,
            pt.ultimo_piso_alquilado,
            pt.avalistas,
            pt.rango_precio_min,
            pt.rango_precio_max,
            pt.ubicacion_deseada,
            pt.curriculum,
            pt.mascotas,
            pt.fumador
          FROM usuarios u
          JOIN perfiles p ON p.usuario_id = u.id
          LEFT JOIN perfiles_arrendador pa ON pa.perfil_id = p.id
          LEFT JOIN perfiles_arrendatario pt ON pt.perfil_id = p.id
          WHERE u.id = $1
          LIMIT 1
        `,
        [req.auth.userId],
      )

      if (current.rowCount === 0) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      const me = current.rows[0]

      if (me.rol === 'arrendatario') {
        await asegurarArrendadoresDeviber(client)
      }

      const candidates =
        me.rol === 'arrendatario'
          ? await client.query(
              `
                SELECT
                  u.id AS user_id,
                  p.id AS profile_id,
                  p.nombre,
                  p.apellidos,
                  p.foto_perfil,
                  p.descripcion,
                  p.ciudad,
                  u.rol,
                  pa.nombre_comercial,
                  pa.descripcion_empresa,
                  pa.web,
                  pa.ver_email,
                  pa.ver_telefono,
                  prop.id AS property_id,
                  prop.titulo AS property_titulo,
                  prop.ciudad AS property_ciudad,
                  prop.zona AS property_zona,
                  prop.precio AS property_precio,
                  prop.habitaciones AS property_habitaciones,
                  prop.banos AS property_banos,
                  prop.tipo_alquiler AS property_tipo_alquiler,
                  m.id AS match_id,
                  m.estado AS match_estado,
                  m.arrendador_voto AS match_arrendador_voto,
                  m.arrendatario_voto AS match_arrendatario_voto,
                  m.contacto_visible,
                  m.arrendatario_perfil_id AS counterpart_profile_id
                FROM usuarios u
                JOIN perfiles p ON p.usuario_id = u.id
                JOIN perfiles_arrendador pa ON pa.perfil_id = p.id
                LEFT JOIN LATERAL (
                  SELECT prop.*
                  FROM propiedades prop
                  WHERE prop.arrendador_perfil_id = p.id
                    AND prop.disponible = TRUE
                  ORDER BY prop.fecha_publicacion DESC, prop.id DESC
                  LIMIT 1
                ) prop ON TRUE
                LEFT JOIN matches m
                  ON m.arrendador_perfil_id = p.id
                 AND m.arrendatario_perfil_id = $1
                WHERE u.rol = 'arrendador'
                  AND p.id <> $1
                ORDER BY m.contacto_visible DESC NULLS LAST, prop.fecha_publicacion DESC NULLS LAST, p.id DESC
              `,
              [me.profile_id],
            )
          : await client.query(
              `
                SELECT
                  u.id AS user_id,
                  p.id AS profile_id,
                  p.nombre,
                  p.apellidos,
                  p.foto_perfil,
                  p.descripcion,
                  p.ciudad,
                  u.rol,
                  pt.ultimo_piso_alquilado,
                  pt.avalistas,
                  pt.rango_precio_min,
                  pt.rango_precio_max,
                  pt.ubicacion_deseada,
                  pt.curriculum,
                  pt.mascotas,
                  pt.fumador,
                  m.id AS match_id,
                  m.estado AS match_estado,
                  m.arrendador_voto AS match_arrendador_voto,
                  m.arrendatario_voto AS match_arrendatario_voto,
                  m.contacto_visible,
                  m.arrendador_perfil_id AS counterpart_profile_id
                FROM usuarios u
                JOIN perfiles p ON p.usuario_id = u.id
                JOIN perfiles_arrendatario pt ON pt.perfil_id = p.id
                LEFT JOIN matches m
                  ON m.arrendador_perfil_id = $1
                 AND m.arrendatario_perfil_id = p.id
                WHERE u.rol = 'arrendatario'
                  AND p.id <> $1
                ORDER BY m.contacto_visible DESC NULLS LAST, p.id DESC
                LIMIT 12
              `,
              [me.profile_id],
            )

      return {
        me: {
          profileId: me.profile_id,
          rol: me.rol,
        },
        candidates: candidates.rows.map((row) => ({
          profile: construirVistaPreviaPerfil(row),
          match: row.match_id
            ? construirResumenCoincidencia({
                id: row.match_id,
                estado: row.match_estado,
                contacto_visible: row.contacto_visible,
                my_vote: me.rol === 'arrendador' ? row.match_arrendador_voto : row.match_arrendatario_voto,
                their_vote: me.rol === 'arrendador' ? row.match_arrendatario_voto : row.match_arrendador_voto,
                counterpart_profile_id: row.counterpart_profile_id,
              })
            : null,
          property:
            row.property_id && row.property_titulo
              ? {
                  id: row.property_id,
                  titulo: row.property_titulo,
                  ciudad: row.property_ciudad,
                  zona: row.property_zona,
                  precio: row.property_precio,
                  habitaciones: row.property_habitaciones,
                  banos: row.property_banos,
                  tipoAlquiler: row.property_tipo_alquiler,
                }
              : null,
        })),
      }
    })

    return res.json(result)
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo ejecutar la busqueda' })
  }
})

app.post('/api/matches/:profileId/vote', requiereAutenticacion, async (req, res) => {
  const targetProfileId = Number(req.params.profileId)
  const { vote } = req.body ?? {}

  if (!Number.isInteger(targetProfileId)) {
    return res.status(400).json({ error: 'Perfil destino invalido' })
  }

  if (!['up', 'down'].includes(vote)) {
    return res.status(400).json({ error: 'Voto no valido' })
  }

  try {
    const result = await conTransaccion(async (client) => {
      const current = await client.query(
        `
          SELECT u.rol, p.id AS profile_id
          FROM usuarios u
          JOIN perfiles p ON p.usuario_id = u.id
          WHERE u.id = $1
          LIMIT 1
        `,
        [req.auth.userId],
      )

      if (current.rowCount === 0) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      const me = current.rows[0]
      const isArrendador = me.rol === 'arrendador'
      const arrendadorProfileId = isArrendador ? me.profile_id : targetProfileId
      const arrendatarioProfileId = isArrendador ? targetProfileId : me.profile_id

      const counterpart = await client.query(
        `
          SELECT p.id, u.rol
          FROM perfiles p
          JOIN usuarios u ON u.id = p.usuario_id
          WHERE p.id = $1
          LIMIT 1
        `,
        [targetProfileId],
      )

      if (counterpart.rowCount === 0) {
        const error = new Error('Perfil destino no encontrado')
        error.statusCode = 404
        throw error
      }

      if (counterpart.rows[0].rol === me.rol) {
        const error = new Error('El voto solo puede realizarse sobre el rol contrario')
        error.statusCode = 400
        throw error
      }

      const existing = await client.query(
        `
          SELECT *
          FROM matches
          WHERE arrendador_perfil_id = $1
            AND arrendatario_perfil_id = $2
          LIMIT 1
        `,
        [arrendadorProfileId, arrendatarioProfileId],
      )

      const timestampColumn = isArrendador ? 'arrendador_voto_at' : 'arrendatario_voto_at'
      const voteColumn = isArrendador ? 'arrendador_voto' : 'arrendatario_voto'
      const otherVoteColumn = isArrendador ? 'arrendatario_voto' : 'arrendador_voto'

      let matchRow
      if (existing.rowCount === 0) {
        const inserted = await client.query(
          `
            INSERT INTO matches (
              arrendador_perfil_id,
              arrendatario_perfil_id,
              ${voteColumn},
              ${timestampColumn}
            )
            VALUES ($1, $2, $3, NOW())
            RETURNING *
          `,
          [arrendadorProfileId, arrendatarioProfileId, vote],
        )
        matchRow = inserted.rows[0]
      } else {
        const updated = await client.query(
          `
            UPDATE matches
            SET
              ${voteColumn} = $2,
              ${timestampColumn} = NOW(),
              fecha_actualizacion = NOW()
            WHERE id = $1
            RETURNING *
          `,
          [existing.rows[0].id, vote],
        )
        matchRow = updated.rows[0]
      }

      if (matchRow.arrendador_voto === 'up' && matchRow.arrendatario_voto === 'up') {
        await client.query(
          `
            UPDATE matches
            SET estado = 'match', contacto_visible = TRUE, fecha_actualizacion = NOW()
            WHERE id = $1
          `,
          [matchRow.id],
        )
        matchRow.estado = 'match'
        matchRow.contacto_visible = true
      }

      if (matchRow.arrendador_voto === 'down' || matchRow.arrendatario_voto === 'down') {
        await client.query(
          `
            UPDATE matches
            SET estado = 'rechazado', contacto_visible = FALSE, fecha_actualizacion = NOW()
            WHERE id = $1
          `,
          [matchRow.id],
        )
        matchRow.estado = 'rechazado'
        matchRow.contacto_visible = false
      }

      return matchRow
    })

    return res.json({ match: construirResumenCoincidencia(result) })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudo guardar el voto' })
  }
})

app.get('/api/matches/mine', requiereAutenticacion, async (req, res) => {
  try {
    const result = await conTransaccion(async (client) => {
      const current = await client.query(
        `
          SELECT u.rol, p.id AS profile_id
          FROM usuarios u
          JOIN perfiles p ON p.usuario_id = u.id
          WHERE u.id = $1
          LIMIT 1
        `,
        [req.auth.userId],
      )

      if (current.rowCount === 0) {
        const error = new Error('Usuario no encontrado')
        error.statusCode = 404
        throw error
      }

      const me = current.rows[0]
      const matches = await client.query(
        `
          SELECT
            m.id,
            m.estado,
            m.contacto_visible,
            m.arrendador_voto AS my_arrendador_voto,
            m.arrendatario_voto AS my_arrendatario_voto,
            m.arrendador_perfil_id AS arrendador_profile_id,
            m.arrendatario_perfil_id AS arrendatario_profile_id,
            p.id AS profile_id,
            p.nombre,
            p.apellidos,
            p.foto_perfil,
            p.descripcion,
            p.ciudad,
            u.email,
            u.telefono AS user_telefono,
            u.rol,
            pa.nombre_comercial,
            pa.descripcion_empresa,
            pa.web,
            pa.ver_email,
            pa.ver_telefono,
            pt.ultimo_piso_alquilado,
            pt.avalistas,
            pt.rango_precio_min,
            pt.rango_precio_max,
            pt.ubicacion_deseada,
            pt.curriculum,
            pt.mascotas,
            pt.fumador,
            prop.id AS property_id,
            prop.titulo AS property_titulo,
            prop.descripcion AS property_descripcion,
            prop.precio AS property_precio,
            prop.ciudad AS property_ciudad,
            prop.zona AS property_zona,
            prop.direccion AS property_direccion,
            prop.habitaciones AS property_habitaciones,
            prop.banos AS property_banos,
            prop.metros_cuadrados AS property_metros_cuadrados,
            prop.tipo_alquiler AS property_tipo_alquiler,
            prop.amueblado AS property_amueblado,
            prop.disponible AS property_disponible
          FROM matches m
          JOIN perfiles p ON p.id = CASE WHEN m.arrendador_perfil_id = $1 THEN m.arrendatario_perfil_id ELSE m.arrendador_perfil_id END
          JOIN usuarios u ON u.id = p.usuario_id
          LEFT JOIN perfiles_arrendador pa ON pa.perfil_id = p.id
          LEFT JOIN perfiles_arrendatario pt ON pt.perfil_id = p.id
          LEFT JOIN LATERAL (
            SELECT prop.*
            FROM propiedades prop
            WHERE prop.arrendador_perfil_id = m.arrendador_perfil_id
            ORDER BY prop.fecha_publicacion DESC, prop.id DESC
            LIMIT 1
          ) prop ON TRUE
          WHERE m.arrendador_perfil_id = $1 OR m.arrendatario_perfil_id = $1
          ORDER BY m.fecha_actualizacion DESC, m.id DESC
        `,
        [me.profile_id],
      )

      return matches.rows.map((row) => ({
        id: row.id,
        estado: row.estado,
        contactoVisible: row.contacto_visible,
        usuarioCoincidencia:
          me.rol === 'arrendador'
            ? {
                profileId: row.profile_id,
                userId: row.profile_id,
                nombre: row.nombre,
                apellidos: row.apellidos,
                fotoPerfil: row.foto_perfil,
                descripcion: row.descripcion,
                ciudad: row.ciudad,
                email: row.contacto_visible ? row.email : null,
                telefono: row.contacto_visible ? row.user_telefono : null,
                datosRol:
                  row.rol === 'arrendador'
                    ? {
                        nombreComercial: row.nombre_comercial,
                        descripcionEmpresa: row.descripcion_empresa,
                        web: row.web,
                      }
                    : {
                        ultimoPisoAlquilado: row.ultimo_piso_alquilado,
                        avalistas: row.avalistas,
                        rangoPrecioMin: row.rango_precio_min,
                        rangoPrecioMax: row.rango_precio_max,
                        ubicacionDeseada: row.ubicacion_deseada,
                        curriculum: row.curriculum,
                        mascotas: row.mascotas,
                        fumador: row.fumador,
                      },
              }
            : {
                profileId: row.profile_id,
                userId: row.profile_id,
                nombre: row.nombre,
                apellidos: row.apellidos,
                fotoPerfil: row.foto_perfil,
                descripcion: row.descripcion,
                ciudad: row.ciudad,
                email: row.contacto_visible ? row.email : null,
                telefono: row.contacto_visible ? row.user_telefono : null,
                datosRol:
                  row.rol === 'arrendador'
                    ? {
                        nombreComercial: row.nombre_comercial,
                        descripcionEmpresa: row.descripcion_empresa,
                        web: row.web,
                      }
                    : {
                        ultimoPisoAlquilado: row.ultimo_piso_alquilado,
                        avalistas: row.avalistas,
                        rangoPrecioMin: row.rango_precio_min,
                        rangoPrecioMax: row.rango_precio_max,
                        ubicacionDeseada: row.ubicacion_deseada,
                        curriculum: row.curriculum,
                        mascotas: row.mascotas,
                        fumador: row.fumador,
                      },
              },
        property:
          row.property_id
            ? {
                id: row.property_id,
                titulo: row.property_titulo,
                descripcion: row.property_descripcion,
                precio: row.property_precio,
                ciudad: row.property_ciudad,
                zona: row.property_zona,
                direccion: row.property_direccion,
                habitaciones: row.property_habitaciones,
                banos: row.property_banos,
                metrosCuadrados: row.property_metros_cuadrados,
                tipoAlquiler: row.property_tipo_alquiler,
                amueblado: row.property_amueblado,
                disponible: row.property_disponible,
              }
            : null,
      }))
    })

    return res.json({ matches: result })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'No se pudieron cargar los matches' })
  }
})

app.use((error, _req, res, _next) => {
  console.error(error)
  res.status(500).json({ error: 'Error interno del servidor' })
})

app.listen(port, () => {
  console.log(`Api escuchando en http://localhost:${port}`)
  
  // Mantener el proceso abierto
  setInterval(() => {
    // Keep-alive
  }, 30000)
})
