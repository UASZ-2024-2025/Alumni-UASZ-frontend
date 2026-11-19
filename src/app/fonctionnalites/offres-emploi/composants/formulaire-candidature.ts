import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { ApplicationsService } from '../../../api/generes/offres-emploi/api/applications.service';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';

export const LETTRE_MAX = 3000;
export const MESSAGE_DEJA_POSTULE = 'Vous avez déjà postulé à cette offre.';

/**
 * ALUM-204 : formulaire de candidature (choix du CV et lettre de motivation), affiché dans la modale du détail
 * d'une offre. Émet `envoyee` avec la candidature créée (201) et `dejaPostule` quand le serveur répond 409.
 */
@Component({
  selector: 'app-formulaire-candidature',
  imports: [ReactiveFormsModule, Alerte, Bouton, Champ, Spinner],
  template: `
    @if (chargementCv()) {
      <app-spinner />
    } @else if (erreurCv(); as message) {
      <app-alerte>{{ message }}</app-alerte>
      <div class="pied">
        <app-bouton variante="secondaire" (clic)="chargerCv()">Réessayer</app-bouton>
      </div>
    } @else if (!cv()) {
      <p class="sans-cv">
        Vous n'avez pas encore de CV sur la plateforme. Créez-le depuis votre profil avant de postuler.
      </p>
      <div class="pied">
        <app-bouton variante="secondaire" (clic)="annuler.emit()">Fermer</app-bouton>
      </div>
    } @else {
      <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        @if (erreur(); as message) { <app-alerte>{{ message }}</app-alerte> }
        <app-champ libelle="CV" type="select" [requis]="true" [options]="optionsCv()" formControlName="cvId"
          [erreur]="touche('cvId') ? 'Choisissez le CV à joindre.' : null" />
        <app-champ libelle="Lettre de motivation" type="textarea" [lignes]="8" [requis]="true"
          placeholder="Présentez votre motivation pour cette offre." formControlName="coverLetter"
          [erreur]="erreurLettre()" />
        <p class="aide">{{ formulaire.controls.coverLetter.value.length }} / {{ lettreMax }} caractères</p>
        <div class="pied">
          <app-bouton variante="secondaire" [desactive]="envoi()" (clic)="annuler.emit()">Annuler</app-bouton>
          <app-bouton type="submit" [chargement]="envoi()">Envoyer ma candidature</app-bouton>
        </div>
      </form>
    }
  `,
  styles: `
    .formulaire { display: grid; gap: 12px; }
    .aide { margin: -6px 0 0; color: var(--mu); font-size: .8125rem; text-align: right; }
    .pied { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; margin-top: .5rem; }
    .sans-cv { margin: 0; color: var(--tx); }
    app-alerte { display: block; }
  `,
})
export class FormulaireCandidature implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly candidaturesApi = inject(ApplicationsService);
  private readonly etudiantsApi = inject(StudentsService);

  readonly offreId = input.required<string>();
  readonly etudiantId = input.required<string>();
  readonly envoyee = output<Application>();
  readonly dejaPostule = output<void>();
  readonly annuler = output<void>();

  protected readonly lettreMax = LETTRE_MAX;
  protected readonly cv = signal<CvResponse | null>(null);
  protected readonly chargementCv = signal(true);
  protected readonly erreurCv = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly optionsCv = computed<OptionChamp[]>(() => {
    const cv = this.cv();
    return [
      { valeur: '', libelle: 'Choisir un CV' },
      ...(cv?.id ? [{ valeur: cv.id, libelle: cv.title || 'Mon CV' }] : []),
    ];
  });

  protected readonly formulaire = this.fb.group({
    cvId: ['', Validators.required],
    coverLetter: ['', [Validators.required, Validators.maxLength(LETTRE_MAX)]],
  });

  ngOnInit(): void {
    this.chargerCv();
  }

  protected chargerCv(): void {
    this.chargementCv.set(true);
    this.erreurCv.set(null);
    this.etudiantsApi.getStudentCv(this.etudiantId()).subscribe({
      next: (cv) => {
        this.cv.set(cv);
        // un seul CV : il est présélectionné, l'étudiant n'a plus qu'à écrire sa lettre
        if (cv.id) this.formulaire.controls.cvId.setValue(cv.id);
        this.chargementCv.set(false);
      },
      error: (e) => {
        if (e instanceof ErreurApi && e.statut === 404) {
          this.cv.set(null);
        } else {
          this.erreurCv.set(messageErreur(e));
        }
        this.chargementCv.set(false);
      },
    });
  }

  protected touche(champ: 'cvId' | 'coverLetter'): boolean {
    const c = this.formulaire.controls[champ];
    return c.touched && c.invalid;
  }

  protected erreurLettre(): string | null {
    const c = this.formulaire.controls.coverLetter;
    if (!c.touched) return null;
    if (c.hasError('maxlength')) return `La lettre ne doit pas dépasser ${LETTRE_MAX} caractères.`;
    if (c.invalid || !c.value.trim()) return 'La lettre de motivation est obligatoire.';
    return null;
  }

  protected soumettre(): void {
    const { cvId, coverLetter } = this.formulaire.getRawValue();
    if (this.formulaire.invalid || !coverLetter.trim()) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.envoi.set(true);
    this.candidaturesApi
      .submitApplication(this.offreId(), { studentId: this.etudiantId(), cvId, coverLetter: coverLetter.trim() })
      .subscribe({
        next: (candidature) => {
          this.envoi.set(false);
          this.envoyee.emit(candidature);
        },
        error: (e) => {
          this.envoi.set(false);
          if (e instanceof ErreurApi && e.statut === 409) {
            this.dejaPostule.emit();
            return;
          }
          this.erreur.set(
            messageErreur(e, {
              400: 'La candidature est incomplète. Vérifiez le CV et la lettre.',
              404: "Cette offre n'existe plus.",
            }),
          );
        },
      });
  }
}
