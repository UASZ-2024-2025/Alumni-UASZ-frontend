import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { AnalyticsReportsService } from '../../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../../api/generes/analyses-correspondances/api/dashboard.service';
import { DashboardStats } from '../../../api/generes/analyses-correspondances/model/dashboardStats';
import { InsertionReportItem } from '../../../api/generes/analyses-correspondances/model/insertionReportItem';
import { InsertionReportResponse } from '../../../api/generes/analyses-correspondances/model/insertionReportResponse';
import { SkillsGapResponse } from '../../../api/generes/analyses-correspondances/model/skillsGapResponse';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { UserStatus } from '../../../api/generes/utilisateurs/model/userStatus';
import { Alerte } from '../alerte/alerte';
import { Bouton } from '../bouton/bouton';
import { Champ, OptionChamp } from '../champ/champ';
import { EtatVide } from '../etat-vide/etat-vide';
import { Carte } from '../carte/carte';
import { EntetePage } from '../entete-page/entete-page';
import { CarteStat } from '../carte-stat/carte-stat';
import { GraphiqueBarres, LigneGraphique } from '../graphique-barres/graphique-barres';
import { ColonneGraphique, GraphiqueColonnes } from '../graphique-colonnes/graphique-colonnes';
import { GraphiqueAnneau, SegmentAnneau } from '../graphique-anneau/graphique-anneau';
import { libelleRole, libelleStatut } from '../../utilitaires/libelles';
import { messageErreur } from '../../utilitaires/messages-erreur';

/** État de chargement d'un bloc ; chaque bloc est indépendant des autres. */
interface Etat<T> {
  statut: 'chargement' | 'ok' | 'erreur';
  donnees?: T;
  message?: string;
}

const enChargement = <T>(): Etat<T> => ({ statut: 'chargement' });

/** Bornes de l'année de promotion acceptées par le back (contrat 1.20.0 : sinon 400 INVALID_GRADUATION_YEAR). */
export const ANNEE_PROMOTION_MIN = 1990;
export const ANNEE_PROMOTION_MAX = 2100;

/**
 * Détail d'une ligne du rapport d'insertion : « 36/45 insérés · délai moyen 3 mois ».
 * Le délai est `null` (ou absent) quand aucun diplômé de la ligne n'a de délai connu (contrat 1.20.0).
 */
export function detailInsertion(r: InsertionReportItem): string {
  const base = `${r.employedCount ?? 0}/${r.totalGraduates ?? 0} insérés`;
  return r.averageMonthsToFirstJob == null ? `${base} · délai moyen inconnu` : `${base} · délai moyen ${r.averageMonthsToFirstJob} mois`;
}

function anneeValide(valeur: string): boolean {
  const n = Number(valeur);
  return Number.isInteger(n) && n >= ANNEE_PROMOTION_MIN && n <= ANNEE_PROMOTION_MAX;
}

