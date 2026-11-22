import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap, tap } from 'rxjs';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { AlumniProfile } from '../../../api/generes/alumni/model/alumniProfile';
import { WorkExperience } from '../../../api/generes/alumni/model/workExperience';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { periode } from '../../profil-etudiant/modeles/cv.modele';
import { nomComplet } from '../modeles/cartes';
import { Bouton } from '../../../commun/components/bouton/bouton';

/** Les expériences en cours d'abord, puis de la plus récente à la plus ancienne. */
export function trierExperiences(liste: WorkExperience[]): WorkExperience[] {
  return [...liste].sort((a, b) => {
    if (!!a.isCurrent !== !!b.isCurrent) return a.isCurrent ? -1 : 1;
    return (b.startDate ?? '').localeCompare(a.startDate ?? '');
  });
}

@Component({
  selector: 'app-fiche-alumni',
  imports: [RouterLink, Alerte, Avatar, Bouton, Spinner],
  templateUrl: './fiche-alumni.html',
  styleUrls: ['../../profil-etudiant/pages/profil-etudiant.scss', '../annuaire.scss'],
})
export class FicheAlumni implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(AlumniService);
  private readonly auth = inject(AuthentificationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly profil = signal<AlumniProfile | null>(null);
  protected readonly experiences = signal<WorkExperience[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);

  protected readonly nom = computed(() => (this.profil() ? nomComplet(this.profil()!) : ''));
  protected readonly estProprietaire = computed(() => this.auth.utilisateur()?.id === this.profil()?.userId);

  protected duree(e: WorkExperience): string {
    return e.isCurrent ? periode(e.startDate ?? '', '', 'Français') : periode(e.startDate ?? '', e.endDate ?? '', 'Français');
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.chargement.set(true);
          this.erreur.set(null);
        }),
        switchMap((p) => {
          const id = p.get('id') ?? '';
          return forkJoin({
            profil: this.api.getAlumniById(id),
            experiences: this.api.getAlumniExperiences(id).pipe(catchError(() => of([] as WorkExperience[]))),
          }).pipe(
            tap(({ profil, experiences }) => {
              this.profil.set(profil);
              this.experiences.set(trierExperiences(experiences.length ? experiences : (profil.experiences ?? [])));
              this.chargement.set(false);
            }),
            catchError((e) => {
              this.profil.set(null);
              this.erreur.set(messageErreur(e, { 404: 'Alumni introuvable.', 403: 'Accès refusé.' }));
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
