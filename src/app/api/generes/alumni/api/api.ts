export * from './alumni.service';
import { AlumniService } from './alumni.service';
export * from './companies.service';
import { CompaniesService } from './companies.service';
export * from './promotions.service';
import { PromotionsService } from './promotions.service';
export * from './students.service';
import { StudentsService } from './students.service';
export const APIS = [AlumniService, CompaniesService, PromotionsService, StudentsService];
