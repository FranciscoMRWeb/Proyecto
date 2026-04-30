import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

console.log('Initializing database pool with:', {
  connectionString: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'),
  ssl: process.env.PGSSL,
})

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (error) => {
  console.error('Error inesperado en cliente inactivo', error)
})

pool.on('connect', () => {
  console.log('Nuevo cliente conectado a la base de datos')
})

export async function query(text, params) {
  return pool.query(text, params)
}

export async function conTransaccion(callback) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export { pool }
