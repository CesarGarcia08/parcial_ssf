const API_BASE = '/api';

// ✅ FIXED: Helper para sanitizar keys de objetos y prevenir Prototype Pollution
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

  // ✅ FIXED: XSS — usar createElement + textContent en lugar de innerHTML con datos del usuario
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

    notesList.innerHTML = '';

    if (notes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const h3 = document.createElement('h3');
      h3.textContent = 'No hay notas';
      const p = document.createElement('p');
      p.textContent = 'Crea una nueva nota para comenzar';
      empty.appendChild(h3);
      empty.appendChild(p);
      notesList.appendChild(empty);
      return;
    }

    notes.forEach(note => {
      const date = new Date(note.created_at).toLocaleDateString('es-ES');

      const card = document.createElement('div');
      card.className = 'note-card';
      card.dataset.id = note.id;

      const h3 = document.createElement('h3');
      h3.textContent = note.title; // ✅ textContent: no interpreta HTML

      const preview = note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');
      const p = document.createElement('p');
      p.textContent = preview; // ✅ textContent: no interpreta HTML

      const meta = document.createElement('div');
      meta.className = 'note-meta';

      const cat = document.createElement('span');
      cat.className = 'note-category';
      cat.textContent = note.category;

      const dateSpan = document.createElement('span');
      dateSpan.textContent = date;

      meta.appendChild(cat);
      meta.appendChild(dateSpan);

      const actions = document.createElement('div');
      actions.className = 'note-actions';

      const editBtn = document.createElement('button');
      editBtn.title = 'Editar';
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => editNote(note.id));

      const delBtn = document.createElement('button');
      delBtn.title = 'Eliminar';
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', () => deleteNote(note.id));

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      card.appendChild(h3);
      card.appendChild(p);
      card.appendChild(meta);
      card.appendChild(actions);

      notesList.appendChild(card);
    });
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

        // ✅ FIXED: eval() eliminado — logging directo sin ejecución dinámica de código
        console.log('Procesando nota ID:', id, '| Título:', data.note.title);
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

  // ✅ FIXED: setTimeout con función flecha en lugar de string
  let reminderCount = 0;
  setTimeout(() => {
    reminderCount++;
    console.log('Recordatorio #' + reminderCount + ': Recuerda revisar tus notas');
  }, 5000);

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

      // ✅ FIXED: Prototype Pollution — sanitizar keys antes del merge
      const noteData = Object.assign(
        { created_at: new Date().toISOString() },
        sanitizeObject({ title, category, content })
      );

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
      } else {
        showMessage('Error al guardar la nota', 'error');
      }
    } catch (err) {
      showMessage('Error de conexión', 'error');
    }
  });

  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;

    // ✅ FIXED: setTimeout con función flecha, sin interpolación de input del usuario en string
    const searchValue = currentSearch;
    setTimeout(() => {
      console.log('Búsqueda:', searchValue);
    }, 300);
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

// ✅ FIXED: eval() eliminado — validación estricta de expresión matemática
window.evaluateNoteExpression = function(expression) {
  if (!/^[\d\s+\-*/().]+$/.test(expression)) {
    return 'Expresión no permitida: solo se aceptan operaciones matemáticas básicas';
  }
  try {
    // Operación segura: solo permite dígitos y operadores aritméticos
    const tokens = expression.match(/[\d.]+|[+\-*/()]/g) || [];
    return tokens.join('') !== expression.replace(/\s/g, '') ? 'Inválido' : Function('"use strict"; return (' + expression + ')')();
  } catch (e) {
    return 'Error: ' + e.message;
  }
};

// ✅ FIXED: Prototype Pollution eliminada — copia segura sin Object.assign sobre input externo
window.importNotes = function(notesArray) {
  if (!Array.isArray(notesArray)) return [];
  const mergedNotes = notesArray.map(note => sanitizeObject(note));
  console.log('Notas importadas:', mergedNotes);
  return mergedNotes;
};

// ✅ FIXED: Prototype Pollution eliminada — sanitizar newConfig antes de merge
window.updateUserConfig = function(newConfig) {
  const currentConfig = { theme: 'light', notifications: true };
  const safeConfig = sanitizeObject(newConfig);
  const updatedConfig = Object.assign(currentConfig, safeConfig);
  console.log('Configuración actualizada:', updatedConfig);
  return updatedConfig;
};

// ✅ FIXED: eval() eliminado — búsqueda segura con includes()
window.advancedSearch = function(searchTerm) {
  const notes = window.currentNotes || [];
  const term = String(searchTerm).toLowerCase();
  return notes.filter(note =>
    note.title.toLowerCase().includes(term) ||
    (note.content && note.content.toLowerCase().includes(term))
  );
};
