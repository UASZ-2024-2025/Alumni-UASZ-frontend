import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, map, Observable, Subscription } from 'rxjs';
import { AlumniService } from '../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../api/generes/alumni/api/companies.service';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { AvailabilityStatus } from '../../../api/generes/alumni/model/availabilityStatus';
import { Company } from '../../../api/generes/alumni/model/company';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Avatar } from '../../../commun/components/avatar/avatar';
import { Badge } from '../../../commun/components/badge/badge';
import { Bouton } from '../../../commun/components/bouton/bouton';
import { Champ, OptionChamp } from '../../../commun/components/champ/champ';
import { EtatVide } from '../../../commun/components/etat-vide/etat-vide';
import { Onglets } from '../../../commun/components/onglets/onglets';
import { Pagination } from '../../../commun/components/pagination/pagination';
import { PucesCompetences } from '../../../commun/components/puces-competences/puces-competences';
import { Spinner } from '../../../commun/components/spinner/spinner';
import { messageErreur } from '../../../commun/utilitaires/messages-erreur';
import { LIBELLES_DISPONIBILITE } from '../../profil-etudiant/modeles/cv.modele';
import { CarteAnnuaire, carteAlumni, carteEntreprise, carteEtudiant, Onglet, ONGLETS, ongletValide } from '../modeles/cartes';
import { EntetePage } from '../../../commun/components/entete-page/entete-page';

export const SPECIALITES = ['Génie Logiciel', 'Réseaux et Télécommunications', 'Informatique de Gestion', 'Intelligence Artificielle', 'Cybersécurité'];

interface Page {
  cartes: CarteAnnuaire[];
  total: number;
}

@Component({
  selector: 'app-annuaire',
  imports: [FormsModule, ReactiveFormsModule, RouterLink, Alerte, Avatar, Badge, Bouton, Champ, EtatVide, Onglets, Pagination, PucesCompetences, Spinner, EntetePage],
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

  protected readonly onglets = ONGLETS.map((o) => ({ cle: o.code, libelle: o.libelle }));
  protected readonly specialites = SPECIALITES;
  protected readonly optionsDisponibilite: OptionChamp[] = [
    { valeur: '', libelle: 'Toutes' },
    ...(Object.entries(LIBELLES_DISPONIBILITE) as [AvailabilityStatus, string][]).map(([valeur, libelle]) => ({ valeur, libelle })),
  ];
  protected readonly optionsPartenaire: OptionChamp[] = [
    { valeur: '', libelle: 'Toutes' },
    { valeur: 'oui', libelle: 'Partenaires officielles' },
    { valeur: 'non', libelle: 'Non partenaires' },
  ];
  protected readonly taille = 12;

  protected readonly onglet = signal<Onglet>('etudiants');
  protected readonly page = signal(0);
  protected readonly cartes = signal<CarteAnnuaire[]>([]);
  protected readonly total = signal(0);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly entreprises = signal<Company[]>([]);
  protected readonly optionsEntreprise = computed<OptionChamp[]>(() => [
    { valeur: '', libelle: 'Toutes' },
    ...this.entreprises().map((c) => ({ valeur: c.id ?? '', libelle: c.name ?? '' })),
  ]);
  protected readonly nbPages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille)));

  protected readonly filtres = this.fb.group({
    query: [''],
    specialty: [''],
    annee: [''],
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
          .searchAlumni(texte, f.entrepriseId || undefined, f.annee ? Number(f.annee) : undefined, undefined, page, this.taille)
          .pipe(map((r) => ({ cartes: (r.content ?? []).map(carteAlumni), total: r.totalElements ?? 0 })));
      case 'entreprises':
        return this.entreprisesApi
          .searchCompanies(texte, f.partenaire === '' ? undefined : f.partenaire === 'oui', page, this.taille)
          .pipe(map((r) => ({ cartes: (r.content ?? []).map(carteEntreprise), total: r.totalElements ?? 0 })));
      default:
        return this.etudiants
          .searchStudents(texte, f.specialty.trim() || undefined, f.annee ? Number(f.annee) : undefined, f.disponibilite || undefined, page, this.taille)
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
