import { Injectable } from '@angular/core';
import { DonneesCv, ignorerLignesVides, initialesCv, MISE_EN_PAGE_CV, nomFichierPdf, periode, titresSections } from '../modeles/cv.modele';

type Rvb = [number, number, number];

interface Theme {
  accent: Rvb;
  /** Colonne gauche pleine (texte blanc) ou grise (texte encre). */
  colonnePleine: boolean;
  police: 'helvetica' | 'times';
}

const THEMES: Record<string, Theme> = {
  MODERN_BLUE: { accent: [29, 79, 145], colonnePleine: true, police: 'helvetica' },
  UASZ_VERT: { accent: [11, 93, 59], colonnePleine: true, police: 'helvetica' },
  CLASSIC: { accent: [30, 30, 30], colonnePleine: false, police: 'times' },
};

const ENCRE: Rvb = [30, 30, 30];
const GRIS: Rvb = [95, 95, 95];
const BLANC: Rvb = [255, 255, 255];
const FOND_CLASSIQUE: Rvb = [238, 238, 238];
const { largeur: LARGEUR, hauteur: HAUTEUR, colonneGauche: COL_G, marge: MARGE } = MISE_EN_PAGE_CV;
const X_PRINCIPAL = COL_G + MARGE + 2;
const LARGEUR_PRINCIPALE = LARGEUR - X_PRINCIPAL - MARGE;
const LARGEUR_GAUCHE = COL_G - 2 * MARGE;

/** Les polices PDF standard ne couvrent que le Latin-1 / WinAnsi : on retire le reste (emojis, etc.). */
export function versLatin(texte: string): string {
  return texte.replace(/[^\n\x20-\x7E -ÿŒœ–—‘’“”•…€]/g, '');
}

/** Échelles essayées dans l'ordre : on réduit légèrement la typographie pour tenir sur 2 pages au plus. */
const ECHELLES = [1, 0.94, 0.88, 0.82];
const PAGES_MAX = 2;

type Style = 'normal' | 'bold' | 'italic';
interface Ligne { texte: string; taille: number; style: Style; couleur: Rvb; avant?: number }

/** Génère le CV en PDF (texte vectoriel, sélectionnable) avec jsPDF, chargé à la demande. */
@Injectable({ providedIn: 'root' })
export class CvPdfService {
  async generer(brut: DonneesCv): Promise<Blob> {
    const d = ignorerLignesVides(brut);
    const { jsPDF } = await import('jspdf');
    let doc = this.dessiner(new jsPDF({ unit: 'mm', format: 'a4' }), d, ECHELLES[0]);
    for (const echelle of ECHELLES.slice(1)) {
      if (doc.getNumberOfPages() <= PAGES_MAX) break;
      doc = this.dessiner(new jsPDF({ unit: 'mm', format: 'a4' }), d, echelle);
    }
    return doc.output('blob');
  }

