import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, map, of, startWith, switchMap, throwError } from 'rxjs';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';
import { Carte } from '../../../commun/components/carte/carte';
import { Champ } from '../../../commun/components/champ/champ';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { ApercuCv } from '../composants/apercu-cv';
import { SelecteurModeleCv } from '../composants/selecteur-modele-cv';
import {
  cvInitial,
  depuisCvEnregistre,
  DonneesCv,
  LANGUES_CV,
  MODELE_PAR_DEFAUT,
  NIVEAUX_LANGUE,
  ignorerLignesVides,
  versRequeteCv,
} from '../modeles/cv.modele';
import { CvPdfService } from '../services/cv-pdf.service';

@Component({
  selector: 'app-editeur-cv',
  imports: [ReactiveFormsModule, Alerte, ApercuCv, Bouton, EntetePage, Carte, Champ, PucesCompetences, SelecteurModeleCv, Spinner],
  templateUrl: './editeur-cv.html',
  styleUrls: ['./profil-etudiant.scss', './editeur-cv.scss'],
})
export class EditeurCv implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(StudentsService);
  private readonly auth = inject(AuthentificationService);
  private readonly pdf = inject(CvPdfService);

  protected readonly languesCv = LANGUES_CV.map((l) => ({ valeur: l, libelle: l }));
  protected readonly niveaux = NIVEAUX_LANGUE.map((n) => ({ valeur: n, libelle: n }));

  protected readonly formulaire = this.fb.group({
    titre: ['', [Validators.required, Validators.maxLength(150)]],
    modele: [MODELE_PAR_DEFAUT as string, Validators.required],
    langue: ['Français', Validators.required],
    resume: ['', Validators.maxLength(2000)],
    competences: [[] as string[]],
    experiences: this.fb.array<FormGroup>([]),
    formations: this.fb.array<FormGroup>([]),
    langues: this.fb.array<FormGroup>([]),
  });
  private readonly identite = signal<DonneesCv>(cvInitial(null, null));

  private readonly valeurs = toSignal(
    this.formulaire.valueChanges.pipe(
      startWith(null),
      map(() => this.formulaire.getRawValue()),
    ),
    { initialValue: this.formulaire.getRawValue() },
  );

  /** Données pour l'aperçu et le PDF : identité du compte + contenu du formulaire. */
  protected readonly donnees = computed<DonneesCv>(() => {
    const v = this.valeurs();
    return ignorerLignesVides({
      ...this.identite(),
      titre: v.titre,
      modele: v.modele,
      langue: v.langue,
      resume: v.resume,
      competences: v.competences,
      experiences: v.experiences as DonneesCv['experiences'],
      formations: v.formations as DonneesCv['formations'],
      langues: v.langues as DonneesCv['langues'],
    });
  });

  protected readonly chargement = signal(true);
  protected readonly enregistrement = signal(false);
  protected readonly telechargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal(false);
  protected readonly nouveau = signal(false);
  /** Modèle enregistré avec le CV (celui qu'on retrouvera à la prochaine visite) ; le modèle par défaut tant que rien n'est enregistré. */
  private readonly modeleEnregistre = signal<string>(MODELE_PAR_DEFAUT);
  /** Vrai quand le modèle choisi n'est pas encore celui qui sera retrouvé à la prochaine visite. */
  protected readonly modeleAEnregistrer = computed(() => this.donnees().modele !== this.modeleEnregistre());

  get experiences(): FormArray<FormGroup> { return this.formulaire.controls.experiences; }
  get formations(): FormArray<FormGroup> { return this.formulaire.controls.formations; }
  get langues(): FormArray<FormGroup> { return this.formulaire.controls.langues; }

  ngOnInit(): void {
    const utilisateur = this.auth.utilisateur();
    const id = utilisateur?.id;
    if (!id) {
      this.erreur.set('Session invalide : reconnectez-vous.');
      this.chargement.set(false);
      return;
    }

    this.api
      .getStudentById(id)
      .pipe(
        switchMap((profil) =>
          this.api.getStudentCv(id).pipe(
            map((cv) => ({ profil, cv })),
            // Pas encore de CV : on part d'un CV pré-rempli avec le profil.
            catchError((e) => (e instanceof ErreurApi && e.statut === 404 ? of({ profil, cv: null }) : throwError(() => e))),
          ),
        ),
      )
      .subscribe({
        next: ({ profil, cv }) => {
          const base = cvInitial(utilisateur, profil);
          this.identite.set(base);
          this.nouveau.set(!cv);
          const charge = cv ? depuisCvEnregistre(cv, base) : base;
          this.modeleEnregistre.set(charge.modele);
          this.appliquer(charge);
          this.chargement.set(false);
        },
        error: (e) => {
          this.erreur.set(messageErreur(e, { 404: 'Profil introuvable.', 403: 'Accès refusé.' }));
          this.chargement.set(false);
        },
      });
  }

  private appliquer(d: DonneesCv): void {
    this.formulaire.patchValue({ titre: d.titre, modele: d.modele, langue: d.langue, resume: d.resume, competences: d.competences });
    this.experiences.clear();
    d.experiences.forEach((e) => this.experiences.push(this.groupeExperience(e)));
    this.formations.clear();
    d.formations.forEach((f) => this.formations.push(this.groupeFormation(f)));
    this.langues.clear();
    d.langues.forEach((l) => this.langues.push(this.groupeLangue(l)));
  }

  private groupeExperience(e?: Partial<DonneesCv['experiences'][number]>): FormGroup {
    return this.fb.group({
      companyName: [e?.companyName ?? ''],
      position: [e?.position ?? ''],
      startDate: [e?.startDate ?? ''],
      endDate: [e?.endDate ?? ''],
      description: [e?.description ?? '', Validators.maxLength(2000)],
    });
  }

  private groupeFormation(f?: Partial<DonneesCv['formations'][number]>): FormGroup {
    return this.fb.group({
      institution: [f?.institution ?? ''],
      degree: [f?.degree ?? ''],
      fieldOfStudy: [f?.fieldOfStudy ?? ''],
      startDate: [f?.startDate ?? ''],
      endDate: [f?.endDate ?? ''],
    });
  }

  private groupeLangue(l?: Partial<DonneesCv['langues'][number]>): FormGroup {
    return this.fb.group({ language: [l?.language ?? ''], proficiency: [l?.proficiency ?? 'Intermédiaire'] });
  }

  protected ajouterExperience(): void { this.experiences.push(this.groupeExperience()); }
  protected ajouterFormation(): void { this.formations.push(this.groupeFormation()); }
  protected ajouterLangue(): void { this.langues.push(this.groupeLangue()); }
  protected retirer(tableau: FormArray<FormGroup>, index: number): void { tableau.removeAt(index); }

  /** Dates incohérentes : la fin précède le début. */
  protected datesInvalides(g: FormGroup): boolean {
    const { startDate, endDate } = g.getRawValue() as { startDate: string; endDate: string };
    return !!startDate && !!endDate && endDate < startDate;
  }

  private versionValide(): boolean {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      this.erreur.set('Renseignez au minimum le titre du CV.');
      return false;
    }
    const mauvaise = [...this.experiences.controls, ...this.formations.controls].some((g) => this.datesInvalides(g));
    if (mauvaise) {
      this.erreur.set('Dans une expérience ou une formation, la date de fin précède la date de début.');
      return false;
    }
    return true;
  }

  protected enregistrer(): void {
    const id = this.auth.utilisateur()?.id;
    this.erreur.set(null);
    this.succes.set(false);
    if (!id || !this.versionValide()) return;

    this.enregistrement.set(true);
    this.api.updateStudentCv(id, versRequeteCv(this.donnees())).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.nouveau.set(false);
        this.modeleEnregistre.set(this.donnees().modele);
        this.succes.set(true);
      },
      error: (e) => {
        this.enregistrement.set(false);
        this.erreur.set(messageErreur(e, { 400: 'Certaines informations du CV sont invalides.', 403: 'Vous ne pouvez modifier que votre propre CV.' }));
      },
    });
  }

  protected async telecharger(): Promise<void> {
    this.erreur.set(null);
    if (!this.versionValide()) return;
    this.telechargement.set(true);
    try {
      await this.pdf.telecharger(this.donnees());
    } catch {
      this.erreur.set('Impossible de générer le PDF. Réessayez.');
    } finally {
      this.telechargement.set(false);
    }
  }
}
