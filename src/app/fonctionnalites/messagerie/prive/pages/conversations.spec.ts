import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PrivateMessagingService } from '../../../../api/generes/notifications-messagerie/api/privateMessaging.service';
import { ConversationSummary } from '../../../../api/generes/notifications-messagerie/model/conversationSummary';
import { ErreurApi } from '../../../../commun/modeles/erreur-api.model';
import { Conversations } from './conversations';

const awa: ConversationSummary = {
  recipientId: 'u-2', recipientName: 'Awa Diop', recipientRole: 'ALUMNI',
  lastMessage: 'À ce soir', lastMessageTime: '2026-11-18T10:00:00Z', unreadCount: 2,
};
const ibou: ConversationSummary = {
  recipientId: 'u-3', recipientName: 'Ibou Ba', recipientRole: 'ENTREPRISE',
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

  beforeEach(() => {
    vi.useFakeTimers();
    api = { listConversations: vi.fn(() => of([awa, ibou])) };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PrivateMessagingService, useValue: api }],
    });
  });

  afterEach(() => vi.useRealTimers());

  it('liste les conversations, la plus récente en premier', async () => {
    await ouvrir();
    expect(noms()).toEqual(['Ibou Ba', 'Awa Diop']);
  });

  it('affiche le dernier message et le nombre de messages non lus', async () => {
    await ouvrir();
    const lignes = el.querySelectorAll('.conversation');
    expect(lignes[1].textContent).toContain('À ce soir');
    expect(lignes[1].querySelector('.compteur')?.textContent?.trim()).toBe('2');
    expect(lignes[0].querySelector('.compteur')).toBeNull();
  });

  it('ouvre le fil de l’interlocuteur au clic (lien vers /messagerie/:id)', async () => {
    await ouvrir();
    const liens = [...el.querySelectorAll<HTMLAnchorElement>('.conversation')].map((a) => a.getAttribute('href'));
    expect(liens).toEqual(['/messagerie/u-3', '/messagerie/u-2']);
  });

  it('affiche un état vide quand il n’y a aucune conversation', async () => {
    api.listConversations.mockReturnValue(of([]));
    await ouvrir();
    expect(el.querySelector('.liste app-etat-vide')?.textContent).toContain('Aucune conversation');
  });

  it('affiche une erreur si le chargement échoue', async () => {
    api.listConversations.mockReturnValue(throwError(() => erreurApi));
    await ouvrir();
    expect(el.querySelector('.liste app-alerte')).not.toBeNull();
    expect(el.querySelector('.liste app-spinner')).toBeNull();
  });

  it('met la liste à jour toutes les 10 secondes (nouveau message, compteur)', async () => {
    await ouvrir();
    api.listConversations.mockReturnValue(of([{ ...awa, unreadCount: 5, lastMessageTime: '2026-11-18T13:00:00Z' }, ibou]));
    await stabiliser(10_000);
    expect(noms()).toEqual(['Awa Diop', 'Ibou Ba']);
    expect(el.querySelector('.conversation .compteur')?.textContent?.trim()).toBe('5');
  });

  it('garde la liste affichée si un rafraîchissement échoue', async () => {
    await ouvrir();
    api.listConversations.mockReturnValue(throwError(() => erreurApi));
    await stabiliser(10_000);
    expect(noms()).toHaveLength(2);
    expect(el.querySelector('.liste app-alerte')).toBeNull();
  });
});
