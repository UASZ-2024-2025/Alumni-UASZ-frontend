import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { AvailabilityStatus } from '../../../api/generes/alumni/model/availabilityStatus';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { LIBELLES_DISPONIBILITE } from '../../profil-etudiant/modeles/cv.modele';
import { Pagination } from '../composants/pagination';
import { CarteAnnuaire, carteAlumni, carteEntreprise, carteEtudiant, initiales, Onglet, ONGLETS, ongletValide } from '../modeles/cartes';

export const SPECIALITES = ['Génie Logiciel', 'Réseaux et Télécommunications', 'Informatique de Gestion', 'Intelligence Artificielle', 'Cybersécurité'];

interface Page {
  cartes: CarteAnnuaire[];
  total: number;
}

@Component({
  selector: 'app-annuaire',
  imports: [ReactiveFormsModule, RouterLink, Alerte, Pagination],
  templateUrl: './annuaire.html',
  styleUrls: ['../../profil-etudiant/pages/profil-etudiant.scss', '../annuaire.scss'],
})
export class Annuaire implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly etudiants = inject(StudentsService);
  private readonly alumni = inject(AlumniService);
  private readonly entreprisesApi = inject(CompaniesService);

  protected readonly onglets = ONGLETS;
  protected readonly specialites = SPECIALITES;
  protected readonly disponibilites = Object.entries(LIBELLES_DISPONIBILITE) as [AvailabilityStatus, string][];
  protected readonly taille = 12;
  protected readonly initiales = initiales;

  protected readonly onglet = signal<Onglet>('etudiants');
  protected readonly page = signal(0);
  protected readonly cartes = signal<CarteAnnuaire[]>([]);
  protected readonly total = signal(0);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly entreprises = signal<Company[]>([]);

  protected readonly filtres = this.fb.group({
    query: [''],
    specialty: [''],
    annee: [null as number | null],
    disponibilite: ['' as '' | AvailabilityStatus],
    entrepriseId: [''],
    partenaire: ['' as '' | 'oui' | 'non'],
  });

  private abonnement?: Subscription;

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      const onglet = ongletValide(p.get('onglet'));
      this.onglet.set(onglet);
      this.filtres.reset(undefined, { emitEvent: false });
      if (onglet === 'alumni' && this.entreprises().length === 0) this.chargerEntreprises();
      this.charger(0);
    });
    this.filtres.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.charger(0));
  }

  protected choisirOnglet(onglet: Onglet): void {
    void this.router.navigate([], { queryParams: { onglet }, replaceUrl: true });
  }

  protected charger(page: number): void {
    this.abonnement?.unsubscribe();
    this.page.set(page);
    this.chargement.set(true);
    this.erreur.set(null);
    this.abonnement = this.requete(page).subscribe({
      next: (r) => {
        this.cartes.set(r.cartes);
        this.total.set(r.total);
        this.chargement.set(false);
      },
      error: (e) => {
        this.cartes.set([]);
        this.total.set(0);
        this.erreur.set(messageErreur(e));
        this.chargement.set(false);
      },
    });
  }

  private requete(page: number): Observable<Page> {
    const f = this.filtres.getRawValue();
    const texte = f.query.trim() || undefined;
    switch (this.onglet()) {
      case 'alumni':
        return this.alumni
          .searchAlumni(texte, f.entrepriseId || undefined, f.annee ?? undefined, undefined, page, this.taille)
          .pipe(map((r) => ({ cartes: (r.content ?? []).map(carteAlumni), total: r.totalElements ?? 0 })));
      case 'entreprises':
        return this.entreprisesApi
          .searchCompanies(texte, f.partenaire === '' ? undefined : f.partenaire === 'oui', page, this.taille)
          .pipe(map((r) => ({ cartes: (r.content ?? []).map(carteEntreprise), total: r.totalElements ?? 0 })));
      default:
        return this.etudiants
          .searchStudents(texte, f.specialty.trim() || undefined, f.annee ?? undefined, f.disponibilite || undefined, page, this.taille)
          .pipe(map((r) => ({ cartes: (r.content ?? []).map(carteEtudiant), total: r.totalElements ?? 0 })));
    }
  }

  private chargerEntreprises(): void {
    this.entreprisesApi.searchCompanies(undefined, undefined, 0, 100).subscribe({
      next: (r) => this.entreprises.set(r.content ?? []),
      error: () => this.entreprises.set([]),
    });
  }

  protected reinitialiser(): void {
    this.filtres.reset();
  }
}
