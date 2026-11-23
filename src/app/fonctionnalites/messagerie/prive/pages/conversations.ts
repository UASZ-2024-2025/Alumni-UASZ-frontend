import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { timer } from 'rxjs';
import { ConversationSummary } from '../../../../api/generes/notifications-messagerie/model/conversationSummary';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { Champ } from '../../../../commun/components/champ/champ';
import { Onglet, Onglets } from '../../../../commun/components/onglets/onglets';
import { Spinner } from '../../../../commun/components/spinner/spinner';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { Contact, NouvelleDiscussion } from '../composants/nouvelle-discussion';
import { ConversationsStore } from '../conversations.store';
import { apercuConversation, horodatageListe } from '../fil-prive';

/** Le contrat n'a pas de temps réel : la liste est réinterrogée à intervalle régulier. */
const INTERVALLE_LISTE_MS = 10_000;

type Filtre = 'tous' | 'non-lus';

/**
 * ALUM-184 : discussions privées, présentées comme les groupes (liste à gauche, fil à droite) :
 * recherche, filtre « Non lus », épinglées en tête, section « Archivées ».
 */
@Component({
  selector: 'app-conversations',
  imports: [FormsModule, RouterLink, RouterLinkActive, RouterOutlet, Alerte, Avatar, Bouton, Champ, NouvelleDiscussion, Onglets, Spinner],
  providers: [ConversationsStore],
  templateUrl: './conversations.html',
  styleUrl: '../../groupes/pages/groupes.scss',
})
export class Conversations {
  protected readonly store = inject(ConversationsStore);
  private readonly router = inject(Router);
  protected readonly moiId = inject(AuthentificationService).utilisateur()?.id;
  /** ALUM-263 : la colonne de gauche affiche le choix d'un destinataire à la place de la liste. */
  protected readonly nouvelle = signal(false);
  /** Vrai quand un fil est ouvert : sur mobile, il remplace la liste. */
  protected readonly filOuvert = signal(false);

  protected readonly horodatage = horodatageListe;
  protected readonly apercu = (c: ConversationSummary) => apercuConversation(c, this.moiId);

  protected readonly recherche = signal('');
  protected readonly filtre = signal<Filtre>('tous');
  protected readonly vueArchives = signal(false);
  protected readonly nonLues = computed(() => this.store.actives().filter((c) => c.unreadCount).length);
  protected readonly onglets = computed<Onglet[]>(() => [
    { cle: 'tous', libelle: 'Toutes' },
    { cle: 'non-lus', libelle: this.nonLues() ? `Non lues (${this.nonLues()})` : 'Non lues' },
  ]);

  protected readonly affichees = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    // Une recherche porte sur toutes les discussions, archivées comprises.
    let liste = q ? this.store.liste() : this.vueArchives() ? this.store.archives() : this.store.actives();
    if (q) liste = liste.filter((c) => (c.recipientName ?? '').toLowerCase().includes(q));
    if (this.filtre() === 'non-lus' && !this.vueArchives()) liste = liste.filter((c) => c.unreadCount);
    return liste;
  });

  constructor() {
    this.store.charger();
    timer(INTERVALLE_LISTE_MS, INTERVALLE_LISTE_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.store.rafraichir());
  }

  /** Ouvre le fil avec la personne choisie (conversation existante ou nouvelle). */
  protected ecrireA(c: Contact): void {
    this.store.retenir({ userId: c.userId, nom: c.nom, role: c.role });
    this.nouvelle.set(false);
    void this.router.navigate(['/messagerie', c.userId]);
  }

  protected choisirFiltre(cle: string): void {
    this.filtre.set(cle as Filtre);
  }
}
