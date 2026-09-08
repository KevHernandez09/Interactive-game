const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const cardsRoutes = require('./src/routes/cardsRoutes');
const { initSockets } = require('./src/sockets/gameSocket');

const app = express();
const server = http.createServer(app);

// Enable CORS allowing FRONTEND_URL or everything
const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL, 'http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:3000'] : '*';

const io = new Server(server, {
  cors: { origin: allowedOrigins }
});

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL;

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();

app.use(cors());
app.use(express.json());

app.use('/api', cardsRoutes);

app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// If FRONTEND_URL is set (Render), use it. Otherwise, use local IP (local dev).
const baseFrontendUrl = FRONTEND_URL || `http://${localIp}:${PORT}`;

initSockets(io, baseFrontendUrl);

server.listen(PORT, () => {
  console.log(`
  ═══════════════════════════════════════════════════════════
   🔥 PURO VICIO — Servidor Backend Socket.io Activo 🔥
   
   📍 Puerto local: ${PORT}
   📍 Frontend URL base para QR: ${baseFrontendUrl}
   
   ¡Listo para recibir conexiones en tiempo real!
  ═══════════════════════════════════════════════════════════
  `);
});
