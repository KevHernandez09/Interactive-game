const path = require('path');
const fs = require('fs');

const cardsFilePath = path.join(__dirname, '..', 'data', 'cards.json');
let cardsData = {};

try {
  const rawData = fs.readFileSync(cardsFilePath, 'utf8');
  cardsData = JSON.parse(rawData);
  console.log('✅ [Controller] Base de datos de cartas cargada correctamente.');
} catch (err) {
  console.error('❌ [Controller] Error al leer cards.json:', err.message);
}

const getHealth = (req, res) => {
  res.json({
    status: 'ok',
    app: 'Puro Vicio API (Node.js)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
};

const getAllCards = (req, res) => {
  res.json(cardsData);
};

const getRandomCard = (req, res) => {
  const { category, level } = req.query;

  if (!category || !cardsData[category]) {
    return res.status(400).json({ error: 'Categoría requerida o inválida (verdad/reto)' });
  }

  const levels = cardsData[category];
  const selectedLevel = level && levels[level] ? level : Object.keys(levels)[Math.floor(Math.random() * Object.keys(levels).length)];
  const pool = levels[selectedLevel];

  if (!pool || pool.length === 0) {
    return res.status(404).json({ error: 'No existen cartas para ese nivel' });
  }

  const randomCard = pool[Math.floor(Math.random() * pool.length)];

  res.json({
    category,
    level: selectedLevel,
    text: randomCard
  });
};

module.exports = {
  getHealth,
  getAllCards,
  getRandomCard
};
