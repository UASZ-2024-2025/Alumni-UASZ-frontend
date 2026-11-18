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
  ],
};

describe('InfosGroupe', () => {
  let api: Record<'removeGroupMember' | 'deleteGroup' | 'updateGroup' | 'addGroupMembers', ReturnType<typeof vi.fn>>;
  let confirmation: { demander: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<InfosGroupe>;
  let el: HTMLElement;

  const creer = (moiId: string, role = 'ETUDIANT') => {
    TestBed.overrideProvider(AuthentificationService, { useValue: { role: () => role } });
    fixture = TestBed.createComponent(InfosGroupe);
    fixture.componentRef.setInput('groupe', groupe);
    fixture.componentRef.setInput('moiId', moiId);
    fixture.detectChanges();
    el = fixture.nativeElement;
  };
  const bouton = (libelle: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === libelle);
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

  it('liste les participants : propriétaire, puis « Vous », puis par nom', () => {
    creer('moi');
    expect([...el.querySelectorAll('.membres strong')].map((s) => s.textContent)).toEqual(['Fatou Sow', 'Vous', 'Awa Diop']);
    expect(el.querySelector('.membres app-badge')?.textContent).toContain('Propriétaire');
  });

  it("un membre peut seulement quitter le groupe", async () => {
    creer('moi');
    const quitte = vi.fn();
    fixture.componentInstance.quitte.subscribe(quitte);
    expect(bouton('Retirer')).toBeUndefined();
    expect(bouton('Ajouter')).toBeUndefined();
    expect(bouton('Supprimer le groupe')).toBeUndefined();

    bouton('Quitter le groupe')!.click();
    await attendre();
    expect(api.removeGroupMember).toHaveBeenCalledWith('g1', 'moi');
    expect(quitte).toHaveBeenCalled();
  });

  it('le propriétaire retire un membre après confirmation', async () => {
    creer('u3', 'ENSEIGNANT');
    const modifie = vi.fn();
    fixture.componentInstance.modifie.subscribe(modifie);
    expect(bouton('Quitter le groupe')).toBeUndefined();
    expect(bouton('Ajouter')).toBeDefined();

    el.querySelector<HTMLButtonElement>('[aria-label="Retirer Awa Diop"]')!.click();
    await attendre();
    expect(api.removeGroupMember).toHaveBeenCalledWith('g1', 'u4');
    expect(modifie.mock.calls[0][0].members.map((m: { userId: string }) => m.userId)).toEqual(['u3', 'moi']);
  });

  it("n'agit pas si la confirmation est refusée", async () => {
    confirmation.demander.mockResolvedValue(false);
    creer('u3', 'ENSEIGNANT');
    bouton('Supprimer le groupe')!.click();
    await attendre();
    expect(api.deleteGroup).not.toHaveBeenCalled();
  });

  it("l'administrateur peut supprimer un groupe dont il n'est pas propriétaire", async () => {
    creer('moi', 'ADMINISTRATEUR');
    bouton('Supprimer le groupe')!.click();
    await attendre();
    expect(api.deleteGroup).toHaveBeenCalledWith('g1');
  });
});
