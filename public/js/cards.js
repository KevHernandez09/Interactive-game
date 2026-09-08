const CARDS = {
  verdad: {
    bajo: [
      "¿Cuál es tu mayor guilty pleasure que nunca admitirías en público?",
      "¿Alguna vez mandaste un mensaje borracho/a del que te arrepentiste? ¿A quién?",
      "¿Cuál es la mentira más grande que le has dicho a tu mamá o papá?",
      "¿Alguna vez te han cachado haciendo algo que no debías? Cuenta qué pasó.",
      "¿Cuál es el crush más vergonzoso que has tenido?",
      "¿Alguna vez fingiste estar enfermo/a para no ir a trabajar o a la escuela? ¿Qué hiciste ese día?",
      "¿Cuál es la cosa más rara que has googleado a las 3 AM?",
      "¿Alguna vez te has comido algo del suelo cuando nadie te veía?",
      "¿Cuál es la excusa más patética que has usado para cancelar planes?",
      "Confiesa: ¿alguna vez le diste stalk a tu ex en redes sociales? ¿Hasta dónde llegaste?"
    ],
    medio: [
      "¿Cuál ha sido tu peor experiencia en una cita? Da todos los detalles.",
      "¿Alguna vez besaste a alguien que no debías? ¿Quién y por qué?",
      "Confiesa tu fantasía más loca que aún no has cumplido.",
      "¿Cuál es la cosa más atrevida que has hecho estando borracho/a?",
      "¿Alguna vez te ligaste a alguien solo por despecho? Cuenta la historia.",
      "¿Cuál es tu técnica secreta para ligar? Demuéstrala ahora mismo.",
      "¿Alguna vez te cacharon en una situación comprometedora? ¿Quién te vio?",
      "¿Cuál es el lugar más extraño donde has besado a alguien?",
      "Si tuvieras que elegir a alguien de este grupo para una cita, ¿a quién elegirías y por qué?",
      "¿Alguna vez has mandado fotos subidas de tono? ¿A quién?"
    ],
    alto: [
      "Cuenta con detalle la experiencia más salvaje que has tenido en una fiesta.",
      "¿Cuál es tu secreto más oscuro que NADIE en este grupo sabe?",
      "¿Alguna vez te han propuesto un trío? ¿Aceptaste o rechazaste?",
      "Confiesa: ¿cuál es la persona más inapropiada con la que te has metido?",
      "¿Cuál es la cosa más sucia que has hecho y que te da vergüenza admitir?",
      "Si pudieras pasar una noche con alguien famoso sin consecuencias, ¿con quién sería?",
      "¿Cuál es la mentira más grande que has dicho a una pareja?",
      "Cuenta algo que hiciste y juraste que nunca iba a contar.",
      "¿Alguna vez has tenido pensamientos prohibidos con alguien presente en esta fiesta?"
    ]
  },
  reto: {
    bajo: [
      "Hazle un piropo exagerado y ridículo al jugador de tu derecha.",
      "Imita a alguien de este grupo hasta que adivinen quién es.",
      "Manda un audio de WhatsApp al último contacto cantando 'I Will Always Love You'.",
      "Baila reggaetón durante 30 segundos como si estuvieras en el antro.",
      "Habla con acento sensual durante las próximas 2 rondas.",
      "Deja que el grupo revise tu galería de fotos durante 15 segundos.",
      "Haz tu mejor cara de 'bedroom eyes' y mantenla 10 segundos sin reírte.",
      "Dedícale una canción de amor al jugador de tu izquierda, cantándola con sentimiento.",
      "Publica una historia de Instagram diciendo: 'Busco novio/a, apliquen en mis DMs'.",
      "Haz 10 sentadillas mientras dices piropos al grupo."
    ],
    medio: [
      "Dale un masaje de 30 segundos en los hombros a la persona que elija el grupo.",
      "Deja que alguien del grupo publique lo que quiera en tus redes sociales.",
      "Llama a tu ex y dile que has estado pensando en él/ella (ponlo en altavoz).",
      "Siéntate en las piernas de alguien del grupo durante la siguiente ronda.",
      "Hazle un lap dance de 20 segundos a la persona que elija el grupo.",
      "Manda un mensaje a tu crush diciendo 'Estoy pensando cosas que no debería sobre ti'.",
      "Deja que el grupo elija a alguien y mándale un mensaje coqueto desde tu teléfono.",
      "Quítate una prenda de ropa (zapatos y calcetines no cuentan).",
      "Haz un striptease PG-13 de 15 segundos (solo baile sensual).",
      "Susúrrale algo 'spicy' al oído al jugador frente a ti."
    ],
    alto: [
      "Besa en la boca a quien el grupo decida (si ambos aceptan).",
      "Deja tu celular desbloqueado y el grupo puede mandar UN mensaje a quien quieran.",
      "Haz un body shot con la persona que el grupo elija.",
      "Deja que alguien del grupo te dé un chupetón donde quiera.",
      "Dale un beso en el cuello al jugador de tu derecha.",
      "El grupo elige una persona: debes hacer contacto visual intenso con ella durante 30 segundos sin hablar.",
      "Deja que el grupo cree y publique una historia comprometedora en tu Instagram.",
      "Baila sensualmente con la persona que el grupo decida durante 1 minuto.",
      "Confiesa algo y después besa a alguien del grupo en la mejilla.",
      "Haz un reto de 'verdad o beso': responde la pregunta que el grupo haga o besa a quien ellos decidan."
    ]
  }
};

const CardUtils = {
  levels: ['bajo', 'medio', 'alto'],
  levelLabels: { bajo: '🟢 Suave', medio: '🟡 Picante', alto: '🔴 Extremo' },
  levelColors: { bajo: '#39ff14', medio: '#ffe100', alto: '#ff2d55' },

  _usedCards: { verdad: { bajo: [], medio: [], alto: [] }, reto: { bajo: [], medio: [], alto: [] } },

  async fetchCardFromAPI(category, level) {
    try {
      const res = await fetch(`/api/cards/random?category=${category}&level=${level}`);
      if (res.ok) {
        const data = await res.json();
        return data.text;
      }
    } catch (e) {
      console.warn('API no disponible, usando local:', e);
    }
    return this.getRandomCard(category, level);
  },

  getRandomCard(category, level) {
    const pool = CARDS[category][level];
    const used = this._usedCards[category][level];

    if (used.length >= pool.length) {
      used.length = 0;
    }

    const available = pool.filter((_, i) => !used.includes(i));
    const randomIdx = Math.floor(Math.random() * available.length);
    const cardText = available[randomIdx];
    const originalIdx = pool.indexOf(cardText);
    used.push(originalIdx);

    return cardText;
  },

  getRandomLevel() {
    return this.levels[Math.floor(Math.random() * this.levels.length)];
  },

  resetUsedCards() {
    for (const cat of ['verdad', 'reto']) {
      for (const lvl of this.levels) {
        this._usedCards[cat][lvl] = [];
      }
    }
  }
};
