# Mis Notas - Aplicación de Notas Personales

Aplicación web completa con backend en Node.js + Express y frontend vanilla HTML/CSS/JS.

**IMPORTANTE**: Esta aplicación contiene vulnerabilidades de seguridad INTENCIONALES con fines educativos. NO usar en producción.

## Estructura del Proyecto

```
├── backend/
│   ├── server.js          # Servidor Express principal
│   ├── database.js        # Configuración de SQLite
│   └── routes/
│       ├── auth.js        # Rutas de autenticación
│       └── notes.js       # Rutas de notas
├── frontend/
│   ├── index.html         # Página de login
│   ├── register.html      # Página de registro
│   ├── dashboard.html     # Panel principal de notas
│   ├── css/
│   │   └── style.css      # Estilos
│   └── js/
│       └── app.js         # Lógica del frontend
├── package.json
├── eslint.config.js       # Configuración de ESLint con plugin de seguridad
└── README.md
```

## Requisitos

- Node.js v18+ (o v22.16.0 como en el sistema actual)
- npm

## Instalación

```bash
npm install
```

## Ejecutar la Aplicación

```bash
npm start
```

La aplicación estará disponible en: http://localhost:3000

## Vulnerabilidades de Seguridad (Intencionales)

Esta aplicación incluye las siguientes vulnerabilidades para fines educativos:

### 1. SQL Injection (backend/auth.js)
- **Ubicación**: `backend/routes/auth.js:30`
- **Tipo**: SQL Injection en el login
- **Descripción**: El input del usuario se concatena directamente en la query SQL sin usar parámetros
- **Impacto**: Permite bypass de autenticación y acceso no autorizado

### 2. XSS via innerHTML (frontend/js/app.js)
- **Ubicación**: `frontend/js/app.js:140`
- **Tipo**: Cross-Site Scripting
- **Descripción**: Los títulos y contenidos de notas se renderizan con innerHTML sin sanitizar
- **Impacto**: Permite ejecución de scripts maliciosos

### 3. eval() (frontend/js/app.js)
- **Ubicación**: `frontend/js/app.js:147, 252, 275, 286`
- **Tipo**: Code Injection
- **Descripción**: Se usa eval() para procesar datos de notas y expresiones de búsqueda
- **Impacto**: Permite ejecución de código arbitrario

### 4. setTimeout con string (frontend/js/app.js)
- **Ubicación**: `frontend/js/app.js:177, 238`
- **Tipo**: Code Injection
- **Descripción**: setTimeout recibe strings que son evaluados como código
- **Impacto**: Permite ejecución de código arbitrario

### 5. Prototype Pollution (frontend/js/app.js)
- **Ubicación**: `frontend/js/app.js:195, 262`
- **Tipo**: Prototype Pollution
- **Descripción**: Object.assign() se usa sin validar las keys del objeto
- **Impacto**: Permite modificar el prototype de Object

## ESLint - Detección de Vulnerabilidades

La configuración de ESLint incluye `eslint-plugin-security` para detectar patrones inseguros.

### Instalar y ejecutar:

```bash
npm install
npm run lint
```

### Reglas de seguridad habilitadas:
- `security/detect-eval-with-expression`
- `security/detect-object-injection`
- `security/detect-possible-timing-attacks`
- `security/detect-pseudoRandomBytes`

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/logout` - Cerrar sesión
- `GET /api/auth/verify` - Verificar autenticación

### Notas
- `GET /api/notes` - Listar notas (soporta ?search=&category=)
- `GET /api/notes/:id` - Obtener nota específica
- `POST /api/notes` - Crear nota
- `PUT /api/notes/:id` - Actualizar nota
- `DELETE /api/notes/:id` - Eliminar nota

## Base de Datos

SQLite (archivo `backend/notas.db`) con tablas:
- `users` - Usuarios registrados
- `notes` - Notas de los usuarios

## Autor

Aplicación educativa con vulnerabilidades intencionales.