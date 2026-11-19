import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OfferType, RemoteType } from '../../../api/generes/offres-emploi';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { OffresEntrepriseService } from '../services/offres-entreprise.service';


@Component({
  selector: 'app-publier-offre',
  imports: [ReactiveFormsModule, RouterLink, Alerte, Bouton, Carte, Champ, PucesCompetences],
  template: `
    <app-carte titre="Publier une offre">
      <form [formGroup]="formulaire" (ngSubmit)="soumettre()" novalidate>
        @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }

        <app-champ libelle="Intitulé du poste" [requis]="true" formControlName="title"
          [erreur]="erreurDe(formulaire.controls.title, 'L\\'intitulé est obligatoire.')" />

        <div class="deux-colonnes">
          <app-champ libelle="Type d'offre" type="select" [options]="types" formControlName="type" />
          <app-champ libelle="Mode de travail" type="select" [options]="modes" formControlName="remoteType" />
        </div>

        <app-champ libelle="Lieu" [requis]="true" placeholder="Ex. Ziguinchor, Dakar, Remote" formControlName="location"
          [erreur]="erreurDe(formulaire.controls.location, 'Le lieu est obligatoire.')" />

        <app-champ libelle="Description" type="textarea" [lignes]="6" [requis]="true" formControlName="description"
          [erreur]="erreurDe(formulaire.controls.description, 'La description est obligatoire.')" />

        <app-puces-competences libelle="Compétences requises" formControlName="requiredSkills" />
        @if (formulaire.controls.requiredSkills.touched && formulaire.controls.requiredSkills.invalid) {
          <small class="invalide">Ajoutez au moins une compétence.</small>
        }

        <div class="deux-colonnes">
          @if (estStage()) {
            <app-champ libelle="Durée (en mois)" type="number" formControlName="durationMonths"
              [erreur]="erreurDe(formulaire.controls.durationMonths, 'Saisissez un nombre de mois valide.')" />
          }
          <app-champ libelle="Fourchette salariale" placeholder="Ex. 150 000 – 200 000 FCFA" formControlName="salaryRange" />
          <app-champ libelle="Date limite de candidature" type="date" formControlName="deadline" />
        </div>

        <div class="actions">
          <app-bouton type="submit" [chargement]="chargement()">Publier l'offre</app-bouton>
          <a class="btn btn--secondaire btn--auto" routerLink="/offres-emploi/mes-offres">Annuler</a>
        </div>
      </form>
    </app-carte>
  `,
  styles: `
    form { display: grid; gap: 1rem; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  `,
})
export class PublierOffre {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly offres = inject(OffresEntrepriseService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  protected readonly types: OptionChamp[] = [
    { valeur: OfferType.Job, libelle: 'Emploi' },
    { valeur: OfferType.Internship, libelle: 'Stage' },
  ];
  protected readonly modes: OptionChamp[] = [
    { valeur: '', libelle: 'Non précisé' },
    { valeur: RemoteType.OnSite, libelle: 'Sur site' },
    { valeur: RemoteType.Hybrid, libelle: 'Hybride' },
    { valeur: RemoteType.Remote, libelle: 'À distance' },
  ];

  protected readonly formulaire = this.fb.group({
    title: ['', Validators.required],
    type: [OfferType.Job as string, Validators.required],
    remoteType: [''],
    location: ['', Validators.required],
    description: ['', Validators.required],
    requiredSkills: [[] as string[], Validators.required],
    durationMonths: ['', Validators.pattern(/^[1-9]\d*$/)],
    salaryRange: [''],
    deadline: [''],
  });
  protected readonly erreur = signal<string | null>(null);
  protected readonly chargement = signal(false);

  protected estStage(): boolean {
    return this.formulaire.controls.type.value === OfferType.Internship;
  }

  protected erreurDe(controle: AbstractControl, message: string): string | null {
    return controle.touched && controle.invalid ? message : null;
  }

  protected soumettre(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);
    const v = this.formulaire.getRawValue();

    this.offres
      .publier({
        title: v.title.trim(),
        type: v.type as OfferType,
        description: v.description.trim(),
        location: v.location.trim(),
        requiredSkills: v.requiredSkills,
        remoteType: (v.remoteType || undefined) as RemoteType | undefined,
        durationMonths: this.estStage() && v.durationMonths ? Number(v.durationMonths) : undefined,
        salaryRange: v.salaryRange.trim() || undefined,
        deadline: v.deadline || undefined,
      })
      .subscribe({
        next: () => {
          this.chargement.set(false);
          this.toasts.succes('Votre offre a bien été publiée.');
          this.router.navigate(['/offres-emploi/mes-offres']);
        },
        error: (e) => {
          this.chargement.set(false);
          this.erreur.set(
            messageErreur(e, {
              400: 'Certaines informations sont invalides. Vérifiez les champs.',
              401: 'Votre session a expiré. Reconnectez-vous.',
              403: "Votre entreprise n'est pas encore validée : vous ne pouvez pas publier d'offre.",
              404: 'Entreprise introuvable.',
            }),
          );
        },
      });
  }
}