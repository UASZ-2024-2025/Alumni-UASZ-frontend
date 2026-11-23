import { TestBed } from '@angular/core/testing';
import { EnregistreurVocal, VocalEnregistre } from './enregistreur-vocal';

/** MediaRecorder simulé : `stop()` livre un morceau d'audio puis l'événement de fin, comme le navigateur. */
class FauxEnregistreur {
  static dernier: FauxEnregistreur;
  static isTypeSupported = (mime: string) => mime === 'audio/webm;codecs=opus';
  state = 'inactive';
  mimeType: string;
  ondataavailable?: (e: { data: Blob }) => void;
  onstop?: () => void;
  constructor(_flux: unknown, options?: { mimeType: string }) {
    this.mimeType = options?.mimeType ?? '';
    FauxEnregistreur.dernier = this;
  }
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['son'], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}

describe('EnregistreurVocal', () => {
  let piste: { stop: ReturnType<typeof vi.fn> };
  let getUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    piste = { stop: vi.fn() };
    getUserMedia = vi.fn(() => Promise.resolve({ getTracks: () => [piste] }));
    vi.stubGlobal('MediaRecorder', FauxEnregistreur);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  });

  const monter = async (dureeMax = 120) => {
    const f = TestBed.createComponent(EnregistreurVocal);
    f.componentRef.setInput('dureeMax', dureeMax);
    const sortie = { vocaux: [] as VocalEnregistre[], annules: 0, erreurs: [] as string[] };
    f.componentInstance.termine.subscribe((v) => sortie.vocaux.push(v));
    f.componentInstance.annule.subscribe(() => sortie.annules++);
    f.componentInstance.erreur.subscribe((e) => sortie.erreurs.push(e));
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return { f, el, sortie, bouton: (l: string) => el.querySelector<HTMLButtonElement>(`button[aria-label="${l}"]`)! };
  };

  it('enregistre en webm/opus et envoie le vocal avec sa durée, puis coupe le micro', async () => {
    const { sortie, bouton } = await monter();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(FauxEnregistreur.dernier.mimeType).toBe('audio/webm;codecs=opus');
    bouton('Envoyer le message vocal').click();
    expect(sortie.vocaux).toHaveLength(1);
    expect(sortie.vocaux[0].fichier.name).toMatch(/^vocal-.*\.webm$/);
    expect(sortie.vocaux[0].fichier.type).toBe('audio/webm');
    expect(sortie.vocaux[0].duree).toBeGreaterThanOrEqual(0);
    expect(piste.stop).toHaveBeenCalled();
  });

  it('jeter l’enregistrement n’envoie rien', async () => {
    const { sortie, bouton } = await monter();
    bouton("Supprimer l'enregistrement").click();
    expect(sortie.vocaux).toHaveLength(0);
    expect(sortie.annules).toBe(1);
    expect(piste.stop).toHaveBeenCalled();
  });

  it('s’arrête et s’envoie seul à la durée maximale', async () => {
    vi.useFakeTimers();
    let maintenant = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => maintenant);
    const { sortie } = await monter(3);
    maintenant = 3100;
    vi.advanceTimersByTime(300);
    expect(sortie.vocaux).toHaveLength(1);
    expect(sortie.vocaux[0].duree).toBe(3);
  });

  it('signale un micro refusé', async () => {
    getUserMedia.mockReturnValue(Promise.reject(new Error('NotAllowedError')));
    const { sortie } = await monter();
    expect(sortie.erreurs[0]).toContain('Micro inaccessible');
  });
});
