import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LienNavigation, SousNavigation } from '../../../commun/components/sous-navigation/sous-navigation';

@Component({
  selector: 'app-administration',
  imports: [RouterOutlet, SousNavigation],
  template: `
    <app-sous-navigation libelleAria="Administration" [liens]="liens" />
    <router-outlet />
  `,
})
export class Administration {
  protected readonly liens: LienNavigation[] = [
    { chemin: '.', libelle: 'Tableau de bord', exact: true },
    { chemin: 'utilisateurs', libelle: 'Utilisateurs' },
    { chemin: 'promotions', libelle: 'Promotions' },
    { chemin: 'entreprises', libelle: 'Entreprises' },
  ];
}
