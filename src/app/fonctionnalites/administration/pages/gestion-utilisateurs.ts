import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ConfirmationService } from '../../../commun/services/confirmation.service';
import { ToastService } from '../../../commun/services/toast.service';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { messageErreur } from '../erreurs';
import { libelleRole, libelleStatut, tonStatut } from '../libelles';

@Component({
  selector: 'app-gestion-utilisateurs',
  templateUrl: './gestion-utilisateurs.html',
  imports: [DatePipe, Alerte, Avatar, Badge, Bouton, Carte, EtatVide, Pagination, Spinner],
  styleUrl: '../administration.scss',
})
export class GestionUtilisateurs {
  private readonly api = inject(UsersService);
  private readonly auth = inject(AuthentificationService);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);

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
