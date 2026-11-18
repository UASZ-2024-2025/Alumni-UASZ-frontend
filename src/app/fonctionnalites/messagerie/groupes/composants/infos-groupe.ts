import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { GroupMember } from '../../../../api/generes/notifications-messagerie/model/groupMember';
import { GroupSettings } from '../../../../api/generes/notifications-messagerie/model/groupSettings';
import { MuteDuration } from '../../../../api/generes/notifications-messagerie/model/muteDuration';
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
import { erreurNomGroupe, libelleSourdine } from '../fil';
import { ChoixMembres, Membre } from './choix-membres';

const ERREURS: Record<number, string> = {
  400: 'Demande refusée par le serveur (données invalides).',
  403: "Vous n'avez pas les droits pour cette action dans ce groupe.",
  404: "Ce groupe ou ce membre n'existe plus.",
};

/** Réglages du groupe (administrateurs) : libellés affichés, dans l'ordre de WhatsApp. */
export const REGLAGES: { cle: keyof GroupSettings; titre: string }[] = [
  { cle: 'onlyAdminsCanSend', titre: 'Envoyer des messages' },
  { cle: 'onlyAdminsCanEditInfo', titre: 'Modifier les infos du groupe' },
  { cle: 'onlyAdminsCanAddMembers', titre: 'Ajouter des participants' },
];

export const DUREES_SOURDINE: { valeur: MuteDuration; libelle: string }[] = [
  { valeur: 'EIGHT_HOURS', libelle: '8 heures' },
  { valeur: 'ONE_WEEK', libelle: '1 semaine' },
  { valeur: 'ALWAYS', libelle: 'Toujours' },
];

const rang = (m: GroupMember) => (m.groupRole === 'OWNER' ? 0 : m.groupRole === 'ADMIN' ? 1 : 2);

