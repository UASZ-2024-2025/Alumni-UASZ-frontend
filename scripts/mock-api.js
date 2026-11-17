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
  'entreprise-attente@uasz.sn': { id: '6', firstName: 'Mariama', lastName: 'Sy', role: 'ENTREPRISE' },
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
const { randomUUID } = require('crypto');

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
  accessEmails.set(accessToken, email); //celui qui appartient le tocken
  refreshValides.set(refreshToken, email);
  const { motDePasse, ...publicUser } = u;
  return { accessToken, refreshToken, expiresIn: DUREE_ACCESS_S, user: { ...publicUser, email, status: 'ACTIF' } };
}
const accessEmails = new Map(); // token -> email (pour connaître le rôle de l'appelant)
const entreprisesNonValidees = new Set(['entreprise-attente@uasz.sn']);

// --- Données de test de l'administration (utilisateurs, statistiques, entreprises) ---
const STATUTS = ['ACTIF', 'ACTIF', 'EN_ATTENTE', 'SUSPENDU', 'INACTIF'];
const ROLES = ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT'];
const annuaire = [
  ...Object.entries(utilisateurs).map(([email, u]) => ({
    ...u, email, status: 'ACTIF', createdAt: '2026-10-01T09:00:00Z',
  })),
  ...Array.from({ length: 25 }, (_, i) => ({
    id: `u${i + 10}`, firstName: `Prénom${i + 1}`, lastName: `Nom${i + 1}`,
    email: `user${i + 1}@uasz.sn`, role: ROLES[i % ROLES.length], status: STATUTS[i % STATUTS.length],
    createdAt: '2026-10-15T09:00:00Z',
  })),
];
const entreprises = Array.from({ length: 23 }, (_, i) => ({
  id: `c${i + 1}`, name: `Entreprise ${i + 1}`, sector: i % 2 ? 'Télécoms' : 'Banque',
  contactEmail: `contact${i + 1}@entreprise.sn`, isPartner: i % 3 === 0, createdAt: '2026-09-01T09:00:00Z',
}));
const rapportInsertion = [
  { graduationYear: 2023, specialty: 'Génie Logiciel', totalGraduates: 40, employedCount: 29, insertionRate: 72.5, averageMonthsToFirstJob: 4 },
  { graduationYear: 2023, specialty: 'Réseaux', totalGraduates: 30, employedCount: 18, insertionRate: 60, averageMonthsToFirstJob: 6 },
  { graduationYear: 2024, specialty: 'Génie Logiciel', totalGraduates: 45, employedCount: 36, insertionRate: 80, averageMonthsToFirstJob: 3 },
  { graduationYear: 2024, specialty: 'Réseaux', totalGraduates: 28, employedCount: 17, insertionRate: 60.7, averageMonthsToFirstJob: 5 },
];
const parPage = (liste, url) => {
  const q = new URL(url, 'http://mock').searchParams;
  const page = Number(q.get('page') ?? 0);
  const size = Number(q.get('size') ?? 20);
  return { content: liste.slice(page * size, (page + 1) * size), totalElements: liste.length, page, size };
};
const jetonValide = (req) => {
  const expire = accessValides.get((req.headers.authorization || '').replace('Bearer ', ''));
  return !!expire && expire > Date.now();
};

