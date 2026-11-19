import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { AvailabilityStatus } from '../../../api/generes/alumni/model/availabilityStatus';
import { StudentProfile } from '../../../api/generes/alumni/model/studentProfile';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';
import { ChampEtiquettes } from '../composants/champ-etiquettes';
import { LIBELLES_DISPONIBILITE } from '../modeles/cv.modele';

const SPECIALITES = ['Génie Logiciel', 'Réseaux et Télécommunications', 'Informatique de Gestion', 'Intelligence Artificielle', 'Cybersécurité'];

@Component({
  selector: 'app-profil-etudiant',
  imports: [ReactiveFormsModule, RouterLink, Alerte, ChampEtiquettes],
  templateUrl: './profil-etudiant.html',
  styleUrl: './profil-etudiant.scss',
})
export class ProfilEtudiant implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(StudentsService);
  private readonly auth = inject(AuthentificationService);

  protected readonly specialites = SPECIALITES;
  protected readonly disponibilites = Object.entries(LIBELLES_DISPONIBILITE) as [AvailabilityStatus, string][];

  protected readonly formulaire = this.fb.group({
    specialty: ['', Validators.maxLength(150)],
    academicYear: [null as number | null, [Validators.min(2000), Validators.max(2100)]],
    bio: ['', Validators.maxLength(2000)],
    availabilityStatus: ['NOT_AVAILABLE' as AvailabilityStatus],
    availabilityDate: [''],
  });
  protected readonly competences = signal<string[]>([]);
  protected readonly interets = signal<string[]>([]);

  protected readonly profil = signal<StudentProfile | null>(null);
  protected readonly chargement = signal(true);
  protected readonly enregistrement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly succes = signal(false);

  protected readonly nom = computed(() => {
    const u = this.auth.utilisateur();
    const p = this.profil();
    return `${p?.firstName ?? u?.firstName ?? ''} ${p?.lastName ?? u?.lastName ?? ''}`.trim();
  });
  protected readonly datePertinente = computed(() => this.statut() !== 'NOT_AVAILABLE');
  private readonly statut = signal<AvailabilityStatus>('NOT_AVAILABLE');

  ngOnInit(): void {
    this.formulaire.controls.availabilityStatus.valueChanges.subscribe((s) => this.statut.set(s));
    const id = this.auth.utilisateur()?.id;
    if (!id) {
      this.erreur.set('Session invalide : reconnectez-vous.');
      this.chargement.set(false);
      return;
    }
    this.api.getStudentById(id).subscribe({
      next: (p) => {
        this.profil.set(p);
        this.formulaire.patchValue({
          specialty: p.specialty ?? '',
          academicYear: p.academicYear ?? null,
          bio: p.bio ?? '',
          availabilityStatus: p.availabilityStatus ?? 'NOT_AVAILABLE',
          availabilityDate: p.availabilityDate ?? '',
        });
        this.statut.set(p.availabilityStatus ?? 'NOT_AVAILABLE');
        this.competences.set(p.skills ?? []);
        this.interets.set(p.interests ?? []);
        this.chargement.set(false);
      },
      error: (e) => {
        this.erreur.set(messageErreur(e, { 404: 'Profil introuvable.', 403: 'Accès refusé.' }));
        this.chargement.set(false);
      },
    });
  }

  protected enregistrer(): void {
    const id = this.auth.utilisateur()?.id;
    if (!id) return;
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }
    const v = this.formulaire.getRawValue();
    this.erreur.set(null);
    this.succes.set(false);
    this.enregistrement.set(true);

    this.api
      .updateStudentProfile(id, {
        specialty: v.specialty.trim() || undefined,
        academicYear: v.academicYear ?? undefined,
        bio: v.bio.trim() || undefined,
        interests: this.interets(),
        skills: this.competences(),
        availabilityStatus: v.availabilityStatus,
        availabilityDate: v.availabilityStatus !== 'NOT_AVAILABLE' && v.availabilityDate ? v.availabilityDate : undefined,
      })
      .subscribe({
        next: (p) => {
          this.profil.set(p);
          this.competences.set(p.skills ?? []);
          this.interets.set(p.interests ?? []);
          this.enregistrement.set(false);
          this.succes.set(true);
        },
        error: (e) => {
          this.enregistrement.set(false);
          this.erreur.set(messageErreur(e, { 400: 'Certaines informations sont invalides.', 403: 'Vous ne pouvez modifier que votre propre profil.' }));
        },
      });
  }
}
