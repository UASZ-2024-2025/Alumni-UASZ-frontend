// Régénère les clients Angular depuis contrat/*.yaml (generator typescript-angular, options par défaut).
//   npm run api:generate                                   -> les 5 clients
//   npm run api:generate -- analytics-matching-service     -> un seul
const { execSync } = require('node:child_process');

const CLIENTS = {
  'user-service': 'utilisateurs',
  'alumni-student-company-service': 'alumni',
  'job-offer-service': 'offres-emploi',
  'notification-messaging-service': 'notifications-messagerie',
  'analytics-matching-service': 'analyses-correspondances',
};

const demande = process.argv[2];
if (demande && !CLIENTS[demande]) {
  console.error(`Contrat inconnu : ${demande} (attendu : ${Object.keys(CLIENTS).join(', ')})`);
  process.exit(1);
}

for (const [contrat, dossier] of Object.entries(CLIENTS)) {
  if (demande && demande !== contrat) continue;
  const commande = `npx openapi-generator-cli generate -i contrat/${contrat}.yaml -g typescript-angular -o src/app/api/generes/${dossier}`;
  console.log(`> ${commande}`);
  execSync(commande, { stdio: 'inherit' });
}
