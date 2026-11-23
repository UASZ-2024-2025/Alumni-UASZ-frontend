import { Component, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, forkJoin, map, Observable, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../../../api/generes/alumni/api/companies.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { Champ } from '../../../../commun/components/champ/champ';

/** Personne à qui écrire. `userId` est l'id du COMPTE (destinataire de la messagerie), pas celui du profil. */
export interface Contact {
  userId: string;
  nom: string;
  role: Categorie;
  detail: string;
}

export type Categorie = 'ETUDIANT' | 'ALUMNI' | 'ENTREPRISE';
type Filtre = 'tous' | Categorie;

const GROUPES: { role: Categorie; titre: string }[] = [
  { role: 'ETUDIANT', titre: 'Étudiants' },
  { role: 'ALUMNI', titre: 'Alumni' },
  { role: 'ENTREPRISE', titre: 'Entreprises' },
];
/** Résultats par catégorie : moins quand les trois sont affichées ensemble. */
const TAILLE_TOUS = 5;
const TAILLE_SEULE = 15;

/**
 * ALUM-263 : choix de la personne à qui écrire en privé, classée par catégorie (étudiants, Alumni, entreprises).
 * Recherche dans les trois annuaires, ouverts à tous les rôles. Une entreprise est jointe via le compte qui gère
 * sa fiche (`ownerId`) : une fiche sans compte n'est pas proposée. Dès l'ouverture, des suggestions sont affichées.
 */
@Component({
  selector: 'app-nouvelle-discussion',
  imports: [FormsModule, Avatar, Bouton, Champ],
  templateUrl: './nouvelle-discussion.html',
  styleUrl: './nouvelle-discussion.scss',
})
export class NouvelleDiscussion {
  private readonly etudiantsApi = inject(StudentsService);
  private readonly alumniApi = inject(AlumniService);
  private readonly entreprisesApi = inject(CompaniesService);

  /** Comptes à ne pas proposer (soi-même). */
  readonly exclus = input<string[]>([]);
  readonly choisi = output<Contact>();
  readonly fermer = output<void>();

  protected readonly onglets: { cle: Filtre; libelle: string }[] = [
    { cle: 'tous', libelle: 'Tous' },
    ...GROUPES.map((g) => ({ cle: g.role, libelle: g.titre })),
  ];
  protected readonly filtre = signal<Filtre>('tous');
  protected readonly requete = signal('');
  protected readonly recherche = signal(true);
  protected readonly suggestions = signal(true);
  protected readonly erreur = signal<string | null>(null);
  private readonly trouves = signal<Contact[]>([]);

  /** Résultats rangés par catégorie, dans l'ordre étudiants, Alumni, entreprises ; catégories vides omises. */
  protected readonly groupes = computed(() => {
    const exclus = new Set(this.exclus());
    const contacts = this.trouves().filter((c) => !exclus.has(c.userId));
    return GROUPES.map((g) => ({ ...g, contacts: contacts.filter((c) => c.role === g.role) })).filter((g) => g.contacts.length);
  });

  private readonly saisies = new Subject<string>();

  constructor() {
    const texte = this.saisies.pipe(
      map((q) => q.trim()),
      debounceTime(300),
      map((q) => (q.length < 2 ? '' : q)), // moins de 2 lettres : suggestions
      startWith(''),
      distinctUntilChanged(),
    );
    combineLatest([texte, toObservable(this.filtre)])
      .pipe(
        tap(([q]) => {
          this.erreur.set(null);
          this.suggestions.set(!q);
          this.recherche.set(true);
        }),
        switchMap(([q, filtre]) => this.chercher(q, filtre)),
        takeUntilDestroyed(),
      )
      .subscribe((contacts) => {
        this.recherche.set(false);
        this.trouves.set(contacts);
      });
  }

  protected saisir(valeur: string): void {
    this.requete.set(valeur);
    this.saisies.next(valeur);
  }

  protected choisirFiltre(cle: Filtre): void {
    this.filtre.set(cle);
  }

  private chercher(q: string, filtre: Filtre): Observable<Contact[]> {
    const texte = q || undefined;
    const taille = filtre === 'tous' ? TAILLE_TOUS : TAILLE_SEULE;
    const voulu = (role: Categorie) => filtre === 'tous' || filtre === role;
    const appels: Observable<Contact[] | null>[] = [];
    if (voulu('ETUDIANT')) {
      appels.push(this.sur(this.etudiantsApi.searchStudents(texte, undefined, undefined, undefined, 0, taille), (r) =>
        (r.content ?? []).map((s) => contact(s.userId, `${s.firstName ?? ''} ${s.lastName ?? ''}`, 'ETUDIANT', s.specialty))));
    }
    if (voulu('ALUMNI')) {
      appels.push(this.sur(this.alumniApi.searchAlumni(texte, undefined, undefined, undefined, 0, taille), (r) =>
        (r.content ?? []).map((a) => contact(a.userId, `${a.firstName ?? ''} ${a.lastName ?? ''}`, 'ALUMNI', a.currentPosition))));
    }
    if (voulu('ENTREPRISE')) {
      appels.push(this.sur(this.entreprisesApi.searchCompanies(texte, undefined, 0, taille), (r) =>
        (r.content ?? []).map((e) => contact(e.ownerId, e.name ?? '', 'ENTREPRISE', e.sector))));
    }
    return forkJoin(appels).pipe(
      map((listes) => {
        if (listes.every((l) => l === null)) this.erreur.set('La recherche est indisponible pour le moment.');
        const tous = listes.flatMap((l) => l ?? []);
        return [...new Map(tous.map((c) => [c.userId, c])).values()];
      }),
    );
  }

  /** Une catégorie en échec n'empêche pas d'afficher les autres. */
  private sur<R>(appel: Observable<R>, lire: (r: R) => (Contact | null)[]): Observable<Contact[] | null> {
    return appel.pipe(
      map((r) => lire(r).filter((c): c is Contact => !!c)),
      catchError(() => of(null)),
    );
  }
}

function contact(userId: string | undefined, nom: string, role: Categorie, detail?: string): Contact | null {
  if (!userId) return null; // fiche sans compte (entreprise non rattachée) : personne à qui écrire
  return { userId, nom: nom.trim() || 'Sans nom', role, detail: detail ?? '' };
}
