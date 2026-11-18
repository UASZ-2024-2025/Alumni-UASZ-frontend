import { NotificationType } from '../../api/generes/notifications-messagerie/model/notificationType';
import { cheminNotification } from './liens-notifications';

describe('cheminNotification', () => {
  it.each<[NotificationType, string]>([
    ['MESSAGE_RECEIVED', '/messagerie'],
    ['GROUP_MESSAGE_RECEIVED', '/messagerie'],
    ['GROUP_INVITATION', '/messagerie'],
    ['APPLICATION_STATUS_CHANGED', '/candidatures'],
  ])('%s mène à %s quel que soit le rôle', (type, chemin) => {
    expect(cheminNotification(type, 'ETUDIANT')).toBe(chemin);
    expect(cheminNotification(type, 'ENTREPRISE')).toBe(chemin);
  });

  it('envoie l’étudiant vers ses propositions reçues, le recruteur vers ses propositions envoyées', () => {
    expect(cheminNotification('NEW_JOB_PROPOSAL', 'ETUDIANT')).toBe('/candidatures');
    expect(cheminNotification('NEW_JOB_PROPOSAL', 'ALUMNI')).toBe('/propositions');
    expect(cheminNotification('NEW_JOB_PROPOSAL', 'ENTREPRISE')).toBe('/propositions');
  });

  it('envoie l’étudiant vers ses correspondances, les autres vers les offres', () => {
    expect(cheminNotification('NEW_MATCHING_OFFER', 'ETUDIANT')).toBe('/correspondances');
    expect(cheminNotification('NEW_MATCHING_OFFER', 'ALUMNI')).toBe('/offres-emploi');
  });

  it('ne propose aucun lien pour une confirmation de compte, une alerte système ou un type inconnu', () => {
    expect(cheminNotification('ACCOUNT_CONFIRMATION', 'ETUDIANT')).toBeNull();
    expect(cheminNotification('SYSTEM_ALERT', 'ETUDIANT')).toBeNull();
    expect(cheminNotification(undefined, 'ETUDIANT')).toBeNull();
  });
});
