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

// --- Profils étudiants, Alumni, promotions, recommandations (données en mémoire, perdues à l'arrêt) ---
const SPECS = ['Génie Logiciel', 'Réseaux et Télécommunications', 'Informatique de Gestion', 'Intelligence Artificielle'];
const NOMS = [['Awa', 'Sarr'], ['Cheikh', 'Fall'], ['Fatou', 'Ba'], ['Ibrahima', 'Diallo'], ['Aminata', 'Gueye'], ['Omar', 'Sy'], ['Khady', 'Ndoye'], ['Mamadou', 'Faye'], ['Ndeye', 'Thiam'], ['Abdou', 'Mbaye'], ['Mariama', 'Cissé'], ['Pape', 'Sow']];
const COMPETENCES = ['Java', 'Spring Boot', 'Angular', 'Docker', 'SQL', 'Python', 'React', 'Linux', 'Réseaux', 'Kubernetes'];
const DISPOS = ['AVAILABLE_FOR_INTERNSHIP', 'AVAILABLE_FOR_JOB', 'AVAILABLE_IMMEDIATELY', 'NOT_AVAILABLE'];

const profilsEtudiants = {};
NOMS.forEach(([firstName, lastName], i) => {
  const id = `s${i + 1}`;
  profilsEtudiants[id] = {
    id, userId: id, firstName, lastName, email: `${firstName}.${lastName}@etu.uasz.sn`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    specialty: SPECS[i % SPECS.length], academicYear: 2024 + (i % 3),
    bio: i % 2 ? 'Étudiant motivé, à la recherche d’un stage de fin d’études.' : undefined,
    interests: ['Cloud', 'IA'].slice(0, (i % 2) + 1),
    skills: [COMPETENCES[i % 10], COMPETENCES[(i + 3) % 10], COMPETENCES[(i + 6) % 10]],
    availabilityStatus: DISPOS[i % 4], availabilityDate: i % 4 === 3 ? undefined : '2026-09-01',
  };
});
const cvsEtudiants = {
  s1: {
    id: 'cv-s1', studentId: 's1', title: 'Développeuse Java / Spring', template: 'MODERN_BLUE', language: 'Français',
    summary: 'Étudiante en génie logiciel, passionnée par les API et le cloud.', skills: ['Java', 'Spring Boot', 'Docker'],
    experiences: [{ companyName: 'Orange Sonatel', position: 'Stagiaire développeuse', startDate: '2025-07-01', endDate: '2025-09-30', description: 'API REST et déploiement Docker.' }],
    educations: [{ institution: 'UASZ', degree: 'Licence', fieldOfStudy: 'Génie Logiciel', startDate: '2022-10-01', endDate: '2025-07-01' }],
    languages: [{ language: 'Français', proficiency: 'Langue maternelle' }, { language: 'Anglais', proficiency: 'Avancé' }],
  },
};
function profilEtudiant(id) {
  if (!profilsEtudiants[id]) {
    const [email, u] = Object.entries(utilisateurs).find(([, v]) => v.id === id) ?? [];
    if (!u) return null;
    profilsEtudiants[id] = { id, userId: id, firstName: u.firstName, lastName: u.lastName, email, interests: [], skills: [], availabilityStatus: 'NOT_AVAILABLE' };
  }
  return profilsEtudiants[id];
}

