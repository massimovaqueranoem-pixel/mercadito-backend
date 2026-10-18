require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // Habilitar CORS para permitir llamadas desde Vercel o frontend

const conexion = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: { rejectUnauthorized: false }, // Permite la conexión cifrada requerida por Aiven
  waitForConnections: true,
  connectionLimit: 10
});

// Comprobar la conexión al pool
conexion.getConnection((err, connection) => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err.message);
    return;
  }
  console.log('Conectado exitosamente a la base de datos MySQL en la nube.');
  connection.release();
});

// ==========================================
// CRUD ESTUDIANTES
// ==========================================

app.get('/estudiantes', (req, res) => {
  conexion.query('SELECT * FROM estudiantes', (err, resultados) => {
    if (err) {
      console.error('Error al obtener estudiantes:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(resultados);
  });
});

app.post('/estudiantes', (req, res) => {
  const { nombre, grupo } = req.body;
  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio.' });
  }

  conexion.query(
    'INSERT INTO estudiantes (nombre, grupo) VALUES (?, ?)',
    [nombre, grupo || null],
    (err, resultado) => {
      if (err) {
        console.error('Error al insertar estudiante:', err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        mensaje: 'Estudiante agregado correctamente',
        id: resultado.insertId,
        nombre,
        grupo
      });
    }
  );
});

app.put('/estudiantes/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, grupo } = req.body;
  conexion.query(
    'UPDATE estudiantes SET nombre=?, grupo=? WHERE id=?',
    [nombre, grupo, id],
    (err) => {
      if (err) {
        console.error('Error al actualizar estudiante:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ mensaje: `Estudiante con ID ${id} actualizado` });
    }
  );
});

app.delete('/estudiantes/:id', (req, res) => {
  const id = req.params.id;
  conexion.query('DELETE FROM estudiantes WHERE id=?', [id], (err) => {
    if (err) {
      console.error('Error al eliminar estudiante:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ mensaje: `Estudiante con ID ${id} eliminado` });
  });
});


// ==========================================
// CRUD PRODUCTOS
// ==========================================

app.get('/productos', (req, res) => {
  conexion.query('SELECT * FROM productos', (err, resultados) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(resultados);
  });
});

app.post('/productos', (req, res) => {
  const { nombre, precio } = req.body;
  if (!nombre || precio === undefined) {
    return res.status(400).json({ error: 'Los campos "nombre" y "precio" son obligatorios.' });
  }

  conexion.query(
    'INSERT INTO productos (nombre, precio) VALUES (?, ?)',
    [nombre, precio],
    (err, resultado) => {
      if (err) {
        console.error('Error al agregar producto:', err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        mensaje: 'Producto agregado correctamente',
        id: resultado.insertId,
        nombre,
        precio
      });
    }
  );
});

app.put('/productos/:id', (req, res) => {
  const id = req.params.id;
  const { nombre, precio } = req.body;
  conexion.query(
    'UPDATE productos SET nombre=?, precio=? WHERE id=?',
    [nombre, precio, id],
    (err) => {
      if (err) {
        console.error('Error al actualizar producto:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ mensaje: `Producto con ID ${id} actualizado` });
    }
  );
});

app.delete('/productos/:id', (req, res) => {
  const id = req.params.id;
  conexion.query('DELETE FROM productos WHERE id=?', [id], (err) => {
    if (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ mensaje: `Producto con ID ${id} eliminado` });
  });
});


// ==========================================
// CRUD VENTAS (Con JOIN múltiple)
// ==========================================

app.get('/ventas', (req, res) => {
  const sql = `
    SELECT v.id, e.nombre AS estudiante, p.nombre AS producto,
    v.cantidad, v.fecha, p.precio, (v.cantidad * p.precio) AS total,
    v.estudiante_id, v.producto_id
    FROM ventas v
    INNER JOIN estudiantes e ON v.estudiante_id = e.id
    INNER JOIN productos p ON v.producto_id = p.id
  `;
  conexion.query(sql, (err, resultados) => {
    if (err) {
      console.error('Error al obtener ventas:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(resultados);
  });
});

app.post('/ventas', (req, res) => {
  const { estudiante_id, producto_id, cantidad, fecha } = req.body;
  conexion.query(
    'INSERT INTO ventas (estudiante_id, producto_id, cantidad, fecha) VALUES (?, ?, ?, ?)',
    [estudiante_id, producto_id, cantidad, fecha],
    (err, resultado) => {
      if (err) {
        console.error('Error al registrar venta:', err);
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ mensaje: 'Venta registrada correctamente', id: resultado.insertId });
    }
  );
});

app.put('/ventas/:id', (req, res) => {
  const id = req.params.id;
  const { estudiante_id, producto_id, cantidad, fecha } = req.body;
  conexion.query(
    'UPDATE ventas SET estudiante_id=?, producto_id=?, cantidad=?, fecha=? WHERE id=?',
    [estudiante_id, producto_id, cantidad, fecha, id],
    (err) => {
      if (err) {
        console.error('Error al actualizar venta:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ mensaje: `Venta con ID ${id} actualizada` });
    }
  );
});

app.delete('/ventas/:id', (req, res) => {
  const id = req.params.id;
  conexion.query('DELETE FROM ventas WHERE id=?', [id], (err) => {
    if (err) {
      console.error('Error al eliminar venta:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json({ mensaje: `Venta con ID ${id} eliminada` });
  });
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});