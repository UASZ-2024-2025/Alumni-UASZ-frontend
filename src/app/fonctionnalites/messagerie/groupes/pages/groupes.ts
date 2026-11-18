import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { GroupSummary } from '../../../../api/generes/notifications-messagerie/model/groupSummary';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { Champ } from '../../../../commun/components/champ/champ';
import { Modale } from '../../../../commun/components/modale/modale';
import { Spinner } from '../../../../commun/components/spinner/spinner';
import { ToastService } from '../../../../commun/services/toast.service';
import { messageErreur } from '../../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { ChoixMembres, Membre } from '../composants/choix-membres';
import { apercuGroupe, erreurNomGroupe, horodatageListe } from '../fil';
import { GroupesStore } from '../groupes.store';

type Filtre = 'tous' | 'non-lus';

/** ALUM-185 : groupes de discussion, présentés comme une messagerie (liste à gauche, fil à droite). */
@Component({
  selector: 'app-groupes',
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet, Alerte, Avatar, Bouton, Champ, ChoixMembres, Modale, Spinner],
  providers: [GroupesStore],
  templateUrl: './groupes.html',
  styleUrl: './groupes.scss',
})
export class Groupes {
  private readonly api = inject(GroupMessagingService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly store = inject(GroupesStore);
  private readonly moi = inject(AuthentificationService).utilisateur();
  protected readonly moiId = this.moi?.id ?? '';
  private readonly moiNom = `${this.moi?.firstName ?? ''} ${this.moi?.lastName ?? ''}`.trim();

  protected readonly horodatage = horodatageListe;
  protected readonly apercu = (g: GroupSummary) => apercuGroupe(g, this.moiNom);
  /** Sur mobile, un seul panneau à la fois : la liste, ou le fil ouvert. */
  protected readonly filOuvert = signal(false);

  protected readonly recherche = signal('');
  protected readonly filtre = signal<Filtre>('tous');
  /** Vue « Archivées » (comme WhatsApp : une entrée en haut de la liste qui ouvre les conversations archivées). */
  protected readonly vueArchives = signal(false);
  protected readonly nonLus = computed(() => this.store.actifs().filter((g) => g.unreadCount).length);

  protected readonly groupesAffiches = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    // Une recherche porte sur tous les groupes, archivés compris.
    let liste = q ? this.store.liste() : this.vueArchives() ? this.store.archives() : this.store.actifs();
    if (q) liste = liste.filter((g) => g.name?.toLowerCase().includes(q));
    if (this.filtre() === 'non-lus' && !this.vueArchives()) liste = liste.filter((g) => g.unreadCount);
    return liste;
  });

  // --- Création ---
  protected readonly creation = signal(false);
  protected nom = '';
  protected description = '';
  protected readonly membres = signal<Membre[]>([]);
  protected readonly envoi = signal(false);
  protected readonly erreurCreation = signal<string | null>(null);
  protected readonly erreurNom = signal<string | null>(null);

  constructor() {
    this.store.charger();
  }

  protected ouvrirCreation(): void {
    this.nom = '';
    this.description = '';
    this.membres.set([]);
    this.erreurCreation.set(null);
    this.erreurNom.set(null);
    this.creation.set(true);
  }

  protected creer(): void {
    const name = this.nom.trim();
    this.erreurNom.set(erreurNomGroupe(name));
    if (this.erreurNom() || this.envoi()) return;
    this.envoi.set(true);
    this.erreurCreation.set(null);
    this.api
      .createGroup({ name, description: this.description.trim() || undefined, memberIds: this.membres().map((m) => m.userId) })
      .subscribe({
        next: (g) => {
          this.envoi.set(false);
          this.creation.set(false);
          this.vueArchives.set(false);
          this.store.ajouter({
            id: g.id, name: g.name, memberCount: g.members?.length ?? this.membres().length + 1, unreadCount: 0,
            lastMessageTime: g.createdAt, preferences: g.preferences,
          });
          this.toast.succes(`Groupe « ${g.name} » créé.`);
          if (g.id) this.router.navigate(['/groupes', g.id]);
        },
        error: (e) => {
          this.envoi.set(false);
          this.erreurCreation.set(messageErreur(e));
        },
      });
  }
}
