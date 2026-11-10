import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../api/generes/utilisateurs/api/users.service';
import { Gender } from '../../api/generes/utilisateurs/model/gender';
import { UserUpdateRequest } from '../../api/generes/utilisateurs/model/userUpdateRequest';
import { LIBELLE_GENRE, LIBELLE_ROLE, LIBELLE_STATUT } from '../../commun/modeles/libelles';
import { messageErreur } from '../../commun/utilitaires/erreurs';
import { AuthentificationService } from '../../socle/authentification/services/authentification.service';

@Component({
  selector: 'app-profil',
  imports: [ReactiveFormsModule],
  template: `
    <section class="panneau etroit">
      <h1>Mon profil</h1>
      @if (chargement()) {
        <p class="aide">Chargement…</p>
      } @else {
        <p class="aide">
          {{ role() }} · compte {{ statut() }}
        </p>
        <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="enregistrer()" novalidate>
          @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }
          @if (succes()) { <div class="succes" role="status">Profil mis à jour.</div> }

          <div class="rang">
            <label>Prénom <input formControlName="firstName" /></label>
            <label>Nom <input formControlName="lastName" /></label>
          </div>
          <label>
            Email
            <input type="email" formControlName="email" />
          </label>
          @if (!auth.estAdministrateur()) {
            <small class="aide">Seul un administrateur peut modifier l'adresse email.</small>
          }
          <label>Téléphone <input formControlName="phone" maxlength="30" autocomplete="tel" /></label>
          <div class="rang">
            <label>
              Genre
              <select formControlName="gender">
                <option value="">Non renseigné</option>
                @for (g of genres; track g) { <option [value]="g">{{ libelleGenre[g] }}</option> }
              </select>
            </label>
            <label>
              Date de naissance
              <input type="date" formControlName="birthDate" [max]="hier" />
            </label>
          </div>
          @if (formulaire.invalid && formulaire.touched) {
            <small class="invalide">Vérifiez les champs : prénom et nom obligatoires, email valide.</small>
          }
          <button class="btn" type="submit" [disabled]="envoi()">
            {{ envoi() ? 'Enregistrement…' : 'Enregistrer' }}
          </button>
        </form>
      }
    </section>
  `,
})
export class Profil implements OnInit {
  protected readonly auth = inject(AuthentificationService);
  private readonly api = inject(UsersService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly genres: Gender[] = ['MALE', 'FEMALE'];
  protected readonly libelleGenre = LIBELLE_GENRE;
  protected readonly chargement = signal(true);
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal(false);
  /** La date de naissance doit être dans le passé (contrôle du back) : max = hier. */
  protected readonly hier = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  protected readonly formulaire = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    gender: ['' as Gender | ''],
    birthDate: [''],
  });

  protected role(): string {
    const r = this.auth.role();
    return r ? LIBELLE_ROLE[r] : '';
  }
  protected statut(): string {
    const s = this.auth.utilisateur()?.status;
    return s ? LIBELLE_STATUT[s].toLowerCase() : '';
  }

  ngOnInit(): void {
    const id = this.auth.utilisateur()?.id;
    if (!id) return;
    // le back refuse la modification de l'email à un non-administrateur : champ verrouillé
    if (!this.auth.estAdministrateur()) this.formulaire.controls.email.disable();

    this.api.getUserById(id).subscribe({
      next: (u) => {
        this.formulaire.patchValue({
          firstName: u.firstName ?? '',
          lastName: u.lastName ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          gender: u.gender ?? '',
          birthDate: u.birthDate ?? '',
        });
        this.chargement.set(false);
      },
      error: (e: unknown) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  protected enregistrer(): void {
    const id = this.auth.utilisateur()?.id;
    if (!id) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.succes.set(false);
    this.envoi.set(true);

    // mise à jour partielle : on n'envoie que les champs renseignés
    const v = this.formulaire.getRawValue();
    const corps: UserUpdateRequest = { firstName: v.firstName.trim(), lastName: v.lastName.trim() };
    if (this.auth.estAdministrateur()) corps.email = v.email.trim();
    if (v.phone.trim()) corps.phone = v.phone.trim();
    if (v.gender) corps.gender = v.gender;
    if (v.birthDate) corps.birthDate = v.birthDate;

    this.api.updateUser(id, corps).subscribe({
      next: (u) => {
        this.auth.mettreAJourUtilisateur(u);
        this.envoi.set(false);
        this.succes.set(true);
      },
      error: (e: unknown) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e));
      },
    });
  }
}
