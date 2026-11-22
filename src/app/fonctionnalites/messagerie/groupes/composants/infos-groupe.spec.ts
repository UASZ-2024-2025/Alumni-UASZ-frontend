import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AlumniService } from '../../../../api/generes/alumni/api/alumni.service';
import { StudentsService } from '../../../../api/generes/alumni/api/students.service';
import { GroupMessagingService } from '../../../../api/generes/notifications-messagerie/api/groupMessaging.service';
import { Group } from '../../../../api/generes/notifications-messagerie/model/group';
import { ConfirmationService } from '../../../../commun/services/confirmation.service';
import { ToastService } from '../../../../commun/services/toast.service';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { InfosGroupe } from './infos-groupe';

const groupe: Group = {
  id: 'g1', name: 'Promo GL 2025', description: 'Entraide', ownerId: 'u3',
  members: [
    { userId: 'u4', userName: 'Awa Diop', userRole: 'ALUMNI', groupRole: 'MEMBER' },
    { userId: 'u3', userName: 'Fatou Sow', userRole: 'ENSEIGNANT', groupRole: 'OWNER' },
    { userId: 'moi', userName: 'Moussa Ndiaye', userRole: 'ETUDIANT', groupRole: 'MEMBER' },
    { userId: 'u5', userName: 'Ibou Ba', userRole: 'ALUMNI', groupRole: 'ADMIN' },
  ],
  settings: { onlyAdminsCanSend: false, onlyAdminsCanEditInfo: true, onlyAdminsCanAddMembers: true },
  preferences: { pinned: false, archived: false, muted: false },
};

type Methode = 'removeGroupMember' | 'deleteGroup' | 'updateGroup' | 'addGroupMembers' | 'updateGroupSettings'
  | 'updateGroupPreferences' | 'updateGroupMemberRole';

