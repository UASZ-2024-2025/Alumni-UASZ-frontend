
import { inject, Injectable } from '@angular/core';
import {
  ApplicationsService,
  ApplicationStatus,
  JobOfferCreateRequest,
  OffersService,
} from '../../../api/generes/offres-emploi';

export type NouvelleOffre = Omit<JobOfferCreateRequest, 'companyId'>;

@Injectable({ providedIn: 'root' })
export class OffresEntrepriseService {
  private readonly api = inject(OffersService);
  private readonly candidatures = inject(ApplicationsService);

  publier(offre: NouvelleOffre) {
    return this.api.createOffer(offre as JobOfferCreateRequest);
  }

  mesOffres(page = 0, size = 20) {
    return this.api.searchOffers(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      page,
      size
    );
  }

  offre(offerId: string) {
    return this.api.getOfferById(offerId);
  }

  candidaturesRecues(offerId: string) {
    return this.candidatures.getApplicationsForOffer(offerId);
  }

  changerStatut(candidatureId: string, status: ApplicationStatus) {
    return this.candidatures.updateApplicationStatus(
      candidatureId,
      { status }
    );
  }
}
