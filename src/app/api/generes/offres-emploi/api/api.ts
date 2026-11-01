export * from './applications.service';
import { ApplicationsService } from './applications.service';
export * from './offers.service';
import { OffersService } from './offers.service';
export * from './proposals.service';
import { ProposalsService } from './proposals.service';
export const APIS = [ApplicationsService, OffersService, ProposalsService];
