import assert from 'assert'
const base = process.env.TEST_BASE || 'http://localhost:3001'

export default async function(){
  console.log('[test_properties] starting')
  // login arrendador (example existing account)
  const loginRes = await fetch(`${base}/api/auth/iniciar-sesion`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: 'arrendador-a1.615471@example.com', password: 'Pass1234!' }) })
  const login = await loginRes.json()
  assert(loginRes.ok, 'login arrendador failed: '+ (login.error||loginRes.status))
  const token = login.token

  // create property
  const payload = {
    titulo: 'Test Piso desde test',
    descripcion: 'Descripcion de prueba',
    ciudad: 'Madrid',
    zona: 'Centro',
    direccion: 'Calle Falsa 123',
    precio: 500,
    habitaciones: 1,
    banos: 1,
    metrosCuadrados: 35,
    tipoAlquiler: 'temporal',
    amueblado: true,
    disponible: true,
    fotos: ['http://example.com/a.jpg']
  }

  const createRes = await fetch(`${base}/api/properties`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
  const create = await createRes.json()
  assert(createRes.ok, 'create property failed: '+ (create.error||createRes.status))
  console.log('[test_properties] created property id', create.id)

  // update property
  const id = create.id
  const updateRes = await fetch(`${base}/api/properties/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ titulo: 'Test Piso modificado', precio: 550 }) })
  const update = await updateRes.json()
  assert(updateRes.ok, 'update property failed: '+ (update.error||updateRes.status))
  console.log('[test_properties] updated property ok')

  // delete property
  const delRes = await fetch(`${base}/api/properties/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  let del = {}
  try {
    del = await delRes.json()
  } catch (err) {
    // some endpoints may return 204 No Content
  }
  assert(delRes.ok, 'delete property failed: '+ ((del && del.error) || delRes.status))
  console.log('[test_properties] deleted property ok')
}
