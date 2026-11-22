import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';

/** Menu « trois points » pour regrouper les actions d'une ligne de tableau : <app-menu-actions libelle="Actions de Awa"> boutons… </app-menu-actions> */
@Component({
  selector: 'app-menu-actions',
  template: `
    <button type="button" class="declencheur" aria-haspopup="true" [attr.aria-expanded]="ouvert()"
      [attr.aria-label]="libelle()" (click)="basculer()">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
        <circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" />
      </svg>
    </button>
    @if (ouvert()) {
      <div class="menu-actions__liste" role="group" [attr.aria-label]="libelle()" (click)="ouvert.set(false)">
        <ng-content />
      </div>
    }
  `,
  styles: `
    :host { position: relative; display: inline-block; }
    .declencheur {
      display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;
      border: 1px solid var(--bd); border-radius: var(--rayon); background: var(--sf); color: var(--mu); cursor: pointer;
      transition: 0.15s;
      &:hover, &[aria-expanded='true'] { background: var(--g0); border-color: var(--g1); color: var(--g8); }
      &:focus-visible { outline: 2px solid var(--g8); outline-offset: 2px; }
    }
    .menu-actions__liste {
      position: absolute; top: calc(100% + 4px); right: 0; z-index: 20; min-width: 170px; padding: 4px;
      display: grid; gap: 2px; border: 1px solid var(--bd); border-radius: var(--rayon); background: var(--sf);
      box-shadow: var(--ombre-flottante);
    }
  `,
})
export class MenuActions {
  readonly libelle = input('Actions');
  protected readonly ouvert = signal(false);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected basculer(): void {
    this.ouvert.update((v) => !v);
  }

  @HostListener('document:click', ['$event'])
  protected clicDehors(e: Event): void {
    if (!this.hote.nativeElement.contains(e.target as Node)) this.ouvert.set(false);
  }

  @HostListener('keydown.escape')
  protected echap(): void {
    this.ouvert.set(false);
  }
}
