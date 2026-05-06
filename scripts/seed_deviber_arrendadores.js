#!/usr/bin/env node
import bcrypt from 'bcryptjs'
import { conTransaccion } from '../server/db.js'

const arrendadoresDemo = [
  {
    email: 'arrendador.demo1@deviber.local',
    nombre: 'Lucia',
    apellidos: 'Serrano',
    ciudad: 'Madrid',
    telefono: '600100101',
    nombreComercial: 'Deviber Homes Centro',
    descripcionEmpresa: 'Gestion integral de alquiler en zona centro.',
    web: 'https://deviber.local/homes-centro',
    propiedad: {
      titulo: 'Estudio luminoso en Chamberi',
      descripcion: 'Piso reformado, amueblado y listo para entrar.',
      ciudad: 'Madrid',
      zona: 'Chamberi',
      direccion: 'Calle Galileo 45',
      precio: 980,
      habitaciones: 1,
      banos: 1,
      metrosCuadrados: 48,
      tipoAlquiler: 'larga_estancia',
      amueblado: true,
      disponible: true,
    },
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
    propiedad: {
      titulo: 'Piso amplio cerca del Turia',
      descripcion: 'Vivienda tranquila, ideal para pareja o teletrabajo.',
      ciudad: 'Valencia',
      zona: 'Campanar',
      direccion: 'Avenida del Maestro Rodrigo 20',
      precio: 1150,
      habitaciones: 2,
      banos: 2,
      metrosCuadrados: 84,
      tipoAlquiler: 'larga_estancia',
      amueblado: true,
      disponible: true,
    },
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
    propiedad: {
      titulo: 'Apartamento moderno en Nervion',
      descripcion: 'Bien comunicado, muy luminoso y con gastos bajos.',
      ciudad: 'Sevilla',
      zona: 'Nervion',
      direccion: 'Calle Luis de Morales 12',
      precio: 890,
      habitaciones: 1,
      banos: 1,
      metrosCuadrados: 52,
      tipoAlquiler: 'larga_estancia',
      amueblado: false,
      disponible: true,
    },
  },
]

async function upsertArrendador(client, demo) {
  const hash = await bcrypt.hash('Deviber123!', 10)

  const userResult = await client.query(
    `
      INSERT INTO usuarios (email, contrasena_hash, rol, telefono, ciudad, activo, ultima_conexion)
      VALUES ($1, $2, 'arrendador', $3, $4, TRUE, NOW())
      ON CONFLICT (email) DO UPDATE
        SET rol = 'arrendador',
            telefono = EXCLUDED.telefono,
            ciudad = EXCLUDED.ciudad,
            activo = TRUE
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
        SET nombre = EXCLUDED.nombre,
            apellidos = EXCLUDED.apellidos,
            descripcion = EXCLUDED.descripcion,
            telefono = EXCLUDED.telefono,
            ciudad = EXCLUDED.ciudad,
            email_publico = TRUE,
            telefono_publico = TRUE,
            perfil_publico = TRUE,
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
        SET nombre_comercial = EXCLUDED.nombre_comercial,
            descripcion_empresa = EXCLUDED.descripcion_empresa,
            web = EXCLUDED.web,
            ver_email = TRUE,
            ver_telefono = TRUE
    `,
    [profileId, demo.nombreComercial, demo.descripcionEmpresa, demo.web],
  )

  await client.query(
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
        disponible,
        fecha_publicacion,
        fecha_actualizacion
      )
      SELECT
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM propiedades
        WHERE arrendador_perfil_id = $1
      )
    `,
    [
      profileId,
      demo.propiedad.titulo,
      demo.propiedad.descripcion,
      demo.propiedad.ciudad,
      demo.propiedad.zona,
      demo.propiedad.direccion,
      demo.propiedad.precio,
      demo.propiedad.habitaciones,
      demo.propiedad.banos,
      demo.propiedad.metrosCuadrados,
      demo.propiedad.tipoAlquiler,
      demo.propiedad.amueblado,
      demo.propiedad.disponible,
    ],
  )
}

async function main() {
  await conTransaccion(async (client) => {
    for (const demo of arrendadoresDemo) {
      await upsertArrendador(client, demo)
    }

    const totals = await client.query(
      `
        SELECT
          (SELECT COUNT(*)::int FROM usuarios WHERE rol = 'arrendador') AS arrendadores,
          (SELECT COUNT(*)::int FROM perfiles_arrendador) AS perfiles_arrendador,
          (SELECT COUNT(*)::int FROM propiedades) AS propiedades
      `,
    )

    console.log('Seed completado:', totals.rows[0])
  })
}

main().catch((error) => {
  console.error('No se pudo sembrar arrendadores demo:', error)
  process.exit(1)
})