import { Gender } from '../../api/generes/utilisateurs/model/gender';
import { RoleName } from '../../api/generes/utilisateurs/model/roleName';
import { UserStatus } from '../../api/generes/utilisateurs/model/userStatus';

export const LIBELLE_ROLE: Record<RoleName, string> = {
  ALUMNI: 'Alumni',
  ETUDIANT: 'Étudiant',
  ENSEIGNANT: 'Enseignant',
  ENTREPRISE: 'Entreprise',
  ADMINISTRATEUR: 'Administrateur',
};

export const LIBELLE_STATUT: Record<UserStatus, string> = {
  EN_ATTENTE: 'En attente',
  ACTIF: 'Actif',
  INACTIF: 'Inactif',
  SUSPENDU: 'Suspendu',
};

export const LIBELLE_GENRE: Record<Gender, string> = {
  MALE: 'Homme',
  FEMALE: 'Femme',
};

/** Rôles autorisés à l'auto-inscription (ADMINISTRATEUR est attribué par un administrateur). */
export const ROLES_INSCRIPTION: RoleName[] = ['ALUMNI', 'ETUDIANT', 'ENSEIGNANT', 'ENTREPRISE'];
export const TOUS_LES_ROLES: RoleName[] = [...ROLES_INSCRIPTION, 'ADMINISTRATEUR'];
export const TOUS_LES_STATUTS: UserStatus[] = ['EN_ATTENTE', 'ACTIF', 'INACTIF', 'SUSPENDU'];
/** Statuts qu'un administrateur peut attribuer (le back refuse EN_ATTENTE). */
export const STATUTS_ATTRIBUABLES: UserStatus[] = ['ACTIF', 'INACTIF', 'SUSPENDU'];
