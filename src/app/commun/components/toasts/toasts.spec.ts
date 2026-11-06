import { TestBed } from '@angular/core/testing';
import { ToastService } from '../../services/toast.service';
import { Toasts } from './toasts';

describe('Toasts', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('affiche les toasts du service avec le bon rôle', () => {
    const fixture = TestBed.createComponent(Toasts);
    const service = TestBed.inject(ToastService);
    service.succes('Enregistré');
    service.erreur('Échec');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="status"]')!.textContent).toContain('Enregistré');
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Échec');
  });

  it('retire un toast avec le bouton de fermeture', () => {
    const fixture = TestBed.createComponent(Toasts);
    TestBed.inject(ToastService).info('Info');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });
});
