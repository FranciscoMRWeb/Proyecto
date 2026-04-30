import './App.css';
import { useEffect, useState } from 'react';
const baseApi = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '').replace(/\/api$/, '');
function construirUrlApi(path) {
    const rutaNormalizada = path.startsWith('/') ? path : `/${path}`;
    return `${baseApi}${rutaNormalizada}`;
}
const formularioRegistroInicial = {
    email: '',
    password: '',
    role: 'arrendatario',
    nombre: '',
    apellidos: '',
    telefono: '',
    ciudad: '',
    descripcion: '',
    fotoPerfil: '',
    nombreComercial: '',
    descripcionEmpresa: '',
    web: '',
    ultimoPisoAlquilado: '',
    avalistas: '',
    rangoPrecioMin: '',
    rangoPrecioMax: '',
    ubicacionDeseada: '',
    curriculum: '',
    mascotas: false,
    fumador: false,
};
const borradorPerfilInicial = {
    nombre: '',
    apellidos: '',
    telefono: '',
    ciudad: '',
    descripcion: '',
    fotoPerfil: '',
    emailPublico: false,
    telefonoPublico: false,
    perfilPublico: true,
    nombreComercial: '',
    descripcionEmpresa: '',
    web: '',
    ultimoPisoAlquilado: '',
    avalistas: '',
    rangoPrecioMin: '',
    rangoPrecioMax: '',
    ubicacionDeseada: '',
    curriculum: '',
    mascotas: false,
    fumador: false,
};
const borradorPropiedadInicial = {
    titulo: '',
    descripcion: '',
    ciudad: '',
    zona: '',
    direccion: '',
    precio: '',
    habitaciones: '',
    banos: '',
    metrosCuadrados: '',
    tipoAlquiler: '',
    amueblado: false,
    disponible: true,
    fotosInput: '',
};
async function solicitudApi(path, options = {}) {
    const response = await fetch(construirUrlApi(path), {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
        ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload.error || 'No se pudo completar la operacion');
    }
    return payload;
}
function crearBorradorPerfil(user) {
    if (!user || !user.perfil) {
        return borradorPerfilInicial;
    }
    const datosRol = user.perfil.datosRol ?? {};
    return {
        nombre: user.perfil.nombre,
        apellidos: user.perfil.apellidos,
        telefono: user.perfil.telefono ?? user.telefono ?? '',
        ciudad: user.perfil.ciudad ?? user.ciudad ?? '',
        descripcion: user.perfil.descripcion ?? '',
        fotoPerfil: user.perfil.fotoPerfil ?? '',
        emailPublico: user.perfil.emailPublico,
        telefonoPublico: user.perfil.telefonoPublico,
        perfilPublico: user.perfil.perfilPublico,
        nombreComercial: typeof datosRol.nombreComercial === 'string' ? datosRol.nombreComercial : '',
        descripcionEmpresa: typeof datosRol.descripcionEmpresa === 'string' ? datosRol.descripcionEmpresa : '',
        web: typeof datosRol.web === 'string' ? datosRol.web : '',
        ultimoPisoAlquilado: typeof datosRol.ultimoPisoAlquilado === 'string' ? datosRol.ultimoPisoAlquilado : '',
        avalistas: typeof datosRol.avalistas === 'string' ? datosRol.avalistas : '',
        rangoPrecioMin: typeof datosRol.rangoPrecioMin === 'number' || typeof datosRol.rangoPrecioMin === 'string'
            ? String(datosRol.rangoPrecioMin)
            : '',
        rangoPrecioMax: typeof datosRol.rangoPrecioMax === 'number' || typeof datosRol.rangoPrecioMax === 'string'
            ? String(datosRol.rangoPrecioMax)
            : '',
        ubicacionDeseada: typeof datosRol.ubicacionDeseada === 'string' ? datosRol.ubicacionDeseada : '',
        curriculum: typeof datosRol.curriculum === 'string' ? datosRol.curriculum : '',
        mascotas: typeof datosRol.mascotas === 'boolean' ? datosRol.mascotas : false,
        fumador: typeof datosRol.fumador === 'boolean' ? datosRol.fumador : false,
    };
}
function crearBorradorPropiedad(property) {
    if (!property) {
        return borradorPropiedadInicial;
    }
    return {
        titulo: property.titulo,
        descripcion: property.descripcion ?? '',
        ciudad: property.ciudad,
        zona: property.zona ?? '',
        direccion: property.direccion ?? '',
        precio: String(property.precio),
        habitaciones: property.habitaciones === null ? '' : String(property.habitaciones),
        banos: property.banos === null ? '' : String(property.banos),
        metrosCuadrados: property.metros_cuadrados === null ? '' : String(property.metros_cuadrados),
        tipoAlquiler: property.tipo_alquiler,
        amueblado: property.amueblado,
        disponible: property.disponible,
        fotosInput: property.fotos.map((foto) => foto.url).join('\n'),
    };
}
function aTexto(value, fallback = 'No disponible') {
    return typeof value === 'string' && value.trim() ? value : fallback;
}
function obtenerIniciales(nombre, apellidos) {
  const partes = [nombre, apellidos]
    .filter((valor) => typeof valor === 'string' && valor.trim())
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) {
    return 'CC';
  }
  const iniciales = partes.slice(0, 2).map((parte) => parte[0].toUpperCase()).join('');
  return iniciales || 'CC';
}
function convertirArchivoADataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('No se pudo procesar la imagen.'));
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.readAsDataURL(file);
  });
}
function App() {
    const [modoAcceso, setModoAcceso] = useState('inicio de sesion');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [vistaActiva, setVistaActiva] = useState('inicio');
    const [formularioInicioSesion, setFormularioInicioSesion] = useState({
        email: '',
        password: '',
    });
    const [formularioRegistro, setFormularioRegistro] = useState(formularioRegistroInicial);
    const [mensajeEstado, setStatusMessage] = useState(null);
    const [enviandoFormulario, setIsSubmitting] = useState(false);
    const [usuarioSesion, setUsuarioSesion] = useState(null);
    const [borradorPerfil, setBorradorPerfil] = useState(borradorPerfilInicial);
    const [guardandoPerfil, setGuardandoPerfil] = useState(false);
    const [borradorPropiedad, setBorradorPropiedad] = useState(borradorPropiedadInicial);
    const [listaPropiedades, setListaPropiedades] = useState([]);
    const [cargandoPropiedades, setCargandoPropiedades] = useState(false);
    const [guardandoPropiedad, setGuardandoPropiedad] = useState(false);
    const [idPropiedadEditando, setIdPropiedadEditando] = useState(null);
    const [mensajePropiedad, setMensajePropiedad] = useState(null);
    const [candidatosBusqueda, setCandidatosBusqueda] = useState([]);
    const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
    const [mensajeBusqueda, setMensajeBusqueda] = useState(null);
    const [filtrosBusqueda, setFiltrosBusqueda] = useState({
      rol: 'todos',
      ciudad: '',
      precioMax: '',
    });
    const [coincidencias, setCoincidencias] = useState([]);
    const [cargandoCoincidencias, setCargandoCoincidencias] = useState(false);
    const [mensajeCoincidencias, setMensajeCoincidencias] = useState(null);
    useEffect(() => {
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        solicitudApi('/api/me', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => {
            setUsuarioSesion(response.user);
        })
            .catch(() => {
            window.localStorage.removeItem('tokenAutenticacion');
        });
    }, []);
    useEffect(() => {
        setBorradorPerfil(crearBorradorPerfil(usuarioSesion));
    console.log('useEffect usuarioSesion changed:', usuarioSesion?.perfil?.nombre)
    }, [usuarioSesion]);
    useEffect(() => {
        if (!usuarioSesion) {
            setCandidatosBusqueda([]);
            setMensajeBusqueda(null);
            setCoincidencias([]);
            setMensajeCoincidencias(null);
            return;
        }
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        setCargandoBusqueda(true);
        solicitudApi('/api/search/suerte', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => {
            setCandidatosBusqueda(response.candidates);
            setMensajeBusqueda(response.candidates.length > 0
                ? { kind: 'success', text: `Se han encontrado ${response.candidates.length} candidatos compatibles.` }
                : { kind: 'success', text: 'Aun no hay candidatos compatibles con tus criterios.' });
        })
            .catch((error) => {
            setMensajeBusqueda({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudo cargar la busqueda.',
            });
        })
            .finally(() => {
            setCargandoBusqueda(false);
        });
    }, [usuarioSesion]);
    useEffect(() => {
        if (!usuarioSesion) {
            return;
        }
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        setCargandoCoincidencias(true);
        solicitudApi('/api/matches/mine', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => {
            setCoincidencias(response.matches);
            setMensajeCoincidencias(response.matches.length > 0
                ? { kind: 'success', text: `Tienes ${response.matches.length} matches en seguimiento.` }
                : { kind: 'success', text: 'Todavia no hay matches guardados.' });
        })
            .catch((error) => {
            setMensajeCoincidencias({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudieron cargar los matches.',
            });
        })
            .finally(() => {
            setCargandoCoincidencias(false);
        });
    }, [usuarioSesion]);
    useEffect(() => {
        if (usuarioSesion?.rol !== 'arrendador') {
            setListaPropiedades([]);
            setBorradorPropiedad(borradorPropiedadInicial);
            setIdPropiedadEditando(null);
            return;
        }
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        setCargandoPropiedades(true);
        solicitudApi('/api/properties/mine', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => {
            setListaPropiedades(response.properties);
        })
            .catch((error) => {
            setMensajePropiedad({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudieron cargar los pisos.',
            });
        })
            .finally(() => {
            setCargandoPropiedades(false);
        });
    }, [usuarioSesion]);
    const etiquetaRol = usuarioSesion?.rol === 'arrendador' ? 'Arrendador' : 'Arrendatario';
    const seccionesMenu = usuarioSesion
      ? [
        { id: 'inicio', label: 'Inicio' },
        { id: 'perfil', label: 'Perfil' },
        { id: 'buscar', label: 'Buscar suerte' },
        { id: 'matches', label: 'Matches' },
        { id: usuarioSesion.rol === 'arrendador' ? 'gestion' : 'curriculum', label: usuarioSesion.rol === 'arrendador' ? 'Pisos' : 'Curriculum' },
      ]
      : [];
    if (!usuarioSesion) {
        return (<main className="login-shell">
      <section className="login-intro">
        <p className="eyebrow">Casa Clara</p>
        <h1>Accede primero para entrar en la plataforma.</h1>
        <p className="hero-text">
          El acceso es la puerta principal. Una vez dentro, podras gestionar perfil, pisos,
          curriculum y matches desde el panel privado.
        </p>
      </section>

      <section className="auth-panel login-card">
        <div className="auth-tabs" role="tablist" aria-label="Acceso a la plataforma">
          <button className={modoAcceso === 'inicio de sesion' ? 'tab active' : 'tab'} type="button" onClick={() => setModoAcceso('inicio de sesion')}>
            Login
          </button>
          <button className={modoAcceso === 'register' ? 'tab active' : 'tab'} type="button" onClick={() => setModoAcceso('register')}>
            Registro
          </button>
        </div>

        {mensajeEstado ? (<p className={mensajeEstado.kind === 'error' ? 'status status-error' : 'status status-success'}>
            {mensajeEstado.text}
          </p>) : null}

        {modoAcceso === 'inicio de sesion' ? (<form className="auth-form" onSubmit={manejarEnvioInicioSesion}>
            <h2>Entrar en tu cuenta</h2>
            <label>
              Email
              <input type="email" value={formularioInicioSesion.email} onChange={(event) => setFormularioInicioSesion((current) => ({ ...current, email: event.target.value }))} placeholder="usuario@correo.com" required/>
            </label>
            <label>
              Contraseña
              <div className="password-field">
                <input type={mostrarContrasena ? 'text' : 'password'} value={formularioInicioSesion.password} onChange={(event) => setFormularioInicioSesion((current) => ({ ...current, password: event.target.value }))} placeholder="********" required/>
                <button className="password-toggle" type="button" onClick={() => setMostrarContrasena((current) => !current)} aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <span aria-hidden="true">{mostrarContrasena ? 'Llave cerrada' : 'Llave abierta'}</span>
                </button>
              </div>
            </label>
            <button className="button" type="submit" disabled={enviandoFormulario}>
              {enviandoFormulario ? 'Validando...' : 'Entrar'}
            </button>
          </form>) : (<form className="auth-form auth-form-register" onSubmit={manejarEnvioRegistro}>
            <h2>Crear cuenta</h2>

            <div className="field-grid">
              <label>
                Nombre
                <input type="text" value={formularioRegistro.nombre} onChange={(event) => setFormularioRegistro((current) => ({ ...current, nombre: event.target.value }))} required/>
              </label>
              <label>
                Apellidos
                <input type="text" value={formularioRegistro.apellidos} onChange={(event) => setFormularioRegistro((current) => ({ ...current, apellidos: event.target.value }))} required/>
              </label>
            </div>

            <div className="field-grid">
              <label>
                Email
                <input type="email" value={formularioRegistro.email} onChange={(event) => setFormularioRegistro((current) => ({ ...current, email: event.target.value }))} required/>
              </label>
              <label>
                Contraseña
                <div className="password-field">
                  <input type={mostrarContrasena ? 'text' : 'password'} value={formularioRegistro.password} onChange={(event) => setFormularioRegistro((current) => ({ ...current, password: event.target.value }))} minLength={8} required/>
                  <button className="password-toggle" type="button" onClick={() => setMostrarContrasena((current) => !current)} aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <span aria-hidden="true">{mostrarContrasena ? 'Llave cerrada' : 'Llave abierta'}</span>
                  </button>
                </div>
              </label>
            </div>

            <div className="field-grid">
              <label>
                Telefono
                <input type="tel" value={formularioRegistro.telefono} onChange={(event) => setFormularioRegistro((current) => ({ ...current, telefono: event.target.value }))}/>
              </label>
              <label>
                Ciudad
                <input type="text" value={formularioRegistro.ciudad} onChange={(event) => setFormularioRegistro((current) => ({ ...current, ciudad: event.target.value }))}/>
              </label>
            </div>

            <label>
              Rol
              <select value={formularioRegistro.role} onChange={(event) => setFormularioRegistro((current) => ({
                ...current,
                role: event.target.value,
            }))}>
                <option value="arrendatario">Arrendatario</option>
                <option value="arrendador">Arrendador</option>
              </select>
            </label>

            <label>
              Descripcion breve
              <textarea value={formularioRegistro.descripcion} onChange={(event) => setFormularioRegistro((current) => ({ ...current, descripcion: event.target.value }))} rows={3}/>
            </label>

            {formularioRegistro.role === 'arrendador' ? (<div className="role-section">
                <h3>Datos del arrendador</h3>
                <label>
                  Nombre comercial
                  <input type="text" value={formularioRegistro.nombreComercial} onChange={(event) => setFormularioRegistro((current) => ({ ...current, nombreComercial: event.target.value }))}/>
                </label>
                <div className="field-grid">
                  <label>
                    Web
                    <input type="url" value={formularioRegistro.web} onChange={(event) => setFormularioRegistro((current) => ({ ...current, web: event.target.value }))}/>
                  </label>
                  <label>
                    Foto de perfil
                    <input type="url" value={formularioRegistro.fotoPerfil} onChange={(event) => setFormularioRegistro((current) => ({ ...current, fotoPerfil: event.target.value }))}/>
                  </label>
                </div>
                <label>
                  Descripcion de empresa
                  <textarea value={formularioRegistro.descripcionEmpresa} onChange={(event) => setFormularioRegistro((current) => ({ ...current, descripcionEmpresa: event.target.value }))} rows={3}/>
                </label>
              </div>) : (<div className="role-section">
                <h3>Datos del arrendatario</h3>
                <label>
                  Ultimo piso alquilado
                  <input type="text" value={formularioRegistro.ultimoPisoAlquilado} onChange={(event) => setFormularioRegistro((current) => ({ ...current, ultimoPisoAlquilado: event.target.value }))}/>
                </label>
                <div className="field-grid">
                  <label>
                    Precio minimo
                    <input type="number" min="0" step="0.01" value={formularioRegistro.rangoPrecioMin} onChange={(event) => setFormularioRegistro((current) => ({ ...current, rangoPrecioMin: event.target.value }))}/>
                  </label>
                  <label>
                    Precio maximo
                    <input type="number" min="0" step="0.01" value={formularioRegistro.rangoPrecioMax} onChange={(event) => setFormularioRegistro((current) => ({ ...current, rangoPrecioMax: event.target.value }))}/>
                  </label>
                </div>
                <label>
                  Ubicacion deseada
                  <input type="text" value={formularioRegistro.ubicacionDeseada} onChange={(event) => setFormularioRegistro((current) => ({ ...current, ubicacionDeseada: event.target.value }))}/>
                </label>
                <label>
                  Curriculum
                  <textarea value={formularioRegistro.curriculum} onChange={(event) => setFormularioRegistro((current) => ({ ...current, curriculum: event.target.value }))} rows={3}/>
                </label>
                <div className="check-row">
                  <label>
                    <input type="checkbox" checked={formularioRegistro.mascotas} onChange={(event) => setFormularioRegistro((current) => ({ ...current, mascotas: event.target.checked }))}/>
                    Mascotas
                  </label>
                  <label>
                    <input type="checkbox" checked={formularioRegistro.fumador} onChange={(event) => setFormularioRegistro((current) => ({ ...current, fumador: event.target.checked }))}/>
                    Fumador
                  </label>
                </div>
              </div>)}

            <button className="button" type="submit" disabled={enviandoFormulario}>
              {enviandoFormulario ? 'Creando...' : 'Crear cuenta'}
            </button>
          </form>)}
      </section>
    </main>);
    }
    async function manejarEnvioInicioSesion(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            const response = await solicitudApi('/api/auth/iniciar-sesion', {
                method: 'POST',
                body: JSON.stringify(formularioInicioSesion),
            });
            window.localStorage.setItem('tokenAutenticacion', response.token);
            setUsuarioSesion(response.user);
            setVistaActiva('inicio');
            setStatusMessage({ kind: 'success', text: 'Sesion iniciada correctamente.' });
        }
        catch (error) {
            setStatusMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo iniciar sesion.' });
        }
        finally {
            setIsSubmitting(false);
        }
    }
    async function manejarEnvioRegistro(event) {
        event.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);
        try {
            const response = await solicitudApi('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    rol: formularioRegistro.role,
                    email: formularioRegistro.email,
                    password: formularioRegistro.password,
                    nombre: formularioRegistro.nombre,
                    apellidos: formularioRegistro.apellidos,
                    telefono: formularioRegistro.telefono || null,
                    ciudad: formularioRegistro.ciudad || null,
                    descripcion: formularioRegistro.descripcion || null,
                    fotoPerfil: formularioRegistro.fotoPerfil || null,
                    nombreComercial: formularioRegistro.nombreComercial || null,
                    descripcionEmpresa: formularioRegistro.descripcionEmpresa || null,
                    web: formularioRegistro.web || null,
                    ultimoPisoAlquilado: formularioRegistro.ultimoPisoAlquilado || null,
                    avalistas: formularioRegistro.avalistas || null,
                    rangoPrecioMin: formularioRegistro.rangoPrecioMin ? Number(formularioRegistro.rangoPrecioMin) : null,
                    rangoPrecioMax: formularioRegistro.rangoPrecioMax ? Number(formularioRegistro.rangoPrecioMax) : null,
                    ubicacionDeseada: formularioRegistro.ubicacionDeseada || null,
                    curriculum: formularioRegistro.curriculum || null,
                    mascotas: formularioRegistro.mascotas,
                    fumador: formularioRegistro.fumador,
                }),
            });
            window.localStorage.setItem('tokenAutenticacion', response.token);
            setUsuarioSesion(response.user);
            setVistaActiva('inicio');
            setStatusMessage({ kind: 'success', text: 'Cuenta creada correctamente.' });
        }
        catch (error) {
            setStatusMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo crear la cuenta.' });
        }
        finally {
            setIsSubmitting(false);
        }
    }
    function manejarCerrarSesion() {
        window.localStorage.removeItem('tokenAutenticacion');
        setUsuarioSesion(null);
      setVistaActiva('inicio');
        setStatusMessage({ kind: 'success', text: 'Sesion cerrada.' });
        setMensajePropiedad(null);
    }
    async function manejarEnvioPerfil(event) {
        event.preventDefault();
        if (!usuarioSesion) {
            return;
        }
        setGuardandoPerfil(true);
        setStatusMessage(null);
        try {
            const token = window.localStorage.getItem('tokenAutenticacion');
            const response = await solicitudApi('/api/me', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nombre: borradorPerfil.nombre,
                    apellidos: borradorPerfil.apellidos,
                    telefono: borradorPerfil.telefono || null,
                    ciudad: borradorPerfil.ciudad || null,
                    descripcion: borradorPerfil.descripcion || null,
                    fotoPerfil: borradorPerfil.fotoPerfil || null,
                    emailPublico: borradorPerfil.emailPublico,
                    telefonoPublico: borradorPerfil.telefonoPublico,
                    perfilPublico: borradorPerfil.perfilPublico,
                    nombreComercial: borradorPerfil.nombreComercial || null,
                    descripcionEmpresa: borradorPerfil.descripcionEmpresa || null,
                    web: borradorPerfil.web || null,
                    ultimoPisoAlquilado: borradorPerfil.ultimoPisoAlquilado || null,
                    avalistas: borradorPerfil.avalistas || null,
                    rangoPrecioMin: borradorPerfil.rangoPrecioMin ? Number(borradorPerfil.rangoPrecioMin) : null,
                    rangoPrecioMax: borradorPerfil.rangoPrecioMax ? Number(borradorPerfil.rangoPrecioMax) : null,
                    ubicacionDeseada: borradorPerfil.ubicacionDeseada || null,
                    curriculum: borradorPerfil.curriculum || null,
                    mascotas: borradorPerfil.mascotas,
                    fumador: borradorPerfil.fumador,
                }),
            });
                console.log('Client: PUT /api/me finished, server response keys:', Object.keys(response || {}))
                if (typeof borradorPerfil.fotoPerfil === 'string') {
                  console.log('Client: fotoPerfil length being sent:', borradorPerfil.fotoPerfil.length)
                }
                const perfilActualizado = await solicitudApi('/api/me', {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                });
                console.log('Client: GET /api/me response keys:', Object.keys(perfilActualizado || {}))
                console.log('Client: perfilActualizado.user.perfil.nombre:', perfilActualizado.user?.perfil?.nombre)
                setUsuarioSesion(perfilActualizado.user);
                setBorradorPerfil(crearBorradorPerfil(perfilActualizado.user));
            setStatusMessage({ kind: 'success', text: 'Perfil actualizado correctamente.' });
        }
        catch (error) {
            setStatusMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' });
        }
        finally {
            setGuardandoPerfil(false);
        }
    }
    function manejarEdicionPropiedad(property) {
        setIdPropiedadEditando(property.id);
        setBorradorPropiedad(crearBorradorPropiedad(property));
        setMensajePropiedad(null);
    }
    function reiniciarPropiedad() {
        setIdPropiedadEditando(null);
        setBorradorPropiedad(borradorPropiedadInicial);
    }
    async function manejarEnvioPropiedad(event) {
        event.preventDefault();
        if (!usuarioSesion || usuarioSesion.rol !== 'arrendador') {
            return;
        }
        setGuardandoPropiedad(true);
        setMensajePropiedad(null);
        try {
            const token = window.localStorage.getItem('tokenAutenticacion');
            const photos = borradorPropiedad.fotosInput
                .split('\n')
                .map((photo) => photo.trim())
                .filter(Boolean);
            const payload = {
                titulo: borradorPropiedad.titulo,
                descripcion: borradorPropiedad.descripcion || null,
                ciudad: borradorPropiedad.ciudad,
                zona: borradorPropiedad.zona || null,
                direccion: borradorPropiedad.direccion || null,
                precio: Number(borradorPropiedad.precio),
                habitaciones: borradorPropiedad.habitaciones ? Number(borradorPropiedad.habitaciones) : null,
                banos: borradorPropiedad.banos ? Number(borradorPropiedad.banos) : null,
                metrosCuadrados: borradorPropiedad.metrosCuadrados ? Number(borradorPropiedad.metrosCuadrados) : null,
                tipoAlquiler: borradorPropiedad.tipoAlquiler,
                amueblado: borradorPropiedad.amueblado,
                disponible: borradorPropiedad.disponible,
                fotos: photos,
            };
            const response = await solicitudApi(idPropiedadEditando ? `/api/properties/${idPropiedadEditando}` : '/api/properties', {
                method: idPropiedadEditando ? 'PUT' : 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            setMensajePropiedad({
                kind: 'success',
                text: idPropiedadEditando ? 'Piso actualizado correctamente.' : `Piso creado correctamente${response.id ? ` (ID ${response.id})` : ''}.`,
            });
            reiniciarPropiedad();
            const refreshed = await solicitudApi('/api/properties/mine', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setListaPropiedades(refreshed.properties);
        }
        catch (error) {
            setMensajePropiedad({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudo guardar el piso.',
            });
        }
        finally {
            setGuardandoPropiedad(false);
        }
    }
    async function manejarEliminarPropiedad(propertyId) {
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        try {
            await solicitudApi(`/api/properties/${propertyId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setListaPropiedades((current) => current.filter((property) => property.id !== propertyId));
            setMensajePropiedad({ kind: 'success', text: 'Piso eliminado correctamente.' });
            if (idPropiedadEditando === propertyId) {
                reiniciarPropiedad();
            }
        }
        catch (error) {
            setMensajePropiedad({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudo borrar el piso.',
            });
        }
    }
    async function refrescarBusqueda() {
        if (!usuarioSesion) {
            return;
        }
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        setCargandoBusqueda(true);
        try {
            const response = await solicitudApi('/api/search/suerte', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setCandidatosBusqueda(response.candidates);
            setMensajeBusqueda(response.candidates.length > 0
                ? { kind: 'success', text: `Se han encontrado ${response.candidates.length} candidatos compatibles.` }
                : { kind: 'success', text: 'Aun no hay candidatos compatibles con tus criterios.' });
        }
        catch (error) {
            setMensajeBusqueda({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudo actualizar la busqueda.',
            });
        }
        finally {
            setCargandoBusqueda(false);
        }
    }
    async function manejarVoto(candidateProfileId, vote) {
        if (!usuarioSesion) {
            return;
        }
        const token = window.localStorage.getItem('tokenAutenticacion');
        if (!token) {
            return;
        }
        try {
            const response = await solicitudApi(`/api/matches/${candidateProfileId}/vote`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ vote }),
            });
            setMensajeBusqueda({
                kind: 'success',
                text: response.match.estado === 'match'
                    ? 'Match mutuo conseguido. El contacto queda listo para el siguiente paso.'
                    : vote === 'up'
                        ? 'Voto positivo guardado. Esperando respuesta de la otra parte.'
                        : 'Voto negativo guardado.',
            });
            await refrescarBusqueda();
            const refreshedMatches = await solicitudApi('/api/matches/mine', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setCoincidencias(refreshedMatches.matches);
        }
        catch (error) {
            setMensajeBusqueda({
                kind: 'error',
                text: error instanceof Error ? error.message : 'No se pudo guardar el voto.',
            });
        }
    }
      async function manejarSubidaFotoPerfil(event) {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }
        if (!file.type.startsWith('image/')) {
          setStatusMessage({ kind: 'error', text: 'Selecciona un archivo de imagen valido.' });
          event.target.value = '';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          setStatusMessage({ kind: 'error', text: 'La imagen no puede superar 5MB.' });
          event.target.value = '';
          return;
        }
        try {
          const dataUrl = await convertirArchivoADataUrl(file);
          setBorradorPerfil((current) => ({ ...current, fotoPerfil: dataUrl }));
          setStatusMessage({ kind: 'success', text: 'Foto cargada. Guarda el perfil para aplicar el cambio.' });
        }
        catch (error) {
          setStatusMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudo cargar la imagen.' });
        }
        finally {
          event.target.value = '';
        }
      }
      const candidatosFiltrados = candidatosBusqueda.filter((candidate) => {
        if (filtrosBusqueda.rol !== 'todos' && candidate.profile.rol !== filtrosBusqueda.rol) {
          return false;
        }
        const ciudadFiltro = filtrosBusqueda.ciudad.trim().toLowerCase();
        if (ciudadFiltro) {
          const ciudadCandidate = (candidate.profile.ciudad || '').toLowerCase();
          if (!ciudadCandidate.includes(ciudadFiltro)) {
            return false;
          }
        }
        if (filtrosBusqueda.precioMax) {
          const maximo = Number(filtrosBusqueda.precioMax);
          const precioArrendador = typeof candidate.property?.precio === 'number'
            ? candidate.property.precio
            : Number(candidate.property?.precio);
          const precioArrendatario = typeof candidate.profile.datosRol?.rangoPrecioMax === 'number'
            ? candidate.profile.datosRol.rangoPrecioMax
            : Number(candidate.profile.datosRol?.rangoPrecioMax);
          const precioReferencia = Number.isFinite(precioArrendador) ? precioArrendador : precioArrendatario;
          if (!Number.isFinite(precioReferencia) || precioReferencia > maximo) {
            return false;
          }
        }
        return true;
      });
    return (<main className={vistaActiva === 'inicio' ? 'app-shell dashboard-shell dashboard-shell-home' : 'app-shell dashboard-shell'}>
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <p className="eyebrow">Casa Clara</p>
          <strong>Panel privado</strong>
          <span>{usuarioSesion.perfil?.nombre || usuarioSesion.email}</span>
        </div>

        <nav className="dashboard-nav" aria-label="Menu principal">
          {seccionesMenu.map((item) => (<button key={item.id} className={vistaActiva === item.id ? 'tab active' : 'tab'} type="button" onClick={() => setVistaActiva(item.id)}>
              {item.label}
            </button>))}
        </nav>

        <button className="button button-secondary dashboard-logout" type="button" onClick={manejarCerrarSesion}>
          Cerrar sesion
        </button>
      </header>

        {vistaActiva === 'inicio' ? (
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Plataforma de alquiler con filtro humano</p>
          <h1>Pisos, perfiles y contacto solo cuando ambos dan el paso.</h1>
          <p className="hero-text">
            Casa Clara une arrendadores y arrendatarios con un flujo simple: registro, perfil,
            búsqueda compatible y visibilidad de contacto solo tras el match mutuo.
          </p>

          <div className="hero-points">
            <article>
              <strong>Empresa</strong>
              <span>Informacion clara, politica de privacidad y acceso rapido.</span>
            </article>
            <article>
              <strong>Arrendador</strong>
              <span>Gestion de pisos, fotos y estado de disponibilidad.</span>
            </article>
            <article>
              <strong>Arrendatario</strong>
              <span>Curriculum, preferencias y sistema buscar suerte.</span>
            </article>
          </div>
        </div>

        <aside className="hero-panel">
          {usuarioSesion ? (<div className="session-card">
              <span className="badge">Sesion activa</span>
              <div className="session-profile-head">
                <div className="session-avatar" aria-hidden="true">
                  {usuarioSesion.perfil.fotoPerfil
                      ? (<img src={usuarioSesion.perfil.fotoPerfil} alt=""/>)
                      : (<span>{obtenerIniciales(usuarioSesion.perfil.nombre, usuarioSesion.perfil.apellidos)}</span>)}
                </div>
                <div className="session-profile-text">
                  <h2>
                    {usuarioSesion.perfil.nombre} {usuarioSesion.perfil.apellidos}
                  </h2>
                  <p>
                    {etiquetaRol} · {usuarioSesion.ciudad || usuarioSesion.perfil.ciudad || 'Sin ciudad'}
                  </p>
                </div>
              </div>
              <ul className="session-details">
                <li>Email: {usuarioSesion.email}</li>
                <li>Telefono: {usuarioSesion.telefono || usuarioSesion.perfil.telefono || 'No indicado'}</li>
                <li>Perfil publico: {usuarioSesion.perfil.perfilPublico ? 'Si' : 'No'}</li>
              </ul>
              <button className="button button-secondary" type="button" onClick={manejarCerrarSesion}>
                Cerrar sesion
              </button>
            </div>) : (<div className="session-card muted">
              <span className="badge badge-muted">Acceso privado</span>
              <h2>Entra para gestionar tu perfil.</h2>
              <p>
                La cuenta crea un perfil base desde el que luego se podran editar datos personales,
                pisos o curriculum segun el rol.
              </p>
            </div>)}
        </aside>
      </section>
          ) : null}

      {vistaActiva === 'inicio' ? (<section className="content-grid">
        <article className="info-card">
          <p className="section-label">Empresa</p>
          <h2>Quienes somos</h2>
          <p>
            Conectamos vivienda en alquiler con un proceso controlado por roles, perfiles y
            consentimiento mutuo. La idea es reducir ruido y mostrar datos sensibles solo cuando
            ambas partes lo aceptan.
          </p>
        </article>
      </section>) : null}

      {vistaActiva === 'inicio' ? (<article className="info-card home-privacy">
        <p className="section-label">Privacidad</p>
        <h2>Politica resumida</h2>
        <ul className="privacy-list">
          <li>Solo se almacenan los datos necesarios para la cuenta y el perfil.</li>
          <li>El contacto completo se desbloquea cuando ambos usuarios aceptan el match.</li>
          <li>Los perfiles pueden mantener su visibilidad privada hasta que el usuario lo decida.</li>
        </ul>
      </article>) : null}

      <section className="auth-panel">
          {vistaActiva === 'inicio' ? (<div className="dashboard-cta-grid">
              <article className="info-card accent-card dashboard-cta">
                <p className="section-label">Acceso rápido</p>
                <h2>Usa el menú superior para ir a cada función</h2>
                <p>
                  Perfil, búsqueda, matches y gestión de pisos están separados para que el escritorio
                  sea más claro y directo.
                </p>
              </article>

              <article className="info-card accent-card dashboard-cta">
                <p className="section-label">Buscar suerte</p>
                <h2>Un pulgar, una decisión</h2>
                <p>
                  El servidor ya prepara el terreno para comparar candidatos, marcar pulgar arriba o
                  abajo y convertir la coincidencia en una relación visible solo si ambos aceptan.
                </p>
              </article>
            </div>) : null}

          {vistaActiva === 'perfil' && usuarioSesion ? (<form className="auth-form profile-form" onSubmit={manejarEnvioPerfil}>
              <h2>Mi perfil</h2>
              {mensajeEstado ? (<p className={mensajeEstado.kind === 'error' ? 'status status-error' : 'status status-success'}>
                  {mensajeEstado.text}
                </p>) : null}
              <div className="field-grid">
                <label>
                  Nombre
                  <input type="text" value={borradorPerfil.nombre} onChange={(event) => setBorradorPerfil((current) => ({ ...current, nombre: event.target.value }))} required/>
                </label>
                <label>
                  Apellidos
                  <input type="text" value={borradorPerfil.apellidos} onChange={(event) => setBorradorPerfil((current) => ({ ...current, apellidos: event.target.value }))} required/>
                </label>
              </div>

              <div className="field-grid">
                <label>
                  Telefono
                  <input type="tel" value={borradorPerfil.telefono} onChange={(event) => setBorradorPerfil((current) => ({ ...current, telefono: event.target.value }))}/>
                </label>
                <label>
                  Ciudad
                  <input type="text" value={borradorPerfil.ciudad} onChange={(event) => setBorradorPerfil((current) => ({ ...current, ciudad: event.target.value }))}/>
                </label>
              </div>

              <label>
                Descripcion
                <textarea value={borradorPerfil.descripcion} onChange={(event) => setBorradorPerfil((current) => ({ ...current, descripcion: event.target.value }))} rows={3}/>
              </label>

              <div className="field-grid profile-media-grid">
                <div className="photo-upload-field">
                  <span>Foto de perfil</span>
                  <label className="photo-upload-box" htmlFor="foto-perfil-input">
                    {borradorPerfil.fotoPerfil ? (<img className="photo-upload-preview" src={borradorPerfil.fotoPerfil} alt="Vista previa de perfil"/>) : (<span className="photo-upload-placeholder">Pulsa para subir una foto</span>)}
                  </label>
                  <input id="foto-perfil-input" className="photo-upload-input" type="file" accept="image/*" onChange={(event) => void manejarSubidaFotoPerfil(event)}/>
                  {borradorPerfil.fotoPerfil ? (<button className="button button-secondary" type="button" onClick={() => setBorradorPerfil((current) => ({ ...current, fotoPerfil: '' }))}>
                      Quitar foto
                    </button>) : null}
                </div>
                <div className="profile-visibility-block">
                  <label>
                    Visibilidad
                    <select value={borradorPerfil.perfilPublico ? 'publico' : 'privado'} onChange={(event) => setBorradorPerfil((current) => ({
                ...current,
                perfilPublico: event.target.value === 'publico',
            }))}>
                      <option value="publico">Publico</option>
                      <option value="privado">Privado</option>
                    </select>
                  </label>

                  <div className="check-row profile-check-row">
                    <label>
                      <input type="checkbox" checked={borradorPerfil.emailPublico} onChange={(event) => setBorradorPerfil((current) => ({ ...current, emailPublico: event.target.checked }))}/>
                      Mostrar email
                    </label>
                    <label>
                      <input type="checkbox" checked={borradorPerfil.telefonoPublico} onChange={(event) => setBorradorPerfil((current) => ({ ...current, telefonoPublico: event.target.checked }))}/>
                      Mostrar telefono
                    </label>
                  </div>
                </div>
              </div>

              {usuarioSesion.rol === 'arrendador' ? (<div className="role-section">
                  <h3>Perfil de arrendador</h3>
                  <label>
                    Nombre comercial
                    <input type="text" value={borradorPerfil.nombreComercial} onChange={(event) => setBorradorPerfil((current) => ({ ...current, nombreComercial: event.target.value }))}/>
                  </label>
                  <label>
                    Descripcion de empresa
                    <textarea value={borradorPerfil.descripcionEmpresa} onChange={(event) => setBorradorPerfil((current) => ({ ...current, descripcionEmpresa: event.target.value }))} rows={3}/>
                  </label>
                  <label>
                    Web
                    <input type="url" value={borradorPerfil.web} onChange={(event) => setBorradorPerfil((current) => ({ ...current, web: event.target.value }))}/>
                  </label>
                </div>) : (<div className="role-section">
                  <h3>Curriculum de arrendatario</h3>
                  <label>
                    Ultimo piso alquilado
                    <input type="text" value={borradorPerfil.ultimoPisoAlquilado} onChange={(event) => setBorradorPerfil((current) => ({ ...current, ultimoPisoAlquilado: event.target.value }))}/>
                  </label>
                  <label>
                    Avalistas
                    <textarea value={borradorPerfil.avalistas} onChange={(event) => setBorradorPerfil((current) => ({ ...current, avalistas: event.target.value }))} rows={3}/>
                  </label>
                  <div className="field-grid">
                    <label>
                      Precio minimo
                      <input type="number" min="0" step="0.01" value={borradorPerfil.rangoPrecioMin} onChange={(event) => setBorradorPerfil((current) => ({ ...current, rangoPrecioMin: event.target.value }))}/>
                    </label>
                    <label>
                      Precio maximo
                      <input type="number" min="0" step="0.01" value={borradorPerfil.rangoPrecioMax} onChange={(event) => setBorradorPerfil((current) => ({ ...current, rangoPrecioMax: event.target.value }))}/>
                    </label>
                  </div>
                  <label>
                    Ubicacion deseada
                    <input type="text" value={borradorPerfil.ubicacionDeseada} onChange={(event) => setBorradorPerfil((current) => ({ ...current, ubicacionDeseada: event.target.value }))}/>
                  </label>
                  <label>
                    Curriculum
                    <textarea value={borradorPerfil.curriculum} onChange={(event) => setBorradorPerfil((current) => ({ ...current, curriculum: event.target.value }))} rows={3}/>
                  </label>
                  <div className="check-row">
                    <label>
                      <input type="checkbox" checked={borradorPerfil.mascotas} onChange={(event) => setBorradorPerfil((current) => ({ ...current, mascotas: event.target.checked }))}/>
                      Mascotas
                    </label>
                    <label>
                      <input type="checkbox" checked={borradorPerfil.fumador} onChange={(event) => setBorradorPerfil((current) => ({ ...current, fumador: event.target.checked }))}/>
                      Fumador
                    </label>
                  </div>
                </div>)}

              <button className="button" type="submit" disabled={guardandoPerfil}>
                {guardandoPerfil ? 'Guardando...' : 'Guardar perfil'}
              </button>
            </form>) : null}

          {vistaActiva === 'buscar' && usuarioSesion ? (<section className="search-board">
              <div className="search-board-head">
                <div>
                  <p className="section-label">Buscar suerte</p>
                  <h2>Candidatos compatibles</h2>
                </div>
                <form className="search-filters" onSubmit={(event) => {
                event.preventDefault();
                void refrescarBusqueda();
            }}>
                  <select value={filtrosBusqueda.rol} onChange={(event) => setFiltrosBusqueda((current) => ({ ...current, rol: event.target.value }))}>
                    <option value="todos">Todos los roles</option>
                    <option value="arrendador">Arrendadores</option>
                    <option value="arrendatario">Arrendatarios</option>
                  </select>
                  <input type="text" placeholder="Filtrar por ciudad" value={filtrosBusqueda.ciudad} onChange={(event) => setFiltrosBusqueda((current) => ({ ...current, ciudad: event.target.value }))}/>
                  <input type="number" min="0" step="1" placeholder="Precio max" value={filtrosBusqueda.precioMax} onChange={(event) => setFiltrosBusqueda((current) => ({ ...current, precioMax: event.target.value }))}/>
                  <button className="button" type="submit" disabled={cargandoBusqueda}>
                    {cargandoBusqueda ? 'Buscando...' : 'Encontrar'}
                  </button>
                </form>
              </div>

              {mensajeBusqueda ? (<p className={mensajeBusqueda.kind === 'error' ? 'status status-error' : 'status status-success'}>
                  {mensajeBusqueda.text}
                </p>) : null}

              {cargandoBusqueda ? (<div className="house-loader" role="status" aria-live="polite">
                  <span className="house-loader-icon" aria-hidden="true">🏠</span>
                  <span>Buscando coincidencias...</span>
                </div>) : null}

              {!cargandoBusqueda && candidatosFiltrados.length === 0 ? (<p className="empty-state">No hay resultados compatibles con esos filtros.</p>) : null}

              {!cargandoBusqueda && candidatosFiltrados.length > 0 ? (<div className="search-cards">
                  {candidatosFiltrados.map((candidate) => {
                    const matchLabel = candidate.match?.estado === 'match'
                        ? 'Match'
                        : candidate.match?.estado === 'rechazado'
                            ? 'Rechazado'
                            : candidate.match?.estado === 'pendiente'
                                ? 'Pendiente'
                                : 'Sin voto';
                    return (<article className="search-card" key={candidate.profile.profileId}>
                        <div className="search-card-top">
                          <div>
                            <p className="search-role">{candidate.profile.rol === 'arrendador' ? 'Arrendador' : 'Arrendatario'}</p>
                            <h3>
                              {candidate.profile.nombre} {candidate.profile.apellidos}
                            </h3>
                          </div>
                          <span className="pill pill-neutral">{matchLabel}</span>
                        </div>

                        <p className="search-description">
                          {candidate.profile.descripcion || 'Sin descripcion disponible.'}
                        </p>

                        <div className="search-summary">
                          <span>Ciudad: {candidate.profile.ciudad || 'No indicada'}</span>
                          {candidate.profile.rol === 'arrendador' ? (<span>Empresa: {aTexto(candidate.profile.datosRol.nombreComercial, 'Sin nombre comercial')}</span>) : (<span>
                              Rango: {typeof candidate.profile.datosRol.rangoPrecioMin === 'number' ||
                                typeof candidate.profile.datosRol.rangoPrecioMin === 'string'
                                ? String(candidate.profile.datosRol.rangoPrecioMin)
                                : 'Sin minimo'}{' '}
                              -{' '}
                              {typeof candidate.profile.datosRol.rangoPrecioMax === 'number' ||
                                typeof candidate.profile.datosRol.rangoPrecioMax === 'string'
                                ? String(candidate.profile.datosRol.rangoPrecioMax)
                                : 'Sin maximo'} EUR
                            </span>)}
                        </div>

                        {candidate.profile.rol === 'arrendador' && candidate.property ? (<div className="search-property">
                            <strong>Piso compatible</strong>
                            <span>{candidate.property.titulo}</span>
                            <span>
                              {candidate.property.ciudad}
                              {candidate.property.zona ? ` · ${candidate.property.zona}` : ''}
                            </span>
                            <span>{candidate.property.precio} EUR · {candidate.property.tipoAlquiler}</span>
                          </div>) : null}

                        {candidate.profile.rol === 'arrendatario' ? (<div className="search-property">
                            <strong>Curriculum</strong>
                            <span>{aTexto(candidate.profile.datosRol.curriculum, 'Sin curriculum')}</span>
                          </div>) : null}

                        <div className="search-actions">
                          <button className="button button-secondary" type="button" onClick={() => manejarVoto(candidate.profile.profileId, 'down')} disabled={candidate.match?.estado === 'match' || cargandoBusqueda}>
                            Pulgar abajo
                          </button>
                          <button className="button" type="button" onClick={() => manejarVoto(candidate.profile.profileId, 'up')} disabled={candidate.match?.estado === 'match' || cargandoBusqueda}>
                            Pulgar arriba
                          </button>
                        </div>

                        <p className="search-footnote">
                          {candidate.match?.contactoVisible
                            ? 'Match mutuo confirmado. El siguiente paso puede mostrar contacto.'
                            : 'El contacto sigue oculto hasta que ambos acepten.'}
                        </p>
                      </article>);
                })}
                </div>) : null}
            </section>) : null}

          {vistaActiva === 'matches' && usuarioSesion ? (<section className="match-board">
              <div className="match-board-head">
                <div>
                  <p className="section-label">Match</p>
                  <h2>Contacto condicionado</h2>
                </div>
                <button className="button button-secondary" type="button" onClick={() => void refrescarBusqueda()} disabled={cargandoCoincidencias}>
                  {cargandoCoincidencias ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>

              {mensajeCoincidencias ? (<p className={mensajeCoincidencias.kind === 'error' ? 'status status-error' : 'status status-success'}>
                  {mensajeCoincidencias.text}
                </p>) : null}

              {cargandoCoincidencias && coincidencias.length === 0 ? (<p className="empty-state">Comprobando coincidencias confirmadas...</p>) : coincidencias.length === 0 ? (<p className="empty-state">Aun no hay matches confirmados.</p>) : (<div className="match-cards">
                  {coincidencias.map((match) => (<article className="match-card" key={match.id}>
                      <div className="match-card-top">
                        <div>
                          <p className="search-role">{match.estado}</p>
                          <h3>
                            {match.usuarioCoincidencia.nombre} {match.usuarioCoincidencia.apellidos}
                          </h3>
                        </div>
                        <span className={match.contactoVisible ? 'pill pill-on' : 'pill pill-neutral'}>
                          {match.contactoVisible ? 'Contacto visible' : 'Contacto oculto'}
                        </span>
                      </div>

                      <p className="search-description">{match.usuarioCoincidencia.descripcion || 'Sin descripcion disponible.'}</p>

                      <div className="search-summary">
                        <span>Ciudad: {match.usuarioCoincidencia.ciudad || 'No indicada'}</span>
                        {match.property ? (<span>
                            Piso: {match.property.titulo} · {match.property.precio} EUR
                          </span>) : null}
                      </div>

                      {match.contactoVisible ? (<div className="match-contact">
                          <strong>Contacto habilitado</strong>
                          <span>Email: {match.usuarioCoincidencia.email || 'No publicado'}</span>
                          <span>Telefono: {match.usuarioCoincidencia.telefono || 'No publicado'}</span>
                        </div>) : (<p className="search-footnote">El contacto se mantendra oculto hasta el match mutuo.</p>)}
                    </article>))}
                </div>)}
            </section>) : null}

          {vistaActiva === 'gestion' && usuarioSesion?.rol === 'arrendador' ? (<section className="property-board">
              <div className="property-board-head">
                <div>
                  <p className="section-label">Pisos</p>
                  <h2>Gestion de propiedades</h2>
                </div>
                <button className="button button-secondary" type="button" onClick={reiniciarPropiedad}>
                  Nuevo piso
                </button>
              </div>

              {mensajePropiedad ? (<p className={mensajePropiedad.kind === 'error' ? 'status status-error' : 'status status-success'}>
                  {mensajePropiedad.text}
                </p>) : null}

              <form className="auth-form property-form" onSubmit={manejarEnvioPropiedad}>
                <div className="field-grid">
                  <label>
                    Titulo
                    <input type="text" value={borradorPropiedad.titulo} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, titulo: event.target.value }))} required/>
                  </label>
                  <label>
                    Ciudad
                    <input type="text" value={borradorPropiedad.ciudad} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, ciudad: event.target.value }))} required/>
                  </label>
                </div>

                <div className="field-grid">
                  <label>
                    Zona
                    <input type="text" value={borradorPropiedad.zona} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, zona: event.target.value }))}/>
                  </label>
                  <label>
                    Direccion
                    <input type="text" value={borradorPropiedad.direccion} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, direccion: event.target.value }))}/>
                  </label>
                </div>

                <div className="field-grid">
                  <label>
                    Precio
                    <input type="number" min="0" step="0.01" value={borradorPropiedad.precio} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, precio: event.target.value }))} required/>
                  </label>
                  <label>
                    Tipo de alquiler
                    <input type="text" value={borradorPropiedad.tipoAlquiler} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, tipoAlquiler: event.target.value }))} required/>
                  </label>
                </div>

                <div className="field-grid">
                  <label>
                    Habitaciones
                    <input type="number" min="0" step="1" value={borradorPropiedad.habitaciones} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, habitaciones: event.target.value }))}/>
                  </label>
                  <label>
                    Banos
                    <input type="number" min="0" step="1" value={borradorPropiedad.banos} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, banos: event.target.value }))}/>
                  </label>
                </div>

                <label>
                  Metros cuadrados
                  <input type="number" min="0" step="0.01" value={borradorPropiedad.metrosCuadrados} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, metrosCuadrados: event.target.value }))}/>
                </label>

                <label>
                  Descripcion
                  <textarea value={borradorPropiedad.descripcion} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, descripcion: event.target.value }))} rows={3}/>
                </label>

                <label>
                  Fotos, una URL por linea
                  <textarea value={borradorPropiedad.fotosInput} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, fotosInput: event.target.value }))} rows={4}/>
                </label>

                <div className="check-row">
                  <label>
                    <input type="checkbox" checked={borradorPropiedad.amueblado} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, amueblado: event.target.checked }))}/>
                    Amueblado
                  </label>
                  <label>
                    <input type="checkbox" checked={borradorPropiedad.disponible} onChange={(event) => setBorradorPropiedad((current) => ({ ...current, disponible: event.target.checked }))}/>
                    Disponible
                  </label>
                </div>

                <button className="button" type="submit" disabled={guardandoPropiedad}>
                  {guardandoPropiedad
                ? 'Guardando...'
                : idPropiedadEditando
                    ? 'Actualizar piso'
                    : 'Publicar piso'}
                </button>
              </form>

              <div className="property-list">
                <div className="property-list-head">
                  <h3>Mis pisos</h3>
                  <span>{cargandoPropiedades ? 'Cargando...' : `${listaPropiedades.length} activos`}</span>
                </div>

                {listaPropiedades.length === 0 ? (<p className="empty-state">Aun no hay pisos publicados.</p>) : (<div className="property-cards">
                    {listaPropiedades.map((property) => (<article className="property-card" key={property.id}>
                        <div className="property-card-top">
                          <span className={property.disponible ? 'pill pill-on' : 'pill pill-off'}>
                            {property.disponible ? 'Disponible' : 'Reservado'}
                          </span>
                          <strong>{property.precio} EUR</strong>
                        </div>
                        <h3>{property.titulo}</h3>
                        <p>
                          {property.ciudad}
                          {property.zona ? ` · ${property.zona}` : ''}
                        </p>
                        <p className="property-snippet">{property.descripcion || 'Sin descripcion'}</p>
                        <div className="property-meta">
                          <span>{property.tipo_alquiler}</span>
                          <span>{property.habitaciones ?? 0} hab.</span>
                          <span>{property.banos ?? 0} banos</span>
                        </div>
                        <div className="property-actions">
                          <button className="button button-secondary" type="button" onClick={() => manejarEdicionPropiedad(property)}>
                            Editar
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => manejarEliminarPropiedad(property.id)}>
                            Borrar
                          </button>
                        </div>
                        {property.fotos.length > 0 ? (<div className="property-photos">
                            {property.fotos.map((foto) => (<a key={foto.id} href={foto.url} target="_blank" rel="noreferrer">
                                Foto {foto.orden + 1}
                              </a>))}
                          </div>) : null}
                      </article>))}
                  </div>)}
              </div>
            </section>) : vistaActiva === 'curriculum' && usuarioSesion?.rol === 'arrendatario' ? (<section className="cv-board">
              <div>
                <p className="section-label">Curriculum</p>
                <h2>Resumen del arrendatario</h2>
                <p className="cv-intro">
                  Este bloque resume la informacion que el arrendatario comparte para el futuro
                  filtro de busqueda y para el match mutuo.
                </p>
              </div>

              <div className="cv-grid">
                <article className="cv-card">
                  <strong>Ultimo piso</strong>
                  <span>{usuarioSesion?.perfil?.datosRol && typeof usuarioSesion.perfil.datosRol.ultimoPisoAlquilado === 'string' && usuarioSesion.perfil.datosRol.ultimoPisoAlquilado ? usuarioSesion.perfil.datosRol.ultimoPisoAlquilado : 'No indicado'}</span>
                </article>
                <article className="cv-card">
                  <strong>Rango de precio</strong>
                  <span>
                    {usuarioSesion?.perfil?.datosRol && (typeof usuarioSesion.perfil.datosRol.rangoPrecioMin === 'number' ||
                typeof usuarioSesion.perfil.datosRol.rangoPrecioMin === 'string')
                ? String(usuarioSesion.perfil.datosRol.rangoPrecioMin)
                : 'Sin minimo'}{' '}
                    -{' '}
                    {usuarioSesion?.perfil?.datosRol && (typeof usuarioSesion.perfil.datosRol.rangoPrecioMax === 'number' ||
                typeof usuarioSesion.perfil.datosRol.rangoPrecioMax === 'string')
                ? String(usuarioSesion.perfil.datosRol.rangoPrecioMax)
                : 'Sin maximo'}{' '}
                    EUR
                  </span>
                </article>
                <article className="cv-card">
                  <strong>Ubicacion deseada</strong>
                  <span>
                    {usuarioSesion?.perfil?.datosRol && typeof usuarioSesion.perfil.datosRol.ubicacionDeseada === 'string' &&
                usuarioSesion.perfil.datosRol.ubicacionDeseada
                ? usuarioSesion.perfil.datosRol.ubicacionDeseada
                : 'No indicada'}
                  </span>
                </article>
                <article className="cv-card">
                  <strong>Preferencias</strong>
                  <span>
                    {usuarioSesion?.perfil?.datosRol ? (usuarioSesion.perfil.datosRol.mascotas ? 'Acepta mascotas' : 'No indica mascotas') : 'No indicado'} ·{' '}
                    {usuarioSesion?.perfil?.datosRol ? (usuarioSesion.perfil.datosRol.fumador ? 'Fumador' : 'No fumador') : 'No indicado'}
                  </span>
                </article>
                <article className="cv-card cv-card-wide">
                  <strong>Curriculum</strong>
                  <span>
                    {usuarioSesion?.perfil?.datosRol && typeof usuarioSesion.perfil.datosRol.curriculum === 'string' &&
                usuarioSesion.perfil.datosRol.curriculum
                ? usuarioSesion.perfil.datosRol.curriculum
                : 'Sin curriculum redactado todavia.'}
                  </span>
                </article>
              </div>
            </section>) : null}
          </section>
    </main>);
}
export default App;
