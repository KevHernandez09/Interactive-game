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
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

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

initSockets(io, localIp, PORT);

server.listen(PORT, () => {
  console.log(`
  ═══════════════════════════════════════════════════════════
   🔥 PURO VICIO — Servidor Node.js + Sockets Activo 🔥
   
   📍 Local:   http://localhost:${PORT}
   📍 Red Wi-Fi: http://${localIp}:${PORT}
   
   ¡Invita a tus amigos conectándote a la misma red Wi-Fi!
  ═══════════════════════════════════════════════════════════
  `);
});
