import { HttpContextToken } from '@angular/common/http';

/** true : en cas de 401, ne pas tenter de renouveler le jeton (ex. : déconnexion). */
export const SANS_RENOUVELLEMENT = new HttpContextToken<boolean>(() => false);

/** Jeton d'accès à utiliser à la place de celui de la session courante (ex. : déconnexion après effacement locale). */
export const JETON_IMPOSE = new HttpContextToken<string | null>(() => null);
