import { Component, computed, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, map, Observable, of, startWith, Subject, switchMap, tap } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { FormsModule } from '@angular/forms';
import { Avatar } from '../../../../commun/components/avatar/avatar';
import { Bouton } from '../../../../commun/components/bouton/bouton';
import { Champ } from '../../../../commun/components/champ/champ';

/** Personne invitable dans un groupe. `userId` est l'id du COMPTE (celui attendu par `memberIds`), pas celui du profil. */
export interface Membre { userId: string; nom: string; detail: string; }

const TAILLE = 6;

/**
 * Recherche dans les annuaires étudiants et Alumni, puis sélection sous forme de puces.
 * Dès l'ouverture, des suggestions (premiers étudiants et Alumni) sont proposées : la liste n'est jamais vide
 * en attendant la saisie ; à partir de 2 lettres, elle devient le résultat de la recherche.
 * `GET /users` est réservé à l'administrateur : les annuaires sont la seule recherche ouverte à tous.
 */
@Component({
  selector: 'app-choix-membres',
  imports: [FormsModule, Avatar, Bouton, Champ],
  templateUrl: './choix-membres.html',
  styleUrl: './choix-membres.scss',
})
export class ChoixMembres {
  private readonly etudiantsApi = inject(StudentsService);
  private readonly alumniApi = inject(AlumniService);

  /** Comptes déjà membres (et soi-même) : non proposés. */
  readonly exclus = input<string[]>([]);
  readonly selection = model<Membre[]>([]);

  protected readonly requete = signal('');
  /** Vrai tant que la liste affichée est faite de suggestions (moins de 2 lettres saisies). */
  protected readonly suggestions = signal(true);
  protected readonly recherche = signal(false);
  protected readonly erreur = signal<string | null>(null);
  private readonly resultatsBruts = signal<Membre[]>([]);
  protected readonly resultats = computed(() => {
    const ignores = new Set([...this.exclus(), ...this.selection().map((m) => m.userId)]);
    return this.resultatsBruts().filter((m) => !ignores.has(m.userId));
  });

  private readonly saisies = new Subject<string>();

  constructor() {
    this.saisies
      .pipe(
        map((q) => q.trim()),
        debounceTime(300),
        // moins de 2 lettres : une seule et même requête de suggestions
        map((q) => (q.length < 2 ? '' : q)),
        startWith(''),
        distinctUntilChanged(),
        tap((q) => {
          this.erreur.set(null);
          this.suggestions.set(!q);
          this.recherche.set(true);
        }),
        switchMap((q) => this.chercher(q)),
        takeUntilDestroyed(),
      )
      .subscribe((membres) => {
        this.recherche.set(false);
        this.resultatsBruts.set(membres);
      });
  }

  protected saisir(valeur: string): void {
    this.requete.set(valeur);
    this.saisies.next(valeur);
  }

  protected choisir(m: Membre): void {
    this.selection.update((l) => [...l, m]);
  }

  protected retirer(m: Membre): void {
    this.selection.update((l) => l.filter((x) => x.userId !== m.userId));
  }

  private chercher(q: string): Observable<Membre[]> {
    const texte = q || undefined;
    const etudiants = this.etudiantsApi.searchStudents(texte, undefined, undefined, undefined, 0, TAILLE).pipe(
      map((r) => (r.content ?? []).map((s) => this.membre(s.userId, s.firstName, s.lastName, `Étudiant${s.specialty ? ' · ' + s.specialty : ''}`))),
      catchError(() => of(null)),
    );
    const alumni = this.alumniApi.searchAlumni(texte, undefined, undefined, undefined, 0, TAILLE).pipe(
      map((r) => (r.content ?? []).map((a) => this.membre(a.userId, a.firstName, a.lastName, `Alumni${a.currentPosition ? ' · ' + a.currentPosition : ''}`))),
      catchError(() => of(null)),
    );
    return forkJoin([etudiants, alumni]).pipe(
      map(([e, a]) => {
        if (!e && !a) this.erreur.set('La recherche est indisponible pour le moment.');
        const tous = [...(e ?? []), ...(a ?? [])].filter((m): m is Membre => !!m);
        return [...new Map(tous.map((m) => [m.userId, m])).values()];
      }),
    );
  }

  private membre(userId?: string, prenom = '', nom = '', detail = ''): Membre | null {
    return userId ? { userId, nom: `${prenom} ${nom}`.trim() || 'Sans nom', detail } : null;
  }
}
