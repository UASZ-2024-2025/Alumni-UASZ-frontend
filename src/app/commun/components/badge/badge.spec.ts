import { TestBed } from '@angular/core/testing';
import { Badge, TonBadge } from './badge';

describe('Badge', () => {
  const classe = (ton?: TonBadge) => {
    const f = TestBed.createComponent(Badge);
    if (ton) f.componentRef.setInput('ton', ton);
    f.detectChanges();
    return (f.nativeElement as HTMLElement).querySelector('span')!.className;
  };

  it('est neutre par défaut', () => expect(classe()).toBe('badge badge--neutre'));

  it.each(['ok', 'attention', 'erreur'] as const)('applique le ton %s', (ton) =>
    expect(classe(ton)).toBe(`badge badge--${ton}`),
  );
});
