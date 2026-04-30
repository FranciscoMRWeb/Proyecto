#!/usr/bin/env node
import { conTransaccion } from '../server/db.js'

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const firstNames = ['Ana','Luis','María','Carlos','Lucía','Pablo','Sofía','Jorge','Elena','Raúl','Marta','Diego']
const lastNames = ['García','Martínez','Pérez','González','Rodríguez','López','Sánchez','Ramírez','Torres','Flores']
const cities = ['Madrid','Sevilla','Barcelona','Valencia','Bilbao','Granada','Zaragoza','Alicante']
const descriptions = [
  'Busco piso tranquilo y luminoso, con buena conexión al transporte público.',
  'Profesional joven, responsable y con referencias; serio en los pagos.',
  'Pareja sin mascotas, buscamos 1-2 habitaciones cerca del centro.',
  'Estudiante de posgrado, horario diurno, referenciado y ordenado.',
  'Trabajador remoto, buena situación económica y cuidadoso con la vivienda.'
]
const sampleCurricula = [
  'Ingeniero informático con 5 años de experiencia en desarrollo web. Buenas referencias laborales y personales.',
  'Técnico sanitario con contrato estable. Historial de alquiler sin incidencias.',
  'Estudiante de posgrado en Economía. Cuenta con avalistas y capacidad de pago demostrable.',
  'Consultor freelance con ingresos regulares y referencias de arrendadores previos.'
  
]

function makeFakeFor(user) {
  const nombre = randItem(firstNames)
  const apellidos = randItem(lastNames) + ' ' + randItem(lastNames)
  const email = `${nombre.toLowerCase()}.${apellidos.split(' ')[0].toLowerCase()}.${Math.floor(Math.random()*9000)+1000}@example.com`
  const ciudad = randItem(cities)
  const descripcion = randItem(descriptions)
  const rangoMin = Math.floor(Math.random() * 700) + 300 // 300-999
  const rangoMax = rangoMin + (Math.floor(Math.random() * 900) + 200) // ensure max > min
  const curriculum = randItem(sampleCurricula)
  const ultimoPiso = `${Math.floor(Math.random()*5)+1} dormitorio(s) en ${ciudad}`
  const avalistas = Math.random() > 0.6 ? `Avalista: ${capitalize(randItem(firstNames))} ${randItem(lastNames)}` : null
  const mascotas = Math.random() > 0.7
  const fumador = Math.random() > 0.85

  return {
    userId: user.user_id,
    profileId: user.profile_id,
    nombre,
    apellidos,
    email,
    ciudad,
    descripcion,
    rangoPrecioMin: rangoMin,
    rangoPrecioMax: rangoMax,
    curriculum,
    ultimoPisoAlquilado: ultimoPiso,
    avalistas,
    mascotas,
    fumador,
  }
}

async function main() {
  const apply = process.argv.includes('--apply')
  const skipEmail = process.argv.includes('--no-email')

  await conTransaccion(async (client) => {
    const res = await client.query(`SELECT u.id AS user_id, p.id AS profile_id FROM usuarios u JOIN perfiles p ON p.usuario_id = u.id WHERE u.rol = 'arrendatario'`)
    const users = res.rows
    if (users.length === 0) {
      console.log('No hay usuarios con rol arrendatario.')
      return
    }

    console.log(`Encontrados ${users.length} arrendatario(s). Generando datos${apply ? ' y aplicando' : ' (dry-run)'}...`)

    for (const u of users) {
      const fake = makeFakeFor(u)
      console.log('---')
      console.log(`User #${fake.userId} -> ${fake.nombre} ${fake.apellidos} <${fake.email}>`)
      console.log(`Ciudad: ${fake.ciudad} | Rango: ${fake.rangoPrecioMin} - ${fake.rangoPrecioMax}`)
      console.log(`Descripcion: ${fake.descripcion}`)
      console.log(`Curriculum: ${fake.curriculum}`)

      if (apply) {
        if (!skipEmail) {
          // update usuarios email
          await client.query(`UPDATE usuarios SET email = $1 WHERE id = $2`, [fake.email, fake.userId])
        } else {
          console.log(`Skipping email update for user ${fake.userId}`)
        }

        // update perfiles
        await client.query(`UPDATE perfiles SET nombre = $1, apellidos = $2, descripcion = $3, ciudad = $4 WHERE id = $5`, [fake.nombre, fake.apellidos, fake.descripcion, fake.ciudad, fake.profileId])

        // upsert perfiles_arrendatario
        await client.query(
          `INSERT INTO perfiles_arrendatario (perfil_id, ultimo_piso_alquilado, avalistas, rango_precio_min, rango_precio_max, ubicacion_deseada, curriculum, mascotas, fumador)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (perfil_id) DO UPDATE SET
             ultimo_piso_alquilado = EXCLUDED.ultimo_piso_alquilado,
             avalistas = EXCLUDED.avalistas,
             rango_precio_min = EXCLUDED.rango_precio_min,
             rango_precio_max = EXCLUDED.rango_precio_max,
             ubicacion_deseada = EXCLUDED.ubicacion_deseada,
             curriculum = EXCLUDED.curriculum,
             mascotas = EXCLUDED.mascotas,
             fumador = EXCLUDED.fumador,
             fecha_actualizacion = NOW()`,
          [fake.profileId, fake.ultimoPisoAlquilado, fake.avalistas, fake.rangoPrecioMin, fake.rangoPrecioMax, fake.ciudad, fake.curriculum, fake.mascotas, fake.fumador]
        )
      }
    }

    if (!apply) {
      console.log('\nDry-run complete. Run with `node scripts/populate_arrendatarios.js --apply` to apply changes.')
    } else {
      console.log('\nActualización completada.')
    }
  })
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
