import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
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
import { horodatageListe } from '../fil';
import { GroupesStore } from '../groupes.store';

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
  protected readonly moiId = inject(AuthentificationService).utilisateur()?.id ?? '';

  protected readonly horodatage = horodatageListe;
  /** Sur mobile, un seul panneau à la fois : la liste, ou le fil ouvert. */
  protected readonly filOuvert = signal(false);

  protected readonly filtre = signal('');
  protected readonly groupesFiltres = computed(() => {
    const q = this.filtre().trim().toLowerCase();
    return q ? this.store.liste().filter((g) => g.name?.toLowerCase().includes(q)) : this.store.liste();
  });

  // --- Création ---
  protected readonly creation = signal(false);
  protected nom = '';
  protected description = '';
  protected readonly membres = signal<Membre[]>([]);
  protected readonly envoi = signal(false);
  protected readonly erreurCreation = signal<string | null>(null);
  protected readonly nomInvalide = signal(false);

  constructor() {
    this.store.charger();
  }

  protected ouvrirCreation(): void {
    this.nom = '';
    this.description = '';
    this.membres.set([]);
    this.erreurCreation.set(null);
    this.nomInvalide.set(false);
    this.creation.set(true);
  }

  protected creer(): void {
    const name = this.nom.trim();
    this.nomInvalide.set(!name);
    if (!name || this.envoi()) return;
    this.envoi.set(true);
    this.erreurCreation.set(null);
    this.api
      .createGroup({ name, description: this.description.trim() || undefined, memberIds: this.membres().map((m) => m.userId) })
      .subscribe({
        next: (g) => {
          this.envoi.set(false);
          this.creation.set(false);
          this.store.ajouter({ id: g.id, name: g.name, memberCount: g.members?.length ?? this.membres().length + 1, unreadCount: 0, lastMessageTime: g.createdAt });
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
