import { Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';

/** Vocal enregistré : le fichier audio et sa durée mesurée (secondes). */
export interface VocalEnregistre {
  fichier: File;
  duree: number;
}

/** Formats essayés dans l'ordre : Opus en webm (Chrome, Firefox, Edge), puis ogg, puis mp4 (Safari). */
const FORMATS = [
  { mime: 'audio/webm;codecs=opus', ext: 'webm' },
  { mime: 'audio/webm', ext: 'webm' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  { mime: 'audio/mp4', ext: 'm4a' },
];

/** Le navigateur sait-il enregistrer le micro ? (absent en HTTP non sécurisé et sur les vieux navigateurs) */
export const enregistrementPossible = (): boolean =>
  typeof MediaRecorder !== 'undefined' && !!globalThis.navigator?.mediaDevices?.getUserMedia;

/**
 * ALUM-262 : enregistrement d'un message vocal, comme WhatsApp. Démarre dès l'affichage (le navigateur demande
 * l'accès au micro), affiche la durée, s'arrête et s'envoie seul à la durée maximale.
 * `termine` émet le vocal, `annule` quand on jette l'enregistrement, `erreur` si le micro est inaccessible.
 */
@Component({
  selector: 'app-enregistreur-vocal',
  template: `
    <div class="enregistreur" role="group" aria-label="Enregistrement d'un message vocal">
      <button type="button" class="jeter" aria-label="Supprimer l'enregistrement" title="Supprimer" (click)="annuler()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
      </button>
      <span class="voyant" [class.actif]="actif()" aria-hidden="true"></span>
      <span class="temps" aria-live="off">{{ affichage() }}</span>
      <span class="aide">{{ actif() ? 'Enregistrement…' : 'Autorisez le micro' }}</span>
      <button type="button" class="envoyer" aria-label="Envoyer le message vocal" title="Envoyer" [disabled]="!actif()"
        (click)="arreter(true)">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" /></svg>
      </button>
    </div>
  `,
  styles: `
    .enregistreur { display: flex; align-items: center; gap: 10px; min-height: 48px; }
    .jeter, .envoyer {
      flex: none; display: grid; place-items: center; border: 0; border-radius: 50%; cursor: pointer;
    }
    .jeter { width: 40px; height: 40px; background: none; color: var(--dg); }
    .jeter:hover { background: var(--g0); }
    .jeter svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .envoyer { width: 44px; height: 44px; margin-left: auto; background: var(--g8); color: #fff; }
    .envoyer:hover:not(:disabled) { background: var(--g9); }
    .envoyer:disabled { opacity: 0.45; cursor: default; }
    .envoyer svg { width: 22px; height: 22px; fill: currentColor; }
    .jeter:focus-visible, .envoyer:focus-visible { outline: 3px solid var(--ac); outline-offset: 2px; }
    .voyant { width: 12px; height: 12px; border-radius: 50%; background: var(--bd); }
    .voyant.actif { background: #e11d48; animation: pulse 1.2s ease-in-out infinite; }
    .temps { font-variant-numeric: tabular-nums; font-weight: 600; }
    .aide { color: var(--mu); font-size: var(--t-s); }
    @keyframes pulse { 50% { opacity: 0.35; } }
    @media (prefers-reduced-motion: reduce) { .voyant.actif { animation: none; } }
  `,
})
export class EnregistreurVocal implements OnInit {
  /** Durée maximale (secondes) : l'enregistrement s'arrête et s'envoie seul. */
  readonly dureeMax = input(120);
  readonly termine = output<VocalEnregistre>();
  readonly annule = output<void>();
  readonly erreur = output<string>();

  protected readonly actif = signal(false);
  protected readonly affichage = signal('0:00');

  private flux?: MediaStream;
  private enregistreur?: MediaRecorder;
  private morceaux: Blob[] = [];
  private debut = 0;
  private minuterie?: ReturnType<typeof setInterval>;
  private envoyerALaFin = false;
  private detruit = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.detruit = true;
      this.envoyerALaFin = false;
      this.liberer();
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.flux = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.erreur.emit("Micro inaccessible : autorisez l'accès au micro dans votre navigateur.");
      return;
    }
    if (this.detruit) return this.liberer();
    const format = FORMATS.find((f) => MediaRecorder.isTypeSupported?.(f.mime));
    this.enregistreur = new MediaRecorder(this.flux, format ? { mimeType: format.mime } : undefined);
    this.enregistreur.ondataavailable = (e) => { if (e.data.size) this.morceaux.push(e.data); };
    this.enregistreur.onstop = () => this.fin(format?.ext);
    this.enregistreur.start(250);
    this.debut = performance.now();
    this.actif.set(true);
    this.minuterie = setInterval(() => this.tic(), 250);
  }

  protected annuler(): void {
    this.arreter(false);
    this.annule.emit();
  }

  /** Arrête l'enregistrement ; `envoyer` : émettre le vocal une fois le fichier complet. */
  arreter(envoyer: boolean): void {
    this.envoyerALaFin = envoyer;
    if (this.enregistreur?.state === 'recording') this.enregistreur.stop();
    else this.liberer();
  }

  private tic(): void {
    const secondes = this.secondes();
    this.affichage.set(`${Math.floor(secondes / 60)}:${String(Math.floor(secondes % 60)).padStart(2, '0')}`);
    if (secondes >= this.dureeMax()) this.arreter(true);
  }

  private secondes(): number {
    return (performance.now() - this.debut) / 1000;
  }

  private fin(ext = 'webm'): void {
    const duree = Math.min(Math.round(this.secondes() * 10) / 10, this.dureeMax());
    const type = this.enregistreur?.mimeType?.split(';')[0] || 'audio/webm';
    this.liberer();
    if (!this.envoyerALaFin || !this.morceaux.length) return;
    const horodatage = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    this.termine.emit({ fichier: new File(this.morceaux, `vocal-${horodatage}.${ext}`, { type }), duree });
  }

  private liberer(): void {
    clearInterval(this.minuterie);
    this.actif.set(false);
    this.flux?.getTracks().forEach((t) => t.stop());
    this.flux = undefined;
  }
}
