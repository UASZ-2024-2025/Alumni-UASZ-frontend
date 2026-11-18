import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { GroupMember } from '../../../../api/generes/notifications-messagerie/model/groupMember';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Badge } from '../../../../commun/components/badge/badge';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { Champ } from '../../../../commun/components/champ/champ';
import { ConfirmationService } from '../../../../commun/services/confirmation.service';
import { ToastService } from '../../../../commun/services/toast.service';
import { libelleRole } from '../../../../commun/utilitaires/libelles';
import { messageErreur } from '../../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { ChoixMembres, Membre } from './choix-membres';

const ERREURS: Record<number, string> = {
  403: 'Cette action est réservée au propriétaire du groupe.',
  404: "Ce groupe ou ce membre n'existe plus.",
};

/**
 * Infos d'un groupe (affichées dans une modale) : participants et gestion.
 * Le propriétaire renomme, ajoute et retire ; un membre peut quitter ; le propriétaire ou l'administrateur supprime.
 */
@Component({
  selector: 'app-infos-groupe',
  imports: [FormsModule, Alerte, Avatar, Badge, Bouton, Champ, ChoixMembres],
  templateUrl: './infos-groupe.html',
  styleUrl: './infos-groupe.scss',
})
export class InfosGroupe {
  private readonly api = inject(GroupMessagingService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly estAdministrateur = inject(AuthentificationService).role() === 'ADMINISTRATEUR';

  readonly groupe = input.required<Group>();
  readonly moiId = input.required<string>();
  /** Groupe mis à jour (nom, description, membres). */
  readonly modifie = output<Group>();
  /** L'utilisateur a quitté ou supprimé le groupe. */
  readonly quitte = output<void>();

  protected readonly libelleRole = libelleRole;
  protected readonly enCours = signal<string | null>(null);
  protected readonly erreur = signal<string | null>(null);

  protected readonly estProprietaire = computed(() => {
    const g = this.groupe();
    return g.ownerId === this.moiId() || !!g.members?.some((m) => m.userId === this.moiId() && m.groupRole === 'OWNER');
  });
  protected readonly peutSupprimer = computed(() => this.estProprietaire() || this.estAdministrateur);
  /** Propriétaire d'abord, puis « Vous », puis par nom. */
  protected readonly membres = computed(() =>
    [...(this.groupe().members ?? [])].sort(
      (a, b) =>
        Number(b.groupRole === 'OWNER') - Number(a.groupRole === 'OWNER') ||
        Number(b.userId === this.moiId()) - Number(a.userId === this.moiId()) ||
        (a.userName ?? '').localeCompare(b.userName ?? ''),
    ),
  );
  protected readonly idsMembres = computed(() => (this.groupe().members ?? []).map((m) => m.userId ?? ''));

  // --- Modification du nom et de la description ---
  protected readonly edition = signal(false);
  protected nom = '';
  protected description = '';

  protected modifier(): void {
    this.nom = this.groupe().name ?? '';
    this.description = this.groupe().description ?? '';
    this.erreur.set(null);
    this.edition.set(true);
  }

  protected enregistrer(): void {
    const name = this.nom.trim();
    if (!name) {
      this.erreur.set('Le nom du groupe est obligatoire.');
      return;
    }
    this.executer('edition', this.api.updateGroup(this.groupe().id!, { name, description: this.description.trim() }), (g) => {
      this.edition.set(false);
      this.modifie.emit(g);
      this.toast.succes('Groupe mis à jour.');
    });
  }

  // --- Ajout de participants ---
  protected readonly ajout = signal(false);
  protected readonly nouveaux = signal<Membre[]>([]);

  protected ouvrirAjout(): void {
    this.nouveaux.set([]);
    this.erreur.set(null);
    this.ajout.set(true);
  }

  protected ajouter(): void {
    const memberIds = this.nouveaux().map((m) => m.userId);
    if (!memberIds.length) return;
    this.executer('ajout', this.api.addGroupMembers(this.groupe().id!, { memberIds }), (g) => {
      this.ajout.set(false);
      this.modifie.emit(g);
      this.toast.succes(memberIds.length > 1 ? `${memberIds.length} participants ajoutés.` : 'Participant ajouté.');
    });
  }

  // --- Retrait, départ, suppression ---
  protected async retirer(m: GroupMember): Promise<void> {
    const nom = m.userName ?? 'ce membre';
    const ok = await this.confirmation.demander({
      titre: 'Retirer du groupe',
      message: `Retirer ${nom} du groupe « ${this.groupe().name} » ? Il n'aura plus accès au fil.`,
      libelleConfirmer: 'Retirer',
      danger: true,
    });
    if (!ok) return;
    this.executer(m.userId!, this.api.removeGroupMember(this.groupe().id!, m.userId!), () => {
      const g = this.groupe();
      this.modifie.emit({ ...g, members: g.members?.filter((x) => x.userId !== m.userId) });
      this.toast.succes(`${nom} a été retiré du groupe.`);
    });
  }

  protected async quitter(): Promise<void> {
    const ok = await this.confirmation.demander({
      titre: 'Quitter le groupe',
      message: `Quitter « ${this.groupe().name} » ? Vous ne recevrez plus ses messages.`,
      libelleConfirmer: 'Quitter',
      danger: true,
    });
    if (!ok) return;
    this.executer('quitter', this.api.removeGroupMember(this.groupe().id!, this.moiId()), () => {
      this.toast.succes(`Vous avez quitté « ${this.groupe().name} ».`);
      this.quitte.emit();
    });
  }

  protected async supprimer(): Promise<void> {
    const ok = await this.confirmation.demander({
      titre: 'Supprimer le groupe',
      message: `Supprimer « ${this.groupe().name} » et tous ses messages ? Cette action est définitive.`,
      libelleConfirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.executer('supprimer', this.api.deleteGroup(this.groupe().id!), () => {
      this.toast.succes(`Groupe « ${this.groupe().name} » supprimé.`);
      this.quitte.emit();
    });
  }

  /** Une action à la fois : `cle` désactive le bouton concerné le temps de la requête. */
  private executer<T>(cle: string, requete: Observable<T>, succes: (r: T) => void): void {
    this.enCours.set(cle);
    this.erreur.set(null);
    requete.subscribe({
      next: (r) => {
        this.enCours.set(null);
        succes(r);
      },
      error: (e) => {
        this.enCours.set(null);
        this.erreur.set(messageErreur(e, ERREURS));
      },
    });
  }
}
