import { Component, inject, OnInit, signal } from '@angular/core';
import { RolesService } from '../../api/generes/utilisateurs/api/roles.service';
import { Role } from '../../api/generes/utilisateurs/model/role';
import { LIBELLE_ROLE } from '../../commun/modeles/libelles';
import { messageErreur } from '../../commun/utilitaires/erreurs';

@Component({
  selector: 'app-administration-roles',
  template: `
    <h1>Rôles et permissions</h1>
    @if (erreur()) { <div class="alerte" role="alert">{{ erreur() }}</div> }
    <section class="grille">
      @for (r of roles(); track r.id) {
        <article class="panneau">
          <h2>{{ r.name ? libelle[r.name] : '' }}</h2>
          <ul class="puces">
            @for (p of r.permissions; track p) { <li><code>{{ p }}</code></li> }
          </ul>
        </article>
      }
    </section>
  `,
})
export class AdministrationRoles implements OnInit {
  private readonly api = inject(RolesService);
  protected readonly libelle = LIBELLE_ROLE;
  protected readonly roles = signal<Role[]>([]);
  protected readonly erreur = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listRoles().subscribe({
      next: (r) => this.roles.set(r),
      error: (e: unknown) => this.erreur.set(messageErreur(e)),
    });
  }
}
