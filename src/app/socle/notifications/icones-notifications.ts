import { NotificationType } from '../../api/generes/notifications-messagerie/model/notificationType';

/** Tracés SVG (grille 16×16, trait) : un par type de notification, cloche en repli. */
const ICONES: Record<NotificationType, string> = {
  MESSAGE_RECEIVED: 'M2 3h12v8H7l-3 3v-3H2z',
  GROUP_MESSAGE_RECEIVED: 'M6 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M11 3.5a2.2 2.2 0 010 4M12.5 10.5c1.2.5 2 1.6 2 3.5',
  GROUP_INVITATION: 'M6 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M12 5v4M10 7h4',
  APPLICATION_STATUS_CHANGED: 'M4 2h8v12H4zM6 8l1.5 1.5L10 6.5',
  NEW_JOB_PROPOSAL: 'M14 2L7 9M14 2l-4 12-3-5-5-3z',
  NEW_MATCHING_OFFER: 'M2 5h12v8H2zM6 5V3h4v2',
  ACCOUNT_CONFIRMATION: 'M8 14A6 6 0 108 2a6 6 0 000 12zM5.5 8l2 2 3-3.5',
  SYSTEM_ALERT: 'M8 2l6.5 11.5h-13zM8 6.5v3M8 11.5v.01',
};

const ICONE_PAR_DEFAUT = 'M8 2a4 4 0 00-4 4c0 4-2 5-2 5h12s-2-1-2-5a4 4 0 00-4-4zM6.5 13.5a1.5 1.5 0 003 0';

export function iconeNotification(type: NotificationType | undefined): string {
  return (type && ICONES[type]) || ICONE_PAR_DEFAUT;
}
