import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface LienNavigation { chemin: string; libelle: string; exact?: boolean; }

/**
 * Menu de liens routés d'une section (le lien actif est souligné et marqué aria-current).
 *   <app-sous-navigation libelleAria="Administration" [liens]="liens" />
 * Les chemins sont relatifs à la route courante ('.' pour la page d'accueil de la section, avec exact).
 */
@Component({
  selector: 'app-sous-navigation',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav [attr.aria-label]="libelleAria()">
      @for (l of liens(); track l.chemin) {
        <a [routerLink]="l.chemin" routerLinkActive="actif" ariaCurrentWhenActive="page" [routerLinkActiveOptions]="{ exact: !!l.exact }">{{ l.libelle }}</a>
      }
    </nav>
  `,
  styles: `
    :host { display: block; margin-bottom: 1.25rem; }
    nav { display: flex; gap: 4px; border-bottom: 1px solid var(--bd); overflow-x: auto; }
    a { padding: 8px 14px; border-bottom: 3px solid transparent; color: var(--mu); text-decoration: none; white-space: nowrap; }
    a:hover { color: var(--g8); }
    a.actif { border-bottom-color: var(--g8); color: var(--g8); font-weight: 600; }
    a:focus-visible { outline: 2px solid var(--g8); outline-offset: -2px; }
  `,
})
export class SousNavigation {
  readonly liens = input.required<LienNavigation[]>();
  readonly libelleAria = input.required<string>();
}
