const socket = typeof io !== 'undefined' ? io() : null;

const Game = {
  players: [],
  currentPlayerIndex: 0,
  isRunning: false,
  isSocketMode: false,
  isHost: false,
  roomCode: null,
  myPlayerName: null,

  addPlayer(name) {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, msg: 'El nombre no puede estar vacío.' };
    if (this.players.length >= 10) return { ok: false, msg: 'Máximo 10 jugadores.' };
    if (this.players.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, msg: 'Ese nombre ya está en la lista.' };
    }
    this.players.push(trimmed);
    return { ok: true };
  },

  removePlayer(index) {
    this.players.splice(index, 1);
  },

  canStart() {
    return this.players.length >= 3 && this.players.length <= 10;
  },

  start() {
    if (!this.canStart()) return false;
    this.currentPlayerIndex = 0;
    this.isRunning = true;
    CardUtils.resetUsedCards();
    return true;
  },

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  },

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  },

  async pickCard(category) {
    const level = CardUtils.getRandomLevel();
    const text = await CardUtils.fetchCardFromAPI(category, level);
    return { category, level, text };
  },

  reset() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.isRunning = false;
    this.isSocketMode = false;
    this.isHost = false;
    this.roomCode = null;
    this.myPlayerName = null;
    CardUtils.resetUsedCards();
  }
};

