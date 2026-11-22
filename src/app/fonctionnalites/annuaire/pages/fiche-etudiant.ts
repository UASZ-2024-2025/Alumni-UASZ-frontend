import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { ApercuCv } from '../../profil-etudiant/composants/apercu-cv';
import { cvInitial, depuisCvEnregistre, DonneesCv, formaterDate, LIBELLES_DISPONIBILITE } from '../../profil-etudiant/modeles/cv.modele';
import { CvPdfService } from '../../profil-etudiant/services/cv-pdf.service';
import { Recommander } from '../composants/recommander';
import { nomComplet } from '../modeles/cartes';

@Component({
  selector: 'app-fiche-etudiant',
  imports: [RouterLink, Alerte, ApercuCv, Recommander, Avatar, Badge, Bouton, PucesCompetences, Spinner, FormsModule],
  templateUrl: './fiche-etudiant.html',
  styleUrls: ['../../profil-etudiant/pages/profil-etudiant.scss', '../annuaire.scss'],
})
export class FicheEtudiant implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(StudentsService);
  private readonly auth = inject(AuthentificationService);
  private readonly pdf = inject(CvPdfService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly libelles = LIBELLES_DISPONIBILITE;
  protected readonly formaterDate = formaterDate;

  protected readonly profil = signal<StudentProfile | null>(null);
  protected readonly cv = signal<CvResponse | null>(null);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurCv = signal<string | null>(null);
  protected readonly telechargement = signal(false);

  protected readonly nom = computed(() => (this.profil() ? nomComplet(this.profil()!) : ''));
  protected readonly estProprietaire = computed(() => this.auth.utilisateur()?.id === this.profil()?.userId);
  protected readonly estAlumni = computed(() => this.auth.role() === 'ALUMNI');
  /** Même règle que le backend : propriétaire, Alumni, enseignant ou administrateur. */
  protected readonly peutVoirCv = computed(
    () => this.estProprietaire() || ['ALUMNI', 'ENSEIGNANT', 'ADMINISTRATEUR'].includes(this.auth.role() ?? ''),
  );
  protected readonly donneesCv = computed<DonneesCv | null>(() => {
    const p = this.profil();
    const c = this.cv();
    return p && c ? depuisCvEnregistre(c, cvInitial(null, p)) : null;
  });
  protected readonly dispo = computed(() => {
    const s = this.profil()?.availabilityStatus;
    return s && s !== 'NOT_AVAILABLE' ? this.libelles[s] : null;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        tap(() => {
          this.chargement.set(true);
          this.erreur.set(null);
          this.cv.set(null);
          this.erreurCv.set(null);
        }),
        switchMap((p) => {
          const id = p.get('id') ?? '';
          return this.api.getStudentById(id).pipe(
            tap((profil) => this.profil.set(profil)),
            tap(() => this.chargement.set(false)),
            tap(() => this.chargerCv(id)),
            catchError((e) => {
              this.profil.set(null);
              this.erreur.set(messageErreur(e, { 404: 'Étudiant introuvable.', 403: 'Accès refusé.' }));
              this.chargement.set(false);
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private chargerCv(id: string): void {
    if (!this.peutVoirCv()) return;
    this.api.getStudentCv(id).subscribe({
      next: (cv) => this.cv.set(cv),
      error: (e) => {
        // 404 = pas encore de CV : ce n'est pas une erreur à afficher en rouge.
        if (!(e instanceof ErreurApi && e.statut === 404)) this.erreurCv.set(messageErreur(e, { 403: 'Accès au CV refusé.' }));
      },
    });
  }

  protected async telechargerCv(): Promise<void> {
    const donnees = this.donneesCv();
    if (!donnees) return;
    this.telechargement.set(true);
    try {
      await this.pdf.telecharger(donnees);
    } catch {
      this.erreurCv.set('Impossible de générer le PDF. Réessayez.');
    } finally {
      this.telechargement.set(false);
    }
  }
}
