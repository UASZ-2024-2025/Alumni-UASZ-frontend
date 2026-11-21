import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ } from '../../../commun/components/champ/champ';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { ToastService } from '../../../commun/services/toast.service';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

const MESSAGES: Record<number, string> = {
  400: 'Certaines informations sont invalides. Vérifiez les champs.',
  401: 'Votre session a expiré. Reconnectez-vous.',
  403: "Vous n'avez pas le droit de modifier cette fiche.",
  409: 'Votre compte gère déjà une fiche entreprise.',
};

/**
 * Fiche entreprise du compte ENTREPRISE connecté (ALUM-224) : création si le compte n'en a pas encore,
 * sinon consultation et modification. La validation (partenaire) reste réservée à l'administration.
 */
@Component({
  selector: 'app-ma-fiche-entreprise',
  imports: [ReactiveFormsModule, RouterLink, Alerte, Badge, Bouton, Carte, Champ, Spinner],
  template: `
    @if (chargement()) {
      <app-spinner libelle="Chargement de votre fiche entreprise…" />
    } @else if (erreurChargement()) {
      <app-alerte>{{ erreurChargement() }}</app-alerte>
      <app-bouton variante="secondaire" (clic)="charger()">Réessayer</app-bouton>
    } @else {
      @if (fiche(); as f) {
        <app-carte [titre]="f.name ?? 'Ma fiche entreprise'">
          <p class="statut">
            @if (f.isPartner) {
              <app-badge ton="ok">Partenaire validé</app-badge>
              <span>Vous pouvez publier des offres.</span>
            } @else {
              <app-badge ton="attention">En attente de validation</app-badge>
              <span>L'administration doit valider votre entreprise avant que vous puissiez publier des offres.</span>
            }
          </p>
          @if (!edition()) {
            <dl class="details">
              <dt>Secteur</dt><dd>{{ f.sector || '—' }}</dd>
              <dt>Email de contact</dt><dd>{{ f.contactEmail || '—' }}</dd>
              <dt>Téléphone</dt><dd>{{ f.contactPhone || '—' }}</dd>
              <dt>Site web</dt><dd>{{ f.website || '—' }}</dd>
              <dt>Adresse</dt><dd>{{ f.address || '—' }}</dd>
              <dt>Description</dt><dd>{{ f.description || '—' }}</dd>
            </dl>
            <div class="actions">
              <app-bouton (clic)="modifier()">Modifier ma fiche</app-bouton>
              @if (f.isPartner) {
                <a routerLink="/offres-emploi/publier">Publier une offre</a>
              }
            </div>
          }
        </app-carte>
      } @else {
        <app-carte titre="Créer ma fiche entreprise">
          <p>
            Votre compte n'est rattaché à aucune entreprise. Créez sa fiche : elle sera visible dans l'annuaire et
            vous pourrez publier des offres une fois votre entreprise validée par l'administration.
          </p>
        </app-carte>
      }

      @if (edition()) {
        <app-carte [titre]="fiche() ? 'Modifier ma fiche' : 'Informations de l’entreprise'">
          <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="enregistrer()" novalidate>
            @if (erreur()) { <app-alerte>{{ erreur() }}</app-alerte> }
            <app-champ libelle="Nom de l'entreprise" [requis]="true" formControlName="name"
              [erreur]="invalide('name') ? 'Le nom est obligatoire.' : null" />
            <app-champ libelle="Secteur d'activité" [requis]="true" formControlName="sector"
              placeholder="Ex. Technologies de l'information"
              [erreur]="invalide('sector') ? 'Le secteur est obligatoire.' : null" />
            <app-champ libelle="Email de contact" type="email" [requis]="true" formControlName="contactEmail"
              [erreur]="invalide('contactEmail') ? 'Un email valide est obligatoire.' : null" />
            <app-champ libelle="Téléphone" type="tel" formControlName="contactPhone" />
            <app-champ libelle="Site web" formControlName="website" placeholder="https://…"
              [erreur]="invalide('website') ? 'L’adresse doit commencer par http:// ou https://.' : null" />
            <app-champ libelle="Adresse" formControlName="address" />
            <app-champ libelle="Description" type="textarea" [lignes]="5" formControlName="description" />
            <div class="actions">
              @if (fiche()) {
                <app-bouton variante="secondaire" (clic)="annuler()">Annuler</app-bouton>
              }
              <app-bouton type="submit" [chargement]="envoi()">
                {{ fiche() ? 'Enregistrer' : 'Créer ma fiche' }}
              </app-bouton>
            </div>
          </form>
        </app-carte>
      }
    }
  `,
  styles: `
    :host { display: grid; gap: 1rem; }
    .statut { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
    .details { display: grid; grid-template-columns: max-content 1fr; gap: 0.5rem 1rem; margin: 1rem 0; }
    .details dt { font-weight: 600; }
    .details dd { margin: 0; overflow-wrap: anywhere; }
    .formulaire { display: grid; gap: 1rem; }
    .actions { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
  `,
})
export class MaFicheEntreprise implements OnInit {
  private readonly api = inject(CompaniesService);
  private readonly auth = inject(AuthentificationService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toasts = inject(ToastService);

  protected readonly fiche = signal<Company | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreurChargement = signal<string | null>(null);
  protected readonly edition = signal(false);
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly formulaire = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    sector: ['', [Validators.required, Validators.maxLength(150)]],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: [''],
    website: ['', Validators.pattern(/^$|^https?:\/\/\S+$/i)],
    address: [''],
    description: ['', Validators.maxLength(2000)],
  });

  ngOnInit(): void {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreurChargement.set(null);
    this.api.getMyCompany().subscribe({
      next: (c) => {
        this.afficher(c);
        this.chargement.set(false);
      },
      error: (e: unknown) => {
        this.chargement.set(false);
        if (e instanceof ErreurApi && e.statut === 404) {
          // Pas encore de fiche : on propose directement le formulaire de création.
          this.fiche.set(null);
          this.edition.set(true);
          return;
        }
        this.erreurChargement.set(messageErreur(e, MESSAGES));
      },
    });
  }

  protected invalide(champ: keyof typeof this.formulaire.controls): boolean {
    const c = this.formulaire.controls[champ];
    return c.touched && c.invalid;
  }

  protected modifier(): void {
    const f = this.fiche();
    if (!f) return;
    this.erreur.set(null);
    this.formulaire.reset({
      name: f.name ?? '',
      sector: f.sector ?? '',
      contactEmail: f.contactEmail ?? '',
      contactPhone: f.contactPhone ?? '',
      website: f.website ?? '',
      address: f.address ?? '',
      description: f.description ?? '',
    });
    this.edition.set(true);
  }

  protected annuler(): void {
    this.edition.set(false);
    this.erreur.set(null);
  }

  protected enregistrer(): void {
    if (this.envoi()) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    const v = this.formulaire.getRawValue();
    const donnees = {
      name: v.name.trim(),
      sector: v.sector.trim(),
      contactEmail: v.contactEmail.trim(),
      contactPhone: v.contactPhone.trim() || undefined,
      website: v.website.trim() || undefined,
      address: v.address.trim() || undefined,
      description: v.description.trim() || undefined,
    };
    const existante = this.fiche();
    const appel = existante?.id ? this.api.updateCompany(existante.id, donnees) : this.api.createCompany(donnees);

    this.envoi.set(true);
    this.erreur.set(null);
    appel.subscribe({
      next: (c) => {
        this.envoi.set(false);
        this.afficher(c);
        this.toasts.succes(existante ? 'Votre fiche entreprise est enregistrée.' : 'Votre fiche entreprise est créée.');
      },
      error: (e: unknown) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e, MESSAGES));
        // 409 : une fiche existe déjà pour ce compte (autre onglet, rattachement par l'administration) : on l'affiche.
        if (e instanceof ErreurApi && e.statut === 409) this.charger();
      },
    });
  }

  private afficher(c: Company): void {
    this.fiche.set(c);
    this.edition.set(false);
    this.synchroniserSession(c.id);
  }

  /**
   * Le jeton ne porte le companyId qu'après son prochain renouvellement : on le met tout de suite dans la session
   * pour que « Mes offres » et « Publier une offre » fonctionnent sans se reconnecter.
   */
  private synchroniserSession(companyId?: string): void {
    const utilisateur = this.auth.utilisateur();
    if (utilisateur && companyId && utilisateur.companyId !== companyId) {
      this.auth.mettreAJourUtilisateur({ ...utilisateur, companyId });
    }
  }
}