/**
 * Infos d'un groupe (dans une modale), sur le modèle de WhatsApp :
 * préférences personnelles (sourdine, épinglé, archivé), réglages réservés aux administrateurs,
 * participants et leurs rôles, départ et suppression. Les droits suivent le contrat 1.1.0 ;
 * le back reste seul juge (un 403 est affiché tel quel).
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
  private readonly estAdministrateurPlateforme = inject(AuthentificationService).role() === 'ADMINISTRATEUR';

  readonly groupe = input.required<Group>();
  readonly moiId = input.required<string>();
  /** Groupe mis à jour (infos, réglages, préférences, membres). */
  readonly modifie = output<Group>();
  /** L'utilisateur a quitté ou supprimé le groupe. */
  readonly quitte = output<void>();

  protected readonly libelleRole = libelleRole;
  protected readonly libelleSourdine = libelleSourdine;
  protected readonly reglages = REGLAGES;
  protected readonly durees = DUREES_SOURDINE;
  protected readonly enCours = signal<string | null>(null);
  protected readonly erreur = signal<string | null>(null);

  private readonly moi = computed(() => this.groupe().members?.find((m) => m.userId === this.moiId()));
  protected readonly estProprietaire = computed(() => this.moi()?.groupRole === 'OWNER');
  protected readonly estAdmin = computed(() => this.estProprietaire() || this.moi()?.groupRole === 'ADMIN');
  private readonly reglage = (cle: keyof GroupSettings) => this.groupe().settings?.[cle] ?? cle !== 'onlyAdminsCanSend';
  protected readonly peutModifierInfos = computed(() => this.estAdmin() || !this.reglage('onlyAdminsCanEditInfo'));
  protected readonly peutAjouter = computed(() => this.estAdmin() || !this.reglage('onlyAdminsCanAddMembers'));
  protected readonly peutSupprimerGroupe = computed(() => this.estProprietaire() || this.estAdministrateurPlateforme);
  protected readonly preferences = computed(() => this.groupe().preferences ?? {});
  /** Choix affiché dans la liste : activées, coupées sans limite, ou coupées jusqu'à une échéance. */
  protected readonly etatSourdine = computed(() => {
    const p = this.preferences();
    if (!p.muted) return 'NONE';
    return p.mutedUntil ? 'TEMPORAIRE' : 'ALWAYS';
  });

  /** Propriétaire, puis administrateurs, puis « Vous », puis par nom. */
  protected readonly membres = computed(() =>
    [...(this.groupe().members ?? [])].sort(
      (a, b) =>
        rang(a) - rang(b) ||
        Number(b.userId === this.moiId()) - Number(a.userId === this.moiId()) ||
        (a.userName ?? '').localeCompare(b.userName ?? ''),
    ),
  );
  protected readonly idsMembres = computed(() => (this.groupe().members ?? []).map((m) => m.userId ?? ''));

  // --- Infos : nom et description ---
  protected readonly edition = signal(false);
  protected nom = '';
  protected description = '';
  protected readonly erreurNom = signal<string | null>(null);

  protected modifier(): void {
    this.nom = this.groupe().name ?? '';
    this.description = this.groupe().description ?? '';
    this.erreur.set(null);
    this.erreurNom.set(null);
    this.edition.set(true);
  }

  protected enregistrer(): void {
    const name = this.nom.trim();
    this.erreurNom.set(erreurNomGroupe(name));
    if (this.erreurNom()) return;
    this.executer('edition', this.api.updateGroup(this.groupe().id!, { name, description: this.description.trim() }), (g) => {
      this.edition.set(false);
      this.modifie.emit(g);
      this.toast.succes('Infos du groupe mises à jour.');
    });
  }

  // --- Préférences personnelles ---
  protected sourdine(valeur: string): void {
    const mute = valeur as MuteDuration;
    this.executer('sourdine', this.api.updateGroupPreferences(this.groupe().id!, { mute }), (preferences) => {
      this.modifie.emit({ ...this.groupe(), preferences });
      this.toast.succes(mute === 'NONE' ? 'Notifications réactivées.' : 'Notifications coupées.');
    });
  }

  protected basculerPreference(cle: 'pinned' | 'archived'): void {
    const valeur = !this.preferences()[cle];
    this.executer(cle, this.api.updateGroupPreferences(this.groupe().id!, { [cle]: valeur }), (preferences) => {
      this.modifie.emit({ ...this.groupe(), preferences });
    });
  }

  // --- Réglages du groupe (administrateurs) ---
  protected basculerReglage(cle: keyof GroupSettings): void {
    const valeur = !this.reglage(cle);
    this.executer(cle, this.api.updateGroupSettings(this.groupe().id!, { [cle]: valeur }), (g) => {
      this.modifie.emit(g);
      this.toast.succes('Réglage du groupe enregistré.');
    });
  }

  protected adminsSeulement(cle: keyof GroupSettings): boolean {
    return this.reglage(cle);
  }

  // --- Participants ---
  protected readonly ajout = signal(false);
  protected readonly nouveaux = signal<Membre[]>([]);
  /** Participant dont les actions (rôle, retrait) sont dépliées. */
  protected readonly membreOuvert = signal<string | null>(null);

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

  /** Le propriétaire gère les rôles et retire n'importe qui ; un admin retire les admins et membres, jamais le propriétaire. */
  protected peutGererRole(m: GroupMember): boolean {
    return this.estProprietaire() && m.groupRole !== 'OWNER';
  }

  protected peutRetirer(m: GroupMember): boolean {
    if (m.userId === this.moiId() || m.groupRole === 'OWNER') return false;
    return this.estAdmin();
  }

  protected basculerMembre(m: GroupMember): void {
    if (!this.peutGererRole(m) && !this.peutRetirer(m)) return;
    this.membreOuvert.update((id) => (id === m.userId ? null : m.userId ?? null));
  }

  protected changerRole(m: GroupMember): void {
    const groupRole = m.groupRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const nom = m.userName ?? 'Ce participant';
    this.executer(m.userId!, this.api.updateGroupMemberRole(this.groupe().id!, m.userId!, { groupRole }), (g) => {
      this.membreOuvert.set(null);
      this.modifie.emit(g);
      this.toast.succes(groupRole === 'ADMIN' ? `${nom} est maintenant administrateur.` : `${nom} n'est plus administrateur.`);
    });
  }

  protected async retirer(m: GroupMember): Promise<void> {
    const nom = m.userName ?? 'ce participant';
    const ok = await this.confirmation.demander({
      titre: 'Retirer du groupe',
      message: `Retirer ${nom} du groupe « ${this.groupe().name} » ? Il n'aura plus accès au fil.`,
      libelleConfirmer: 'Retirer',
      danger: true,
    });
    if (!ok) return;
    this.executer(m.userId!, this.api.removeGroupMember(this.groupe().id!, m.userId!), () => {
      const g = this.groupe();
      this.membreOuvert.set(null);
      this.modifie.emit({ ...g, members: g.members?.filter((x) => x.userId !== m.userId) });
      this.toast.succes(`${nom} a été retiré du groupe.`);
    });
  }

  // --- Départ et suppression ---
  protected async quitter(): Promise<void> {
    const seul = (this.groupe().members?.length ?? 0) <= 1;
    const suite = seul
      ? 'Vous êtes le dernier participant : le groupe sera supprimé.'
      : this.estProprietaire()
        ? 'La propriété du groupe passera à un administrateur (ou au participant le plus ancien).'
        : 'Vous ne recevrez plus ses messages.';
    const ok = await this.confirmation.demander({
      titre: 'Quitter le groupe',
      message: `Quitter « ${this.groupe().name} » ? ${suite}`,
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
      message: `Supprimer « ${this.groupe().name} » et tous ses messages pour tous les participants ? Cette action est définitive.`,
      libelleConfirmer: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.executer('supprimer', this.api.deleteGroup(this.groupe().id!), () => {
      this.toast.succes(`Groupe « ${this.groupe().name} » supprimé.`);
      this.quitte.emit();
    });
  }

  /** Une action à la fois : `cle` désactive le contrôle concerné le temps de la requête. */
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
