const http = require('http');

const DUREE_ACCESS_S = 20;
const MOT_DE_PASSE = 'password123';
const utilisateurs = {
  'alumni@uasz.sn': { id: '1', firstName: 'Awa', lastName: 'Diop', role: 'ALUMNI' },
  'etudiant@uasz.sn': { id: '2', firstName: 'Moussa', lastName: 'Ndiaye', role: 'ETUDIANT' },
  'enseignant@uasz.sn': { id: '3', firstName: 'Fatou', lastName: 'Sow', role: 'ENSEIGNANT' },
  'entreprise@uasz.sn': { id: '4', firstName: 'Ibou', lastName: 'Ba', role: 'ENTREPRISE' },
  'admin@uasz.sn': { id: '5', firstName: 'Admin', lastName: 'UASZ', role: 'ADMINISTRATEUR' },
};
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
};
const accessValides = new Map(); // token -> expiration (ms)
const refreshValides = new Map(); // token -> email
let compteur = 0;

const envoyer = (res, statut, corps) => {
  res.writeHead(statut, { 'Content-Type': 'application/json', ...CORS });
  res.end(corps === undefined ? '' : JSON.stringify(corps));
};
const erreur = (res, statut, code, message) =>
  envoyer(res, statut, { code, message, timestamp: new Date().toISOString() });

function emettre(email) {
  const u = utilisateurs[email];
  const accessToken = `acc-${++compteur}`;
  const refreshToken = `ref-${++compteur}`;
  accessValides.set(accessToken, Date.now() + DUREE_ACCESS_S * 1000);
  refreshValides.set(refreshToken, email);
  return { accessToken, refreshToken, expiresIn: DUREE_ACCESS_S, user: { ...u, email, status: 'ACTIF' } };
}

http
  .createServer((req, res) => {
    if (req.method === 'OPTIONS') return envoyer(res, 204);
    let brut = '';
    req.on('data', (c) => (brut += c));
    req.on('end', () => {
      const corps = brut ? JSON.parse(brut) : {};
      const chemin = req.url.split('?')[0];

      if (req.method === 'POST' && chemin === '/v1/auth/login') {
        if (utilisateurs[corps.email] && corps.password === MOT_DE_PASSE) {
          console.log(`[login] ${corps.email}`);
          return envoyer(res, 200, emettre(corps.email));
        }
        return erreur(res, 401, 'BAD_CREDENTIALS', 'Email ou mot de passe incorrect.');
      }

      if (req.method === 'POST' && chemin === '/v1/auth/refresh-token') {
        const email = refreshValides.get(corps.refreshToken);
        if (!email) {
          console.log('[refresh] REFUSÉ (token inconnu ou déjà utilisé)');
          return erreur(res, 401, 'INVALID_REFRESH_TOKEN', 'Session expirée, reconnectez-vous.');
        }
        refreshValides.delete(corps.refreshToken); // rotation : usage unique
        console.log(`[refresh] OK pour ${email}`);
        return envoyer(res, 200, emettre(email));
      }

      if (req.method === 'POST' && chemin === '/v1/auth/logout') {
        refreshValides.delete(corps.refreshToken);
        console.log('[logout]');
        return envoyer(res, 200, { message: 'Déconnecté' });
      }

      const m = chemin.match(/^\/v1\/users\/(.+)$/);
      if (req.method === 'GET' && m) {
        const token = (req.headers.authorization || '').replace('Bearer ', '');
        const expire = accessValides.get(token);
        if (!expire || expire < Date.now()) {
          console.log(`[users] 401 (token ${token || 'absent'})`);
          return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.');
        }
        const [email, u] = Object.entries(utilisateurs).find(([, v]) => v.id === m[1]) ?? [];
        if (!u) return erreur(res, 404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
        console.log(`[users] 200 pour ${email}`);
        return envoyer(res, 200, { ...u, email, status: 'ACTIF' });
      }

      return erreur(res, 404, 'NOT_FOUND', 'Route inconnue.');
    });
  })
  .listen(8081, () => console.log('Mock API sur http://localhost:8081/v1 (mot de passe : ' + MOT_DE_PASSE + ')'));