@Component({
  selector: 'app-tableau-de-bord',
  imports: [DatePipe, FormsModule, Alerte, Bouton, Champ, Carte, EntetePage, EtatVide, CarteStat, GraphiqueAnneau, GraphiqueBarres, GraphiqueColonnes],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.scss',
})
export class TableauDeBord implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly rapports = inject(AnalyticsReportsService);
  private readonly utilisateurs = inject(UsersService);

  /**
   * Vue administrateur ou enseignant. Le contrat réserve ces API à l'administrateur (403 sinon) :
   * tant que le back ne les ouvre pas à l'enseignant, sa vue n'appelle rien.
   */
  readonly admin = input(false);
  /** Titre de la page ; par défaut selon le rôle. */
  readonly titre = input<string>();

  protected readonly stats = signal<Etat<DashboardStats>>(enChargement());
  protected readonly insertion = signal<Etat<InsertionReportResponse>>(enChargement());
  protected readonly competences = signal<Etat<SkillsGapResponse>>(enChargement());
  protected readonly specialites = signal<string[]>([]);
  protected readonly annee = signal('');
  protected readonly specialite = signal('');
  protected readonly optionsSpecialites = computed<OptionChamp[]>(() => [
    { valeur: '', libelle: 'Toutes' },
    ...this.specialites().map((s) => ({ valeur: s, libelle: s })),
  ]);
  protected readonly parRole = signal<Etat<SegmentAnneau[]>>(enChargement());
  protected readonly parStatut = signal<Etat<SegmentAnneau[]>>(enChargement());

  /** Taux d'insertion global en anneau : insérés / non insérés. */
  protected readonly jaugeInsertion = computed<SegmentAnneau[]>(() => {
    const taux = Math.round(Math.min(100, Math.max(0, this.stats().donnees?.insertionRate ?? 0)) * 10) / 10;
    return [
      { libelle: 'Insérés', valeur: taux },
      { libelle: 'Non insérés', valeur: Math.round((100 - taux) * 10) / 10, couleur: 'var(--g1)' },
    ];
  });

  /** Taux d'insertion par promotion (insérés / diplômés, toutes spécialités confondues). */
  protected readonly colonnesInsertion = computed<ColonneGraphique[]>(() => {
    const parAnnee = new Map<number, { inseres: number; diplomes: number }>();
    for (const r of this.insertion().donnees?.reportData ?? []) {
      if (r.graduationYear === undefined) continue;
      const cumul = parAnnee.get(r.graduationYear) ?? { inseres: 0, diplomes: 0 };
      cumul.inseres += r.employedCount ?? 0;
      cumul.diplomes += r.totalGraduates ?? 0;
      parAnnee.set(r.graduationYear, cumul);
    }
    return [...parAnnee.entries()]
      .sort(([a], [b]) => a - b)
      .map(([annee, c]) => ({ libelle: String(annee), valeur: c.diplomes ? Math.round((c.inseres / c.diplomes) * 100) : 0 }));
  });

  /** Effectifs du rapport affiché (le taux global du back est calculé sur ces mêmes totaux). */
  protected readonly totauxInsertion = computed(() => {
    const lignes = this.insertion().donnees?.reportData ?? [];
    return {
      diplomes: lignes.reduce((somme, r) => somme + (r.totalGraduates ?? 0), 0),
      emplois: lignes.reduce((somme, r) => somme + (r.employedCount ?? 0), 0),
    };
  });

  protected readonly kpis = computed(() => {
    const s = this.stats().donnees;
    const kpis: { libelle: string; valeur?: number; suffixe?: string }[] = [
      { libelle: 'Alumni', valeur: s?.alumniCount },
      { libelle: 'Étudiants', valeur: s?.studentCount },
      { libelle: 'Entreprises', valeur: s?.companyCount },
      { libelle: "Taux d'insertion", valeur: s?.insertionRate, suffixe: ' %' },
      { libelle: 'Stages', valeur: s?.internshipCount },
      { libelle: "Offres d'emploi publiées", valeur: s?.jobOfferCount },
    ];
    return kpis;
  });

  protected readonly lignesInsertion = computed<LigneGraphique[]>(() =>
    (this.insertion().donnees?.reportData ?? []).map((r) => ({
      libelle: `${r.graduationYear ?? '?'} · ${r.specialty ?? '?'}`,
      valeur: r.insertionRate ?? 0,
      detail: detailInsertion(r),
    })),
  );

  protected readonly lignesCompetences = computed<LigneGraphique[]>(() =>
    (this.competences().donnees?.skillsGapAnalysis ?? []).map((c) => ({
      libelle: c.skillName ?? '?',
      valeur: c.demandPercentage ?? 0,
      secondaire: c.supplyPercentage ?? 0,
      detail: `écart ${c.gap ?? 0}`,
    })),
  );

  ngOnInit(): void {
    if (!this.admin()) return;
    this.chargerStats();
    this.chargerInsertion();
    this.chargerCompetences();
    this.chargerRepartitions();
  }

  /** Une requête par valeur (page de taille 1) : seul `totalElements` nous intéresse. */
  protected chargerRepartitions(): void {
    this.compter(this.parRole, Object.values(RoleName), libelleRole, (r) => this.utilisateurs.listUsers(r as RoleName, undefined, 0, 1));
    this.compter(this.parStatut, Object.values(UserStatus), libelleStatut, (st) => this.utilisateurs.listUsers(undefined, st as UserStatus, 0, 1));
  }

  private compter(
    cible: WritableSignal<Etat<SegmentAnneau[]>>,
    valeurs: string[],
    libelle: (v: string) => string,
    appel: (v: string) => Observable<{ totalElements?: number }>,
  ): void {
    cible.set(enChargement());
    forkJoin(valeurs.map(appel)).subscribe({
      next: (reponses) =>
        cible.set({ statut: 'ok', donnees: valeurs.map((v, i) => ({ libelle: libelle(v), valeur: reponses[i].totalElements ?? 0 })) }),
      error: (e) => cible.set({ statut: 'erreur', message: messageErreur(e) }),
    });
  }

  protected chargerStats(): void {
    this.stats.set(enChargement());
    this.dashboard.getDashboardStats().subscribe({
      next: (donnees) => this.stats.set({ statut: 'ok', donnees }),
      error: (e) => this.stats.set({ statut: 'erreur', message: messageErreur(e) }),
    });
  }

  protected filtrer(): void {
    const annee = this.annee();
    // même règle que le back (400 sinon) : on évite l'aller-retour et on explique tout de suite
    if (annee && !anneeValide(annee)) {
      this.insertion.set({
        statut: 'erreur',
        message: `L'année de promotion doit être comprise entre ${ANNEE_PROMOTION_MIN} et ${ANNEE_PROMOTION_MAX}.`,
      });
      return;
    }
    this.chargerInsertion(annee, this.specialite());
  }

  protected chargerInsertion(annee?: string, specialite?: string): void {
    const filtre = !!annee || !!specialite;
    this.insertion.set(enChargement());
    // 400 et 503 : le message du back est précis (année invalide, données des diplômés indisponibles)
    this.rapports.getInsertionReport(annee ? Number(annee) : undefined, specialite === '' ? undefined : specialite).subscribe({
      next: (donnees) => {
        this.insertion.set({ statut: 'ok', donnees });
        // la liste des spécialités vient de la première réponse non filtrée
        if (!filtre) {
          const noms = (donnees.reportData ?? []).map((r) => r.specialty ?? '');
          this.specialites.set([...new Set(noms.filter(Boolean))].sort((a, b) => a.localeCompare(b)));
        }
      },
      error: (e) => this.insertion.set({ statut: 'erreur', message: messageErreur(e) }),
    });
  }

  protected chargerCompetences(): void {
    this.competences.set(enChargement());
    this.rapports.getSkillsGapReport().subscribe({
      next: (donnees) => this.competences.set({ statut: 'ok', donnees }),
      error: (e) => this.competences.set({ statut: 'erreur', message: messageErreur(e) }),
    });
  }
}
