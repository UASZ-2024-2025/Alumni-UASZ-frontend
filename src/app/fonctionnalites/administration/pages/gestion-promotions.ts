import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PromotionsService } from '../../../api/generes/alumni/api/promotions.service';
import { Promotion } from '../../../api/generes/alumni/model/promotion';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Modale } from '../../../commun/components/modale/modale';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../erreurs';

@Component({
  selector: 'app-gestion-promotions',
  imports: [ReactiveFormsModule, Alerte, Bouton, Carte, Champ, EtatVide, Modale, Spinner],
  templateUrl: './gestion-promotions.html',
  styleUrl: '../administration.scss',
})
export class GestionPromotions {
  private readonly api = inject(PromotionsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly promotions = signal<Promotion[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly formulaireOuvert = signal(false);
  protected readonly envoi = signal(false);

  protected readonly consultee = signal<Promotion | null>(null);
  protected readonly diplomes = signal<StudentProfile[]>([]);
  protected readonly chargementDiplomes = signal(false);
  protected readonly erreurDiplomes = signal<string | null>(null);

  protected readonly formulaire = this.fb.group({
    academicYear: [null as number | null, [Validators.required, Validators.min(2000), Validators.max(2100)]],
    specialty: ['', [Validators.required, Validators.maxLength(150)]],
  });

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.listPromotions().subscribe({
      next: (liste) => {
        // années récentes d'abord, puis par spécialité
        this.promotions.set(
          [...liste].sort(
            (a, b) => (b.academicYear ?? 0) - (a.academicYear ?? 0) || (a.specialty ?? '').localeCompare(b.specialty ?? '', 'fr'),
          ),
        );
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  protected ajouter(): void {
    this.erreur.set(null);
    this.formulaire.reset();
    this.formulaireOuvert.set(true);
  }

  protected annuler(): void {
    this.formulaireOuvert.set(false);
    this.formulaire.reset();
  }

  protected enregistrer(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    const { academicYear, specialty } = this.formulaire.getRawValue();
    this.envoi.set(true);
    this.erreur.set(null);
    this.api.createPromotion({ academicYear: Number(academicYear), specialty: specialty.trim() }).subscribe({
      next: (p) => {
        this.envoi.set(false);
        this.toast.succes(`Promotion ${p.academicYear} · ${p.specialty} créée.`);
        this.annuler();
        this.charger();
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e));
      },
    });
  }

  protected voirDiplomes(p: Promotion): void {
    if (!p.id) return;
    this.consultee.set(p);
    this.diplomes.set([]);
    this.erreurDiplomes.set(null);
    this.chargementDiplomes.set(true);
    this.api.getPromotionGraduates(p.id).subscribe({
      next: (l) => {
        this.diplomes.set(l);
        this.chargementDiplomes.set(false);
      },
      error: (e) => {
        this.erreurDiplomes.set(messageErreur(e, { 404: "Cette promotion n'existe plus." }));
        this.chargementDiplomes.set(false);
      },
    });
  }

  protected fermerDiplomes(): void {
    this.consultee.set(null);
  }
}
