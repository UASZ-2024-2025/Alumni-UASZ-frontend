import { Component, inject } from '@angular/core';
import { TableauDeBord } from '../../../commun/components/tableau-de-bord/tableau-de-bord';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

/** Page /statistiques : la page partagée, complète pour l'administrateur, en attente pour l'enseignant. */
@Component({
  selector: 'app-statistiques',
  imports: [TableauDeBord],
  template: '<app-tableau-de-bord titre="Statistiques" [admin]="estAdmin()" />',
})
export class Statistiques {
  protected readonly estAdmin = inject(AuthentificationService).estAdministrateur;
}
