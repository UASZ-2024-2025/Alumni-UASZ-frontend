import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { StudentsService } from '../../../api/generes/alumni/api/students.service';
import { CvResponse } from '../../../api/generes/alumni/model/cvResponse';
import { User } from '../../../api/generes/utilisateurs/model/user';
import { cvInitial, depuisCvEnregistre, DonneesCv } from '../../profil-etudiant/modeles/cv.modele';

export interface CvCandidat {
  cv: CvResponse;
  /** Données de l'aperçu et du PDF, identiques à celles de l'éditeur de CV. */
  donnees: DonneesCv;
}

/**
 * ALUM-259 : CV d'un candidat prêt à afficher (étudiant qui postule ou entreprise qui lit la candidature).
 * Le profil ne sert qu'à l'identité (nom, e-mail) : s'il ne se charge pas, l'aperçu reste affiché avec `nomAffiche`.
 * Un CV absent (404) remonte en erreur pour que l'écran l'explique.
 */
export function chargerCvCandidat(
  api: StudentsService,
  etudiantId: string,
  options: { utilisateur?: User | null; nomAffiche?: string } = {},
): Observable<CvCandidat> {
  return forkJoin({
    cv: api.getStudentCv(etudiantId),
    profil: api.getStudentById(etudiantId).pipe(catchError(() => of(null))),
  }).pipe(
    map(({ cv, profil }) => {
      const base = cvInitial(options.utilisateur ?? null, profil);
      if (!base.prenom && !base.nom && options.nomAffiche) base.prenom = options.nomAffiche;
      return { cv, donnees: depuisCvEnregistre(cv, base) };
    }),
  );
}
