import { NotificationType } from '../../api/generes/notifications-messagerie/model/notificationType';
import { RoleApplicatif } from '../authentification/modeles/session.model';

/**
 * Écran à ouvrir quand on clique sur une notification, ou `null` si elle n'a pas de destination
 * (confirmation de compte, alerte système).
 * Il n'existe pas encore d'écran de détail (offre, conversation) : on ouvre la liste concernée.
 * À affiner avec `referenceId` quand ces écrans existeront.
 */
export function cheminNotification(type: NotificationType | undefined, role: RoleApplicatif | undefined): string | null {
  switch (type) {
    case 'MESSAGE_RECEIVED':
    case 'GROUP_MESSAGE_RECEIVED':
    case 'GROUP_INVITATION':
      return '/messagerie';
    case 'APPLICATION_STATUS_CHANGED':
      return '/candidatures';
    case 'NEW_JOB_PROPOSAL':
      // L'étudiant reçoit ses propositions dans « Mes candidatures » ; le recruteur suit les siennes.
      return role === 'ETUDIANT' ? '/candidatures' : '/propositions';
    case 'NEW_MATCHING_OFFER':
      return role === 'ETUDIANT' ? '/correspondances' : '/offres-emploi';
    default:
      return null;
  }
}
