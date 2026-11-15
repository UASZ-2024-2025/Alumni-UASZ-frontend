import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PromotionsService } from '../../../api/generes/alumni/api/promotions.service';
import { Promotion } from '../../../api/generes/alumni/model/promotion';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { SPECIALITES } from '../../annuaire/pages/annuaire';
import { nomComplet } from '../../annuaire/modeles/cartes';

/** Années récentes d'abord, puis par spécialité. */
export function trierPromotions(liste: Promotion[]): Promotion[] {
  return [...liste].sort(
    (a, b) => (b.academicYear ?? 0) - (a.academicYear ?? 0) || (a.specialty ?? '').localeCompare(b.specialty ?? '', 'fr'),
  );
}

@Component({
  selector: 'app-gestion-promotions',
  imports: [ReactiveFormsModule, RouterLink, Alerte],
  templateUrl: './gestion-promotions.html',
  styleUrls: ['../../profil-etudiant/pages/profil-etudiant.scss', '../../annuaire/annuaire.scss'],
})
export class GestionPromotions implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(PromotionsService);

  protected readonly specialites = SPECIALITES;
  protected readonly nomComplet = nomComplet;
  protected readonly promotions = signal<Promotion[]>([]);
  protected readonly chargement = signal(true);
  protected readonly ajout = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal<string | null>(null);

  protected readonly ouverte = signal<string | null>(null);
  protected readonly diplomes = signal<StudentProfile[]>([]);
  protected readonly chargementDiplomes = signal(false);
  protected readonly erreurDiplomes = signal<string | null>(null);

  protected readonly formulaire = this.fb.group({
    academicYear: [null as number | null, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    specialty: ['', [Validators.required, Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.api.listPromotions().subscribe({
      next: (l) => {
        this.promotions.set(trierPromotions(l));
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e, { 403: 'Réservé aux administrateurs.' }));
        this.chargement.set(false);
      },
    });
  }

  protected creer(): void {
    const v = this.formulaire.getRawValue();
    if (this.formulaire.invalid || !v.specialty.trim() || v.academicYear == null) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.succes.set(null);
    this.ajout.set(true);
    this.api.createPromotion({ academicYear: v.academicYear, specialty: v.specialty.trim() }).subscribe({
      next: (p) => {
        this.promotions.set(trierPromotions([...this.promotions(), p]));
        this.formulaire.reset();
        this.ajout.set(false);
        this.succes.set(`Promotion ${p.academicYear} · ${p.specialty} ajoutée.`);
      },
      error: (e) => {
        this.ajout.set(false);
        this.erreur.set(messageErreur(e, { 400: 'Promotion invalide : vérifiez les champs.', 409: 'Cette promotion existe déjà.', 403: 'Réservé aux administrateurs.' }));
      },
    });
  }

  protected basculerDiplomes(p: Promotion): void {
    const id = p.id ?? '';
    if (this.ouverte() === id) {
      this.ouverte.set(null);
      return;
    }
    this.ouverte.set(id);
    this.diplomes.set([]);
    this.erreurDiplomes.set(null);
    this.chargementDiplomes.set(true);
    this.api.getPromotionGraduates(id).subscribe({
      next: (l) => {
        if (this.ouverte() !== id) return;
        this.diplomes.set(l);
        this.chargementDiplomes.set(false);
      },
      error: (e) => {
        this.chargementDiplomes.set(false);
        this.erreurDiplomes.set(messageErreur(e, { 404: 'Promotion introuvable.' }));
      },
    });
  }
}
