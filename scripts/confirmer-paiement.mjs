// Aide au DÉVELOPPEMENT uniquement : simule le webhook de l'opérateur mobile money
// qui confirme un paiement. En production, c'est l'opérateur qui appelle cette route.
//
//   node scripts/confirmer-paiement.mjs <reservationId>
//
// Config via variables d'environnement (ou valeurs par défaut du dev local) :
//   API_URL                 défaut http://localhost:3000/api/v1
//   PAYMENT_WEBHOOK_SECRET   secret attendu dans l'en-tête x-webhook-secret

const reservationId = process.argv[2];
if (!reservationId) {
  console.error('Usage : node scripts/confirmer-paiement.mjs <reservationId>');
  process.exit(1);
}

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const secret = process.env.PAYMENT_WEBHOOK_SECRET;
if (!secret) {
  console.error(
    'PAYMENT_WEBHOOK_SECRET manquant — définis-le dans ton environnement (voir yego-api/.env),\n' +
      'ne jamais coder le vrai secret en dur ici (il serait alors versionné en clair).',
  );
  process.exit(1);
}

const res = await fetch(`${API_URL}/paiements/reservation/${reservationId}/confirmer`, {
  method: 'PATCH',
  headers: { 'x-webhook-secret': secret },
});

const corps = await res.json().catch(() => ({}));
console.log(res.status, corps.statut ? `→ paiement ${corps.statut}` : JSON.stringify(corps));
process.exit(res.ok ? 0 : 1);
