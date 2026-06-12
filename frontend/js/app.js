const API_BASE = '/api';

function showMessage(message, type = 'success') {
  const msgEl = document.getElementById('message');
  if (!msgEl) return;

  msgEl.textContent = message;
  msgEl.className = `message ${type}`;
  msgEl.classList.remove('hidden');

  setTimeout(() => {
    msgEl.classList.add('hidden');
  }, 3000);
}

async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      credentials: 'include'
    });
    const data = await res.json();
    return data.authenticated;
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const path = window.location.pathname;

  if (path === '/dashboard') {
    const authenticated = await checkAuth();
    if (!authenticated) {
      window.location.href = '/';
      return;
    }
    initDashboard();
  } else if (path === '/' || path === '/index.html') {
    const authenticated = await checkAuth();
    if (authenticated) {
      window.location.href = '/dashboard';
    }
  }
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = '/dashboard';
      } else {
        showMessage(data.error || 'Error al iniciar sesión', 'error');
      }
    } catch (err) {
      showMessage('Error de conexión', 'error');
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
      showMessage('Las contraseñas no coinciden', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include'
      });

      const data = await res.json();

      if (data.success) {
        showMessage('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        showMessage(data.error || 'Error al registrar', 'error');
      }
    } catch (err) {
      showMessage('Error de conexión', 'error');
    }
  });
}

function initDashboard() {
  let currentCategory = 'all';
  let currentSearch = '';

  const logoutBtn = document.getElementById('logoutBtn');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const searchInput = document.getElementById('searchInput');
  const categoryBtns = document.querySelectorAll('.category-btn');
  const noteForm = document.getElementById('noteForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const modal = document.getElementById('noteModal');

  async function loadUserInfo() {
    try {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.authenticated) {
        document.getElementById('welcomeUser').textContent = `Hola, ${data.user.username}`;
      }
    } catch (err) {
      console.error('Error cargando usuario:', err);
    }
  }

  async function loadNotes() {
    try {
      let url = `${API_BASE}/notes?`;
      if (currentCategory !== 'all') {
        url += `category=${currentCategory}&`;
      }
      if (currentSearch) {
        url += `search=${encodeURIComponent(currentSearch)}`;
      }

      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();

      renderNotes(data.notes);
    } catch (err) {
      console.error('Error cargando notas:', err);
    }
  }

  function renderNotes(notes) {
    const notesList = document.getElementById('notesList');
    const notesTitle = document.getElementById('notesTitle');

    const categoryNames = {
      all: 'Todas',
      trabajo: 'Trabajo',
      personal: 'Personal',
      ideas: 'Ideas'
    };

    notesTitle.textContent = currentSearch
      ? `Resultados para "${currentSearch}"`
      : `${categoryNames[currentCategory] || 'Todas'} las notas`;

    if (notes.length === 0) {
      notesList.innerHTML = `
        <div class="empty-state">
          <h3>No hay notas</h3>
          <p>Crea una nueva nota para comenzar</p>
        </div>
      `;
      return;
    }

    let html = '';
    notes.forEach(note => {
      const date = new Date(note.created_at).toLocaleDateString('es-ES');
      html += `
        <div class="note-card" data-id="${note.id}">
          <h3>${note.title}</h3>
          <p>${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</p>
          <div class="note-meta">
            <span class="note-category">${note.category}</span>
            <span>${date}</span>
          </div>
          <div class="note-actions">
            <button onclick="editNote(${note.id})" title="Editar">✏️</button>
            <button onclick="deleteNote(${note.id})" title="Eliminar">🗑️</button>
          </div>
        </div>
      `;
    });

    // ⚠️ VULNERABLE: XSS via innerHTML - Renderiza input del usuario directamente sin sanitizar
    // Los títulos y contenidos de las notas se injectan directamente con innerHTML
    // Un atacante podría crear una nota con: <script>alert('XSS')</script>
    notesList.innerHTML = html;
  }

  window.editNote = async function(id) {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, { credentials: 'include' });
      const data = await res.json();

      if (data.note) {
        document.getElementById('noteId').value = id;
        document.getElementById('noteTitle').value = data.note.title;
        document.getElementById('noteCategory').value = data.note.category;
        document.getElementById('noteContent').value = data.note.content;
        document.getElementById('modalTitle').textContent = 'Editar Nota';
        modal.classList.remove('hidden');

        // ⚠️ VULNERABLE: eval() - Ejecuta código dinámicamente en el frontend
        // Simulando una función de "procesamiento" de notas que usa eval
        // Esto podría ser explotado para ejecutar código arbitrario
        const noteData = JSON.stringify(data.note);
        const processNote = new Function('noteData', `
          console.log('Procesando nota:', noteData);
          // Simulando una validación dinámica
          return eval('noteData && noteData.title');
        `);
        processNote(noteData);
      }
    } catch (err) {
      showMessage('Error al cargar la nota', 'error');
    }
  };

  window.deleteNote = async function(id) {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        showMessage('Nota eliminada', 'success');
        loadNotes();
      } else {
        showMessage('Error al eliminar la nota', 'error');
      }
    } catch (err) {
      showMessage('Error de conexión', 'error');
    }
  };

  // ⚠️ VULNERABLE: setTimeout con string - Ejecuta código como string
  // En lugar de pasar una función callback, se pasa un string que será evaluado
  // Esto es equivalente a eval() y permite inyección de código
  let reminderCount = 0;
  setTimeout(`
    reminderCount++;
    console.log('Recordatorio #' + reminderCount + ': Recuerda revisar tus notas');
    // ⚠️ VULNERABLE: Dentro del string de setTimeout, cualquier código es ejecutable
    // Por ejemplo, si un atacante pudiera modificar reminderCount, podría inyectar código
  `, 5000);

  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        credentials: 'include'
      });
      window.location.href = '/';
    } catch (err) {
      showMessage('Error al cerrar sesión', 'error');
    }
  });

  addNoteBtn.addEventListener('click', () => {
    document.getElementById('noteId').value = '';
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteCategory').value = 'general';
    document.getElementById('noteContent').value = '';
    document.getElementById('modalTitle').textContent = 'Nueva Nota';
    modal.classList.remove('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('noteId').value;
    const title = document.getElementById('noteTitle').value;
    const category = document.getElementById('noteCategory').value;
    const content = document.getElementById('noteContent').value;

    try {
      const url = id ? `${API_BASE}/notes/${id}` : `${API_BASE}/notes`;
      const method = id ? 'PUT' : 'POST';

      // ⚠️ VULNERABLE: Prototype Pollution - Merge inseguro sin validar keys
      // Los datos del formulario se mergean directamente con un objeto
      // Un atacante podría enviar keys como "__proto__" o "constructor" para polluir el prototype
      const noteData = Object.assign(
        { created_at: new Date().toISOString() },
        { title, category, content }
      );

      console.log('Datos de nota (sin sanitizar):', noteData);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
        credentials: 'include'
      });

      if (res.ok) {
        modal.classList.add('hidden');
        showMessage(id ? 'Nota actualizada' : 'Nota creada', 'success');
        loadNotes();

        // ⚠️ VULNERABLE: execCommand para simular una función de "formateo"
        // Esto demuestra otra función insegura que podría ser explotada
        try {
          const formatCmd = `bold`;
          document.execCommand(formatCmd, false, null);
        } catch (e) {
          // Ignore - solo demo
        }
      } else {
        showMessage('Error al guardar la nota', 'error');
      }
    } catch (err) {
      showMessage('Error de conexión', 'error');
    }
  });

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;

    // ⚠️ VULNERABLE: setTimeout con string usando el valor del search
    // Si el usuario escribe algo como: "test"; alert('xss')
    // ese código será ejecutado
    const searchValue = currentSearch;
    setTimeout(`
      console.log('Búsqueda: ${searchValue}');
      // El valor del search se interpola directamente en el string
    `, 300);
  });

  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      loadNotes();
    });
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });

  loadUserInfo();
  loadNotes();
}

