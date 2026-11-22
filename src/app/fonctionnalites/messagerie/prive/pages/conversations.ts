import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { timer } from 'rxjs';
import { Alerte } from '../../../../commun/components/alerte/alerte';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Compteur } from '../../../../commun/components/compteur/compteur';
import { EtatVide } from '../../../../commun/components/etat-vide/etat-vide';
import { Spinner } from '../../../../commun/components/spinner/spinner';
import { ConversationsStore } from '../conversations.store';
import { horodatageListe, libelleRole } from '../fil-prive';
import { EntetePage } from '../../../../commun/components/entete-page/entete-page';

/** Le contrat n'a pas de temps réel : la liste est réinterrogée à intervalle régulier. */
const INTERVALLE_LISTE_MS = 10_000;

/** ALUM-184 : liste des conversations privées ; le fil ouvert s'affiche à côté (route enfant `:recipientId`). */
@Component({
  selector: 'app-conversations',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Alerte, Avatar, Compteur, EtatVide, Spinner, EntetePage],
  providers: [ConversationsStore],
  templateUrl: './conversations.html',
  styleUrl: './conversations.scss',
})
export class Conversations {
  protected readonly store = inject(ConversationsStore);
  /** Vrai quand un fil est ouvert : sur mobile, il remplace la liste. */
  protected readonly filOuvert = signal(false);

  protected readonly horodatage = horodatageListe;
  protected readonly libelleRole = libelleRole;

  constructor() {
    this.store.charger();
    timer(INTERVALLE_LISTE_MS, INTERVALLE_LISTE_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.store.rafraichir());
  }
}