const UI = {
  screens: {},
  currentScreen: null,
  els: {},

  init() {
    this.screens = {
      mode: document.getElementById('screen-mode'),
      hostLobby: document.getElementById('screen-host-lobby'),
      join: document.getElementById('screen-join'),
      setup: document.getElementById('screen-setup'),
      game: document.getElementById('screen-game'),
      card: document.getElementById('screen-card'),
      shot: document.getElementById('screen-shot'),
    };

    this.els.btnModeHost = document.getElementById('btn-mode-host');
    this.els.btnModeJoin = document.getElementById('btn-mode-join');
    this.els.btnModeLocal = document.getElementById('btn-mode-local');

    this.els.btnBackHost = document.getElementById('btn-back-host');
    this.els.btnBackJoin = document.getElementById('btn-back-join');
    this.els.btnBackSetup = document.getElementById('btn-back-setup');

    this.els.hostRoomCode = document.getElementById('host-room-code');
    this.els.hostQrImg = document.getElementById('host-qr-img');
    this.els.hostIpUrl = document.getElementById('host-ip-url');
    this.els.hostPlayerList = document.getElementById('host-player-list');
    this.els.hostPlayerCount = document.getElementById('host-player-count');
    this.els.btnHostStart = document.getElementById('btn-host-start');

    this.els.joinCodeInput = document.getElementById('join-code-input');
    this.els.joinNameInput = document.getElementById('join-name-input');
    this.els.btnSubmitJoin = document.getElementById('btn-submit-join');
    this.els.btnLeaveRoom = document.getElementById('btn-leave-room');
    this.els.btnLeaveGame = document.getElementById('btn-leave-game');
    this.els.joinError = document.getElementById('join-error');

    this.els.playerInput = document.getElementById('player-name-input');
    this.els.addPlayerBtn = document.getElementById('btn-add-player');
    this.els.playerList = document.getElementById('player-list');
    this.els.playerCount = document.getElementById('player-count');
    this.els.startBtn = document.getElementById('btn-start');
    this.els.setupError = document.getElementById('setup-error');

    this.els.turnName = document.getElementById('turn-player-name');
    this.els.turnAvatar = document.getElementById('turn-avatar');
    this.els.btnVerdad = document.getElementById('btn-verdad');
    this.els.btnReto = document.getElementById('btn-reto');

    this.els.cardCategory = document.getElementById('card-category');
    this.els.cardLevel = document.getElementById('card-level');
    this.els.cardText = document.getElementById('card-text');
    this.els.cardPlayerName = document.getElementById('card-player-name');
    this.els.spinnerContainer = document.getElementById('spinner-container');
    this.els.cardContent = document.getElementById('card-content');
    this.els.btnCompleted = document.getElementById('btn-completed');
    this.els.btnShot = document.getElementById('btn-shot');

    this.els.shotPlayerName = document.getElementById('shot-player-name');
    this.els.btnNextAfterShot = document.getElementById('btn-next-after-shot');

    this._bindEvents();
    this._bindSocketEvents();
    this._checkUrlParams();
    this._initParticles();
  },

  _bindEvents() {
    this.els.btnModeHost.addEventListener('click', () => {
      Game.isSocketMode = true;
      Game.isHost = true;
      if (socket) socket.emit('create_room');
      this.showScreen('hostLobby');
    });

    this.els.btnModeJoin.addEventListener('click', () => {
      Game.isSocketMode = true;
      Game.isHost = false;
      if (this.els.btnLeaveRoom) this.els.btnLeaveRoom.classList.add('hidden');
      if (this.els.btnSubmitJoin) this.els.btnSubmitJoin.classList.remove('hidden');
      this.showScreen('join');
    });

    this.els.btnModeLocal.addEventListener('click', () => {
      Game.isSocketMode = false;
      Game.isHost = false;
      this.showScreen('setup');
    });

    const goBackToMenu = () => {
      if (Game.isSocketMode && socket && Game.roomCode) {
        socket.emit('leave_room', { roomCode: Game.roomCode });
      }
      Game.reset();
      this.showScreen('mode');
    };

    if (this.els.btnBackHost) this.els.btnBackHost.addEventListener('click', goBackToMenu);
    if (this.els.btnBackJoin) this.els.btnBackJoin.addEventListener('click', goBackToMenu);
    if (this.els.btnBackSetup) this.els.btnBackSetup.addEventListener('click', goBackToMenu);

    if (this.els.btnLeaveRoom) {
      this.els.btnLeaveRoom.addEventListener('click', () => {
        if (socket && Game.roomCode) {
          socket.emit('leave_room', { roomCode: Game.roomCode });
        }
      });
    }

    if (this.els.btnLeaveGame) {
      this.els.btnLeaveGame.addEventListener('click', () => {
        if (Game.isSocketMode && socket && Game.roomCode) {
          socket.emit('leave_room', { roomCode: Game.roomCode });
        } else {
          Game.reset();
          this.showScreen('mode');
        }
      });
    }

    this.els.btnSubmitJoin.addEventListener('click', () => this._handleJoinRoom());
    this.els.btnHostStart.addEventListener('click', () => {
      if (socket && Game.roomCode) {
        socket.emit('start_game', { roomCode: Game.roomCode });
      }
    });

    this.els.addPlayerBtn.addEventListener('click', () => this._handleAddPlayer());
    this.els.playerInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._handleAddPlayer();
    });

    this.els.startBtn.addEventListener('click', () => this._handleStart());
    
    this.els.btnVerdad.addEventListener('click', () => this._onChoiceSelected('verdad'));
    this.els.btnReto.addEventListener('click', () => this._onChoiceSelected('reto'));

    this.els.btnCompleted.addEventListener('click', () => {
      if (Game.isSocketMode && socket) {
        socket.emit('card_completed', { roomCode: Game.roomCode });
      } else {
        this._handleCompleted();
      }
    });

    this.els.btnShot.addEventListener('click', () => {
      if (Game.isSocketMode && socket) {
        socket.emit('card_surrender', { roomCode: Game.roomCode });
      } else {
        this._handleShot();
      }
    });

    this.els.btnNextAfterShot.addEventListener('click', () => {
      if (!Game.isSocketMode) {
        this._handleNextAfterShot();
      } else {
        this.showScreen('game');
        this._renderTurn();
        this.els.btnVerdad.disabled = false;
        this.els.btnReto.disabled = false;
      }
    });
  },

  _bindSocketEvents() {
    if (!socket) return;

    socket.on('room_created', ({ roomCode, joinUrl, qrCodeUrl, localIp, port }) => {
      Game.roomCode = roomCode;
      this.els.hostRoomCode.textContent = roomCode;
      this.els.hostQrImg.src = qrCodeUrl;
      this.els.hostIpUrl.textContent = `O entra a: http://${localIp}:${port}`;
    });

    socket.on('joined_successfully', ({ roomCode, playerName }) => {
      Game.roomCode = roomCode;
      Game.myPlayerName = playerName;
      this.showScreen('join');
      if (this.els.btnSubmitJoin) this.els.btnSubmitJoin.classList.add('hidden');
      if (this.els.btnLeaveRoom) this.els.btnLeaveRoom.classList.remove('hidden');
      this.els.joinError.textContent = '✅ ¡Te uniste! Esperando que el Host inicie...';
      this.els.joinError.style.color = '#39ff14';
      this.els.joinError.classList.add('visible');
    });

    socket.on('kicked_from_room', ({ reason }) => {
      alert(reason || 'Fuiste eliminado de la sala por el Host.');
      Game.reset();
      this.showScreen('mode');
    });

    socket.on('left_room_successfully', () => {
      Game.reset();
      this.showScreen('mode');
    });

    socket.on('error_message', (msg) => {
      this.els.joinError.textContent = msg;
      this.els.joinError.style.color = '#ef4444';
      this.els.joinError.classList.add('visible');
    });

    socket.on('room_updated', ({ players, canStart }) => {
      Game.players = players;

      this.els.hostPlayerList.innerHTML = '';
      players.forEach((name, i) => {
        const li = document.createElement('li');
        li.className = 'player-item';
        li.innerHTML = `
          <span class="player-item-name">
            <span class="player-avatar">${name.charAt(0).toUpperCase()}</span>
            ${name}
          </span>
          ${Game.isHost ? `<button class="btn-remove" onclick="UI._kickPlayer('${name}')" title="Eliminar jugador">✕</button>` : ''}
        `;
        this.els.hostPlayerList.appendChild(li);
      });

      this.els.hostPlayerCount.textContent = `${players.length}/10 jugadores`;
      this.els.btnHostStart.disabled = !canStart;
      if (canStart) {
        this.els.btnHostStart.classList.add('ready');
      } else {
        this.els.btnHostStart.classList.remove('ready');
      }
    });

    socket.on('game_started', ({ currentPlayer, turnIndex, players }) => {
      Game.players = players;
      Game.currentPlayerIndex = turnIndex;
      Game.isRunning = true;
      this.showScreen('game');
      this._renderTurn();
    });

    socket.on('spin_and_reveal', async ({ category, level, text, currentPlayer }) => {
      this.showScreen('card');
      this.els.spinnerContainer.classList.remove('hidden');
      this.els.cardContent.classList.add('hidden');

      this.els.cardCategory.textContent = category === 'verdad' ? '🔮 VERDAD' : '🔥 RETO';
      this.els.cardCategory.className = 'card-category ' + category;

      await this._animateSpinner(level);

      this.els.cardLevel.textContent = CardUtils.levelLabels[level];
      this.els.cardLevel.style.color = CardUtils.levelColors[level];
      this.els.cardText.textContent = text;
      this.els.cardPlayerName.textContent = currentPlayer;

      const cardBody = document.getElementById('card-body');
      cardBody.className = 'card-body ' + (category === 'verdad' ? 'verdad-card' : 'reto-card');

      this.els.spinnerContainer.classList.add('hidden');
      this.els.cardContent.classList.remove('hidden');

      void this.els.cardContent.offsetWidth;
      this.els.cardContent.classList.add('card-reveal');
    });

    socket.on('action_completed', ({ nextPlayer, turnIndex }) => {
      Game.currentPlayerIndex = turnIndex;
      this._confettiBurst();
      setTimeout(() => {
        this.showScreen('game');
        this._renderTurn();
        this.els.btnVerdad.disabled = false;
        this.els.btnReto.disabled = false;
      }, 600);
    });

    socket.on('action_shot', ({ punishedPlayer, nextPlayer, turnIndex }) => {
      Game.currentPlayerIndex = turnIndex;
      this.els.shotPlayerName.textContent = punishedPlayer;
      this.showScreen('shot');
      this._shotAnimation();
    });
  },

  _kickPlayer(playerName) {
    if (Game.isHost && socket && Game.roomCode) {
      socket.emit('kick_player', { roomCode: Game.roomCode, playerName });
    }
  },

  _checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      Game.isSocketMode = true;
      this.showScreen('join');
      this.els.joinCodeInput.value = roomParam;
      this.els.joinNameInput.focus();
    }
  },

  _handleJoinRoom() {
    const code = this.els.joinCodeInput.value.trim();
    const name = this.els.joinNameInput.value.trim();
    if (!code || !name) {
      this.els.joinError.textContent = 'Completa el código y tu nombre.';
      this.els.joinError.style.color = '#ef4444';
      this.els.joinError.classList.add('visible');
      return;
    }
    if (socket) {
      socket.emit('join_room', { roomCode: code, playerName: name });
    }
  },

  _onChoiceSelected(category) {
    if (Game.isSocketMode && socket) {
      this.els.btnVerdad.disabled = true;
      this.els.btnReto.disabled = true;
      socket.emit('select_category', { roomCode: Game.roomCode, category });
    } else {
      this._handleChoice(category);
    }
  },

  showScreen(name) {
    Object.values(this.screens).forEach(s => {
      if (s) s.classList.remove('active');
    });
    if (this.screens[name]) this.screens[name].classList.add('active');
    this.currentScreen = name;
  },

  _handleAddPlayer() {
    const result = Game.addPlayer(this.els.playerInput.value);
    if (!result.ok) {
      this._showSetupError(result.msg);
      this._shakeElement(this.els.playerInput);
      return;
    }
    this.els.playerInput.value = '';
    this.els.playerInput.focus();
    this._hideSetupError();
    this._renderPlayerList();
    this._updateStartBtn();
  },

  _handleStart() {
    if (!Game.canStart()) {
      this._showSetupError('Necesitas entre 3 y 10 jugadores para empezar la fiesta.');
      return;
    }
    Game.start();
    this.showScreen('game');
    this._renderTurn();
  },

  async _handleChoice(category) {
    this.els.btnVerdad.disabled = true;
    this.els.btnReto.disabled = true;

    const card = await Game.pickCard(category);
    this.showScreen('card');

    this.els.spinnerContainer.classList.remove('hidden');
    this.els.cardContent.classList.add('hidden');

    this.els.cardCategory.textContent = category === 'verdad' ? '🔮 VERDAD' : '🔥 RETO';
    this.els.cardCategory.className = 'card-category ' + category;

    await this._animateSpinner(card.level);

    this.els.cardLevel.textContent = CardUtils.levelLabels[card.level];
    this.els.cardLevel.style.color = CardUtils.levelColors[card.level];
    this.els.cardText.textContent = card.text;
    this.els.cardPlayerName.textContent = Game.getCurrentPlayer();

    const cardBody = document.getElementById('card-body');
    cardBody.className = 'card-body ' + (category === 'verdad' ? 'verdad-card' : 'reto-card');

    this.els.spinnerContainer.classList.add('hidden');
    this.els.cardContent.classList.remove('hidden');

    void this.els.cardContent.offsetWidth;
    this.els.cardContent.classList.add('card-reveal');
  },

  _handleCompleted() {
    this._confettiBurst();
    Game.nextTurn();
    setTimeout(() => {
      this.showScreen('game');
      this._renderTurn();
      this.els.btnVerdad.disabled = false;
      this.els.btnReto.disabled = false;
    }, 600);
  },

  _handleShot() {
    const name = Game.getCurrentPlayer();
    this.els.shotPlayerName.textContent = name;
    this.showScreen('shot');
    this._shotAnimation();
  },

  _handleNextAfterShot() {
    Game.nextTurn();
    this.showScreen('game');
    this._renderTurn();
    this.els.btnVerdad.disabled = false;
    this.els.btnReto.disabled = false;
  },

  _renderPlayerList() {
    this.els.playerList.innerHTML = '';
    Game.players.forEach((name, i) => {
      const li = document.createElement('li');
      li.className = 'player-item';
      li.innerHTML = `
        <span class="player-item-name">
          <span class="player-avatar">${name.charAt(0).toUpperCase()}</span>
          ${name}
        </span>
        <button class="btn-remove" onclick="UI._removePlayer(${i})" aria-label="Eliminar jugador">✕</button>
      `;
      li.style.animationDelay = `${i * 0.05}s`;
      this.els.playerList.appendChild(li);
    });
    this.els.playerCount.textContent = `${Game.players.length}/10 jugadores`;
  },

  _removePlayer(index) {
    Game.removePlayer(index);
    this._renderPlayerList();
    this._updateStartBtn();
  },

  _updateStartBtn() {
    const canStart = Game.canStart();
    this.els.startBtn.disabled = !canStart;
    if (canStart) {
      this.els.startBtn.classList.add('ready');
    } else {
      this.els.startBtn.classList.remove('ready');
    }
  },

  _renderTurn() {
    const name = Game.getCurrentPlayer();
    this.els.turnName.textContent = name;
    this.els.turnAvatar.textContent = name.charAt(0).toUpperCase();

    const turnCard = document.querySelector('.turn-card');
    if (turnCard) {
      turnCard.classList.remove('turn-enter');
      void turnCard.offsetWidth;
      turnCard.classList.add('turn-enter');
    }
  },

  _showSetupError(msg) {
    this.els.setupError.textContent = msg;
    this.els.setupError.classList.add('visible');
  },

  _hideSetupError() {
    this.els.setupError.classList.remove('visible');
  },

  _shakeElement(el) {
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  },

  async _animateSpinner(finalLevel) {
    const levelDisplay = document.getElementById('spinner-level');
    const levels = CardUtils.levels;
    const labels = CardUtils.levelLabels;
    const colors = CardUtils.levelColors;
    const totalCycles = 18;

    return new Promise(resolve => {
      let step = 0;

      const decelerate = () => {
        if (step < totalCycles) {
          const idx = step % levels.length;
          levelDisplay.textContent = labels[levels[idx]];
          levelDisplay.style.color = colors[levels[idx]];
          levelDisplay.style.textShadow = `0 0 20px ${colors[levels[idx]]}, 0 0 40px ${colors[levels[idx]]}`;

          step++;
          const delay = 70 + (step * 18);
          setTimeout(decelerate, delay);
        } else {
          levelDisplay.textContent = labels[finalLevel];
          levelDisplay.style.color = colors[finalLevel];
          levelDisplay.style.textShadow = `0 0 30px ${colors[finalLevel]}, 0 0 60px ${colors[finalLevel]}`;
          levelDisplay.classList.add('spinner-final');
          setTimeout(() => {
            levelDisplay.classList.remove('spinner-final');
            resolve();
          }, 700);
        }
      };

      decelerate();
    });
  },

  _confettiBurst() {
    const container = document.getElementById('confetti-container');
    const colors = ['#ff2d95', '#a855f7', '#ffe100', '#39ff14', '#00d4ff'];
    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + '%';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = Math.random() * 0.3 + 's';
      piece.style.animationDuration = (0.8 + Math.random() * 0.8) + 's';
      container.appendChild(piece);
      setTimeout(() => piece.remove(), 1600);
    }
  },

  _shotAnimation() {
    const shotScreen = this.screens.shot;
    if (shotScreen) {
      shotScreen.classList.add('shot-flash');
      setTimeout(() => shotScreen.classList.remove('shot-flash'), 600);
    }
  },

  _initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const particles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        color: ['rgba(255,45,149,', 'rgba(168,85,247,', 'rgba(255,225,0,'][Math.floor(Math.random() * 3)],
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
      });
      requestAnimationFrame(draw);
    }
    draw();
  }
};

document.addEventListener('DOMContentLoaded', () => UI.init());
