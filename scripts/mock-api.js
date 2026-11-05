const http = require('http');

const DUREE_ACCESS_S = 20;
const MOT_DE_PASSE = 'password123';
const FRONT = 'http://localhost:4200';
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
const jetonsConfirmation = new Map(); // token -> email
const jetonsReset = new Map(); // token -> email
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
  const { motDePasse, ...publicUser } = u;
  return { accessToken, refreshToken, expiresIn: DUREE_ACCESS_S, user: { ...publicUser, email, status: 'ACTIF' } };
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
        const u = utilisateurs[corps.email];
        if (!u || (u.motDePasse ?? MOT_DE_PASSE) !== corps.password) {
          return erreur(res, 401, 'BAD_CREDENTIALS', 'Email ou mot de passe incorrect.');
        }
        if (u.status === 'EN_ATTENTE') {
          return erreur(res, 403, 'ACCOUNT_NOT_ACTIVATED', 'Compte non activé.');
        }
        console.log(`[login] ${corps.email}`);
        return envoyer(res, 200, emettre(corps.email));
      }

      if (req.method === 'POST' && chemin === '/v1/auth/refresh-token') {
        const email = refreshValides.get(corps.refreshToken);
        if (!email) {
          console.log('[refresh] REFUSÉ (token inconnu ou déjà utilisé)');
          return erreur(res, 401, 'INVALID_REFRESH_TOKEN', 'Session expirée, reconnectez-vous.');
        }
        refreshValides.delete(corps.refreshToken);
        console.log(`[refresh] OK pour ${email}`);
        return envoyer(res, 200, emettre(email));
      }

      if (req.method === 'POST' && chemin === '/v1/auth/logout') {
        refreshValides.delete(corps.refreshToken);
        console.log('[logout]');
        return envoyer(res, 200, { message: 'Déconnecté' });
      }

      if (req.method === 'POST' && chemin === '/v1/auth/register') {
        const { firstName, lastName, email, password, role } = corps;
        if (!firstName || !lastName || !email || !role || !password || password.length < 8) {
          return erreur(res, 400, 'VALIDATION_ERROR', 'Données invalides.');
        }
        if (utilisateurs[email]) return erreur(res, 409, 'EMAIL_ALREADY_USED', 'Email déjà utilisé.');
        const id = String(Object.keys(utilisateurs).length + 1);
        utilisateurs[email] = { id, firstName, lastName, role, status: 'EN_ATTENTE', motDePasse: password };
        const token = `conf-${++compteur}`;
        jetonsConfirmation.set(token, email);
        console.log(`[email] Confirmation pour ${email} : ${FRONT}/confirmation-email?token=${token}`);
        return envoyer(res, 201, { id, firstName, lastName, email, role, status: 'EN_ATTENTE' });
      }

      if (req.method === 'POST' && chemin === '/v1/auth/confirm-email') {
        const email = jetonsConfirmation.get(corps.token);
        if (!email) return erreur(res, 400, 'INVALID_TOKEN', 'Lien invalide ou expiré.');
        utilisateurs[email].status = 'ACTIF';
        jetonsConfirmation.delete(corps.token);
        return envoyer(res, 200, { message: 'Compte activé.' });
      }

      if (req.method === 'POST' && chemin === '/v1/auth/resend-confirmation') {
        const u = utilisateurs[corps.email];
        if (u && u.status !== 'EN_ATTENTE') return erreur(res, 409, 'ALREADY_ACTIVATED', 'Compte déjà activé.');
        if (u) {
          const token = `conf-${++compteur}`;
          jetonsConfirmation.set(token, corps.email);
          console.log(`[email] Confirmation pour ${corps.email} : ${FRONT}/confirmation-email?token=${token}`);
        }
        return envoyer(res, 200, { message: 'Email renvoyé si le compte existe.' });
      }

      if (req.method === 'POST' && chemin === '/v1/auth/forgot-password') {
        if (utilisateurs[corps.email]) {
          const token = `rst-${++compteur}`;
          jetonsReset.set(token, corps.email);
          console.log(`[email] Réinitialisation pour ${corps.email} : ${FRONT}/reinitialisation-mot-de-passe?token=${token}`);
        }
        return envoyer(res, 200, { message: 'Si un compte existe, un email a été envoyé.' });
      }

      if (req.method === 'POST' && chemin === '/v1/auth/reset-password') {
        const email = jetonsReset.get(corps.token);
        if (!email) return erreur(res, 400, 'INVALID_TOKEN', 'Lien invalide ou expiré.');
        if (!corps.newPassword || corps.newPassword.length < 8 || !/\d/.test(corps.newPassword)) {
          return erreur(res, 422, 'WEAK_PASSWORD', 'Mot de passe non conforme.');
        }
        utilisateurs[email].motDePasse = corps.newPassword;
        jetonsReset.delete(corps.token);
        return envoyer(res, 200, { message: 'Mot de passe réinitialisé.' });
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
        const { motDePasse, ...publicUser } = u;
        return envoyer(res, 200, { ...publicUser, email, status: 'ACTIF' });
      }

      return erreur(res, 404, 'NOT_FOUND', 'Route inconnue.');
    });
  })
  .listen(8081, () => console.log('Mock API sur http://localhost:8081/v1 (mot de passe : ' + MOT_DE_PASSE + ')'));