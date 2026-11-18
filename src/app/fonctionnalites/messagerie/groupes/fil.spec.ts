import { GroupMessage } from '../../../api/generes/notifications-messagerie/model/groupMessage';
import { construireFil, couleurAuteur, fusionnerMessages, horodatageListe, libelleJour } from './fil';

const maintenant = new Date(2026, 10, 18, 15, 0); // mercredi 18 novembre 2026, 15 h
const le = (jour: number, h: number, m = 0) => new Date(2026, 10, jour, h, m).toISOString();
const msg = (id: string, senderId: string, createdAt: string): GroupMessage => ({ id, senderId, senderName: senderId, content: id, createdAt });

describe('fil de groupe', () => {
  it('fusionne deux pages sans doublon, du plus ancien au plus récent', () => {
    const recents = [msg('b', 'u1', le(18, 9)), msg('c', 'u2', le(18, 10))];
    const anciens = [msg('a', 'u1', le(17, 9)), msg('b', 'u1', le(18, 9))];
    expect(fusionnerMessages(anciens, recents).map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('nomme les jours comme une messagerie', () => {
    expect(libelleJour(le(18, 8), maintenant)).toBe("Aujourd'hui");
    expect(libelleJour(le(17, 23), maintenant)).toBe('Hier');
    expect(libelleJour(le(16, 8), maintenant)).toBe('lundi 16 novembre');
    expect(libelleJour(le(2, 8), maintenant)).toBe('02/11/2026');
  });

  it("affiche l'heure aujourd'hui, « Hier », puis la date dans la liste", () => {
    expect(horodatageListe(le(18, 9, 5), maintenant)).toBe('09:05');
    expect(horodatageListe(le(17, 9), maintenant)).toBe('Hier');
    expect(horodatageListe(le(10, 9), maintenant)).toBe('10/11/2026');
    expect(horodatageListe(undefined, maintenant)).toBe('');
  });

  it('insère les séparateurs de jour et repère les séries du même auteur', () => {
    const fil = construireFil(
      [msg('a', 'u1', le(17, 9)), msg('b', 'u1', le(17, 9, 1)), msg('c', 'moi', le(17, 9, 2)), msg('d', 'u1', le(18, 8))],
      'moi',
      maintenant,
    );
    expect(fil.map((e) => (e.type === 'jour' ? e.libelle : `${e.cle}:${e.moi ? 'moi' : 'autre'}:${e.debutSerie ? 'debut' : 'suite'}`))).toEqual([
      'Hier',
      'a:autre:debut',
      'b:autre:suite',
      'c:moi:debut',
      "Aujourd'hui",
      'd:autre:debut', // un nouveau jour relance la série
    ]);
  });

  it('donne toujours la même couleur à un même auteur', () => {
    expect(couleurAuteur('u1')).toBe(couleurAuteur('u1'));
    expect(couleurAuteur('u1')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
