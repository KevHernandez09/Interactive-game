const express = require('express');
const router = express.Router();
const cardsController = require('../controllers/cardsController');

router.get('/health', cardsController.getHealth);
router.get('/cards', cardsController.getAllCards);
router.get('/cards/random', cardsController.getRandomCard);

module.exports = router;
