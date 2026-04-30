# React TFG

Plataforma de alquiler de pisos con interfaz en React, servidor Node.js y base de datos PostgreSQL.

## Alcance actual

- Pagina principal con información de la empresa y privacidad.
- Registro, inicio de sesion y sesión con JWT.
- Perfiles de arrendador y arrendatario.
- Edición de datos personales y datos por rol.
- Gestión de pisos del arrendador con fotos por URL.
- Currículum del arrendatario.
- Sistema "buscar suerte" con pulgar arriba y pulgar abajo.
- Match mutuo con contacto oculto hasta que ambas partes aceptan.

## Estructura

- `src/` contiene el interfaz React.
- `server/` contiene la API Node.js + Express.
- `BBDD.sql` contiene el esquema PostgreSQL.

## Requisitos

- Node.js 18 o superior.
- PostgreSQL 14 o superior.

## Variables de entorno

Crea un archivo `.env` en la raíz o exporta estas variables en el entorno donde arranques el servidor:

- `DATABASE_URL`: cadena de conexión a PostgreSQL.
- `JWT_SECRET`: secreto para firmar tokens.
- `PORT`: puerto del servidor. Por defecto usa `3001`.
- `CORS_ORIGIN`: origen permitido por CORS. Por defecto usa `http://localhost:5173`.
- `PGSSL`: pon `true` si necesitas SSL en la conexión a PostgreSQL.
- `VITE_API_URL`: origen del servidor para el interfaz, sin incluir `/api`. Por defecto usa `http://localhost:3001`.

## Arranque

1. Instala dependencias.

   ```bash
   npm install
   ```

2. Arranca el servidor.

   ```bash
   npm run server
   ```

3. Arranca el interfaz en otra terminal.

   ```bash
   npm run dev
   ```

   O arranca ambos con un solo comando:

   ```bash
   npm run dev:full
   ```

4. Abre `http://localhost:5173`.

## Scripts

- `npm run dev`: interfaz con Vite.
- `npm run server`: API Express.
- `npm run build`: compila interfaz.
- `npm run lint`: ejecuta ESLint.
- `npm run preview`: previsualiza la build.

## API principal

- `POST /api/auth/register`
- `POST /api/auth/inicio de sesion`
- `GET /api/me`
- `PUT /api/me`
- `GET /api/properties/mine`
- `POST /api/properties`
- `PUT /api/properties/:id`
- `DELETE /api/properties/:id`
- `GET /api/search/suerte`
- `POST /api/matches/:profileId/vote`
- `GET /api/matches/mine`

## Base de datos

El esquema está preparado para:

- usuarios con rol `arrendador` o `arrendatario`,
- perfiles separados por rol,
- propiedades y fotos,
- matches mutuos con visibilidad de contacto,
- soporte para el flujo de búsqueda y aceptación.

Importa `BBDD.sql` en PostgreSQL antes de usar el servidor.