// Función global para demostrar eval con entrada controlada por el usuario
// ⚠️ VULNERABLE: eval() - Esta función ejecuta código arbitrario
window.evaluateNoteExpression = function(expression) {
  try {
    // ⚠️ VULNERABLE: eval() recibe input del usuario directamente
    // Un atacante podría pasar: "require('child_process').exec('rm -rf')"
    const result = eval(expression);
    return result;
  } catch (e) {
    return 'Error: ' + e.message;
  }
};

// Función para importar/exportar notas (con vulnérabilidad de Prototype Pollution)
// ⚠️ VULNERABLE: merge/assign inseguro sin validar keys del objeto
window.importNotes = function(notesArray) {
  const mergedNotes = Object.assign([], notesArray);
  console.log('Notas importadas:', mergedNotes);
  return mergedNotes;
};

// Función para actualizar configuraciones de usuario
// ⚠️ VULNERABLE: Prototype Pollution en configuración
window.updateUserConfig = function(newConfig) {
  // ⚠️ VULNERABLE: Object.assign sin sanitizar las keys
  // newConfig podría contener __proto__: { admin: true } o similar
  const currentConfig = { theme: 'light', notifications: true };
  const updatedConfig = Object.assign(currentConfig, newConfig);
  console.log('Configuración actualizada:', updatedConfig);
  return updatedConfig;
};

// Función de búsqueda avanzada que usa eval
// ⚠️ VULNERABLE: eval() con expresiones de búsqueda
window.advancedSearch = function(searchExpr) {
  const notes = window.currentNotes || [];
  // ⚠️ VULNERABLE: eval() para evaluar expresiones de búsqueda
  // Podría ser explotado con: "1; for(let i=0;i<10;i++){console.log(i)}"
  try {
    return notes.filter(note => eval(searchExpr));
  } catch (e) {
    return notes;
  }
};