  private dessiner(doc: import('jspdf').jsPDF, d: DonneesCv, e: number): import('jspdf').jsPDF {
    const theme = THEMES[d.modele] ?? THEMES['MODERN_BLUE'];
    const t = titresSections(d.langue);
    const texteGauche = theme.colonnePleine ? BLANC : ENCRE;
    const nomComplet = `${d.prenom} ${d.nom}`.trim() || 'Nom Prénom';
    let y = 0;

    const police = (style: Style, taille: number) => {
      doc.setFont(theme.police, style);
      doc.setFontSize(taille * e);
    };
    const fondColonne = () => {
      doc.setFillColor(...(theme.colonnePleine ? theme.accent : FOND_CLASSIQUE));
      doc.rect(0, 0, COL_G, HAUTEUR, 'F');
    };
    const saut = (hauteur: number) => {
      if (y + hauteur > HAUTEUR - MARGE) {
        doc.addPage();
        fondColonne();
        y = MARGE + 2;
      }
    };

    // ----- Colonne principale : un bloc n'est jamais coupé entre deux pages -----
    const decouper = (l: Ligne) => {
      police(l.style, l.taille);
      return doc.splitTextToSize(versLatin(l.texte), LARGEUR_PRINCIPALE) as string[];
    };
    const hauteurBloc = (lignes: Ligne[]) =>
      lignes.reduce((h, l) => h + (l.avant ?? 0) * e + decouper(l).length * l.taille * e * 0.45, 0);
    const titreSection = (libelle: string, premier: Ligne[]) => {
      saut(12 * e + hauteurBloc(premier)); // le titre reste avec son premier bloc
      y += 5 * e;
      police('bold', 11.5);
      doc.setTextColor(...theme.accent);
      doc.text(versLatin(libelle.toUpperCase()), X_PRINCIPAL, y);
      doc.setDrawColor(...theme.accent);
      doc.setLineWidth(0.4);
      doc.line(X_PRINCIPAL, y + 1.8 * e, LARGEUR - MARGE, y + 1.8 * e);
      y += 7 * e;
    };
    const bloc = (lignes: Ligne[], espaceApres = 3.5) => {
      // ponytail: un bloc plus haut qu'une page (résumé énorme) est coupé ligne à ligne par saut().
      saut(Math.min(hauteurBloc(lignes), HAUTEUR - 2 * MARGE - 4));
      for (const l of lignes) {
        y += (l.avant ?? 0) * e;
        police(l.style, l.taille);
        doc.setTextColor(...l.couleur);
        const interligne = l.taille * e * 0.45;
        for (const ligne of decouper(l)) {
          saut(interligne);
          doc.text(ligne, X_PRINCIPAL, y);
          y += interligne;
        }
      }
      y += espaceApres * e;
    };
    const entete = (intitule: string, sous: string, description = ''): Ligne[] => [
      { texte: intitule, taille: 11, style: 'bold', couleur: ENCRE },
      ...(sous ? [{ texte: sous, taille: 9.5, style: 'italic' as Style, couleur: theme.accent }] : []),
      ...(description.trim() ? [{ texte: description, taille: 10, style: 'normal' as Style, couleur: ENCRE, avant: 0.8 }] : []),
    ];
    const section = (libelle: string, blocs: Ligne[][]) => {
      titreSection(libelle, blocs[0]);
      for (const b of blocs) bloc(b);
    };

    fondColonne();

    // ----- Colonne principale : en-tête puis sections -----
    y = MARGE + 10;
    police('bold', 24);
    doc.setTextColor(...theme.accent);
    for (const ligne of doc.splitTextToSize(versLatin(nomComplet), LARGEUR_PRINCIPALE) as string[]) {
      doc.text(ligne, X_PRINCIPAL, y);
      y += 10 * e;
    }
    if (d.titre.trim()) {
      police('italic', 12.5);
      doc.setTextColor(...GRIS);
      for (const ligne of doc.splitTextToSize(versLatin(d.titre), LARGEUR_PRINCIPALE) as string[]) {
        doc.text(ligne, X_PRINCIPAL, y);
        y += 6 * e;
      }
    }

    if (d.resume.trim()) {
      section(t.resume, [[{ texte: d.resume, taille: 10, style: 'normal', couleur: ENCRE }]]);
    }
    if (d.experiences.length) {
      section(
        t.experiences,
        d.experiences.map((x) =>
          entete(
            x.position || x.companyName,
            [x.position ? x.companyName : '', periode(x.startDate, x.endDate, d.langue)].filter(Boolean).join('   |   '),
            x.description,
          ),
        ),
      );
    }
    if (d.formations.length) {
      section(
        t.formations,
        d.formations.map((f) =>
          entete(
            [f.degree, f.fieldOfStudy].filter(Boolean).join(' – ') || f.institution,
            [[f.degree, f.fieldOfStudy].filter(Boolean).length ? f.institution : '', periode(f.startDate, f.endDate, d.langue)].filter(Boolean).join('   |   '),
          ),
        ),
      );
    }

    // ----- Colonne gauche (commence page 1, se poursuit page 2 si besoin ; jamais d'élément coupé ni omis) -----
    let pageG = 1;
    doc.setPage(1);
    let yg = MARGE + 6;
    if (d.photo) {
      // Photo (ALUM-256) : déjà recadrée en carré, découpée en cercle à la place des initiales.
      const [cx, cy, r] = [COL_G / 2, yg + 11, 11];
      doc.saveGraphicsState();
      doc.circle(cx, cy, r, null);
      doc.clip();
      doc.discardPath();
      doc.addImage(d.photo, 'JPEG', cx - r, cy - r, 2 * r, 2 * r);
      doc.restoreGraphicsState();
      doc.setDrawColor(...(theme.colonnePleine ? BLANC : theme.accent));
      doc.setLineWidth(0.6);
      doc.circle(cx, cy, r, 'S');
    } else {
      doc.setFillColor(...(theme.colonnePleine ? BLANC : theme.accent));
      doc.circle(COL_G / 2, yg + 11, 11, 'F');
      police('bold', 17);
      doc.setTextColor(...(theme.colonnePleine ? theme.accent : BLANC));
      doc.text(versLatin(initialesCv(d)), COL_G / 2, yg + 14, { align: 'center' });
    }
    yg += 34;
    const limiteGauche = HAUTEUR - MARGE;
    /** Passe en haut de la page suivante (créée au besoin) si `hauteur` ne tient plus. */
    const placeGauche = (hauteur: number) => {
      if (yg + hauteur <= limiteGauche) return;
      pageG++;
      if (pageG > doc.getNumberOfPages()) {
        doc.addPage();
        fondColonne();
      }
      doc.setPage(pageG);
      yg = MARGE + 2;
    };
    const titreGauche = (libelle: string) => {
      placeGauche(4 * e + 7 * e + 9 * e); // le titre reste avec son premier élément
      yg += 4 * e;
      police('bold', 10);
      doc.setTextColor(...texteGauche);
      doc.text(versLatin(libelle.toUpperCase()), MARGE, yg);
      doc.setDrawColor(...texteGauche);
      doc.setLineWidth(0.3);
      doc.line(MARGE, yg + 1.6 * e, COL_G - MARGE, yg + 1.6 * e);
      yg += 7 * e;
    };
    /** Écrit un élément (1 à n lignes de styles différents), entier, sur la page courante de la colonne. */
    const elementGauche = (lignes: { texte: string; style?: Style; taille?: number; puce?: boolean }[], espace: number) => {
      const decoupees = lignes.map((l) => {
        const taille = l.taille ?? 9;
        police(l.style ?? 'normal', taille);
        const brutes = doc.splitTextToSize(versLatin((l.puce ? '•  ' : '') + l.texte), LARGEUR_GAUCHE) as string[];
        return { l, taille, brutes };
      });
      const hauteur = decoupees.reduce((h, x) => h + x.brutes.length * x.taille * e * 0.45, 0);
      placeGauche(hauteur);
      doc.setTextColor(...texteGauche);
      for (const { l, taille, brutes } of decoupees) {
        police(l.style ?? 'normal', taille);
        brutes.forEach((ligne, i) => {
          doc.text(i > 0 && l.puce ? '   ' + ligne : ligne, MARGE, yg);
          yg += taille * e * 0.45;
        });
      }
      yg += espace * e;
    };

    const contact = [d.email, d.telephone].filter(Boolean);
    if (contact.length) {
      titreGauche(t.contact);
      contact.forEach((c) => elementGauche([{ texte: c }], 1.5));
    }
    if (d.competences.length) {
      titreGauche(t.competences);
      d.competences.forEach((c) => elementGauche([{ texte: c, puce: true }], 0.8));
    }
    if (d.langues.length) {
      titreGauche(t.langues);
      d.langues.forEach((l) =>
        elementGauche([{ texte: l.language, style: 'bold' }, ...(l.proficiency ? [{ texte: l.proficiency, style: 'italic' as Style, taille: 8.5 }] : [])], 1.5),
      );
    }
    if (d.interets.length) {
      titreGauche(t.interets);
      d.interets.forEach((c) => elementGauche([{ texte: c, puce: true }], 0.8));
    }

    doc.setProperties({ title: versLatin(d.titre || `CV ${nomComplet}`), author: versLatin(nomComplet) });
    return doc;
  }

  async telecharger(d: DonneesCv): Promise<void> {
    const blob = await this.generer(d);
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichierPdf(d);
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
