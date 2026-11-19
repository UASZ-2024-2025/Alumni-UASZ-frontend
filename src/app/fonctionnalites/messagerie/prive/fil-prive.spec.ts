import { PrivateMessage } from '../../../api/generes/notifications-messagerie/model/privateMessage';
import { construireFil, fusionnerMessages, horodatageListe, libelleJour, libelleRole } from './fil-prive';

const MAINTENANT = new Date(2026, 10, 18, 14, 0); // 18 novembre 2026, heure locale
const le = (jour: number, h: number, min = 0) => new Date(2026, 10, jour, h, min).toISOString();
const msg = (id: string, senderId: string, createdAt: string, extra: Partial<PrivateMessage> = {}): PrivateMessage => ({
  id, senderId, content: `message ${id}`, createdAt, ...extra,
});

describe('fusionnerMessages', () => {
  it('trie du plus ancien au plus récent, quel que soit l’ordre renvoyé par le back', () => {
    const recents = [msg('m3', 'a', le(18, 10)), msg('m2', 'b', le(18, 9)), msg('m1', 'a', le(17, 8))];
    expect(fusionnerMessages([], recents).map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('supprime les doublons et garde la version la plus récente (ex. isRead)', () => {
    const avant = [msg('m1', 'a', le(18, 9), { isRead: false })];
    const apres = [msg('m1', 'a', le(18, 9), { isRead: true }), msg('m2', 'b', le(18, 10))];
    const fusion = fusionnerMessages(avant, apres);
    expect(fusion).toHaveLength(2);
    expect(fusion[0].isRead).toBe(true);
  });

  it('gère un message sans id grâce à l’expéditeur et à la date', () => {
    const sansId: PrivateMessage = { senderId: 'a', createdAt: le(18, 9), content: 'x' };
    expect(fusionnerMessages([sansId], [{ ...sansId }])).toHaveLength(1);
  });
});

describe('libelleJour / horodatageListe', () => {
  it('« Aujourd’hui », « Hier », jour de la semaine puis date complète', () => {
    expect(libelleJour(le(18, 9), MAINTENANT)).toBe("Aujourd'hui");
    expect(libelleJour(le(17, 9), MAINTENANT)).toBe('Hier');
    expect(libelleJour(le(14, 9), MAINTENANT)).toContain('novembre');
    expect(libelleJour(le(1, 9), MAINTENANT)).toBe('01/11/2026');
  });

  it('affiche l’heure aujourd’hui, « Hier » ou la date dans la liste', () => {
    expect(horodatageListe(le(18, 9, 5), MAINTENANT)).toMatch(/^09[:h]05$/);
    expect(horodatageListe(le(17, 9), MAINTENANT)).toBe('Hier');
    expect(horodatageListe(le(10, 9), MAINTENANT)).toBe('10/11/2026');
    expect(horodatageListe(undefined, MAINTENANT)).toBe('');
  });
});

describe('construireFil', () => {
  it('insère un séparateur par jour et repère mes messages', () => {
    const fil = construireFil(
      [msg('m1', 'autre', le(17, 9)), msg('m2', 'moi', le(18, 9)), msg('m3', 'autre', le(18, 10))],
      'moi',
      MAINTENANT,
    );
    expect(fil.map((e) => e.type)).toEqual(['jour', 'message', 'jour', 'message', 'message']);
    const messages = fil.filter((e) => e.type === 'message');
    expect(messages.map((e) => e.moi)).toEqual([false, true, false]);
  });

  it('ne marque aucun message comme le mien sans utilisateur connecté', () => {
    const fil = construireFil([msg('m1', 'autre', le(18, 9))], undefined, MAINTENANT);
    expect(fil.filter((e) => e.type === 'message').every((e) => !e.moi)).toBe(true);
  });
});

describe('libelleRole', () => {
  it('traduit les rôles connus et laisse les autres tels quels', () => {
    expect(libelleRole('ETUDIANT')).toBe('Étudiant');
    expect(libelleRole('INCONNU')).toBe('INCONNU');
    expect(libelleRole(undefined)).toBe('');
  });
});
