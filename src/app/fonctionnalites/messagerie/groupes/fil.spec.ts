import { GroupMessage } from '../../../api/generes/notifications-messagerie/model/groupMessage';
import { apercuGroupe, construireFil, couleurAuteur, erreurNomGroupe, fusionnerMessages, horodatageListe, libelleJour } from './fil';

const maintenant = new Date(2026, 10, 18, 15, 0); // mercredi 18 novembre 2026, 15 h
const le = (jour: number, h: number, m = 0) => new Date(2026, 10, jour, h, m).toISOString();
const msg = (id: string, senderId: string, createdAt: string): GroupMessage => ({ id, senderId, senderName: senderId, content: id, createdAt });

const resumer = (e: ReturnType<typeof construireFil>[number]) =>
  e.type === 'jour' ? e.libelle : e.type === 'systeme' ? `sys:${e.cle}` : `${e.cle}:${e.moi ? 'moi' : 'autre'}:${e.debutSerie ? 'debut' : 'suite'}`;

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
    expect(fil.map(resumer)).toEqual([
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

  it('affiche les événements du groupe à part, et ils coupent la série', () => {
    const systeme: GroupMessage = { ...msg('s', 'u1', le(18, 9, 1)), type: 'SYSTEM', content: 'Awa a ajouté Moussa' };
    const fil = construireFil([msg('a', 'u1', le(18, 9)), systeme, msg('b', 'u1', le(18, 9, 2))], 'moi', maintenant);
    expect(fil.map(resumer)).toEqual(["Aujourd'hui", 'a:autre:debut', 'sys:s', 'b:autre:debut']);
  });

  it("résume le dernier message dans la liste (« Vous », prénom de l'auteur, événement)", () => {
    const base = { memberCount: 3, lastMessage: 'Salut', lastMessageType: 'TEXT' as const };
    expect(apercuGroupe({ ...base, lastMessageSenderName: 'Awa Diop' }, 'Moussa Ndiaye')).toBe('Awa : Salut');
    expect(apercuGroupe({ ...base, lastMessageSenderName: 'Moussa Ndiaye' }, 'Moussa Ndiaye')).toBe('Vous : Salut');
    expect(apercuGroupe({ ...base, lastMessageType: 'SYSTEM', lastMessage: 'Awa a quitté le groupe' })).toBe('Awa a quitté le groupe');
    expect(apercuGroupe({ memberCount: 1 })).toBe('1 participant');
  });

  it('valide le nom du groupe selon le contrat (3 à 100 caractères)', () => {
    expect(erreurNomGroupe('  ')).toBe('Le nom du groupe est obligatoire.');
    expect(erreurNomGroupe('ab')).toContain('entre 3 et 100');
    expect(erreurNomGroupe('x'.repeat(101))).toContain('entre 3 et 100');
    expect(erreurNomGroupe(' Promo ')).toBeNull();
  });
});
