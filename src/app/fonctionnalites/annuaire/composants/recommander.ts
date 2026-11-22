import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';

/** Bouton « Recommander » (Alumni) : recommande un étudiant auprès d'une entreprise. */
@Component({
  selector: 'app-recommander',
  imports: [ReactiveFormsModule, Alerte, Bouton, Champ],
  template: `
    @if (succes()) { <app-alerte type="succes">Recommandation envoyée. Merci pour votre soutien !</app-alerte> }

    @if (!ouvert()) {
      <app-bouton (clic)="ouvrir()">★ Recommander {{ nomEtudiant() }}</app-bouton>
    } @else {
      <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="envoyer()" novalidate>
        <h3>Recommander {{ nomEtudiant() }}</h3>
        @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }
        <app-champ libelle="Entreprise ou opportunité visée" type="select" [options]="optionsEntreprises()" formControlName="companyId"
          [erreur]="formulaire.controls.companyId.touched && formulaire.controls.companyId.invalid ? 'Choisissez une entreprise.' : null" />
        <app-champ libelle="Votre recommandation" type="textarea" [lignes]="4" placeholder="Pourquoi recommandez-vous cet étudiant ?"
          formControlName="comments"
          [erreur]="formulaire.controls.comments.touched && formulaire.controls.comments.invalid ? 'Rédigez quelques lignes (obligatoire).' : null" />
        <div class="actions">
          <app-bouton type="submit" [chargement]="envoi()">{{ envoi() ? 'Envoi…' : 'Envoyer la recommandation' }}</app-bouton>
          <app-bouton variante="secondaire" (clic)="ouvert.set(false)">Annuler</app-bouton>
        </div>
      </form>
    }
  `,
  styles: `
    :host { display: block; }
    .formulaire { display: flex; flex-direction: column; gap: 0.9rem; padding: 1rem; background: var(--g0); border: 1px solid var(--bd); border-radius: 14px; }
    h3 { margin: 0; font: 700 1.0625rem var(--police-titre); color: var(--g8); }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  `,
})
export class Recommander {
  private readonly fb = inject(FormBuilder);
  private readonly alumni = inject(AlumniService);
  private readonly entreprisesApi = inject(CompaniesService);

  readonly etudiantId = input.required<string>();
  readonly nomEtudiant = input('cet étudiant');

  protected readonly ouvert = signal(false);
  protected readonly envoi = signal(false);
  protected readonly succes = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly entreprises = signal<Company[]>([]);
  protected readonly optionsEntreprises = computed<OptionChamp[]>(() => [
    { valeur: '', libelle: 'Choisir une entreprise…' },
    ...this.entreprises().map((c) => ({ valeur: c.id ?? '', libelle: c.name ?? '' })),
  ]);

  protected readonly formulaire = this.fb.nonNullable.group({
    companyId: ['', Validators.required],
    comments: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  protected ouvrir(): void {
    this.succes.set(false);
    this.erreur.set(null);
    this.ouvert.set(true);
    if (this.entreprises().length === 0) {
      this.entreprisesApi.searchCompanies(undefined, undefined, 0, 100).subscribe({
        next: (r) => this.entreprises.set(r.content ?? []),
        error: (e) => this.erreur.set(messageErreur(e)),
      });
    }
  }

  protected envoyer(): void {
    const v = this.formulaire.getRawValue();
    if (this.formulaire.invalid || !v.comments.trim()) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.envoi.set(true);
    this.erreur.set(null);
    this.alumni.recommendCandidate({ studentId: this.etudiantId(), companyId: v.companyId, comments: v.comments.trim() }).subscribe({
      next: () => {
        this.envoi.set(false);
        this.ouvert.set(false);
        this.succes.set(true);
        this.formulaire.reset();
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e, { 400: 'Recommandation invalide : vérifiez les champs.', 403: 'Seuls les Alumni peuvent recommander.' }));
      },
    });
  }
}
