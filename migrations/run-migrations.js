#!/usr/bin/env node
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import pg from 'pg'

const { Pool } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('ERROR: DATABASE_URL no definida. Define DATABASE_URL en tu .env antes de ejecutar las migraciones.')
  process.exit(1)
}

const pool = new Pool({
  connectionString,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
})

async function run() {
  const migrationsDir = path.resolve(process.cwd(), 'migrations')
  let files
  try {
    files = await fs.readdir(migrationsDir)
  } catch (err) {
    console.error('No se pudo leer migrations/:', err.message)
    process.exit(1)
  }

  files = files.filter((f) => f.endsWith('.sql')).sort()
  if (files.length === 0) {
    console.log('No hay archivos .sql en migrations/. Nada que aplicar.')
    process.exit(0)
  }

  for (const file of files) {
    const full = path.join(migrationsDir, file)
    console.log(`Aplicando migración: ${file}`)
    const sql = await fs.readFile(full, 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log(`OK: ${file}`)
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`ERROR aplicando ${file}:`, err.message)
      client.release()
      throw err
    } finally {
      client.release()
    }
  }

  console.log('Todas las migraciones aplicadas')
  await pool.end()
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migración fallida:', err)
    process.exit(1)
  })
