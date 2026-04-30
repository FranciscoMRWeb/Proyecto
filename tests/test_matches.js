import assert from 'assert'

const base = process.env.TEST_BASE || 'http://localhost:3001'

async function post(path, body, token) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

async function get(path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const json = await res.json().catch(() => ({}))
  return { res, json }
}

async function registrarUsuario({ email, rol, nombre, apellidos }) {
  const { res, json } = await post('/api/auth/register', {
    email,
    password: 'Pass1234!',
    rol,
    nombre,
    apellidos,
    ciudad: 'Madrid',
  })

  assert(res.ok, `register ${rol} failed: ${json.error || res.status}`)
  return json.token
}

async function obtenerPerfilActual(token) {
  const { res, json } = await get('/api/me', token)
  assert(res.ok, `GET /api/me failed: ${json.error || res.status}`)
  return json.user.perfil.profileId
}

export default async function () {
  console.log('[test_matches] starting')

  const suffix = Date.now()

  const tokenArrendadorA = await registrarUsuario({
    email: `arr-a-${suffix}@test.com`,
    rol: 'arrendador',
    nombre: 'Arrendador',
    apellidos: 'Uno',
  })

  const tokenArrendadorB = await registrarUsuario({
    email: `arr-b-${suffix}@test.com`,
    rol: 'arrendador',
    nombre: 'Arrendador',
    apellidos: 'Dos',
  })

  const tokenArrendatario = await registrarUsuario({
    email: `inqui-${suffix}@test.com`,
    rol: 'arrendatario',
    nombre: 'Inquilino',
    apellidos: 'Uno',
  })

  const perfilArrendadorA = await obtenerPerfilActual(tokenArrendadorA)
  const perfilArrendadorB = await obtenerPerfilActual(tokenArrendadorB)
  const perfilArrendatario = await obtenerPerfilActual(tokenArrendatario)

  const { res: createPropRes, json: createPropJson } = await post(
    '/api/properties',
    {
      titulo: `Piso test matches ${suffix}`,
      descripcion: 'Piso para pruebas de voto mutuo',
      ciudad: 'Madrid',
      zona: 'Centro',
      direccion: 'Calle Test 123',
      precio: 900,
      habitaciones: 2,
      banos: 1,
      metrosCuadrados: 70,
      tipoAlquiler: 'temporal',
      amueblado: true,
      disponible: true,
      fotos: ['http://example.com/test-match.jpg'],
    },
    tokenArrendadorA,
  )
  assert(createPropRes.ok, `create property failed: ${createPropJson.error || createPropRes.status}`)

  // up + up => match true
  const { res: votoInquilinoRes, json: votoInquilinoJson } = await post(
    `/api/matches/${perfilArrendadorA}/vote`,
    { vote: 'up' },
    tokenArrendatario,
  )
  assert(votoInquilinoRes.ok, `tenant vote up failed: ${votoInquilinoJson.error || votoInquilinoRes.status}`)
  assert.equal(votoInquilinoJson.match.estado, 'pendiente')
  assert.equal(votoInquilinoJson.match.contactoVisible, false)

  const { res: votoArrendadorRes, json: votoArrendadorJson } = await post(
    `/api/matches/${perfilArrendatario}/vote`,
    { vote: 'up' },
    tokenArrendadorA,
  )
  assert(votoArrendadorRes.ok, `landlord vote up failed: ${votoArrendadorJson.error || votoArrendadorRes.status}`)
  assert.equal(votoArrendadorJson.match.estado, 'match')
  assert.equal(votoArrendadorJson.match.contactoVisible, true)

  const { res: matchesMineRes, json: matchesMineJson } = await get('/api/matches/mine', tokenArrendadorA)
  assert(matchesMineRes.ok, `GET /api/matches/mine failed: ${matchesMineJson.error || matchesMineRes.status}`)

  const matchConInquilino = (matchesMineJson.matches || []).find(
    (m) => m.usuarioCoincidencia?.profileId === perfilArrendatario,
  )
  assert(matchConInquilino, 'expected counterpart match not found in /api/matches/mine')
  assert.equal(matchConInquilino.estado, 'match')
  assert.equal(matchConInquilino.contactoVisible, true)
  assert.equal(matchConInquilino.miVoto, 'up')
  assert.equal(matchConInquilino.suVoto, 'up')

  // up + down => rechazado
  const { res: downRes, json: downJson } = await post(
    `/api/matches/${perfilArrendadorA}/vote`,
    { vote: 'down' },
    tokenArrendatario,
  )
  assert(downRes.ok, `tenant vote down failed: ${downJson.error || downRes.status}`)
  assert.equal(downJson.match.estado, 'rechazado')
  assert.equal(downJson.match.contactoVisible, false)

  // validacion rol opuesto
  const { res: mismoRolRes } = await post(
    `/api/matches/${perfilArrendadorB}/vote`,
    { vote: 'up' },
    tokenArrendadorA,
  )
  assert.equal(mismoRolRes.status, 400)

  // validacion no auto-voto
  const { res: autoVotoRes } = await post(
    `/api/matches/${perfilArrendadorA}/vote`,
    { vote: 'up' },
    tokenArrendadorA,
  )
  assert.equal(autoVotoRes.status, 400)

  console.log('[test_matches] up/up, up/down y validaciones OK')
}
