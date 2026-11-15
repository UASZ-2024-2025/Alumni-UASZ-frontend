import { Injectable } from '@angular/core';
import { DonneesCv, ignorerLignesVides, nomFichierPdf, periode, titresSections } from '../modeles/cv.modele';

interface Theme {
  accent: [number, number, number];
  bandeau: boolean;
  police: 'helvetica' | 'times';
}

const THEMES: Record<string, Theme> = {
  MODERN_BLUE: { accent: [29, 79, 145], bandeau: true, police: 'helvetica' },
  UASZ_VERT: { accent: [11, 93, 59], bandeau: true, police: 'helvetica' },
  CLASSIC: { accent: [30, 30, 30], bandeau: false, police: 'times' },
};

const A4 = { l: 210, h: 297 };
const MARGE = 16;

/** Les polices PDF standard ne couvrent que le Latin-1 / WinAnsi : on retire le reste (emojis, etc.). */
export function versLatin(texte: string): string {
  return texte.replace(/[^\n\x20-\x7E\u00A0-\u00FF\u0152\u0153\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, '');
}

/** Génère le CV en PDF (texte vectoriel, sélectionnable) avec jsPDF, chargé à la demande. */
@Injectable({ providedIn: 'root' })
export class CvPdfService {
  async generer(brut: DonneesCv): Promise<Blob> {
    const d = ignorerLignesVides(brut);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const theme = THEMES[d.modele] ?? THEMES['MODERN_BLUE'];
    const t = titresSections(d.langue);
    const largeur = A4.l - 2 * MARGE;
    let y = 0;

    const police = (style: 'normal' | 'bold' | 'italic', taille: number) => {
      doc.setFont(theme.police, style);
      doc.setFontSize(taille);
    };
    const saut = (hauteur: number) => {
      if (y + hauteur > A4.h - MARGE) {
        doc.addPage();
        y = MARGE;
      }
    };
    const paragraphe = (texte: string, taille = 10, style: 'normal' | 'bold' | 'italic' = 'normal') => {
      police(style, taille);
      const interligne = taille * 0.43;
      const lignes: string[] = doc.splitTextToSize(versLatin(texte), largeur);
      for (const ligne of lignes) {
        saut(interligne);
        doc.text(ligne, MARGE, y);
        y += interligne;
      }
    };
    const titreSection = (libelle: string) => {
      saut(14);
      y += 4;
      police('bold', 11);
      doc.setTextColor(...theme.accent);
      doc.text(versLatin(libelle.toUpperCase()), MARGE, y);
      doc.setDrawColor(...theme.accent);
      doc.setLineWidth(0.3);
      doc.line(MARGE, y + 1.5, A4.l - MARGE, y + 1.5);
      doc.setTextColor(30, 30, 30);
      y += 6;
    };

    // En-tête
    const nomComplet = `${d.prenom} ${d.nom}`.trim() || 'Nom Prénom';
    const contact = [d.email, d.telephone].filter(Boolean).join('   |   ');
    if (theme.bandeau) {
      doc.setFillColor(...theme.accent);
      doc.rect(0, 0, A4.l, 38, 'F');
      doc.setTextColor(255, 255, 255);
      police('bold', 22);
      doc.text(versLatin(nomComplet), MARGE, 17);
      police('normal', 12);
      doc.text(versLatin(d.titre), MARGE, 25, { maxWidth: largeur });
      police('normal', 9);
      doc.text(versLatin(contact), MARGE, 32, { maxWidth: largeur });
    } else {
      doc.setTextColor(30, 30, 30);
      police('bold', 22);
      doc.text(versLatin(nomComplet), MARGE, 22);
      police('italic', 12);
      doc.text(versLatin(d.titre), MARGE, 29, { maxWidth: largeur });
      police('normal', 9);
      doc.text(versLatin(contact), MARGE, 35, { maxWidth: largeur });
      doc.setDrawColor(30, 30, 30);
      doc.setLineWidth(0.6);
      doc.line(MARGE, 38, A4.l - MARGE, 38);
    }
    y = 40;
    doc.setTextColor(30, 30, 30);

    if (d.resume.trim()) {
      titreSection(t.resume);
      paragraphe(d.resume);
    }

    if (d.experiences.length) {
      titreSection(t.experiences);
      for (const e of d.experiences) {
        saut(12);
        paragraphe([e.position, e.companyName].filter(Boolean).join(' – '), 10.5, 'bold');
        const p = periode(e.startDate, e.endDate, d.langue);
        if (p) paragraphe(p, 9, 'italic');
        if (e.description.trim()) paragraphe(e.description, 10);
        y += 2.5;
      }
    }

    if (d.formations.length) {
      titreSection(t.formations);
      for (const f of d.formations) {
        saut(10);
        paragraphe([f.degree, f.fieldOfStudy].filter(Boolean).join(' – '), 10.5, 'bold');
        const sous = [f.institution, periode(f.startDate, f.endDate, d.langue)].filter(Boolean).join('   |   ');
        if (sous) paragraphe(sous, 9, 'italic');
        y += 2.5;
      }
    }

    if (d.competences.length) {
      titreSection(t.competences);
      paragraphe(d.competences.join('  •  '));
    }

    if (d.langues.length) {
      titreSection(t.langues);
      paragraphe(d.langues.map((l) => (l.proficiency ? `${l.language} (${l.proficiency})` : l.language)).join('  •  '));
    }

    doc.setProperties({ title: versLatin(d.titre || `CV ${nomComplet}`), author: versLatin(nomComplet) });
    return doc.output('blob');
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
