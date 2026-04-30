import jwt from 'jsonwebtoken'

export function crearToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      role: user.rol,
      email: user.email,
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' },
  )
}

export function requiereAutenticacion(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta token de autenticacion' })
  }

  try {
    const token = header.slice('Bearer '.length)
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.auth = {
      userId: Number(payload.sub),
      role: payload.role,
      email: payload.email,
    }
    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalido o expirado' })
  }
}
