import { RoleName } from '../../../api/generes/utilisateurs/model/roleName';
import { User } from '../../../api/generes/utilisateurs/model/user';

export type RoleApplicatif = RoleName | 'ENTREPRISE';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expireLe: number; // timestamp en ms
  utilisateur: User;
}