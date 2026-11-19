import { Routes } from '@angular/router';
import { StudentsService } from '../../api/generes/alumni/api/students.service';
import { BASE_PATH as BASE_PATH_ALUMNI } from '../../api/generes/alumni/variables';
import { environment } from '../../../environments/environment';

export const PROFIL_ETUDIANT_ROUTES: Routes = [
  {
    path: '',
    // Provisoire : à retirer quand le BASE_PATH alumni sera déclaré dans app.config.ts
    providers: [{ provide: BASE_PATH_ALUMNI, useValue: environment.urlsApi.alumni }, StudentsService],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profil' },
      {
        path: 'profil',
        title: 'Mon profil',
        loadComponent: () => import('./pages/profil-etudiant').then((m) => m.ProfilEtudiant),
      },
      {
        path: 'cv',
        title: 'Mon CV',
        loadComponent: () => import('./pages/editeur-cv').then((m) => m.EditeurCv),
      },
    ],
  },
];
