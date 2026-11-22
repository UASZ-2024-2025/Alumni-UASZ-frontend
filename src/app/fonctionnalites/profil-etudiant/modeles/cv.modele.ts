import { AvailabilityStatus } from '../../../api/generes/alumni/model/availabilityStatus';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { User } from '../../../api/generes/utilisateurs/model/user';

export const MODELES_CV = [
  { code: 'MODERN_BLUE', libelle: 'Moderne (bleu)' },
  { code: 'UASZ_VERT', libelle: 'UASZ (vert)' },
  { code: 'CLASSIC', libelle: 'Classique (noir et blanc)' },
] as const;

export const LANGUES_CV = ['Français', 'Anglais'] as const;

export const NIVEAUX_LANGUE = ['Débutant', 'Intermédiaire', 'Avancé', 'Courant', 'Langue maternelle'] as const;

export const LIBELLES_DISPONIBILITE: Record<AvailabilityStatus, string> = {
  AVAILABLE_FOR_INTERNSHIP: 'Disponible pour un stage',
  AVAILABLE_FOR_JOB: 'Disponible pour un emploi',
  AVAILABLE_IMMEDIATELY: 'Disponible immédiatement',
  NOT_AVAILABLE: 'Non disponible',
};

export interface ExperienceCv {
  companyName: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface FormationCv {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
}

export interface LangueCv {
  language: string;
  proficiency: string;
}

/** Tout ce qu'il faut pour afficher l'aperçu et générer le PDF (identité + contenu éditable). */
export interface DonneesCv {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  specialite: string;
  titre: string;
  langue: string;
  modele: string;
  resume: string;
  competences: string[];
  experiences: ExperienceCv[];
  formations: FormationCv[];
  langues: LangueCv[];
  /** Centres d'intérêt : repris du profil, non enregistrés avec le CV. */
  interets: string[];
}

export interface TitresSections {
  resume: string;
  experiences: string;
  formations: string;
  competences: string;
  langues: string;
  interets: string;
  contact: string;
  present: string;
}

const TITRES_SECTIONS: Record<string, TitresSections> = {
  Français: {
    resume: 'Profil',
    experiences: 'Expériences professionnelles',
    formations: 'Formation',
    competences: 'Compétences',
    langues: 'Langues',
    interets: 'Centres d’intérêt',
    contact: 'Contact',
    present: 'Aujourd’hui',
  },
  Anglais: {
    resume: 'Profile',
    experiences: 'Work experience',
    formations: 'Education',
    competences: 'Skills',
    langues: 'Languages',
    interets: 'Interests',
    contact: 'Contact',
    present: 'Present',
  },
};

/** Mise en page unique du CV (PDF et aperçu) : feuille A4 en mm, colonne gauche (contact, compétences, langues) et colonne principale. */
export const MISE_EN_PAGE_CV = { largeur: 210, hauteur: 297, colonneGauche: 64, marge: 8 } as const;

/** Initiales affichées en tête de la colonne gauche. */
export function initialesCv(d: Pick<DonneesCv, 'prenom' | 'nom'>): string {
  return [d.prenom, d.nom].map((v) => v.trim().charAt(0).toUpperCase()).join('') || 'CV';
}

export function titresSections(langue: string): TitresSections {
  return TITRES_SECTIONS[langue] ?? TITRES_SECTIONS['Français'];
}

/** CV vide pré-rempli avec ce que l'on sait déjà de l'étudiant (profil et compte). */
export function cvInitial(utilisateur: User | null, profil: StudentProfile | null): DonneesCv {
  return {
    prenom: profil?.firstName ?? utilisateur?.firstName ?? '',
    nom: profil?.lastName ?? utilisateur?.lastName ?? '',
    email: profil?.email ?? utilisateur?.email ?? '',
    telephone: utilisateur?.phone ?? '',
    specialite: profil?.specialty ?? '',
    titre: profil?.specialty ? `Étudiant en ${profil.specialty}` : '',
    langue: 'Français',
    modele: 'MODERN_BLUE',
    resume: profil?.bio ?? '',
    competences: [...(profil?.skills ?? [])],
    experiences: [],
    formations: [],
    langues: [{ language: 'Français', proficiency: 'Langue maternelle' }],
    interets: [...(profil?.interests ?? [])],
  };
}

/** Reconstitue les données d'édition à partir du CV enregistré. */
export function depuisCvEnregistre(cv: CvResponse, base: DonneesCv): DonneesCv {
  return {
    ...base,
    titre: cv.title ?? base.titre,
    langue: cv.language ?? base.langue,
    modele: cv.template ?? base.modele,
    resume: cv.summary ?? '',
    competences: [...(cv.skills ?? [])],
    experiences: (cv.experiences ?? []).map((e) => ({
      companyName: e.companyName ?? '',
      position: e.position ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
      description: e.description ?? '',
    })),
    formations: (cv.educations ?? []).map((e) => ({
      institution: e.institution ?? '',
      degree: e.degree ?? '',
      fieldOfStudy: e.fieldOfStudy ?? '',
      startDate: e.startDate ?? '',
      endDate: e.endDate ?? '',
    })),
    langues: (cv.languages ?? []).map((l) => ({ language: l.language ?? '', proficiency: l.proficiency ?? '' })),
  };
}

const lignePleine = (...valeurs: string[]) => valeurs.some((v) => v.trim() !== '');

/** Retire les expériences, formations et langues entièrement vides (lignes ajoutées mais jamais remplies). */
export function ignorerLignesVides(d: DonneesCv): DonneesCv {
  return {
    ...d,
    experiences: d.experiences.filter((e) => lignePleine(e.companyName, e.position, e.description)),
    formations: d.formations.filter((f) => lignePleine(f.institution, f.degree, f.fieldOfStudy)),
    langues: d.langues.filter((l) => lignePleine(l.language)),
  };
}

const vide = (v: string) => (v.trim() === '' ? undefined : v.trim());

/** Corps de la requête PUT /students/{id}/cv (les lignes entièrement vides sont ignorées). */
export function versRequeteCv(brut: DonneesCv) {
  const d = ignorerLignesVides(brut);
  return {
    title: d.titre.trim(),
    template: d.modele,
    language: d.langue,
    summary: vide(d.resume),
    skills: d.competences,
    experiences: d.experiences
      .map((e) => ({
        companyName: vide(e.companyName),
        position: vide(e.position),
        startDate: vide(e.startDate),
        endDate: vide(e.endDate),
        description: vide(e.description),
      })),
    educations: d.formations
      .map((f) => ({
        institution: vide(f.institution),
        degree: vide(f.degree),
        fieldOfStudy: vide(f.fieldOfStudy),
        startDate: vide(f.startDate),
        endDate: vide(f.endDate),
      })),
    languages: d.langues
      .map((l) => ({ language: l.language.trim(), proficiency: vide(l.proficiency) })),
  };
}

/** « sept. 2025 » à partir de « 2025-09-01 » (sans passer par un fuseau horaire). */
export function formaterMois(iso: string, langue: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return new Intl.DateTimeFormat(langue === 'Anglais' ? 'en-GB' : 'fr-FR', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** « 1 septembre 2026 » à partir de « 2026-09-01 ». */
export function formaterDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  );
}

export function periode(debut: string, fin: string, langue: string): string {
  const d = formaterMois(debut, langue);
  const f = formaterMois(fin, langue);
  if (!d && !f) return '';
  return `${d || '…'} – ${f || titresSections(langue).present}`;
}

export function nomFichierPdf(d: DonneesCv): string {
  const base = `CV ${d.prenom} ${d.nom}`
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_');
  return `${base || 'CV'}.pdf`;
}
