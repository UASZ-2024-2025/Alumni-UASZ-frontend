import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { AlumniProfile } from '../../../api/generes/alumni/model/alumniProfile';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Badge } from '../../../commun/components/badge/badge';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { nomComplet } from '../modeles/cartes';

@Component({
  selector: 'app-fiche-entreprise',
  imports: [RouterLink, Alerte, Avatar, Badge, Spinner],
  templateUrl: './fiche-entreprise.html',
  styleUrls: ['../../profil-etudiant/pages/profil-etudiant.scss', '../annuaire.scss'],
})
export class FicheEntreprise implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly entreprises = inject(CompaniesService);
  private readonly alumni = inject(AlumniService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nomComplet = nomComplet;
  protected readonly entreprise = signal<Company | null>(null);
  protected readonly alumniDeLEntreprise = signal<AlumniProfile[]>([]);
  protected readonly totalAlumni = signal(0);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  /** N'accepte que des liens http(s) : évite les liens « javascript: » saisis dans une fiche. */
  protected lienSur(url?: string): string | null {
    return url && /^https?:\/\//i.test(url) ? url : null;
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.chargement.set(true);
          this.erreur.set(null);
          this.alumniDeLEntreprise.set([]);
        }),
        switchMap((p) => {
          const id = p.get('id') ?? '';
          return this.entreprises.getCompanyById(id).pipe(
            tap((c) => {
              this.entreprise.set(c);
              this.chargement.set(false);
              this.alumni.searchAlumni(undefined, id, undefined, undefined, 0, 12).subscribe({
                next: (r) => {
                  this.alumniDeLEntreprise.set(r.content ?? []);
                  this.totalAlumni.set(r.totalElements ?? 0);
                },
                error: () => this.alumniDeLEntreprise.set([]),
              });
            }),
            catchError((e) => {
              this.entreprise.set(null);
              this.erreur.set(messageErreur(e, { 404: 'Entreprise introuvable.' }));
              this.chargement.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }
}