const profilsAlumni = {};
const experiencesAlumni = {};
[['Awa', 'Diop'], ['Moussa', 'Kane'], ['Fatima', 'Ndiaye'], ['Samba', 'Wade'], ['Rokhaya', 'Seck'], ['Alioune', 'Badji'], ['Coumba', 'Diouf'], ['Babacar', 'Lo']].forEach(([firstName, lastName], i) => {
  const id = i === 0 ? '1' : `al${i}`;
  profilsAlumni[id] = {
    id, userId: id, firstName, lastName, email: `${firstName}.${lastName}@alumni.uasz.sn`.toLowerCase(), graduationYear: 2019 + (i % 5),
    specialty: SPECS[i % SPECS.length], currentCompany: `Entreprise ${(i % 6) + 1}`, currentPosition: ['Ingénieur logiciel', 'Administrateur réseaux', 'Data analyst', 'Chef de projet'][i % 4],
    linkedinUrl: i % 2 ? undefined : `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
  };
  experiencesAlumni[id] = [
    { id: `e${id}-1`, companyName: profilsAlumni[id].currentCompany, position: profilsAlumni[id].currentPosition, startDate: '2023-02-01', isCurrent: true, description: 'Missions principales du poste actuel.' },
    { id: `e${id}-2`, companyName: 'Start-up locale', position: 'Stagiaire', startDate: '2021-07-01', endDate: '2021-12-31', isCurrent: false },
  ];
});
let compteurAlumni = 0;
const promotions = [
  { id: 'p1', academicYear: 2025, specialty: 'Génie Logiciel' },
  { id: 'p2', academicYear: 2025, specialty: 'Réseaux et Télécommunications' },
  { id: 'p3', academicYear: 2024, specialty: 'Génie Logiciel' },
];
const diplomesDe = (p) => Object.values(profilsEtudiants).filter((s) => s.academicYear === p.academicYear && s.specialty === p.specialty);
const vue = (p) => ({ ...p, graduateCount: diplomesDe(p).length });
const contient = (v, q) => (v ?? '').toString().toLowerCase().includes(q);

function routesAnnuaire(req, res, chemin, corps) {
  const m = chemin.match(/^\/v1\/(students|alumni|promotions)(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (!m) return false;
  if (!jetonValide(req)) return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.') ?? true;
  const [, ressource, id, sous] = m;
  const q = new URL(req.url, 'http://mock').searchParams;
  const ok = (corpsReponse, statut = 200) => envoyer(res, statut, corpsReponse) ?? true;
  const absent = (msg) => erreur(res, 404, 'NOT_FOUND', msg) ?? true;
  const invalide = (msg) => erreur(res, 400, 'BAD_REQUEST', msg) ?? true;

  if (ressource === 'students') {
    if (!id && req.method === 'GET') {
      profilEtudiant('2');
      const texte = (q.get('query') || '').trim().toLowerCase();
      const liste = Object.values(profilsEtudiants).filter((s) =>
        (!texte || contient(s.firstName, texte) || contient(s.lastName, texte) || (s.skills ?? []).some((c) => contient(c, texte))) &&
        (!q.get('specialty') || (s.specialty ?? '').toLowerCase() === q.get('specialty').toLowerCase()) &&
        (!q.get('graduationYear') || s.academicYear === Number(q.get('graduationYear'))) &&
        (!q.get('availability') || s.availabilityStatus === q.get('availability')));
      return ok(parPage(liste, req.url));
    }
    const profil = id && profilEtudiant(id);
    if (!profil) return absent('Étudiant introuvable.');
    if (!sous && req.method === 'GET') return ok(profil);
    if (!sous && req.method === 'PUT') {
      if (corps.academicYear != null && (corps.academicYear < 2000 || corps.academicYear > 2100)) return invalide("L'année doit être comprise entre 2000 et 2100.");
      Object.assign(profil, { specialty: corps.specialty, academicYear: corps.academicYear, bio: corps.bio, interests: corps.interests ?? [], skills: corps.skills ?? [], availabilityStatus: corps.availabilityStatus ?? 'NOT_AVAILABLE', availabilityDate: corps.availabilityDate });
      return ok(profil);
    }
    if (sous === 'cv' && req.method === 'GET') return cvsEtudiants[id] ? ok(cvsEtudiants[id]) : absent("Cet étudiant n'a pas encore de CV.");
    if (sous === 'cv' && req.method === 'PUT') {
      if (!corps.title || !corps.template || !corps.language) return invalide('Le titre, le modèle et la langue du CV sont obligatoires.');
      cvsEtudiants[id] = { id: `cv-${id}`, studentId: id, ...corps };
      return ok(cvsEtudiants[id]);
    }
  }

  if (ressource === 'alumni') {
    if (id === 'recommendations' && req.method === 'POST') {
      if (!corps.studentId || !corps.companyId || !corps.comments?.trim()) return invalide('studentId, companyId et comments sont obligatoires.');
      if (!profilEtudiant(corps.studentId)) return absent('Étudiant introuvable.');
      console.log(`[recommandation] ${corps.studentId} -> ${corps.companyId} : ${corps.comments}`);
      return ok({ id: `r${++compteurAlumni}`, recommenderId: '1', ...corps, createdAt: new Date().toISOString() }, 201);
    }
    if (!id && req.method === 'GET') {
      const texte = (q.get('query') || '').trim().toLowerCase();
      const societe = q.get('companyId') && entreprises.find((c) => c.id === q.get('companyId'))?.name;
      const liste = Object.values(profilsAlumni).filter((a) =>
        (!texte || [a.firstName, a.lastName, a.currentCompany, a.currentPosition].some((v) => contient(v, texte))) &&
        (!q.get('companyId') || a.currentCompany === societe) &&
        (!q.get('graduationYear') || a.graduationYear === Number(q.get('graduationYear'))));
      return ok(parPage(liste, req.url));
    }
    const profil = id && profilsAlumni[id];
    if (!profil) return absent('Alumni introuvable.');
    if (!sous && req.method === 'GET') return ok({ ...profil, experiences: experiencesAlumni[id] ?? [] });
    if (!sous && req.method === 'PUT') { Object.assign(profil, { graduationYear: corps.graduationYear, specialty: corps.specialty, currentCompany: corps.currentCompany, currentPosition: corps.currentPosition, linkedinUrl: corps.linkedinUrl }); return ok(profil); }
    if (sous === 'experiences' && req.method === 'GET') return ok(experiencesAlumni[id] ?? []);
    if (sous === 'experiences' && req.method === 'POST') {
      if (!corps.companyName || !corps.position || !corps.startDate) return invalide('companyName, position et startDate sont obligatoires.');
      const e = { id: `e${id}-${Date.now()}`, ...corps };
      (experiencesAlumni[id] ??= []).push(e);
      return ok(e, 201);
    }
  }

  if (ressource === 'promotions') {
    if (!id && req.method === 'GET') return ok(promotions.map(vue));
    if (!id && req.method === 'POST') {
      if (!corps.academicYear || !corps.specialty?.trim()) return invalide('academicYear et specialty sont obligatoires.');
      if (promotions.some((p) => p.academicYear === corps.academicYear && p.specialty === corps.specialty.trim())) return erreur(res, 409, 'PROMOTION_EXISTS', 'Cette promotion existe déjà.') ?? true;
      const p = { id: `p${promotions.length + 1}`, academicYear: corps.academicYear, specialty: corps.specialty.trim() };
      promotions.push(p);
      return ok(vue(p), 201);
    }
    const promo = promotions.find((p) => p.id === id);
    if (sous === 'graduates' && req.method === 'GET') return promo ? ok(diplomesDe(promo)) : absent('Promotion introuvable.');
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
      if (routesAnnuaire(req, res, chemin, corps)) return;

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
[8081, 8082, 8084].forEach((port) =>
  http
    .createServer(traiter)
    .listen(port, () => console.log(`Mock API sur http://localhost:${port}/v1 (mot de passe : ${MOT_DE_PASSE})`)),
);
