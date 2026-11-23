import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { ApplicationsService } from '../../../api/generes/offres-emploi/api/applications.service';
import { Application } from '../../../api/generes/offres-emploi/model/application';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Champ } from '../../../commun/components/champ/champ';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { ApercuCv } from '../../profil-etudiant/composants/apercu-cv';
import { CvCandidat, chargerCvCandidat } from '../services/cv-candidat';

export const LETTRE_MAX = 3000;
export const MESSAGE_DEJA_POSTULE = 'Vous avez déjà postulé à cette offre.';
export const LIEN_EDITEUR_CV = '/mon-espace/cv';

/**
 * ALUM-204, ALUM-259 : formulaire de candidature affiché dans la modale du détail d'une offre.
 * Le CV de l'étudiant connecté est joint automatiquement (aperçu dépliable) ; il ne lui reste qu'à écrire sa lettre.
 * Émet `envoyee` avec la candidature créée (201) et `dejaPostule` quand le serveur répond 409.
 */
@Component({
  selector: 'app-formulaire-candidature',
  imports: [ReactiveFormsModule, Alerte, ApercuCv, Bouton, Champ, Spinner],
  template: `
    @if (chargementCv()) {
      <app-spinner libelle="Chargement de votre CV…" />
    } @else if (erreurCv(); as message) {
      <app-alerte>{{ message }}</app-alerte>
      <div class="pied">
        <app-bouton variante="secondaire" (clic)="chargerCv()">Réessayer</app-bouton>
      </div>
    } @else if (!dossier()) {
      <div class="sans-cv">
        <p><strong>Vous n'avez pas encore de CV sur la plateforme.</strong></p>
        <p>Créez-le en quelques minutes : il sera ensuite joint automatiquement à toutes vos candidatures.</p>
      </div>
      <div class="pied">
        <app-bouton variante="secondaire" (clic)="annuler.emit()">Fermer</app-bouton>
        <app-bouton [lien]="lienEditeurCv">Créer mon CV</app-bouton>
      </div>
    } @else {
      <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        @if (erreur(); as message) { <app-alerte>{{ message }}</app-alerte> }

        <section class="etape" aria-labelledby="etape-cv">
          <h3 id="etape-cv"><span class="numero" aria-hidden="true">1</span> Votre CV</h3>
          <div class="cv-joint">
            <svg class="icone-doc" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5M8 13h8M8 17h6" />
            </svg>
            <div class="cv-texte">
              <p class="cv-titre">{{ dossier()!.cv.title || 'Mon CV' }}</p>
              <p class="cv-etat"><span aria-hidden="true">✓</span> Joint automatiquement à votre candidature</p>
            </div>
            <div class="cv-actions">
              <app-bouton variante="secondaire" [petit]="true" [etendu]="apercuOuvert()" controle="apercu-cv-candidature"
                (clic)="apercuOuvert.set(!apercuOuvert())">{{ apercuOuvert() ? "Masquer l'aperçu" : "Voir l'aperçu" }}</app-bouton>
              <app-bouton variante="discret" [petit]="true" [lien]="lienEditeurCv">Modifier mon CV</app-bouton>
            </div>
          </div>
          @if (apercuOuvert()) {
            <div id="apercu-cv-candidature" class="apercu">
              <app-apercu-cv [donnees]="dossier()!.donnees" />
            </div>
          }
        </section>

        <section class="etape" aria-labelledby="etape-lettre">
          <h3 id="etape-lettre"><span class="numero" aria-hidden="true">2</span> Votre lettre de motivation</h3>
          <app-champ libelle="Lettre de motivation" [libelleCache]="true" type="textarea" [lignes]="10" [requis]="true"
            [placeholder]="exempleLettre" formControlName="coverLetter" [erreur]="erreurLettre()" />
          <p class="aide">
            <span>Expliquez pourquoi cette offre vous intéresse et ce que vous pouvez apporter.</span>
            <span class="compteur" [class.limite]="formulaire.controls.coverLetter.value.length > lettreMax">
              {{ formulaire.controls.coverLetter.value.length }} / {{ lettreMax }}
            </span>
          </p>
        </section>

        <div class="pied">
          <app-bouton variante="secondaire" [desactive]="envoi()" (clic)="annuler.emit()">Annuler</app-bouton>
          <app-bouton type="submit" [chargement]="envoi()">Envoyer ma candidature</app-bouton>
        </div>
      </form>
    }
  `,
  styles: `
    .formulaire { display: grid; gap: 20px; }
    .etape { display: grid; gap: 10px; }
    h3 { display: flex; align-items: center; gap: 8px; margin: 0; font: 600 1rem/1.3 var(--police); color: var(--tx); }
    .numero {
      display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
      background: var(--g8); color: #fff; font-size: var(--t-s); font-weight: 700;
    }
    .cv-joint {
      display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding: 12px 14px;
      border: 1px solid var(--bd); border-radius: var(--rayon-m); background: var(--g0);
    }
    .icone-doc {
      flex: none; width: 36px; height: 36px; padding: 6px; border-radius: var(--rayon-s); background: var(--g1);
      fill: none; stroke: var(--g8); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
    }
    .cv-texte { flex: 1 1 180px; min-width: 0; }
    .cv-titre { margin: 0; font-weight: 600; color: var(--tx); overflow-wrap: anywhere; }
    .cv-etat { margin: 2px 0 0; color: var(--ok); font-size: var(--t-s); }
    .cv-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .apercu { max-height: 60vh; overflow-y: auto; padding: 12px; border-radius: var(--rayon-m); background: var(--g0); }
    .aide { display: flex; justify-content: space-between; gap: 12px; margin: -4px 0 0; color: var(--mu); font-size: var(--t-s); }
    .compteur { flex: none; }
    .limite { color: var(--dg); font-weight: 600; }
    .pied { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
    .sans-cv p { margin: 0 0 .5rem; color: var(--tx); }
    app-alerte { display: block; }
  `,
})
export class FormulaireCandidature implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly candidaturesApi = inject(ApplicationsService);
  private readonly etudiantsApi = inject(StudentsService);
  private readonly auth = inject(AuthentificationService);

  readonly offreId = input.required<string>();
  readonly etudiantId = input.required<string>();
  readonly envoyee = output<Application>();
  readonly dejaPostule = output<void>();
  readonly annuler = output<void>();

  protected readonly lettreMax = LETTRE_MAX;
  protected readonly lienEditeurCv = LIEN_EDITEUR_CV;
  protected readonly exempleLettre =
    'Madame, Monsieur,\n\nActuellement étudiant(e) en …, je souhaite vous proposer ma candidature pour …';
  protected readonly dossier = signal<CvCandidat | null>(null);
  protected readonly apercuOuvert = signal(false);
  protected readonly chargementCv = signal(true);
  protected readonly erreurCv = signal<string | null>(null);
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

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
    chargerCvCandidat(this.etudiantsApi, this.etudiantId(), { utilisateur: this.auth.utilisateur() }).subscribe({
      next: (dossier) => {
        this.dossier.set(dossier);
        // le CV de l'étudiant est joint d'office : il n'a plus qu'à écrire sa lettre
        this.formulaire.controls.cvId.setValue(dossier.cv.id ?? '');
        this.chargementCv.set(false);
      },
      error: (e) => {
        if (e instanceof ErreurApi && e.statut === 404) {
          this.dossier.set(null);
        } else {
          this.erreurCv.set(messageErreur(e));
        }
        this.chargementCv.set(false);
      },
    });
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
              400: 'La candidature est incomplète. Vérifiez votre CV et votre lettre.',
              404: "Cette offre n'existe plus.",
            }),
          );
        },
      });
  }
}
