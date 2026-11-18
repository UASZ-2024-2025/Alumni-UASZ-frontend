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
const accessEmails = new Map(); // token -> email (identifie l'utilisateur connecté)
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
  accessEmails.set(accessToken, email);
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

// --- Données de test des candidatures et propositions (étudiant 2 ; recruteurs : alumni 1, entreprise 4) ---
const STATUTS_CANDIDATURE = ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'ACCEPTED'];
const candidatures = Array.from({ length: 12 }, (_, i) => ({
  id: `a${i + 1}`, offerId: `o${i + 1}`, offerTitle: `Stage développeur ${i + 1}`, studentId: '2',
  studentName: 'Moussa Ndiaye', status: STATUTS_CANDIDATURE[i % STATUTS_CANDIDATURE.length],
  createdAt: `2026-10-${String(i + 10).padStart(2, '0')}T09:00:00Z`,
}));
const propositions = [
  { id: 'p1', offerId: 'o20', offerTitle: 'Développeur Angular', studentId: '2', studentName: 'Moussa Ndiaye',
    recruiterId: '4', recruiterName: 'Ibou Ba', message: 'Votre profil correspond à notre équipe front.', status: 'PENDING', createdAt: '2026-11-10T09:00:00Z' },
  { id: 'p2', offerId: 'o21', offerTitle: 'Stage data', studentId: '2', studentName: 'Moussa Ndiaye',
    recruiterId: '1', recruiterName: 'Awa Diop', message: 'Je recommande ce stage, contactez-moi.', status: 'PENDING', createdAt: '2026-11-12T09:00:00Z' },
  { id: 'p3', offerId: 'o22', offerTitle: 'Administrateur réseau', studentId: '2', studentName: 'Moussa Ndiaye',
    recruiterId: '4', recruiterName: 'Ibou Ba', status: 'EXPIRED', createdAt: '2026-09-01T09:00:00Z' },
];

// Routes du service offres ; renvoie true si la requête a été traitée.
function routesOffres(req, res, chemin, corps) {
  if (!/^\/v1\/(applications|proposals)(\/|$)/.test(chemin)) return false;
  if (!jetonValide(req)) return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.') ?? true;
  const q = new URL(req.url, 'http://mock').searchParams;
  const filtre = (cle) => (x) => !q.get(cle) || x[cle] === q.get(cle);
  if (req.method === 'GET' && chemin === '/v1/applications') {
    return envoyer(res, 200, parPage(candidatures.filter(filtre('studentId')).filter(filtre('status')), req.url)) ?? true;
  }
  if (req.method === 'GET' && chemin === '/v1/proposals') {
    return envoyer(res, 200, propositions.filter(filtre('studentId')).filter(filtre('recruiterId')).filter(filtre('status'))) ?? true;
  }
  const m = chemin.match(/^\/v1\/proposals\/([^/]+)\/status$/);
  if (req.method === 'PATCH' && m) {
    const p = propositions.find((x) => x.id === m[1]);
    if (!p) return erreur(res, 404, 'PROPOSAL_NOT_FOUND', 'Proposition introuvable.') ?? true;
    p.status = corps.status;
    console.log(`[proposals] ${p.id} -> ${p.status}`);
    return envoyer(res, 200, p) ?? true;
  }
  return false;
}

// --- Annuaires étudiants et Alumni (recherche de participants) : profils construits depuis l'annuaire des comptes ---
function routesAnnuaires(req, res, chemin) {
  const role = { '/v1/students': 'ETUDIANT', '/v1/alumni': 'ALUMNI' }[chemin];
  if (req.method !== 'GET' || !role) return false;
  if (!jetonValide(req)) return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.') ?? true;
  const requete = (new URL(req.url, 'http://mock').searchParams.get('query') || '').toLowerCase();
  const liste = annuaire
    .filter((u) => u.role === role && u.status === 'ACTIF' && `${u.firstName} ${u.lastName}`.toLowerCase().includes(requete))
    .map((u) => ({
      id: `profil-${u.id}`, userId: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email,
      specialty: 'Génie Logiciel', ...(role === 'ALUMNI' ? { currentPosition: 'Développeur' } : {}),
    }));
  return envoyer(res, 200, parPage(liste, req.url)) ?? true;
}

