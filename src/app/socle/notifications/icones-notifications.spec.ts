import { NotificationType } from '../../api/generes/notifications-messagerie/model/notificationType';
import { iconeNotification } from './icones-notifications';

const TYPES: NotificationType[] = [
  'MESSAGE_RECEIVED',
  'GROUP_MESSAGE_RECEIVED',
  'GROUP_INVITATION',
  'APPLICATION_STATUS_CHANGED',
  'NEW_JOB_PROPOSAL',
  'NEW_MATCHING_OFFER',
  'ACCOUNT_CONFIRMATION',
  'SYSTEM_ALERT',
];

describe('iconeNotification', () => {
  it('renvoie un tracé propre à chaque type', () => {
    const traces = TYPES.map((t) => iconeNotification(t));
    expect(new Set(traces).size).toBe(TYPES.length);
  });

  it('retombe sur la cloche quand le type est absent', () => {
    expect(iconeNotification(undefined)).toContain('M8 2a4 4 0');
  });
});
