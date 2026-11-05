import { Component, computed, input } from '@angular/core';

/** Pastille d'initiales : <app-avatar nom="Awa Diop" /> */
@Component({
  selector: 'app-avatar',
  template: '{{ initiales() }}',
  styles: `
    :host { display: inline-grid; place-items: center; flex: none; width: 2.5rem; aspect-ratio: 1; border-radius: 50%; background: var(--g1); color: var(--g8); font-size: 0.875rem; font-weight: 700; }
  `,
  host: { 'aria-hidden': 'true' },
})
export class Avatar {
  readonly nom = input('');
  protected readonly initiales = computed(() =>
    this.nom().split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join('').toUpperCase() || '?',
  );
}