// --- Groupes de discussion (service messagerie, port 8085, contrat 1.1.0) ---
// Mêmes règles que le back : OWNER/ADMIN = administrateurs, réglages, préférences personnelles, messages système.
// L'étudiant (2) est membre de g1 et g2, pas de g3 : /groupes/g3 doit afficher « Accès réservé aux membres ».
const ilYA = (jours, h, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const compte = (id) => annuaire.find((u) => u.id === id);
const nomDe = (id) => { const u = compte(id); return u ? `${u.firstName} ${u.lastName}` : undefined; };
const membre = (id, groupRole = 'MEMBER', joinedAt = ilYA(10, 9)) =>
  ({ userId: id, userName: nomDe(id), userRole: compte(id)?.role, groupRole, joinedAt });
const reglagesParDefaut = () => ({ onlyAdminsCanSend: false, onlyAdminsCanEditInfo: true, onlyAdminsCanAddMembers: true });
const groupes = [
  { id: 'g1', name: 'Promo GL 2025', description: 'Entraide et annonces de la promotion Génie Logiciel.', ownerId: '3',
    members: [membre('3', 'OWNER'), membre('1', 'ADMIN'), membre('2'), membre('u10'), membre('u11')],
    settings: reglagesParDefaut(), createdAt: ilYA(10, 9) },
  { id: 'g2', name: 'Club Data & IA', description: 'Veille, projets et offres autour de la data.', ownerId: '2',
    members: [membre('2', 'OWNER'), membre('1'), membre('u13')], settings: reglagesParDefaut(), createdAt: ilYA(6, 14) },
  { id: 'g3', name: 'Conseil pédagogique', description: 'Réservé aux enseignants.', ownerId: '3',
    members: [membre('3', 'OWNER'), membre('u12')], settings: reglagesParDefaut(), createdAt: ilYA(20, 8) },
  { id: 'g4', name: 'Annonces UFR SET', description: 'Informations officielles : seuls les administrateurs écrivent.', ownerId: '3',
    members: [membre('3', 'OWNER'), membre('2'), membre('1')],
    settings: { ...reglagesParDefaut(), onlyAdminsCanSend: true }, createdAt: ilYA(30, 8) },
];
let numeroMessage = 0;
const msg = (groupId, senderId, content, createdAt, type = 'TEXT') => ({
  id: `m${++numeroMessage}`, groupId, senderId, senderName: nomDe(senderId), type, content, deleted: false, createdAt,
});
const messagesGroupes = [
  msg('g1', '3', 'Fatou Sow a créé le groupe « Promo GL 2025 »', ilYA(10, 9), 'SYSTEM'),
  msg('g1', '3', 'Bonjour à tous, bienvenue dans le groupe de la promo !', ilYA(3, 9, 5)),
  msg('g1', '1', 'Merci Madame. Je partagerai ici les offres de mon entreprise.', ilYA(3, 9, 20)),
  msg('g1', 'u10', 'Super, merci Awa !', ilYA(3, 9, 22)),
  msg('g1', '3', 'Fatou Sow a nommé Awa Diop administrateur', ilYA(3, 9, 30), 'SYSTEM'),
  msg('g1', '2', "Est-ce que quelqu'un a le planning des soutenances ?", ilYA(1, 18, 2)),
  msg('g1', '3', 'Il sera publié vendredi.', ilYA(1, 18, 30)),
  msg('g1', '3', 'Pensez à déposer vos rapports avant jeudi minuit.', ilYA(0, 8, 15)),
  msg('g1', 'u11', 'Bien noté, merci !', ilYA(0, 8, 40)),
  msg('g2', '2', 'Atelier pandas samedi à 10 h en salle 3.', ilYA(2, 11)),
  msg('g2', '1', 'Je peux venir présenter un cas réel de scoring.', ilYA(2, 12, 10)),
  msg('g3', '3', 'Réunion du conseil lundi.', ilYA(1, 10)),
  msg('g4', '3', 'Fatou Sow a modifié les réglages : seuls les administrateurs peuvent envoyer des messages', ilYA(30, 8), 'SYSTEM'),
  msg('g4', '3', 'Les inscriptions pédagogiques ferment le 30 novembre.', ilYA(4, 10)),
];
const lus = new Map(); // `${groupe}:${utilisateur}` -> date de dernière lecture
lus.set('g1:2', ilYA(1, 18, 10));
const preferences = new Map(); // `${groupe}:${utilisateur}` -> { pinned, archived, mutedUntil, mutedForever }
preferences.set('g2:2', { pinned: true, archived: false });

function routesGroupes(req, res, chemin, corps) {
  if (!/^\/v1\/messages\/groups(\/|$)/.test(chemin)) return false;
  if (!jetonValide(req)) return erreur(res, 401, 'TOKEN_EXPIRED', 'Token expiré ou invalide.') ?? true;
  const moi = utilisateurs[accessEmails.get((req.headers.authorization || '').replace('Bearer ', ''))];
  if (moi.role === 'ENTREPRISE') return erreur(res, 403, 'FORBIDDEN', 'Groupes réservés à la communauté UASZ.') ?? true;
  const maintenant = () => new Date().toISOString();
  const moiDans = (g) => g.members.find((m) => m.userId === moi.id);
  const estAdminDe = (g) => ['OWNER', 'ADMIN'].includes(moiDans(g)?.groupRole);
  const qui = nomDe(moi.id) ?? 'Un participant';
  const systeme = (g, texte) => messagesGroupes.push(msg(g.id, moi.id, texte, maintenant(), 'SYSTEM'));
  const prefs = (g) => {
    const p = preferences.get(`${g.id}:${moi.id}`) ?? {};
    const muted = !!p.mutedForever || (!!p.mutedUntil && p.mutedUntil > maintenant());
    return { pinned: !!p.pinned, archived: !!p.archived, muted, ...(muted && !p.mutedForever ? { mutedUntil: p.mutedUntil } : {}) };
  };
  const vue = (g) => ({ ...g, preferences: prefs(g) });
  const noms = (ids) => {
    const n = ids.map((id) => nomDe(id) ?? 'un participant');
    return n.length > 1 ? `${n.slice(0, -1).join(', ')} et ${n[n.length - 1]}` : n[0];
  };
  const ajouterMembres = (g, ids = []) => {
    const ajoutes = [...new Set(ids)].filter((id) => compte(id) && !g.members.some((m) => m.userId === id));
    ajoutes.forEach((id) => g.members.push(membre(id, 'MEMBER', maintenant())));
    return ajoutes;
  };
  const nomValide = (n) => typeof n === 'string' && n.trim().length >= 3 && n.trim().length <= 100;

  if (chemin === '/v1/messages/groups') {
    if (req.method === 'GET') {
      const liste = groupes.filter(moiDans).map((g) => {
        const fil = messagesGroupes.filter((m) => m.groupId === g.id);
        const dernier = fil[fil.length - 1];
        const depuis = [lus.get(`${g.id}:${moi.id}`) ?? '', moiDans(g).joinedAt].sort().pop();
        return {
          id: g.id, name: g.name, memberCount: g.members.length,
          lastMessage: dernier?.deleted ? undefined : dernier?.content, lastMessageType: dernier?.type,
          lastMessageSenderName: dernier?.senderName, lastMessageTime: dernier?.createdAt ?? g.createdAt,
          unreadCount: fil.filter((m) => m.type === 'TEXT' && !m.deleted && m.senderId !== moi.id && m.createdAt > depuis).length,
          preferences: prefs(g),
        };
      });
      liste.sort((a, b) => Number(b.preferences.pinned) - Number(a.preferences.pinned) || b.lastMessageTime.localeCompare(a.lastMessageTime));
      return envoyer(res, 200, liste) ?? true;
    }
    if (req.method === 'POST') {
      if (!nomValide(corps.name)) return erreur(res, 400, 'INVALID_GROUP', 'Le nom du groupe doit contenir entre 3 et 100 caractères.') ?? true;
      const g = { id: `g${Date.now()}`, name: corps.name.trim(), description: corps.description?.trim() || undefined, ownerId: moi.id,
        members: [membre(moi.id, 'OWNER', maintenant())], settings: reglagesParDefaut(), createdAt: maintenant() };
      ajouterMembres(g, corps.memberIds);
      groupes.push(g);
      systeme(g, `${qui} a créé le groupe « ${g.name} »`);
      lus.set(`${g.id}:${moi.id}`, maintenant());
      console.log(`[groupes] ${moi.id} crée ${g.id} (${g.members.length} membres)`);
      return envoyer(res, 201, vue(g)) ?? true;
    }
  }

  const m = chemin.match(/^\/v1\/messages\/groups\/([^/]+)(\/[a-z]+)?(?:\/([^/]+))?$/);
  if (!m) return false;
  const [, id, suite = '', cible] = m;
  const g = groupes.find((x) => x.id === id);
  if (!g) return erreur(res, 404, 'GROUP_NOT_FOUND', 'Groupe introuvable.') ?? true;
  const interdit = (message = "Vous n'êtes pas membre de ce groupe.") => erreur(res, 403, 'FORBIDDEN', message) ?? true;

  if (suite === '' && req.method === 'DELETE') {
    if (moiDans(g)?.groupRole !== 'OWNER' && moi.role !== 'ADMINISTRATEUR') return interdit('Suppression réservée au propriétaire.');
    groupes.splice(groupes.indexOf(g), 1);
    return envoyer(res, 204) ?? true;
  }
  const moiMembre = moiDans(g);
  if (!moiMembre) {
    console.log(`[groupes] 403 : ${moi.id} n'est pas membre de ${g.id}`);
    return interdit();
  }
  if (suite === '' && req.method === 'GET') return envoyer(res, 200, vue(g)) ?? true;
  if (suite === '' && req.method === 'PUT') {
    if (g.settings.onlyAdminsCanEditInfo && !estAdminDe(g)) return interdit('Seuls les administrateurs peuvent modifier les infos.');
    if (corps.name !== undefined && !nomValide(corps.name)) return erreur(res, 400, 'INVALID_GROUP', 'Le nom du groupe doit contenir entre 3 et 100 caractères.') ?? true;
    if (corps.name !== undefined && corps.name.trim() !== g.name) {
      g.name = corps.name.trim();
      systeme(g, `${qui} a renommé le groupe en « ${g.name} »`);
    }
    if (corps.description !== undefined && (corps.description.trim() || undefined) !== g.description) {
      g.description = corps.description.trim() || undefined;
      systeme(g, `${qui} a modifié la description du groupe`);
    }
    return envoyer(res, 200, vue(g)) ?? true;
  }
  if (suite === '/settings' && req.method === 'PATCH') {
    if (!estAdminDe(g)) return interdit('Seuls les administrateurs peuvent modifier les réglages.');
    const libelles = { onlyAdminsCanSend: 'envoyer des messages', onlyAdminsCanEditInfo: 'modifier les infos du groupe', onlyAdminsCanAddMembers: 'ajouter des participants' };
    for (const [cle, libelle] of Object.entries(libelles)) {
      if (typeof corps[cle] === 'boolean' && corps[cle] !== g.settings[cle]) {
        g.settings[cle] = corps[cle];
        systeme(g, `${qui} a modifié les réglages : ${corps[cle] ? 'seuls les administrateurs' : 'tous les participants'} peuvent ${libelle}`);
      }
    }
    return envoyer(res, 200, vue(g)) ?? true;
  }
  if (suite === '/preferences' && req.method === 'PATCH') {
    const cle = `${g.id}:${moi.id}`;
    const p = { ...(preferences.get(cle) ?? {}) };
    if (typeof corps.pinned === 'boolean') p.pinned = corps.pinned;
    if (typeof corps.archived === 'boolean') p.archived = corps.archived;
    const heures = { EIGHT_HOURS: 8, ONE_WEEK: 24 * 7 };
    if (corps.mute) {
      p.mutedForever = corps.mute === 'ALWAYS';
      p.mutedUntil = heures[corps.mute] ? new Date(Date.now() + heures[corps.mute] * 3_600_000).toISOString() : undefined;
    }
    preferences.set(cle, p);
    return envoyer(res, 200, prefs(g)) ?? true;
  }
  if (suite === '/members' && !cible && req.method === 'POST') {
    if (g.settings.onlyAdminsCanAddMembers && !estAdminDe(g)) return interdit('Seuls les administrateurs peuvent ajouter des participants.');
    if (!corps.memberIds?.length) return erreur(res, 400, 'VALIDATION_ERROR', 'memberIds est obligatoire.') ?? true;
    const ajoutes = ajouterMembres(g, corps.memberIds);
    if (ajoutes.length) systeme(g, `${qui} a ajouté ${noms(ajoutes)}`);
    return envoyer(res, 200, vue(g)) ?? true;
  }
  const visee = cible && g.members.find((x) => x.userId === cible);
  if (suite === '/members' && cible && req.method === 'PATCH') {
    if (moiMembre.groupRole !== 'OWNER') return interdit('Seul le propriétaire nomme les administrateurs.');
    if (!visee) return erreur(res, 404, 'MEMBER_NOT_FOUND', 'Membre introuvable.') ?? true;
    if (visee.groupRole === 'OWNER' || !['ADMIN', 'MEMBER'].includes(corps.groupRole)) return erreur(res, 400, 'INVALID_ROLE', 'Rôle invalide.') ?? true;
    if (visee.groupRole !== corps.groupRole) {
      visee.groupRole = corps.groupRole;
      systeme(g, corps.groupRole === 'ADMIN' ? `${qui} a nommé ${noms([cible])} administrateur` : `${qui} a retiré ${noms([cible])} des administrateurs`);
    }
    return envoyer(res, 200, vue(g)) ?? true;
  }
  if (suite === '/members' && cible && req.method === 'DELETE') {
    if (!visee) return erreur(res, 404, 'MEMBER_NOT_FOUND', 'Membre introuvable.') ?? true;
    const depart = cible === moi.id;
    const autorise = depart || moiMembre.groupRole === 'OWNER' || (moiMembre.groupRole === 'ADMIN' && visee.groupRole !== 'OWNER');
    if (!autorise) return interdit('Vous ne pouvez pas retirer ce membre.');
    g.members = g.members.filter((x) => x.userId !== cible);
    if (!g.members.length) {
      groupes.splice(groupes.indexOf(g), 1);
      return envoyer(res, 204) ?? true;
    }
    systeme(g, depart ? `${qui} a quitté le groupe` : `${qui} a retiré ${noms([cible])}`);
    if (visee.groupRole === 'OWNER') {
      const successeur = g.members.find((x) => x.groupRole === 'ADMIN') ?? g.members[0];
      successeur.groupRole = 'OWNER';
      g.ownerId = successeur.userId;
      messagesGroupes.push(msg(g.id, successeur.userId, `${nomDe(successeur.userId) ?? 'Un participant'} est maintenant propriétaire du groupe`, maintenant(), 'SYSTEM'));
    }
    return envoyer(res, 204) ?? true;
  }
  if (suite === '/messages' && !cible && req.method === 'GET') {
    // Page 0 = messages les plus récents, chaque page restituée dans l'ordre chronologique.
    const q = new URL(req.url, 'http://mock').searchParams;
    const page = Number(q.get('page') ?? 0);
    const size = Number(q.get('size') ?? 30);
    const fil = messagesGroupes.filter((x) => x.groupId === g.id).reverse();
    return envoyer(res, 200, { content: fil.slice(page * size, (page + 1) * size).reverse(), totalElements: fil.length, page, size }) ?? true;
  }
  if (suite === '/messages' && !cible && req.method === 'POST') {
    if (g.settings.onlyAdminsCanSend && !estAdminDe(g)) return interdit('Seuls les administrateurs peuvent envoyer des messages dans ce groupe.');
    const texte = corps.content?.trim();
    if (!texte || texte.length > 4000) return erreur(res, 400, 'INVALID_MESSAGE', 'Le message doit contenir entre 1 et 4000 caractères.') ?? true;
    const nouveau = msg(g.id, moi.id, texte, maintenant());
    messagesGroupes.push(nouveau);
    lus.set(`${g.id}:${moi.id}`, nouveau.createdAt);
    return envoyer(res, 201, nouveau) ?? true;
  }
  if (suite === '/messages' && cible && req.method === 'DELETE') {
    const message = messagesGroupes.find((x) => x.groupId === g.id && x.id === cible);
    if (!message) return erreur(res, 404, 'MESSAGE_NOT_FOUND', 'Message introuvable.') ?? true;
    if (message.type === 'SYSTEM') return erreur(res, 400, 'INVALID_MESSAGE', 'Les messages système ne peuvent pas être supprimés.') ?? true;
    if (message.senderId !== moi.id && !estAdminDe(g)) return interdit('Vous ne pouvez supprimer que vos propres messages.');
    Object.assign(message, { deleted: true, content: undefined });
    return envoyer(res, 204) ?? true;
  }
  if (suite === '/read' && req.method === 'PATCH') {
    lus.set(`${g.id}:${moi.id}`, maintenant());
    return envoyer(res, 204) ?? true;
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
      if (routesAnnuaires(req, res, chemin)) return;
      if (routesGroupes(req, res, chemin, corps)) return;

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

// Un même mock sert les cinq services (ports par défaut des contrats : user 8081, alumni 8082, offres 8083, analytics 8084, messagerie 8085)
[8081, 8082, 8083, 8084, 8085].forEach((port) =>
  http
    .createServer(traiter)
    .listen(port, () => console.log(`Mock API sur http://localhost:${port}/v1 (mot de passe : ${MOT_DE_PASSE})`)),
);