// Routes de l'administration ; renvoie true si la requête a été traitée.
function routesAdmin(req, res, chemin, corps) {
  const estAdmin = /^\/v1\/(users|analytics|companies)(\/|$)/.test(chemin);
  if (!estAdmin || (req.method === 'GET' && /^\/v1\/users\/[^/]+$/.test(chemin))) return false;
  if (!jetonValide(req)) return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.') ?? true;
  const q = new URL(req.url, 'http://mock').searchParams;

  if (req.method === 'GET' && chemin === '/v1/users') {
    const liste = annuaire.filter(
      (u) => (!q.get('role') || u.role === q.get('role')) && (!q.get('status') || u.status === q.get('status')),
    );
    return envoyer(res, 200, parPage(liste, req.url)) ?? true;
  }
  let m = chemin.match(/^\/v1\/users\/([^/]+)\/status$/);
  if (req.method === 'PATCH' && m) {
    const u = annuaire.find((x) => x.id === m[1]);
    if (!u) return erreur(res, 404, 'USER_NOT_FOUND', 'Utilisateur introuvable.') ?? true;
    u.status = corps.status;
    return envoyer(res, 200, u) ?? true;
  }
  m = chemin.match(/^\/v1\/users\/([^/]+)$/);
  if (req.method === 'DELETE' && m) {
    const i = annuaire.findIndex((x) => x.id === m[1]);
    if (i < 0) return erreur(res, 404, 'USER_NOT_FOUND', 'Utilisateur introuvable.') ?? true;
    annuaire.splice(i, 1);
    return envoyer(res, 204) ?? true;
  }

  if (req.method === 'GET' && chemin === '/v1/analytics/dashboard/stats') {
    return envoyer(res, 200, {
      alumniCount: 320, studentCount: 1450, companyCount: entreprises.length, insertionRate: 68.4,
      internshipCount: 87, jobOfferCount: 42, updatedAt: new Date().toISOString(),
    }) ?? true;
  }
  if (req.method === 'GET' && chemin === '/v1/analytics/reports/insertion') {
    const annee = q.get('graduationYear');
    const spec = q.get('specialty');
    const reportData = rapportInsertion.filter(
      (r) => (!annee || r.graduationYear === Number(annee)) && (!spec || r.specialty === spec),
    );
    return envoyer(res, 200, { overallInsertionRate: 68.4, reportData }) ?? true;
  }
  if (req.method === 'GET' && chemin === '/v1/analytics/reports/skills-gap') {
    return envoyer(res, 200, {
      topRequiredSkills: ['Angular', 'Docker', 'SQL'],
      skillsGapAnalysis: [
        { skillName: 'Angular', demandPercentage: 80, supplyPercentage: 45, gap: 35 },
        { skillName: 'Docker', demandPercentage: 65, supplyPercentage: 20, gap: 45 },
        { skillName: 'SQL', demandPercentage: 70, supplyPercentage: 75, gap: -5 },
      ],
    }) ?? true;
  }

  if (req.method === 'GET' && chemin === '/v1/companies') {
    const requete = (q.get('query') || '').toLowerCase();
    const part = q.get('isPartner');
    const liste = entreprises.filter(
      (c) => c.name.toLowerCase().includes(requete) && (part === null || String(c.isPartner) === part),
    );
    return envoyer(res, 200, parPage(liste, req.url)) ?? true;
  }
  if (req.method === 'POST' && chemin === '/v1/companies') {
    if (!corps.name || !corps.sector || !corps.contactEmail)
      return erreur(res, 400, 'VALIDATION_ERROR', 'name, sector et contactEmail sont obligatoires.') ?? true;
    if (entreprises.some((c) => c.name === corps.name))
      return erreur(res, 409, 'COMPANY_EXISTS', 'Une entreprise porte déjà ce nom.') ?? true;
    const c = { ...corps, id: `c${entreprises.length + 1}`, isPartner: false, createdAt: new Date().toISOString() };
    entreprises.unshift(c);
    return envoyer(res, 201, c) ?? true;
  }
  m = chemin.match(/^\/v1\/companies\/([^/]+)$/);
  if (m && (req.method === 'PUT' || req.method === 'GET')) {
    const c = entreprises.find((x) => x.id === m[1]);
    if (!c) return erreur(res, 404, 'COMPANY_NOT_FOUND', 'Entreprise introuvable.') ?? true;
    if (req.method === 'PUT') Object.assign(c, corps);
    return envoyer(res, 200, c) ?? true;
  }
  return false;
}

// --- Offres d'emploi (job-offer-service) ---
// Cet id doit être identique à ID_ENTREPRISE_MOCK dans offres-entreprise.service.ts
const ID_ENTREPRISE = '11111111-1111-4111-8111-111111111111';
const ID_AUTRE_ENTREPRISE = '22222222-2222-4222-8222-222222222222';
const nomsEntreprises = { [ID_ENTREPRISE]: 'Sonatel', [ID_AUTRE_ENTREPRISE]: 'Orange Digital Center' };
const offres = [
  // Une offre d'une AUTRE entreprise : elle ne doit jamais apparaître dans « Mes offres »
  {
    id: randomUUID(), title: 'Développeur Java', type: 'JOB', description: 'Backend Spring.',
    companyId: ID_AUTRE_ENTREPRISE, companyName: nomsEntreprises[ID_AUTRE_ENTREPRISE],
    publisherId: '99', publisherName: 'RH Orange', location: 'Dakar', remoteType: 'HYBRID',
    requiredSkills: ['Java', 'Spring'], status: 'OPEN', createdAt: '2026-11-01T09:00:00Z',
  },

  // --- Offres simulées, publiées par entreprise@uasz.sn ---
  {
    id: randomUUID(), title: 'Développeur Full Stack Angular / Spring', type: 'JOB',
    description: "Conception et développement d'applications web pour nos clients.",
    companyId: ID_ENTREPRISE, companyName: nomsEntreprises[ID_ENTREPRISE],
    publisherId: utilisateurs['entreprise@uasz.sn'].id,
    publisherName: `${utilisateurs['entreprise@uasz.sn'].firstName} ${utilisateurs['entreprise@uasz.sn'].lastName}`,
    location: 'Dakar', remoteType: 'HYBRID',
    requiredSkills: ['Angular', 'Spring Boot', 'SQL'], status: 'OPEN', createdAt: '2026-11-10T09:00:00Z',
  },
  {
    id: randomUUID(), title: 'Stage Data Analyst', type: 'INTERNSHIP',
    description: 'Stage de 6 mois : analyse de données et tableaux de bord.',
    companyId: ID_ENTREPRISE, companyName: nomsEntreprises[ID_ENTREPRISE],
    publisherId: utilisateurs['entreprise@uasz.sn'].id,
    publisherName: `${utilisateurs['entreprise@uasz.sn'].firstName} ${utilisateurs['entreprise@uasz.sn'].lastName}`,
    location: 'Ziguinchor', remoteType: 'ONSITE',
    requiredSkills: ['Python', 'SQL', 'Power BI'], status: 'OPEN', createdAt: '2026-11-12T09:00:00Z',
  },
  {
    id: randomUUID(), title: 'Ingénieur DevOps', type: 'JOB',
    description: 'Mise en place de pipelines CI/CD et gestion de conteneurs.',
    companyId: ID_ENTREPRISE, companyName: nomsEntreprises[ID_ENTREPRISE],
    publisherId: utilisateurs['entreprise@uasz.sn'].id,
    publisherName: `${utilisateurs['entreprise@uasz.sn'].firstName} ${utilisateurs['entreprise@uasz.sn'].lastName}`,
    location: 'Dakar', remoteType: 'REMOTE',
    requiredSkills: ['Docker', 'Jenkins', 'GitHub Actions'], status: 'OPEN', createdAt: '2026-11-14T09:00:00Z',
  },
];
const TYPES_OFFRE = ['JOB', 'INTERNSHIP'];

