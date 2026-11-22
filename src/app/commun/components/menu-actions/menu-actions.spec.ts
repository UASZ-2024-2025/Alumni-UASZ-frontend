import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MenuActions } from './menu-actions';

@Component({
  imports: [MenuActions],
  template: `<app-menu-actions libelle="Actions pour Awa"><button type="button">Modifier</button></app-menu-actions><p id="dehors">x</p>`,
})
class Hote {}

describe('MenuActions', () => {
  const monter = () => {
    const fixture = TestBed.createComponent(Hote);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const declencheur = el.querySelector<HTMLButtonElement>('button.declencheur')!;
    return { fixture, el, declencheur };
  };

  it('cache les actions tant que le menu est fermé', () => {
    const { el, declencheur } = monter();
    expect(el.textContent).not.toContain('Modifier');
    expect(declencheur.getAttribute('aria-label')).toBe('Actions pour Awa');
    expect(declencheur.getAttribute('aria-expanded')).toBe('false');
  });

  it("ouvre au clic, puis ferme après un clic sur une action ou à l'extérieur", () => {
    const { fixture, el, declencheur } = monter();
    declencheur.click();
    fixture.detectChanges();
    expect(el.textContent).toContain('Modifier');
    expect(declencheur.getAttribute('aria-expanded')).toBe('true');

    el.querySelector<HTMLButtonElement>('.menu-actions__liste button')!.click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Modifier');

    declencheur.click();
    fixture.detectChanges();
    el.querySelector<HTMLElement>('#dehors')!.click();
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Modifier');
  });
});
