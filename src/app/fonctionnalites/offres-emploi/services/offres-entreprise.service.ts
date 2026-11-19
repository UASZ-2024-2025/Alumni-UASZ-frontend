import { inject, Injectable } from '@angular/core';
import {
  ApplicationsService,
  ApplicationStatus,
  JobOfferCreateRequest,
  OffersService,
} from '../../../api/generes/offres-emploi';

// TODO : remplacer par l'id de l'entreprise connectée (session/profil) quand il sera connu.
const ID_ENTREPRISE_MOCK = '11111111-1111-4111-8111-111111111111';

export type NouvelleOffre = Omit<JobOfferCreateRequest, 'companyId'>;

@Injectable({ providedIn: 'root' })
export class OffresEntrepriseService {
  private readonly api = inject(OffersService);
  private readonly candidatures = inject(ApplicationsService);

  idEntreprise(): string {
    return ID_ENTREPRISE_MOCK;
  }

  publier(offre: NouvelleOffre) {
    return this.api.createOffer({ ...offre, companyId: this.idEntreprise() });
  }

  mesOffres(page = 0, size = 20) {
    return this.api.searchOffers(
      undefined, undefined, this.idEntreprise(), undefined, undefined, undefined, page, size,
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
