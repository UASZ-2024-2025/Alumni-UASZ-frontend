import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { Gender } from '../../../api/generes/utilisateurs/model/gender';
import { UserUpdateRequest } from '../../../api/generes/utilisateurs/model/userUpdateRequest';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ToastService } from '../../../commun/services/toast.service';
import { libelleRole, libelleStatut } from '../../../commun/utilitaires/libelles';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

const aujourdhui = () => new Date().toISOString().slice(0, 10);
/** Le back exige une date de naissance dans le passé. */
const dansLePasse: ValidatorFn = (c) => (!c.value || c.value < aujourdhui() ? null : { futur: true });

@Component({
  selector: 'app-profil',
  imports: [ReactiveFormsModule, Alerte, Bouton, Carte, Champ, Spinner],
  styleUrl: '../compte.scss',
  template: `
    <h1>Mon profil</h1>
    <app-carte>
      @if (chargement()) {
        <app-spinner libelle="Chargement du profil…" />
      } @else {
        <p class="aide">{{ role() }} · compte {{ statut() }}</p>
        <form class="formulaire" [formGroup]="formulaire" (ngSubmit)="enregistrer()" novalidate>
          @if (erreur(); as message) { <app-alerte>{{ message }}</app-alerte> }
          <div class="deux">
            <app-champ libelle="Prénom" [requis]="true" formControlName="firstName"
              [erreur]="invalide('firstName') ? 'Le prénom est obligatoire.' : null" />
            <app-champ libelle="Nom" [requis]="true" formControlName="lastName"
              [erreur]="invalide('lastName') ? 'Le nom est obligatoire.' : null" />
          </div>
          <app-champ libelle="Email" type="email" [requis]="true" formControlName="email"
            [erreur]="invalide('email') ? 'Saisissez un email valide.' : null" />
          @if (!auth.estAdministrateur()) {
            <p class="aide">Seul un administrateur peut modifier l'adresse email.</p>
          }
          <app-champ libelle="Téléphone" type="tel" formControlName="phone" />
          <div class="deux">
            <app-champ libelle="Genre" type="select" [options]="genres" formControlName="gender" />
            <app-champ libelle="Date de naissance" type="date" formControlName="birthDate"
              [erreur]="invalide('birthDate') ? 'La date doit être dans le passé.' : null" />
          </div>
          <div class="pied">
            <app-bouton type="submit" [chargement]="envoi()">Enregistrer</app-bouton>
          </div>
        </form>
      }
    </app-carte>
  `,
})
export class Profil implements OnInit {
  protected readonly auth = inject(AuthentificationService);
  private readonly api = inject(UsersService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly toast = inject(ToastService);

  protected readonly genres: OptionChamp[] = [
    { valeur: '', libelle: 'Non renseigné' },
    { valeur: Gender.Male, libelle: 'Homme' },
    { valeur: Gender.Female, libelle: 'Femme' },
  ];
  protected readonly chargement = signal(true);
  protected readonly envoi = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly formulaire = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    gender: ['' as Gender | ''],
    birthDate: ['', dansLePasse],
  });

  protected role(): string {
    return libelleRole(this.auth.role());
  }
  protected statut(): string {
    return libelleStatut(this.auth.utilisateur()?.status).toLowerCase();
  }
  protected invalide(champ: 'firstName' | 'lastName' | 'email' | 'birthDate'): boolean {
    const c = this.formulaire.controls[champ];
    return c.touched && c.invalid;
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
      error: (e) => {
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
        this.toast.succes('Profil mis à jour.');
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreur.set(messageErreur(e, { 409: 'Cette adresse email est déjà utilisée.' }));
      },
    });
  }
}
