import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import {
  ApplicationsService,
  ApplicationStatus,
  JobOffer,
  JobOfferCreateRequest,
  JobOfferPagedResponse,
  OffersService,
} from '../../../api/generes/offres-emploi';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../socle/authentification/services/authentification.service';

export type NouvelleOffre = Omit<JobOfferCreateRequest, 'companyId'>;

/** Même code que le job-offer-service quand un compte ENTREPRISE n'a pas de fiche (ALUM-168). */
export const CODE_COMPTE_NON_RATTACHE = 'ACCOUNT_NOT_LINKED';

@Injectable({ providedIn: 'root' })
export class OffresEntrepriseService {
  private readonly api = inject(OffersService);
  private readonly candidatures = inject(ApplicationsService);
  private readonly auth = inject(AuthentificationService);

  /** Fiche entreprise rattachée au compte connecté (`User.companyId`), absente tant que le compte n'est pas rattaché. */
  idEntreprise(): string | null {
    return this.auth.utilisateur()?.companyId ?? null;
  }

  publier(offre: NouvelleOffre): Observable<JobOffer> {
    const companyId = this.idEntreprise();
    if (!companyId) return compteNonRattache();
    return this.api.createOffer({ ...offre, companyId });
  }

  mesOffres(page = 0, size = 20): Observable<JobOfferPagedResponse> {
    const companyId = this.idEntreprise();
    if (!companyId) return compteNonRattache();
    return this.api.searchOffers(
      undefined, undefined, companyId, undefined, undefined, undefined, page, size,
    );
  }

  /** Offre affichée en tête de l'écran des candidatures (ALUM-208). */
  offre(offerId: string) {
    return this.api.getOfferById(offerId);
  }

  /** Candidatures reçues pour une offre ; 403 si l'appelant n'en est pas l'auteur. */
  candidaturesRecues(offerId: string) {
    return this.candidatures.getApplicationsForOffer(offerId);
  }

  changerStatut(candidatureId: string, status: ApplicationStatus) {
    return this.candidatures.updateApplicationStatus(candidatureId, { status });
  }
}

/** Sans fiche rattachée, on n'appelle pas l'API : le back refuserait de toute façon (403). */
function compteNonRattache(): Observable<never> {
  return throwError(
    () =>
      new ErreurApi(
        403,
        CODE_COMPTE_NON_RATTACHE,
        "Votre compte n'est rattaché à aucune fiche entreprise. Créez votre fiche entreprise ou contactez l'administration.",
      ),
  );
}
