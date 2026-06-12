const express = require('express');
const router = express.Router();
const { getDb, saveDatabase } = require('../database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'secret-key-demo';

const authenticate = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

function resultToObjects(result) {
  if (!result || result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

router.get('/', authenticate, (req, res) => {
  const { search, category } = req.query;
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  let query = 'SELECT * FROM notes WHERE user_id = ?';
  const params = [req.user.id];

  if (search) {
    query += ` AND (title LIKE ? OR content LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && category !== 'all') {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ' ORDER BY created_at DESC';

  const result = db.exec(query, params);
  const notes = resultToObjects(result);

  res.json({ notes });
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  const result = db.exec('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const notes = resultToObjects(result);

  if (notes.length === 0) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  res.json({ note: notes[0] });
});

router.post('/', authenticate, (req, res) => {
  const { title, content, category } = req.body;
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  if (!title) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  db.run('INSERT INTO notes (user_id, title, content, category) VALUES (?, ?, ?, ?)',
    [req.user.id, title, content || '', category || 'general']);
  saveDatabase();

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0]?.values[0]?.[0] || 0;

  res.json({ success: true, id });
});

router.put('/:id', authenticate, (req, res) => {
  const { title, content, category } = req.body;
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  const checkResult = db.exec('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const existingNotes = resultToObjects(checkResult);

  if (existingNotes.length === 0) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  const existingNote = existingNotes[0];
  const updatedTitle = title || existingNote.title;
  const updatedContent = content !== undefined ? content : existingNote.content;
  const updatedCategory = category || existingNote.category;

  db.run('UPDATE notes SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [updatedTitle, updatedContent, updatedCategory, req.params.id, req.user.id]);
  saveDatabase();

  res.json({ success: true });
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  const checkResult = db.exec('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const existingNotes = resultToObjects(checkResult);

  if (existingNotes.length === 0) {
    return res.status(404).json({ error: 'Nota no encontrada' });
  }

  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  saveDatabase();

  res.json({ success: true });
});

module.exports = router;