describe('InfosGroupe', () => {
  let api: Record<Methode, ReturnType<typeof vi.fn>>;
  let confirmation: { demander: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<InfosGroupe>;
  let el: HTMLElement;
  let modifie: ReturnType<typeof vi.fn<(g: Group) => void>>;

  const creer = (moiId: string, role = 'ETUDIANT', g: Group = groupe) => {
    TestBed.overrideProvider(AuthentificationService, { useValue: { role: () => role } });
    fixture = TestBed.createComponent(InfosGroupe);
    fixture.componentRef.setInput('groupe', g);
    fixture.componentRef.setInput('moiId', moiId);
    modifie = vi.fn<(g: Group) => void>();
    fixture.componentInstance.modifie.subscribe((g) => modifie(g));
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const bouton = (libelle: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === libelle);
  const ligne = (titre: string) =>
    [...el.querySelectorAll<HTMLElement>('.ligne-reglage')].find((l) => l.textContent?.includes(titre))!;
  const membre = (nom: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('.membre button')].find((b) => b.querySelector('strong')?.textContent === nom)!;
  const attendre = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    api = {
      removeGroupMember: vi.fn(() => of(null)),
      deleteGroup: vi.fn(() => of(null)),
      updateGroup: vi.fn(() => of(groupe)),
      addGroupMembers: vi.fn(() => of(groupe)),
      updateGroupSettings: vi.fn(() => of({ ...groupe, settings: { ...groupe.settings, onlyAdminsCanSend: true } })),
      updateGroupPreferences: vi.fn(() => of({ pinned: true, archived: false, muted: false })),
      updateGroupMemberRole: vi.fn(() => of(groupe)),
    };
    confirmation = { demander: vi.fn(() => Promise.resolve(true)) };
    TestBed.configureTestingModule({
      providers: [
        { provide: GroupMessagingService, useValue: api },
        { provide: StudentsService, useValue: { searchStudents: vi.fn(() => of({ content: [] })) } },
        { provide: AlumniService, useValue: { searchAlumni: vi.fn(() => of({ content: [] })) } },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: ToastService, useValue: { succes: vi.fn() } },
        { provide: AuthentificationService, useValue: { role: () => 'ETUDIANT' } },
      ],
    });
  });

  it('liste les participants : propriétaire, administrateurs, « Vous », puis par nom', () => {
    creer('moi');
    expect([...el.querySelectorAll('.membres strong')].map((s) => s.textContent)).toEqual(['Fatou Sow', 'Ibou Ba', 'Vous', 'Awa Diop']);
    expect([...el.querySelectorAll('.membres app-badge')].map((b) => b.textContent?.trim())).toEqual(['Propriétaire', 'Admin du groupe']);
  });

  it("un simple membre règle ses préférences mais ni les infos, ni les réglages, ni les participants", async () => {
    creer('moi');
    expect(el.textContent).not.toContain('Réglages du groupe');
    expect(bouton('Modifier le nom ou la description')).toBeUndefined();
    expect(bouton('Ajouter des participants')).toBeUndefined();
    expect(bouton('Supprimer le groupe')).toBeUndefined();
    membre('Awa Diop').click();
    fixture.detectChanges();
    expect(el.querySelector('.actions-membre')).toBeNull();

    ligne('Épingler en haut de la liste').querySelector('input')!.click();
    await attendre();
    expect(api.updateGroupPreferences).toHaveBeenCalledWith('g1', { pinned: true });
    expect(modifie.mock.calls[0][0].preferences).toEqual({ pinned: true, archived: false, muted: false });
  });

  it('coupe les notifications pour la durée choisie', () => {
    creer('moi');
    const choix = el.querySelector<HTMLSelectElement>('.selection select')!;
    choix.value = 'ONE_WEEK';
    choix.dispatchEvent(new Event('change'));
    expect(api.updateGroupPreferences).toHaveBeenCalledWith('g1', { mute: 'ONE_WEEK' });
  });

  it('les réglages ouverts à tous donnent aux membres les infos et les ajouts', () => {
    creer('moi', 'ETUDIANT', { ...groupe, settings: { onlyAdminsCanEditInfo: false, onlyAdminsCanAddMembers: false } });
    expect(bouton('Modifier le nom ou la description')).toBeDefined();
    expect(bouton('Ajouter des participants')).toBeDefined();
  });

  it('un administrateur modifie les réglages du groupe', async () => {
    creer('u5', 'ALUMNI');
    expect(el.textContent).toContain('Réglages du groupe');
    expect(ligne('Envoyer des messages').textContent).toContain('Tous les participants');
    ligne('Envoyer des messages').querySelector('input')!.click();
    await attendre();
    expect(api.updateGroupSettings).toHaveBeenCalledWith('g1', { onlyAdminsCanSend: true });
    expect(modifie).toHaveBeenCalled();
  });

  it("un administrateur retire un membre mais ni le propriétaire, ni ne gère les rôles", async () => {
    creer('u5', 'ALUMNI');
    membre('Fatou Sow').click();
    fixture.detectChanges();
    expect(el.querySelector('.actions-membre')).toBeNull();

    membre('Awa Diop').click();
    fixture.detectChanges();
    expect(bouton('Nommer administrateur')).toBeUndefined();
    el.querySelector<HTMLButtonElement>('[aria-label="Retirer Awa Diop"]')!.click();
    await attendre();
    expect(api.removeGroupMember).toHaveBeenCalledWith('g1', 'u4');
    expect(modifie.mock.calls[0][0].members?.map((m) => m.userId)).toEqual(['u3', 'moi', 'u5']);
  });

  it('le propriétaire nomme et retire des administrateurs', async () => {
    creer('u3', 'ENSEIGNANT');
    membre('Awa Diop').click();
    fixture.detectChanges();
    bouton('Nommer administrateur')!.click();
    await attendre();
    expect(api.updateGroupMemberRole).toHaveBeenCalledWith('g1', 'u4', { groupRole: 'ADMIN' });

    membre('Ibou Ba').click();
    fixture.detectChanges();
    bouton('Retirer des administrateurs')!.click();
    await attendre();
    expect(api.updateGroupMemberRole).toHaveBeenCalledWith('g1', 'u5', { groupRole: 'MEMBER' });
  });

  it('tout le monde peut quitter, le propriétaire est prévenu de la passation', async () => {
    creer('u3', 'ENSEIGNANT');
    const quitte = vi.fn();
    fixture.componentInstance.quitte.subscribe(quitte);
    bouton('Quitter le groupe')!.click();
    await attendre();
    expect(confirmation.demander.mock.calls[0][0].message).toContain('La propriété du groupe passera');
    expect(api.removeGroupMember).toHaveBeenCalledWith('g1', 'u3');
    expect(quitte).toHaveBeenCalled();
  });

  it("n'agit pas si la confirmation est refusée", async () => {
    confirmation.demander.mockResolvedValue(false);
    creer('u3', 'ENSEIGNANT');
    bouton('Supprimer le groupe')!.click();
    await attendre();
    expect(api.deleteGroup).not.toHaveBeenCalled();
  });

  it("l'administrateur de la plateforme peut supprimer un groupe dont il n'est pas propriétaire", async () => {
    creer('moi', 'ADMINISTRATEUR');
    bouton('Supprimer le groupe')!.click();
    await attendre();
    expect(api.deleteGroup).toHaveBeenCalledWith('g1');
  });

  it('refuse un nom de moins de 3 caractères', async () => {
    creer('u3', 'ENSEIGNANT');
    bouton('Modifier le nom ou la description')!.click();
    fixture.detectChanges();
    await attendre();
    const champ = el.querySelector<HTMLInputElement>('.formulaire app-champ input')!;
    champ.value = 'ab';
    champ.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('.formulaire')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(api.updateGroup).not.toHaveBeenCalled();
    expect(el.textContent).toContain('entre 3 et 100 caractères');
  });
});
