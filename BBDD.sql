CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('arrendador', 'arrendatario')),
    telefono VARCHAR(20),
    ciudad VARCHAR(120),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    ultima_conexion TIMESTAMP
);

CREATE TABLE perfiles (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(120) NOT NULL,
    apellidos VARCHAR(180) NOT NULL,
    foto_perfil TEXT,
    descripcion TEXT,
    telefono VARCHAR(20),
    email_publico BOOLEAN NOT NULL DEFAULT FALSE,
    telefono_publico BOOLEAN NOT NULL DEFAULT FALSE,
    ciudad VARCHAR(120),
    perfil_publico BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE perfiles_arrendador (
    perfil_id INT PRIMARY KEY REFERENCES perfiles(id) ON DELETE CASCADE,
    nombre_comercial VARCHAR(160),
    descripcion_empresa TEXT,
    web TEXT,
    ver_email BOOLEAN NOT NULL DEFAULT FALSE,
    ver_telefono BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE perfiles_arrendatario (
    perfil_id INT PRIMARY KEY REFERENCES perfiles(id) ON DELETE CASCADE,
    ultimo_piso_alquilado VARCHAR(180),
    avalistas TEXT,
    rango_precio_min NUMERIC(12,2),
    rango_precio_max NUMERIC(12,2),
    ubicacion_deseada VARCHAR(180),
    curriculum TEXT,
    mascotas BOOLEAN,
    fumador BOOLEAN,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (
        rango_precio_min IS NULL
        OR rango_precio_max IS NULL
        OR rango_precio_min <= rango_precio_max
    )
);

CREATE TABLE propiedades (
    id SERIAL PRIMARY KEY,
    arrendador_perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    ciudad VARCHAR(120) NOT NULL,
    zona VARCHAR(120),
    direccion VARCHAR(255),
    precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
    habitaciones INT CHECK (habitaciones IS NULL OR habitaciones >= 0),
    banos INT CHECK (banos IS NULL OR banos >= 0),
    metros_cuadrados NUMERIC(10,2) CHECK (metros_cuadrados IS NULL OR metros_cuadrados >= 0),
    tipo_alquiler VARCHAR(50) NOT NULL,
    amueblado BOOLEAN NOT NULL DEFAULT FALSE,
    disponible BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE propiedad_fotos (
    id SERIAL PRIMARY KEY,
    propiedad_id INT NOT NULL REFERENCES propiedades(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    UNIQUE (propiedad_id, orden)
);

CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    arrendador_perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    arrendatario_perfil_id INT NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    arrendador_voto VARCHAR(10) CHECK (arrendador_voto IN ('up', 'down')),
    arrendatario_voto VARCHAR(10) CHECK (arrendatario_voto IN ('up', 'down')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'match', 'rechazado')),
    contacto_visible BOOLEAN NOT NULL DEFAULT FALSE,
    arrendador_voto_at TIMESTAMP,
    arrendatario_voto_at TIMESTAMP,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (arrendador_perfil_id, arrendatario_perfil_id),
    CHECK (arrendador_perfil_id <> arrendatario_perfil_id)
);

CREATE INDEX idx_usuarios_email ON usuarios (email);
CREATE INDEX idx_perfiles_usuario ON perfiles (usuario_id);
CREATE INDEX idx_propiedades_busqueda ON propiedades (ciudad, disponible, precio);
CREATE INDEX idx_propiedad_fotos_propiedad ON propiedad_fotos (propiedad_id, orden);
CREATE INDEX idx_matches_estado ON matches (estado, contacto_visible);
