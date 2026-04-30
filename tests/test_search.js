import assert from 'assert'
const base = process.env.TEST_BASE || 'http://localhost:3001'

export default async function(){
  console.log('[test_search] starting')
  // test arrendador sees arrendatarios
  const loginArr = await fetch(`${base}/api/auth/iniciar-sesion`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: 'arrendador-a1.615471@example.com', password: 'Pass1234!' }) })
  const ja = await loginArr.json()
  assert(loginArr.ok, 'login arrendador failed: '+ (ja.error||loginArr.status))
  const sa = await fetch(`${base}/api/search/suerte`, { headers: { Authorization: `Bearer ${ja.token}` } })
  const resa = await sa.json()
  assert(sa.ok, 'search arrendador failed: '+ (resa.error||sa.status))
  console.log('[test_search] arrendador candidates:', resa.candidates.length)

  // test arrendatario sees propiedades
  const registerRes = await fetch(`${base}/api/auth/register`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: `arrend-test-${Date.now()}@test.com`, password: 'Pass1234!', rol: 'arrendatario', nombre: 'T', apellidos: 'T', ciudad: 'Madrid' }) })
  const reg = await registerRes.json()
  assert(registerRes.ok, 'register arrendatario failed: '+ (reg.error||registerRes.status))
  const ss = await fetch(`${base}/api/search/suerte`, { headers: { Authorization: `Bearer ${reg.token}` } })
  const r2 = await ss.json()
  assert(ss.ok, 'search arrendatario failed: '+ (r2.error||ss.status))
  console.log('[test_search] arrendatario candidates:', r2.candidates.length)
}
