import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { UserStatus } from '../../../api/generes/utilisateurs/model/userStatus';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Badge } from '../../../commun/components/badge/badge';
import { Carte } from '../../../commun/components/carte/carte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { Modale } from '../../../commun/components/modale/modale';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { messageErreur } from '../erreurs';
import { libelleRole, libelleStatut, tonStatut } from '../../../commun/utilitaires/libelles';

@Component({
  selector: 'app-gestion-utilisateurs',
  templateUrl: './gestion-utilisateurs.html',
  imports: [DatePipe, ReactiveFormsModule, Alerte, Avatar, Badge, Bouton, Carte, Champ, EtatVide, Modale, Pagination, Spinner],
  styleUrl: '../administration.scss',
})
export class GestionUtilisateurs {
  private readonly api = inject(UsersService);
  private readonly auth = inject(AuthentificationService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly roles = Object.values(RoleName);
  protected readonly statuts = Object.values(UserStatus);
  protected readonly taille = 20;

  protected readonly utilisateurs = signal<User[]>([]);
  protected readonly total = signal(0);
  protected readonly page = signal(0);
  protected readonly role = signal<RoleName | undefined>(undefined);
  protected readonly statut = signal<UserStatus | undefined>(undefined);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly enCours = signal<string | null>(null);

  protected readonly formulaireOuvert = signal(false);
  protected readonly enEdition = signal<User | null>(null);
  protected readonly envoi = signal(false);
  protected readonly erreurFormulaire = signal<string | null>(null);
  protected readonly optionsRole: OptionChamp[] = this.roles.map((r) => ({ valeur: r, libelle: libelleRole(r) }));
  protected readonly formulaire = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    role: [RoleName.Etudiant as RoleName],
  });

  protected readonly tonStatut = tonStatut;
  protected readonly libelleRole = libelleRole;
  protected readonly libelleStatut = libelleStatut;

  protected readonly nbPages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille)));

  constructor() {
    this.charger();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.api.listUsers(this.role(), this.statut(), this.page(), this.taille).subscribe({
      next: (r) => {
        this.utilisateurs.set(r.content ?? []);
        this.total.set(r.totalElements ?? 0);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  protected filtrerRole(valeur: string): void {
    this.role.set((valeur || undefined) as RoleName | undefined);
    this.page.set(0);
    this.charger();
  }

  protected filtrerStatut(valeur: string): void {
    this.statut.set((valeur || undefined) as UserStatus | undefined);
    this.page.set(0);
    this.charger();
  }

  protected aller(page: number): void {
    if (page < 0 || page >= this.nbPages()) return;
    this.page.set(page);
    this.charger();
  }

  protected estMoi(u: User): boolean {
    return !!u.id && u.id === this.auth.utilisateur()?.id;
  }

  protected nomComplet(u: User): string {
    return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || (u.email ?? '');
  }

  protected activer(u: User): void {
    this.changerStatut(u, UserStatus.Actif, `${this.nomComplet(u)} est activé.`);
  }

  protected async suspendre(u: User): Promise<void> {
    if (this.estMoi(u)) return;
    const accepte = await this.confirmation.demander({
      titre: 'Suspendre le compte',
      message: `Suspendre ${this.nomComplet(u)} ?`,
      libelleConfirmer: 'Suspendre',
    });
    if (!accepte) return;
    this.changerStatut(u, UserStatus.Suspendu, `${this.nomComplet(u)} est suspendu.`);
  }

  protected async supprimer(u: User): Promise<void> {
    if (!u.id || this.estMoi(u)) return;
    const accepte = await this.confirmation.demander({
      titre: 'Supprimer le compte',
      message: `Supprimer ${this.nomComplet(u)} ? Cette action est irréversible.`,
      libelleConfirmer: 'Supprimer',
      danger: true,
    });
    if (!accepte) return;
    this.demarrer(u.id);
    this.api.deleteUser(u.id).subscribe({
      next: () => {
        this.enCours.set(null);
        this.toast.succes(`${this.nomComplet(u)} est supprimé.`);
        // dernière ligne d'une page > 0 : on recule d'une page
        if (this.utilisateurs().length === 1 && this.page() > 0) this.page.update((p) => p - 1);
        this.charger();
      },
      error: (e) => this.echec(e),
    });
  }

  protected ouvrirCreation(): void {
    this.erreurFormulaire.set(null);
    this.enEdition.set(null);
    this.formulaire.reset({ firstName: '', lastName: '', email: '', phone: '', role: RoleName.Etudiant });
    this.formulaireOuvert.set(true);
  }

  protected ouvrirEdition(u: User): void {
    this.erreurFormulaire.set(null);
    this.enEdition.set(u);
    this.formulaire.reset({
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      role: u.role ?? RoleName.Etudiant,
    });
    this.formulaireOuvert.set(true);
  }

  protected annuler(): void {
    this.formulaireOuvert.set(false);
    this.enEdition.set(null);
  }

  protected invalide(champ: 'firstName' | 'lastName' | 'email'): boolean {
    const c = this.formulaire.controls[champ];
    return c.touched && c.invalid;
  }

  protected enregistrer(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    const v = this.formulaire.getRawValue();
    const firstName = v.firstName.trim();
    const lastName = v.lastName.trim();
    const email = v.email.trim();
    const phone = v.phone.trim() || undefined;
    const edition = this.enEdition();

    this.envoi.set(true);
    this.erreurFormulaire.set(null);
    // le rôle n'est pas modifiable (le contrat ne l'expose pas) ; l'email n'est envoyé que s'il change
    const appel$ = edition?.id
      ? this.api.updateUser(edition.id, { firstName, lastName, email: email !== edition.email ? email : undefined, phone })
      : this.api.createUser({ firstName, lastName, email, phone, role: v.role });

    appel$.subscribe({
      next: (u) => {
        this.envoi.set(false);
        if (edition) {
          this.utilisateurs.update((liste) => liste.map((x) => (x.id === u.id ? u : x)));
          if (this.estMoi(u)) this.auth.mettreAJourUtilisateur(u);
          this.toast.succes(`${this.nomComplet(u)} est modifié.`);
        } else {
          this.toast.succes(`Compte créé. Une invitation a été envoyée à ${u.email}.`);
          this.page.set(0);
          this.charger();
        }
        this.annuler();
      },
      error: (e) => {
        this.envoi.set(false);
        this.erreurFormulaire.set(
          messageErreur(e, { 409: 'Cette adresse email est déjà utilisée.', 404: "Cet utilisateur n'existe plus." }),
        );
      },
    });
  }

  private changerStatut(u: User, status: UserStatus, message: string): void {
    if (!u.id) return;
    this.demarrer(u.id);
    this.api.updateUserStatus(u.id, { status }).subscribe({
      next: (maj) => {
        this.enCours.set(null);
        this.toast.succes(message);
        this.utilisateurs.update((liste) => liste.map((x) => (x.id === maj.id ? maj : x)));
      },
      error: (e) => this.echec(e),
    });
  }

  private demarrer(id: string): void {
    this.enCours.set(id);
    this.erreur.set(null);
  }

  private echec(e: unknown): void {
    this.enCours.set(null);
    // charger() efface l'erreur : on recharge d'abord, puis on affiche le message.
    if (e instanceof ErreurApi && e.statut === 404) this.charger();
    this.erreur.set(messageErreur(e, { 404: "Cet utilisateur n'existe plus." }));
  }
}
