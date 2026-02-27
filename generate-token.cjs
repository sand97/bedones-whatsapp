const jwt = require('jsonwebtoken');

const secret = '38F4NPE0YqYYQ81eE6aQn7CYUAle0STKO0eqkZl2Sjahsbdjahbsdjhbsd87834s2iGJcaOG_TaskoqQ_obww5PrBggyEv87WR5NFqsM';

// IMPORTANT: L'ID de l'agent WhatsApp doit correspondre à un enregistrement dans la table WhatsAppAgent
// Pour obtenir l'ID, exécutez: node -e "const { PrismaClient } = require('./apps/backend/src/generated/client'); const prisma = new PrismaClient(); prisma.whatsAppAgent.findMany({ select: { id: true, userId: true } }).then(agents => { console.log(agents); prisma.\$disconnect(); });"
const WHATSAPP_AGENT_ID = 'cmm2kr9ap000os0zpvfxczbl7'; // Remplacer par l'ID de votre agent WhatsApp

const token = jwt.sign(
  {
    sub: WHATSAPP_AGENT_ID, // Doit être l'ID de la table WhatsAppAgent, PAS une chaîne statique
    type: 'agent-internal'
  },
  secret,
  {
    expiresIn: '365d' // Token valide pour 1 an
  }
);

console.log('Generated AGENT_BACKEND_TOKEN:');
console.log(token);
