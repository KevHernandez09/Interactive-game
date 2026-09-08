const QRCode = require('qrcode');
const cardsController = require('../controllers/cardsController');

const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'VIC-' + code;
}

function initSockets(io, baseFrontendUrl) {
  io.on('connection', (socket) => {

    socket.on('create_room', async () => {
      const roomCode = generateRoomCode();
      const joinUrl = `${baseFrontendUrl}/?room=${roomCode}`;
      
      let qrCodeUrl = '';
      try {
        qrCodeUrl = await QRCode.toDataURL(joinUrl, { width: 300, margin: 2, color: { dark: '#0a0a12', light: '#ffffff' } });
      } catch (err) {
        console.error('Error QR:', err);
      }

      const room = {
        code: roomCode,
        hostSocketId: socket.id,
        players: [],
        status: 'lobby',
        currentTurnIndex: 0,
        currentCard: null,
        joinUrl,
        qrCodeUrl
      };

      rooms.set(roomCode, room);
      socket.join(roomCode);

      socket.emit('room_created', {
        roomCode,
        joinUrl,
        qrCodeUrl,
        baseFrontendUrl
      });
    });

    socket.on('join_room', ({ roomCode, playerName }) => {
      const cleanCode = (roomCode || '').toUpperCase().trim();
      const room = rooms.get(cleanCode);

      if (!room) {
        return socket.emit('error_message', 'La sala especificada no existe.');
      }

      const trimmedName = (playerName || '').trim();
      if (!trimmedName) {
        return socket.emit('error_message', 'Ingresa un nombre válido.');
      }

      if (room.players.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        return socket.emit('error_message', 'Ese nombre ya está en la sala.');
      }

      const player = { socketId: socket.id, name: trimmedName };
      room.players.push(player);
      socket.join(cleanCode);

      socket.emit('joined_successfully', {
        roomCode: cleanCode,
        playerName: trimmedName,
        isHost: false
      });

      io.to(cleanCode).emit('room_updated', {
        players: room.players.map(p => p.name),
        status: room.status,
        canStart: room.players.length >= 3 && room.players.length <= 10
      });
    });

    socket.on('kick_player', ({ roomCode, playerName }) => {
      const room = rooms.get(roomCode);
      if (!room || room.hostSocketId !== socket.id) return;

      const targetIdx = room.players.findIndex(p => p.name === playerName);
      if (targetIdx !== -1) {
        const kickedPlayer = room.players[targetIdx];
        room.players.splice(targetIdx, 1);

        io.to(kickedPlayer.socketId).emit('kicked_from_room', {
          reason: 'Fuiste eliminado de la sala por el Host.'
        });

        const kickedSocket = io.sockets.sockets.get(kickedPlayer.socketId);
        if (kickedSocket) kickedSocket.leave(roomCode);

        if (room.currentTurnIndex >= room.players.length && room.players.length > 0) {
          room.currentTurnIndex = 0;
        }

        io.to(roomCode).emit('room_updated', {
          players: room.players.map(p => p.name),
          status: room.status,
          canStart: room.players.length >= 3 && room.players.length <= 10
        });
      }
    });

    socket.on('leave_room', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        socket.leave(roomCode);
        socket.emit('left_room_successfully');

        if (room.currentTurnIndex >= room.players.length && room.players.length > 0) {
          room.currentTurnIndex = 0;
        }

        io.to(roomCode).emit('room_updated', {
          players: room.players.map(p => p.name),
          status: room.status,
          canStart: room.players.length >= 3 && room.players.length <= 10
        });
      }
    });

    socket.on('start_game', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      if (room.players.length < 3) {
        return socket.emit('error_message', 'Se requieren al menos 3 jugadores.');
      }

      room.status = 'playing';
      room.currentTurnIndex = 0;
      room.history = {};

      io.to(roomCode).emit('game_started', {
        currentPlayer: room.players[room.currentTurnIndex].name,
        turnIndex: room.currentTurnIndex,
        players: room.players.map(p => p.name)
      });
    });

    socket.on('select_category', ({ roomCode, category }) => {
      const room = rooms.get(roomCode);
      if (!room || room.status !== 'playing') return;

      const currentPlayerName = room.players[room.currentTurnIndex]?.name;
      if (!currentPlayerName) return;

      if (!room.history) room.history = {};
      const playerHistory = room.history[currentPlayerName] || [];

      let finalCategory = category;
      if (playerHistory.length >= 2) {
        const lastTwo = playerHistory.slice(-2);
        if (lastTwo[0] === 'verdad' && lastTwo[1] === 'verdad') {
          finalCategory = 'reto';
        } else if (lastTwo[0] === 'reto' && lastTwo[1] === 'reto') {
          finalCategory = 'verdad';
        }
      }

      playerHistory.push(finalCategory);
      room.history[currentPlayerName] = playerHistory;

      // 15% chance for a Special Card
      const isSpecial = Math.random() < 0.15;
      if (isSpecial) {
        const types = ['trago_solidario', 'inmunidad', 'el_juicio'];
        const specialType = types[Math.floor(Math.random() * types.length)];
        let cardText = '';
        let cardLevelLabel = '';

        if (specialType === 'trago_solidario') {
          cardLevelLabel = '🍹 TRAGO SOLIDARIO';
          cardText = '¡Salud por la amistad! Te tomas un SHOT de castigo, pero obligas a otro jugador de la mesa a tomarse otro contigo 🍹.';
        } else if (specialType === 'inmunidad') {
          cardLevelLabel = '🛡️ INMUNIDAD DIVINA';
          cardText = '¡La diosa fortuna te premia! Ganas 1 Carta de Inmunidad Divina. Puedes usarla más adelante para liberarte de un reto o verdad sin tomar shot 🛡️.';
          if (!room.immunity) room.immunity = {};
          room.immunity[currentPlayerName] = (room.immunity[currentPlayerName] || 0) + 1;
        } else {
          cardLevelLabel = '⚖️ EL JUICIO';
          const levels = ['bajo', 'medio', 'alto'];
          const randomLevel = levels[Math.floor(Math.random() * levels.length)];
          const fakeReq = { query: { category: finalCategory, level: randomLevel, roomCode } };
          let rawCardText = '¿Cuál es tu mayor secreto?';
          const fakeRes = { status: () => fakeRes, json: (data) => { if (data && data.text) rawCardText = data.text; } };
          cardsController.getRandomCard(fakeReq, fakeRes);
          cardText = `¡TÚ ERES EL JUEZ! ⚖️ No te toca a ti: Elige a cualquier otro jugador de la mesa para que cumpla lo siguiente:\n\n👉 "${rawCardText}"`;
        }

        io.to(roomCode).emit('spin_and_reveal', {
          category: 'especial',
          level: cardLevelLabel,
          text: cardText,
          specialType,
          currentPlayer: currentPlayerName,
          immunityCount: (room.immunity && room.immunity[currentPlayerName]) || 0
        });
        return;
      }

      const levels = ['bajo', 'medio', 'alto'];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];

      const fakeReq = { query: { category: finalCategory, level: randomLevel, roomCode } };
      let cardText = '¿Cuál es tu mayor secreto?';

      const fakeRes = {
        status: () => fakeRes,
        json: (data) => {
          if (data && data.text) cardText = data.text;
        }
      };

      cardsController.getRandomCard(fakeReq, fakeRes);

      room.currentCard = { category: finalCategory, level: randomLevel, text: cardText };

      io.to(roomCode).emit('spin_and_reveal', {
        category: finalCategory,
        level: randomLevel,
        text: cardText,
        specialType: null,
        currentPlayer: currentPlayerName,
        immunityCount: (room.immunity && room.immunity[currentPlayerName]) || 0
      });
    });

    socket.on('use_immunity', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const currentPlayerName = room.players[room.currentTurnIndex]?.name;
      if (!room.immunity) room.immunity = {};
      if ((room.immunity[currentPlayerName] || 0) > 0) {
        room.immunity[currentPlayerName]--;
      }

      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

      io.to(roomCode).emit('action_completed', {
        nextPlayer: room.players[room.currentTurnIndex].name,
        turnIndex: room.currentTurnIndex
      });
    });

    socket.on('card_completed', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

      io.to(roomCode).emit('action_completed', {
        nextPlayer: room.players[room.currentTurnIndex].name,
        turnIndex: room.currentTurnIndex
      });
    });

    socket.on('card_surrender', ({ roomCode }) => {
      const room = rooms.get(roomCode);
      if (!room) return;

      const punishedPlayer = room.players[room.currentTurnIndex].name;
      room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

      io.to(roomCode).emit('action_shot', {
        punishedPlayer,
        nextPlayer: room.players[room.currentTurnIndex].name,
        turnIndex: room.currentTurnIndex
      });
    });

    socket.on('disconnect', () => {
      for (const [code, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(code).emit('room_updated', {
            players: room.players.map(p => p.name),
            status: room.status,
            canStart: room.players.length >= 3 && room.players.length <= 10
          });
        }
        if (room.hostSocketId === socket.id && room.players.length === 0) {
          rooms.delete(code);
        }
      }
    });

  });
}

module.exports = { initSockets };
