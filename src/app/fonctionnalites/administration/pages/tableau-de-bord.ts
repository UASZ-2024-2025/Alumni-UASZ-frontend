import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { AnalyticsReportsService } from '../../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../../api/generes/analyses-correspondances/api/dashboard.service';
import { DashboardStats } from '../../../api/generes/analyses-correspondances/model/dashboardStats';
import { InsertionReportResponse } from '../../../api/generes/analyses-correspondances/model/insertionReportResponse';
import { SkillsGapResponse } from '../../../api/generes/analyses-correspondances/model/skillsGapResponse';
import { UsersService } from '../../../api/generes/utilisateurs/api/users.service';
import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { UserStatus } from '../../../api/generes/utilisateurs/model/userStatus';
import { Alerte } from '../../../commun/components/alerte/alerte';
import { Carte } from '../../../commun/components/carte/carte';
import { CarteStat } from '../../../commun/components/carte-stat/carte-stat';
import { GraphiqueBarres, LigneGraphique } from '../../../commun/components/graphique-barres/graphique-barres';
import { ColonneGraphique, GraphiqueColonnes } from '../../../commun/components/graphique-colonnes/graphique-colonnes';
import { GraphiqueAnneau, SegmentAnneau } from '../../../commun/components/graphique-anneau/graphique-anneau';
import { messageErreur } from '../erreurs';
import { libelleRole, libelleStatut } from '../../../commun/utilitaires/libelles';

/** État de chargement d'un bloc ; chaque bloc est indépendant des autres. */
interface Etat<T> {
  statut: 'chargement' | 'ok' | 'erreur';
  donnees?: T;
  message?: string;
}

const enChargement = <T>(): Etat<T> => ({ statut: 'chargement' });

@Component({
  selector: 'app-tableau-de-bord',
  imports: [DatePipe, Alerte, Carte, CarteStat, GraphiqueAnneau, GraphiqueBarres, GraphiqueColonnes],
  templateUrl: './tableau-de-bord.html',
  styleUrl: '../administration.scss',
})
export class TableauDeBord {
  private readonly dashboard = inject(DashboardService);
  private readonly rapports = inject(AnalyticsReportsService);
  private readonly utilisateurs = inject(UsersService);

  protected readonly stats = signal<Etat<DashboardStats>>(enChargement());
  protected readonly insertion = signal<Etat<InsertionReportResponse>>(enChargement());
  protected readonly competences = signal<Etat<SkillsGapResponse>>(enChargement());
  protected readonly specialites = signal<string[]>([]);
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
      detail: `${r.employedCount ?? 0}/${r.totalGraduates ?? 0} insérés`,
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

  constructor() {
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

  protected chargerInsertion(annee?: string, specialite?: string): void {
    const filtre = !!annee || !!specialite;
    this.insertion.set(enChargement());
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
