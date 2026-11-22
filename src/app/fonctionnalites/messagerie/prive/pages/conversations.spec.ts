import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PrivateMessagingService } from '../../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { ConversationSummary } from '../../../../api/generes/notifications-messagerie/model/conversationSummary';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { AuthentificationService } from '../../../../socle/authentification/services/authentification.service';
import { Conversations } from './conversations';

const MOI = 'u-1';
const awa: ConversationSummary = {
  recipientId: 'u-2', recipientName: 'Awa Diop', recipientRole: 'ALUMNI', lastMessageSenderId: 'u-2',
  lastMessage: 'À ce soir', lastMessageTime: '2026-11-18T10:00:00Z', unreadCount: 2,
};
const ibou: ConversationSummary = {
  recipientId: 'u-3', recipientName: 'Ibou Ba', recipientRole: 'ENTREPRISE', lastMessageSenderId: MOI,
  lastMessage: 'Merci', lastMessageTime: '2026-11-18T12:00:00Z', unreadCount: 0,
};
const erreurApi = { statut: 500, code: 'SERVER_ERROR', message: 'Erreur serveur' } as ErreurApi;

describe('Conversations', () => {
  let api: { listConversations: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<Conversations>;
  let el: HTMLElement;

  const stabiliser = async (ms = 0) => {
    // Pas de `whenStable()` avec de faux minuteurs : le planificateur d'Angular attendrait un minuteur gelé.
    await vi.advanceTimersByTimeAsync(ms);
    fixture.detectChanges();
  };
  const ouvrir = async () => {
    fixture = TestBed.createComponent(Conversations);
    el = fixture.nativeElement;
    fixture.detectChanges();
    await stabiliser();
  };
  const noms = () => [...el.querySelectorAll('.conversation .nom')].map((n) => n.textContent?.trim());
  const apercus = () => [...el.querySelectorAll('.conversation .apercu')].map((n) => n.textContent?.trim());
  const rechercher = (texte: string) => {
    const champ = el.querySelector<HTMLInputElement>('.recherche input')!;
    champ.value = texte;
    champ.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    api = { listConversations: vi.fn(() => of([awa, ibou])) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PrivateMessagingService, useValue: api },
        { provide: AuthentificationService, useValue: { utilisateur: () => ({ id: MOI }) } },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('liste les discussions, la plus récente en premier', async () => {
    await ouvrir();
    expect(noms()).toEqual(['Ibou Ba', 'Awa Diop']);
  });

  it('affiche le dernier message (« Vous : » pour le mien) et la pastille des non-lus', async () => {
    await ouvrir();
    expect(apercus()).toEqual(['Vous : Merci', 'À ce soir']);
    const lignes = el.querySelectorAll('.conversation');
    expect(lignes[1].querySelector('.pastille')?.textContent?.trim()).toBe('2');
    expect(lignes[1].querySelector('.date.non-lu')).not.toBeNull();
    expect(lignes[0].querySelector('.pastille')).toBeNull();
  });

  it('signale un dernier message supprimé', async () => {
    api.listConversations.mockReturnValue(of([{ ...awa, lastMessage: undefined, lastMessageDeleted: true }]));
    await ouvrir();
    expect(apercus()).toEqual(['Ce message a été supprimé']);
  });

  it('ouvre le fil de l’interlocuteur au clic (lien vers /messagerie/:id)', async () => {
    await ouvrir();
    const liens = [...el.querySelectorAll<HTMLAnchorElement>('.conversation')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/messagerie/u-3', '/messagerie/u-2']);
  });

  it('place les discussions épinglées en tête et grise la pastille d’une discussion en sourdine', async () => {
    api.listConversations.mockReturnValue(of([ibou, { ...awa, preferences: { pinned: true, muted: true } }]));
    await ouvrir();
    expect(noms()).toEqual(['Awa Diop', 'Ibou Ba']);
    const premiere = el.querySelector('.conversation')!;
    expect(premiere.querySelector('[aria-label="Épinglée"]')).not.toBeNull();
    expect(premiere.querySelector('[aria-label="Notifications coupées"]')).not.toBeNull();
    expect(premiere.querySelector('.pastille.sourdine')).not.toBeNull();
  });

  it('range les discussions archivées dans une section à part', async () => {
    api.listConversations.mockReturnValue(of([ibou, { ...awa, preferences: { archived: true } }]));
    await ouvrir();
    expect(noms()).toEqual(['Ibou Ba']);
    const entree = el.querySelector<HTMLButtonElement>('.entree-archives button')!;
    expect(entree.textContent).toContain('1');
    entree.click();
    fixture.detectChanges();
    expect(el.querySelector('h1')?.textContent).toContain('Archivées');
    expect(noms()).toEqual(['Awa Diop']);
  });

  it('filtre par nom et sur les non-lues', async () => {
    await ouvrir();
    rechercher('awa');
    expect(noms()).toEqual(['Awa Diop']);
    rechercher('');
    [...el.querySelectorAll<HTMLButtonElement>('app-onglets button')].find((b) => b.textContent?.includes('Non lues'))!.click();
    fixture.detectChanges();
    expect(noms()).toEqual(['Awa Diop']);
  });

  it('affiche un état vide quand il n’y a aucune discussion', async () => {
    api.listConversations.mockReturnValue(of([]));
    await ouvrir();
    expect(el.querySelector('.message-liste.vide')?.textContent).toContain('Aucune discussion');
  });

  it('affiche une erreur si le chargement échoue', async () => {
    api.listConversations.mockReturnValue(throwError(() => erreurApi));
    await ouvrir();
    expect(el.querySelector('.colonne-liste app-alerte')).not.toBeNull();
    expect(el.querySelector('.colonne-liste app-spinner')).toBeNull();
  });

  it('met la liste à jour toutes les 10 secondes (nouveau message, compteur)', async () => {
    await ouvrir();
    api.listConversations.mockReturnValue(of([{ ...awa, unreadCount: 5, lastMessageTime: '2026-11-18T13:00:00Z' }, ibou]));
    await stabiliser(10_000);
    expect(noms()).toEqual(['Awa Diop', 'Ibou Ba']);
    expect(el.querySelector('.conversation .pastille')?.textContent?.trim()).toBe('5');
  });

  it('garde la liste affichée si un rafraîchissement échoue', async () => {
    await ouvrir();
    api.listConversations.mockReturnValue(throwError(() => erreurApi));
    await stabiliser(10_000);
    expect(noms()).toHaveLength(2);
    expect(el.querySelector('.colonne-liste app-alerte')).toBeNull();
  });
});
