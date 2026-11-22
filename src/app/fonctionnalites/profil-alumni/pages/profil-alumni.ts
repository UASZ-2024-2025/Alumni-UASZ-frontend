import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { AlumniProfile } from '../../../api/generes/alumni/model/alumniProfile';
import { WorkExperience } from '../../../api/generes/alumni/model/workExperience';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';
import { Carte } from '../../../commun/components/carte/carte';
import { CaseACocher } from '../../../commun/components/case-a-cocher/case-a-cocher';
import { Champ } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { trierExperiences } from '../../annuaire/pages/fiche-alumni';
import { periode } from '../../profil-etudiant/modeles/cv.modele';

/** La date de fin ne peut pas précéder la date de début. */
export function datesCoherentes(g: AbstractControl): ValidationErrors | null {
  const debut = g.get('startDate')?.value as string;
  const fin = g.get('endDate')?.value as string;
  const encours = g.get('isCurrent')?.value as boolean;
  return !encours && debut && fin && fin < debut ? { datesIncoherentes: true } : null;
}

@Component({
  selector: 'app-profil-alumni',
  imports: [ReactiveFormsModule, Alerte, Bouton, EntetePage, Carte, CaseACocher, Champ, EtatVide, Spinner],
  templateUrl: './profil-alumni.html',
  styleUrls: ['../../profil-etudiant/pages/profil-etudiant.scss', '../../annuaire/annuaire.scss'],
  styles: `.page-pleine { max-width: 760px; } /* aligné à gauche comme les autres pages, sans le centrage de .page */`,
})
export class ProfilAlumni implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(AlumniService);
  private readonly auth = inject(AuthentificationService);

  protected readonly id = computed(() => this.auth.utilisateur()?.id ?? '');
  protected readonly profil = signal<AlumniProfile | null>(null);
  protected readonly experiences = signal<WorkExperience[]>([]);
  protected readonly chargement = signal(true);
  protected readonly enregistrement = signal(false);
  protected readonly ajout = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurExperience = signal<string | null>(null);
  protected readonly succes = signal(false);
  protected readonly succesExperience = signal(false);
  protected readonly periode = periode;

  protected readonly formulaire = this.fb.group({
    graduationYear: ['', [Validators.min(2000), Validators.max(2100)]],
    specialty: ['', Validators.maxLength(150)],
    currentCompany: ['', Validators.maxLength(150)],
    currentPosition: ['', Validators.maxLength(150)],
    linkedinUrl: ['', [Validators.maxLength(300), Validators.pattern(/^$|^https?:\/\/\S+$/i)]],
  });

  protected readonly experience = this.fb.group(
    {
      companyName: ['', [Validators.required, Validators.maxLength(150)]],
      position: ['', [Validators.required, Validators.maxLength(150)]],
      startDate: ['', Validators.required],
      endDate: [''],
      isCurrent: [false],
      description: ['', Validators.maxLength(2000)],
    },
    { validators: datesCoherentes },
  );

  ngOnInit(): void {
    if (!this.id()) {
      this.erreur.set('Session invalide : reconnectez-vous.');
      this.chargement.set(false);
      return;
    }
    this.experience.controls.isCurrent.valueChanges.subscribe((enCours) => {
      if (enCours) this.experience.controls.endDate.setValue('');
    });
    forkJoin({
      profil: this.api.getAlumniById(this.id()),
      experiences: this.api.getAlumniExperiences(this.id()).pipe(catchError(() => of([] as WorkExperience[]))),
    }).subscribe({
      next: ({ profil, experiences }) => {
        this.profil.set(profil);
        this.formulaire.patchValue({
          graduationYear: profil.graduationYear == null ? '' : String(profil.graduationYear),
          specialty: profil.specialty ?? '',
          currentCompany: profil.currentCompany ?? '',
          currentPosition: profil.currentPosition ?? '',
          linkedinUrl: profil.linkedinUrl ?? '',
        });
        this.experiences.set(trierExperiences(experiences.length ? experiences : (profil.experiences ?? [])));
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e, { 404: 'Profil Alumni introuvable.', 403: 'Accès refusé.' }));
        this.chargement.set(false);
      },
    });
  }

  protected enregistrer(): void {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    const v = this.formulaire.getRawValue();
    this.erreur.set(null);
    this.succes.set(false);
    this.enregistrement.set(true);
    this.api
      .updateAlumniProfile(this.id(), {
        graduationYear: v.graduationYear ? Number(v.graduationYear) : undefined,
        specialty: v.specialty.trim() || undefined,
        currentCompany: v.currentCompany.trim() || undefined,
        currentPosition: v.currentPosition.trim() || undefined,
        linkedinUrl: v.linkedinUrl.trim() || undefined,
      })
      .subscribe({
        next: (p) => {
          this.profil.set(p);
          this.enregistrement.set(false);
          this.succes.set(true);
        },
        error: (e) => {
          this.enregistrement.set(false);
          this.erreur.set(messageErreur(e, { 400: 'Certaines informations sont invalides.', 403: 'Vous ne pouvez modifier que votre propre profil.' }));
        },
      });
  }

  protected ajouterExperience(): void {
    if (this.experience.invalid) {
      this.experience.markAllAsTouched();
      return;
    }
    const v = this.experience.getRawValue();
    this.erreurExperience.set(null);
    this.succesExperience.set(false);
    this.ajout.set(true);
    this.api
      .addAlumniExperience(this.id(), {
        companyName: v.companyName.trim(),
        position: v.position.trim(),
        startDate: v.startDate,
        endDate: v.isCurrent || !v.endDate ? undefined : v.endDate,
        isCurrent: v.isCurrent,
        description: v.description.trim() || undefined,
      })
      .subscribe({
        next: (e) => {
          this.experiences.set(trierExperiences([...this.experiences(), e]));
          this.experience.reset();
          this.ajout.set(false);
          this.succesExperience.set(true);
        },
        error: (e) => {
          this.ajout.set(false);
          this.erreurExperience.set(messageErreur(e, { 400: "L'expérience est invalide : vérifiez les champs.", 403: 'Action non autorisée.' }));
        },
      });
  }
}
