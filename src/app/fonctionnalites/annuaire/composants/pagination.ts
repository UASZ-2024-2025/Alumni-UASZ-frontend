import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    @if (nombrePages() > 1) {
      <nav class="pagination" aria-label="Pagination">
        <button type="button" (click)="changer.emit(page() - 1)" [disabled]="page() === 0">← Précédent</button>
        <span aria-live="polite">Page {{ page() + 1 }} sur {{ nombrePages() }}</span>
        <button type="button" (click)="changer.emit(page() + 1)" [disabled]="page() + 1 >= nombrePages()">Suivant →</button>
      </nav>
    }
  `,
  styles: `
    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.25rem; color: var(--mu); font-size: 0.875rem; }
    button { padding: 8px 14px; border: 1px solid var(--g8); border-radius: var(--rayon); background: #fff; color: var(--g8); font: 600 0.8125rem var(--police); cursor: pointer; }
    button:disabled { opacity: 0.45; cursor: default; }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly taille = input.required<number>();
  readonly total = input.required<number>();
  readonly changer = output<number>();

  protected readonly nombrePages = computed(() => Math.max(1, Math.ceil(this.total() / this.taille())));
}