function routesOffres(req, res, chemin, corps) {
  const m = chemin.match(/^\/v1\/offers(?:\/([^/]+))?$/);
  if (!m) return false;
  if (!jetonValide(req)) return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.') ?? true;
  const email = accessEmails.get((req.headers.authorization || '').replace('Bearer ', ''));
  const utilisateur = utilisateurs[email];
  const q = new URL(req.url, 'http://mock').searchParams;

  if (req.method === 'GET' && !m[1]) {
    const terme = (q.get('query') || '').toLowerCase();
    const liste = offres.filter(
      (o) =>
        (!q.get('companyId') || o.companyId === q.get('companyId')) &&
        (!q.get('type') || o.type === q.get('type')) &&
        (!q.get('status') || o.status === q.get('status')) &&
        (!q.get('remoteType') || o.remoteType === q.get('remoteType')) &&
        (!q.get('location') || o.location.toLowerCase().includes(q.get('location').toLowerCase())) &&
        o.title.toLowerCase().includes(terme),
    );
    return envoyer(res, 200, parPage(liste, req.url)) ?? true;
  }

  if (req.method === 'GET' && m[1]) {
    const o = offres.find((x) => x.id === m[1]);
    if (!o) return erreur(res, 404, 'OFFER_NOT_FOUND', 'Offre introuvable.') ?? true;
    return envoyer(res, 200, o) ?? true;
  }

  if (req.method === 'POST' && !m[1]) {
    if (utilisateur?.role !== 'ENTREPRISE')
      return erreur(res, 403, 'FORBIDDEN', 'Seules les entreprises peuvent publier une offre.') ?? true;
    if (entreprisesNonValidees.has(email))
      return erreur(res, 403, 'COMPANY_NOT_VALIDATED', "Votre entreprise n'est pas encore validée.") ?? true;

    const invalide =
      !corps.title?.trim() || !TYPES_OFFRE.includes(corps.type) || !corps.description?.trim() ||
      !corps.companyId || !corps.location?.trim() ||
      !Array.isArray(corps.requiredSkills) || corps.requiredSkills.length === 0;
    if (invalide)
      return erreur(res, 400, 'VALIDATION_ERROR', 'title, type, description, companyId, location et requiredSkills sont obligatoires.') ?? true;
    if (!nomsEntreprises[corps.companyId])
      return erreur(res, 404, 'COMPANY_NOT_FOUND', 'Entreprise introuvable.') ?? true;

    const offre = {
      ...corps,
      id: randomUUID(),
      companyName: nomsEntreprises[corps.companyId],
      publisherId: utilisateur.id,
      publisherName: `${utilisateur.firstName} ${utilisateur.lastName}`,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    offres.unshift(offre); // la plus récente en premier
    console.log(`[offers] publiée par ${email} : ${offre.title}`);
    return envoyer(res, 201, offre) ?? true;
  }
  return false;
}


const traiter = (req, res) => {
    if (req.method === 'OPTIONS') return envoyer(res, 204);
    let brut = '';
    req.on('data', (c) => (brut += c));
    req.on('end', () => {
      const corps = brut ? JSON.parse(brut) : {};
      const chemin = req.url.split('?')[0];

      if (routesAdmin(req, res, chemin, corps)) return;

      if (routesOffres(req, res, chemin, corps)) return;

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
};

// Un même mock sert les trois services (ports par défaut des contrats : user 8081, alumni 8082, analytics 8084)
[8081, 8082, 8083, 8084].forEach((port) =>
  http
    .createServer(traiter)
    .listen(port, () => console.log(`Mock API sur http://localhost:${port}/v1 (mot de passe : ${MOT_DE_PASSE})`)),
);