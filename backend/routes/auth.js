const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDatabase } = require('../database');

const JWT_SECRET = 'secret-key-demo';

router.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password son requeridos' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  try {
    db.run('INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email || '']);
    saveDatabase();

    const result = db.exec('SELECT last_insert_rowid() as id');
    const userId = result[0]?.values[0]?.[0] || 0;

    res.json({ success: true, userId });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y password son requeridos' });
  }

  const db = getDb();

  if (!db) {
    return res.status(500).json({ error: 'Base de datos no inicializada' });
  }

  // ⚠️ VULNERABLE: SQL Injection - concatenando input del usuario directamente en la query
  // El input del usuario se concatena sin sanitizar ni usar parámetros
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  console.log('Query ejecutada:', query);

  let user = null;
  try {
    const result = db.exec(query);
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      user = {};
      columns.forEach((col, i) => {
        user[col] = row[i];
      });
    }
  } catch (err) {
    console.error('Error en query:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.cookie('token', token, { httpOnly: true });
  res.json({
    success: true,
    user: { id: user.id, username: user.username },
    token
  });
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/verify', (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.status(401).json({ authenticated: false });
  }
});

module.exports = router;