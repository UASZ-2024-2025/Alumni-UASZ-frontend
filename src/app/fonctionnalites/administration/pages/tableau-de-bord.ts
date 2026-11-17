import { Component } from '@angular/core';
import { TableauDeBord as TableauDeBordCommun } from '../../../commun/components/tableau-de-bord/tableau-de-bord';

/** Onglet « Tableau de bord » de l'administration : la page partagée, en vue administrateur. */
@Component({
  selector: 'app-admin-tableau-de-bord',
  imports: [TableauDeBordCommun],
  template: '<app-tableau-de-bord [admin]="true" />',
})
export class TableauDeBord {}
