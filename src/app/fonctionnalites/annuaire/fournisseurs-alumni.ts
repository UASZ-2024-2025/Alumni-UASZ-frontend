import { AlumniService } from '../../api/generes/alumni/api/alumni.service';
import { CompaniesService } from '../../api/generes/alumni/api/companies.service';
import { PromotionsService } from '../../api/generes/alumni/api/promotions.service';
import { StudentsService } from '../../api/generes/alumni/api/students.service';
import { BASE_PATH as BASE_PATH_ALUMNI } from '../../api/generes/alumni/variables';
import { environment } from '../../../environments/environment';

/** Fournisseurs communs aux écrans qui appellent alumni-student-company-service. */
export const FOURNISSEURS_ALUMNI = [
  // Provisoire : à retirer quand le BASE_PATH alumni sera déclaré dans app.config.ts
  { provide: BASE_PATH_ALUMNI, useValue: environment.urlsApi.alumni },
  StudentsService,
  AlumniService,
  CompaniesService,
  PromotionsService,
];
