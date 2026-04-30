## Plan: Plataforma de alquiler de pisos

Crear una web completa de búsqueda y gestión de alquileres con una base clara de datos, autenticación por perfil y un flujo de emparejamiento tipo "buscar suerte". La recomendación es separar frontend y backend: un frontend en JavaScript puro con HTML/CSS y un backend Node.js + Express que exponga una API para la base de datos PostgreSQL. El esquema SQL ya existe como base en `BBDD.sql`, así que el trabajo principal es convertirlo en una solución funcional, segura y navegable.

**Steps**
1. Definir la arquitectura base y el alcance del MVP. Confirmar que la app tendrá dos capas: frontend público con landing/login/registro y backend API con auth, perfiles, propiedades, matches y chat. Decidir si el frontend actual se migra desde React TypeScript a JavaScript puro o si se mantiene parte del entorno actual temporalmente mientras se reescribe la UI.
2. Revisar y ajustar el modelo de datos en PostgreSQL a partir de `BBDD.sql`. Normalizar campos que hoy están ambiguos para el caso de uso real, especialmente perfiles, propiedades, datos de contacto, criterios de búsqueda, fotos y estados de match. Añadir índices y restricciones para correo único, relación usuario-perfil, y unicidad de matches.
3. Crear la capa de backend en Node.js + Express. Montar conexión a PostgreSQL, endpoints REST para registro, login, carga/edición de perfil, alta de propiedades, subida de fotos, búsqueda de perfiles compatibles, aceptación/rechazo del match y acceso al chat solo cuando haya coincidencia mutua.
4. Implementar autenticación y autorización por tipo de usuario. Separar rutas y permisos para arrendador y arrendatario. Guardar contraseña con hash, emitir sesión o token, y proteger endpoints según rol. Incluir lógica para que la información sensible solo sea visible cuando ambos usuarios hayan aceptado el match.
5. Construir el frontend público. Crear una página principal con información de la empresa, política de privacidad, acceso de login y registro, y navegación clara hacia el área privada. Reemplazar el contenido por defecto de `src/App.tsx` y `src/App.css` con una experiencia propia del proyecto.
6. Construir los paneles privados por rol. Para arrendador, incluir perfil personal y gestión de pisos con precio, descripción, fotos y estado de disponibilidad. Para arrendatario, incluir perfil personal y formulario de currículum con último piso, avalistas, rango de precio y ubicación deseada. Ambos perfiles deben permitir editar foto, nombre, apellidos, teléfono, email y ciudad.
7. Implementar la función "buscar suerte". Crear el filtrado que compare criterios de arrendador y arrendatario, ordene candidatos compatibles y permita votar con pulgar arriba o abajo. Si ambos marcan aceptación, activar el match y habilitar la visualización del móvil y del perfil completo.
8. Añadir contacto y mensajería básica. Una vez creado el match, permitir ver datos de contacto y, si se quiere ampliar el alcance, habilitar chat sencillo persistido en la base de datos. Si el alcance es mínimo, dejar solo intercambio de datos y marcar el chat como fase posterior.
9. Cerrar la capa visual y de experiencia. Sustituir los estilos base de `src/index.css` y `src/App.css` por una identidad visual propia, responsive y consistente con una web inmobiliaria moderna. Añadir estados vacíos, validaciones y mensajes de error claros.
10. Validar, documentar y preparar despliegue. Comprobar login, registro, edición de perfiles, alta de pisos, filtros de match y restricciones de permisos. Documentar el esquema SQL, variables de entorno y pasos de arranque del frontend y backend.


**Task order**
1. Cerrar alcance técnico y decidir estructura final del proyecto.
2. Ajustar la base de datos PostgreSQL y dejar definidos usuarios, perfiles, propiedades, matches y mensajes.
3. Montar backend Node.js + Express con conexión a la BBDD y autenticación.
4. Crear el frontend público con landing, privacidad, login y registro.
5. Crear los paneles privados por rol con edición de perfil.
6. Implementar publicación de pisos para arrendador y CV/búsqueda para arrendatario.
7. Programar "buscar suerte" con filtrado, pulgar arriba y pulgar abajo, y match mutuo.
8. Activar visibilidad de contacto solo tras aceptación de ambos.
9. Aplicar estilos finales, validaciones y responsive.
10. Probar todo y documentar arranque y despliegue.

