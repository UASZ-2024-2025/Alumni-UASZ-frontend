import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AnalyticsReportsService } from '../../../api/generes/analyses-correspondances/api/analyticsReports.service';
import { DashboardService } from '../../../api/generes/analyses-correspondances/api/dashboard.service';
import { DashboardStats } from '../../../api/generes/analyses-correspondances/model/dashboardStats';
import { InsertionReportResponse } from '../../../api/generes/analyses-correspondances/model/insertionReportResponse';
import { SkillsGapResponse } from '../../../api/generes/analyses-correspondances/model/skillsGapResponse';
import { GraphiqueBarres, LigneGraphique } from '../composants/graphique-barres';
import { messageErreur } from '../erreurs';

/** État de chargement d'un bloc ; chaque bloc est indépendant des autres. */
interface Etat<T> {
  statut: 'chargement' | 'ok' | 'erreur';
  donnees?: T;
  message?: string;
}

const enChargement = <T>(): Etat<T> => ({ statut: 'chargement' });

@Component({
  selector: 'app-tableau-de-bord',
  imports: [DatePipe, GraphiqueBarres],
  templateUrl: './tableau-de-bord.html',
  styleUrl: '../administration.scss',
})
export class TableauDeBord {
  private readonly dashboard = inject(DashboardService);
  private readonly rapports = inject(AnalyticsReportsService);

  protected readonly stats = signal<Etat<DashboardStats>>(enChargement());
  protected readonly insertion = signal<Etat<InsertionReportResponse>>(enChargement());
  protected readonly competences = signal<Etat<SkillsGapResponse>>(enChargement());
  protected readonly specialites = signal<string[]>([]);

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
    this.rapports.getInsertionReport(annee ? Number(annee) : undefined, specialite || undefined).subscribe({
      next: (donnees) => {
        this.insertion.set({ statut: 'ok', donnees });
        // la liste des spécialités vient de la première réponse non filtrée
        if (!filtre) {
          const noms = (donnees.reportData ?? []).map((r) => r.specialty ?? '');
          this.specialites.set([...new Set(noms.filter(Boolean))].sort());
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
