import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Onglet, Onglets } from '../../../commun/components/onglets/onglets';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { ApercuCv } from '../../profil-etudiant/composants/apercu-cv';
import { CvPdfService } from '../../profil-etudiant/services/cv-pdf.service';
import { libelleCandidature, tonCandidature } from '../libelles';
import { CvCandidat, chargerCvCandidat } from '../services/cv-candidat';

/**
 * ALUM-259 : dossier d'une candidature reçue, lu par le recruteur dans une modale.
 * Onglet « Lettre de motivation » et onglet « CV » (même rendu que l'éditeur de l'étudiant, téléchargeable en PDF).
 * Le CV n'est chargé qu'à la première ouverture de son onglet.
 */
@Component({
  selector: 'app-dossier-candidature',
  imports: [DatePipe, Alerte, ApercuCv, Avatar, Badge, Bouton, Onglets, Spinner],
  template: `
    @let c = candidature();
    <header class="candidat">
      <app-avatar [nom]="c.studentName || 'Candidat'" />
      <div class="identite">
        <p class="nom">{{ c.studentName || 'Candidat' }}</p>
        <p class="meta">
          @if (c.offerTitle) { {{ c.offerTitle }} · }
          @if (c.createdAt) { reçue le {{ c.createdAt | date: 'dd/MM/yyyy' }} }
        </p>
      </div>
      <app-badge [ton]="tonCandidature(c.status)">{{ libelleCandidature(c.status) }}</app-badge>
    </header>

    <app-onglets [onglets]="onglets" [actif]="onglet()" (actifChange)="changerOnglet($event)" />

    @if (onglet() === 'lettre') {
      <section aria-label="Lettre de motivation">
        @if (c.coverLetter) {
          <article class="lettre">{{ c.coverLetter }}</article>
        } @else {
          <p class="vide">Le candidat n'a pas joint de lettre de motivation.</p>
        }
      </section>
    } @else {
      <section aria-label="CV du candidat" [attr.aria-busy]="chargementCv()">
        @if (!c.cvId) {
          <p class="vide">Aucun CV n'est joint à cette candidature.</p>
        } @else if (chargementCv()) {
          <app-spinner libelle="Chargement du CV…" />
        } @else if (erreurCv(); as message) {
          <app-alerte>{{ message }}</app-alerte>
          <app-bouton variante="secondaire" [petit]="true" (clic)="chargerCv()">Réessayer</app-bouton>
        } @else if (dossier(); as d) {
          <div class="barre-cv">
            <p class="meta">{{ d.cv.title }}</p>
            <app-bouton variante="secondaire" [petit]="true" [chargement]="telechargement()" (clic)="telecharger()">
              Télécharger le CV (PDF)
            </app-bouton>
          </div>
          <div class="apercu"><app-apercu-cv [donnees]="d.donnees" /></div>
        }
      </section>
    }
  `,
  styles: `
    :host { display: block; }
    .candidat { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
    .identite { flex: 1 1 200px; min-width: 0; }
    .nom { margin: 0; font-weight: 700; font-size: 1.0625rem; color: var(--tx); }
    .meta { margin: 2px 0 0; color: var(--mu); font-size: var(--t-m); }
    .lettre {
      max-width: 72ch; margin: 0 auto; padding: 28px 32px;
      border: 1px solid var(--bd); border-radius: var(--rayon-m); background: var(--sf);
      box-shadow: 0 8px 24px -12px rgba(7, 61, 39, 0.35);
      color: var(--tx); font-size: 0.9375rem; line-height: 1.7; white-space: pre-line; overflow-wrap: anywhere;
    }
    .vide { margin: 0; padding: 24px; border-radius: var(--rayon-m); background: var(--g0); color: var(--mu); text-align: center; }
    .barre-cv { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
    .barre-cv .meta { margin: 0; font-weight: 600; color: var(--tx); }
    .apercu { max-width: 760px; margin: 0 auto; }
    app-alerte { display: block; margin-bottom: 8px; }
    @media (max-width: 600px) { .lettre { padding: 18px; } }
  `,
})
export class DossierCandidature {
  private readonly api = inject(StudentsService);
  private readonly pdf = inject(CvPdfService);

  readonly candidature = input.required<Application>();

  protected readonly libelleCandidature = libelleCandidature;
  protected readonly tonCandidature = tonCandidature;
  protected readonly onglets: Onglet[] = [
    { cle: 'lettre', libelle: 'Lettre de motivation' },
    { cle: 'cv', libelle: 'CV' },
  ];
  protected readonly onglet = signal('lettre');
  protected readonly dossier = signal<CvCandidat | null>(null);
  protected readonly chargementCv = signal(false);
  protected readonly erreurCv = signal<string | null>(null);
  protected readonly telechargement = signal(false);

  protected changerOnglet(cle: string): void {
    this.onglet.set(cle);
    if (cle === 'cv' && !this.dossier() && !this.chargementCv()) this.chargerCv();
  }

  protected chargerCv(): void {
    const c = this.candidature();
    if (!c.cvId || !c.studentId) return;
    this.chargementCv.set(true);
    this.erreurCv.set(null);
    chargerCvCandidat(this.api, c.studentId, { nomAffiche: c.studentName }).subscribe({
      next: (d) => {
        this.dossier.set(d);
        this.chargementCv.set(false);
      },
      error: (e) => {
        this.chargementCv.set(false);
        this.erreurCv.set(
          e instanceof ErreurApi && e.statut === 404
            ? "Le candidat a retiré son CV de la plateforme."
            : messageErreur(e, { 403: 'Accès au CV refusé.' }),
        );
      },
    });
  }

  protected async telecharger(): Promise<void> {
    const d = this.dossier();
    if (!d) return;
    this.telechargement.set(true);
    try {
      await this.pdf.telecharger(d.donnees);
    } catch {
      this.erreurCv.set('Impossible de générer le PDF. Réessayez.');
    } finally {
      this.telechargement.set(false);
    }
  }
}