**Copilot prompt base**
Quiero que desarrolles este proyecto paso a paso sin inventar requisitos. Debes respetar estas reglas: no borres funcionalidades existentes salvo que sea necesario, no cambies el alcance sin preguntarme, no inventes servicios externos si no los pido, y no des por hecho una arquitectura distinta a Node.js + Express + PostgreSQL. Empieza siempre por la tarea más pequeña y verificable, explica brevemente qué vas a tocar antes de editar, y después valida el cambio con la comprobación más barata posible. El proyecto debe incluir una página principal con información de la empresa y privacidad, login y registro, perfil de arrendador y arrendatario, subida de datos personales, pisos para arrendador, currículum para arrendatario, sistema de búsqueda tipo "buscar suerte" con pulgar arriba o abajo, y visibilidad de móvil/perfil solo si ambos aceptan.

**Copilot no debe**
No uses librerías innecesarias, no introduzcas Redux o arquitecturas pesadas sin pedirlo, no conviertas el proyecto en algo ajeno a la web de alquiler, no te saltes la parte de base de datos, no hagas cambios grandes sin dividirlos en tareas pequeñas, y no supongas que el chat completo es obligatorio si no está ya definido como parte del MVP.

**Relevant files**
- `c:\Users\pacom\OneDrive\Escritorio\React TFG\src\App.tsx` - punto de entrada actual de la UI; sustituir el contenido demo por la app real
- `c:\Users\pacom\OneDrive\Escritorio\React TFG\src\App.css` - estilos principales de la interfaz
- `c:\Users\pacom\OneDrive\Escritorio\React TFG\src\index.css` - base global y variables visuales
- `c:\Users\pacom\OneDrive\Escritorio\React TFG\src\main.tsx` - arranque de la app
- `c:\Users\pacom\OneDrive\Escritorio\React TFG\package.json` - scripts y dependencias del frontend
- `c:\Users\pacom\OneDrive\Escritorio\React TFG\BBDD.sql` - esquema base de PostgreSQL a revisar y completar

**Verification**
1. Levantar el frontend y comprobar que la página principal, login y registro cargan sin errores visuales ni de consola.
2. Probar endpoints de backend con un cliente HTTP para registro, login, edición de perfil, publicación de pisos y búsqueda de compatibilidades.
3. Verificar que un arrendatario y un arrendador solo pueden ver datos de contacto y perfil completo cuando ambos han aceptado el match.
4. Ejecutar validación de esquema en PostgreSQL para confirmar claves foráneas, unicidad de usuarios y consistencia de referencias.
5. Revisar responsividad en escritorio y móvil, y comprobar que las cargas de imágenes y formularios funcionan con datos reales.

**Decisions**
- Se asume backend en Node.js con Express, porque el proyecto necesita exponer una API segura hacia una base de datos externa.
- Se asume PostgreSQL como motor SQL, ya que el script actual usa sintaxis compatible con PostgreSQL.
- Se asume que las fotos se guardarán en el propio backend al principio; si luego hace falta escalar, se puede migrar a un servicio externo.
- Se recomienda alinear el proyecto con JavaScript puro en la capa que se vaya a reescribir, aunque el repo actual arranca con React + TypeScript.
- El alcance del MVP prioriza autenticación, perfiles, pisos, match y visibilidad de contacto; el chat completo puede dejarse como extensión si hace falta recortar tiempo.

**Further Considerations**
1. Conviene confirmar si quieres una app totalmente nueva en JavaScript puro o si prefieres conservar React para la interfaz y usar JavaScript solo en el backend.
2. Conviene definir si el match será solo filtrado manual con pulgares o si también quieres puntuación automática por compatibilidad.
3. Conviene decidir si la mensajería será obligatoria desde el inicio o si basta con mostrar datos de contacto tras el doble consentimiento.

---

Progreso actual (implementación en curso):

- Añadidas validaciones de payload para `POST /api/properties` y `PUT /api/properties/:id` en `server/index.js`.
- Añadidos tests de integración básicos bajo `tests/` y script `npm test`.

Próximos pasos que ejecutaré:
1. Añadir validaciones adicionales en `auth/register` y `PUT /api/me`.
2. Crear migrations SQL si se decide tocar el esquema y proveer scripts para DBeaver.
3. Añadir CI/test automation y mejorar manejo de errores en servidor.

Cómo ejecutar los tests locales:

```bash
npm test
```

Si quieres que aplique migraciones en la base de datos local, indícame `aplicar migraciones` y necesitaré que añadas las credenciales (DATABASE_URL) en tu `.env` local.