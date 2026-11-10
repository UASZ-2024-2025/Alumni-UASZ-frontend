import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('ajoute puis retire un toast après 4 secondes', () => {
    const service = TestBed.inject(ToastService);
    service.succes('Enregistré');
    expect(service.toasts()).toEqual([expect.objectContaining({ type: 'succes', message: 'Enregistré' })]);
    vi.advanceTimersByTime(4000);
    expect(service.toasts()).toEqual([]);
  });

  it('ferme un toast précis', () => {
    const service = TestBed.inject(ToastService);
    service.erreur('a');
    service.info('b');
    service.fermer(service.toasts()[0].id);
    expect(service.toasts().map((t) => t.message)).toEqual(['b']);
  });
});
