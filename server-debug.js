const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware básico
app.use(express.json());
app.use(cors());

// Rutas básicas (que funcionan)
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.get('/api/info', (req, res) => {
  res.json({ name: 'API Debug', version: '1.0.0' });
});

// Rutas con parámetros (posible problema)
app.get('/api/test/:param', (req, res) => {
  res.json({ param: req.params.param });
});

// Solo manejo de errores básico
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: error.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
});

module.exports = app;
