import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { User } from '../../../api/generes/utilisateurs/model/user';

/** Alias conservé pour le code existant : le contrat inclut désormais ENTREPRISE dans RoleName. */
export type RoleApplicatif = RoleName;

export interface Session {
  accessToken: string;
  refreshToken: string;
  expireLe: number; // timestamp en ms
  utilisateur: User;
}
