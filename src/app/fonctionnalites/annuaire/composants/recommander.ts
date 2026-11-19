import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';

/** Bouton « Recommander » (Alumni) : recommande un étudiant auprès d'une entreprise. */
@Component({
  selector: 'app-recommander',
  imports: [ReactiveFormsModule, Alerte],
  template: `
    @if (succes()) { <app-alerte type="succes">Recommandation envoyée. Merci pour votre soutien !</app-alerte> }

    @if (!ouvert()) {
      <button type="button" class="btn-prim" (click)="ouvrir()">★ Recommander {{ nomEtudiant() }}</button>
    } @else {
      <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="envoyer()" novalidate>
        <h3>Recommander {{ nomEtudiant() }}</h3>
        @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }
        <label>
          Entreprise ou opportunité visée
          <select formControlName="companyId">
            <option value="">Choisir une entreprise…</option>
            @for (c of entreprises(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
          </select>
          @if (formulaire.controls.companyId.touched && formulaire.controls.companyId.invalid) {
            <span class="invalide">Choisissez une entreprise.</span>
          }
        </label>
        <label>
          Votre recommandation
          <textarea formControlName="comments" rows="4" maxlength="1000" placeholder="Pourquoi recommandez-vous cet étudiant ?"></textarea>
          @if (formulaire.controls.comments.touched && formulaire.controls.comments.invalid) {
            <span class="invalide">Rédigez quelques lignes (obligatoire).</span>
          }
        </label>
        <div class="actions">
          <button type="submit" class="btn-prim" [disabled]="envoi()">{{ envoi() ? 'Envoi…' : 'Envoyer la recommandation' }}</button>
          <button type="button" class="btn-sec" (click)="ouvert.set(false)">Annuler</button>
        </div>
      </form>
    }
  `,
  styles: `
    :host { display: block; }
    .formulaire { display: flex; flex-direction: column; gap: 0.9rem; padding: 1rem; background: var(--g0); border: 1px solid var(--bd); border-radius: 14px; }
    h3 { margin: 0; font: 700 1.0625rem var(--police-titre); color: var(--g8); }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.8125rem; font-weight: 600; }
    select, textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--bord-champ); border-radius: var(--rayon); background: var(--sf); font: 400 0.9375rem var(--police); }
    .invalide { color: var(--dg); font-weight: 400; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .btn-prim, .btn-sec { padding: 10px 18px; border-radius: var(--rayon); font: 600 0.875rem var(--police); cursor: pointer; }
    .btn-prim { border: 1px solid var(--g8); background: var(--g8); color: #fff; }
    .btn-prim:disabled { opacity: 0.6; cursor: wait; }
    .btn-sec { border: 1px solid var(--g8); background: #fff; color: var(--g8); }
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
