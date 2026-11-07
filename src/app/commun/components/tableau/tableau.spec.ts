import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ColonneTableau, Tableau } from './tableau';

const colonnes: ColonneTableau[] = [
  { cle: 'titre', libelle: 'Titre' },
  { cle: 'lieu', libelle: 'Lieu' },
];

describe('Tableau', () => {
  const creer = (lignes: object[], chargement = false) => {
    const f = TestBed.createComponent(Tableau);
    f.componentRef.setInput('colonnes', colonnes);
    f.componentRef.setInput('lignes', lignes);
    f.componentRef.setInput('legende', 'Offres');
    f.componentRef.setInput('chargement', chargement);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('affiche une ligne par élément et un tiret pour une valeur absente', () => {
    const el = creer([{ titre: 'Dev', lieu: 'Dakar' }, { titre: 'Data' }]);
    const lignes = el.querySelectorAll('tbody tr');
    expect(lignes.length).toBe(2);
    expect(lignes[0].textContent).toContain('Dakar');
    expect(lignes[1].querySelectorAll('td')[1].textContent!.trim()).toBe('—');
    expect(el.querySelectorAll('th').length).toBe(2);
  });

  it("affiche l'état vide sans élément", () => {
    expect(creer([]).textContent).toContain('Aucun résultat');
  });

  it('affiche le chargement à la place du tableau', () => {
    const el = creer([{ titre: 'Dev' }], true);
    expect(el.querySelector('[role="status"]')).not.toBeNull();
    expect(el.querySelector('table')).toBeNull();
  });
});

@Component({
  imports: [Tableau],
  template: `
    <app-tableau [colonnes]="colonnes" [lignes]="lignes" legende="Offres">
      <ng-template #cellule let-ligne let-cle="cle"><b>{{ cle }}={{ ligne[cle] }}</b></ng-template>
    </app-tableau>
  `,
})
class Hote {
  colonnes = colonnes;
  lignes = [{ titre: 'Dev', lieu: 'Dakar' }];
}

describe('Tableau avec gabarit de cellule', () => {
  it('utilise le gabarit fourni', () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelectorAll('tbody b')[1].textContent).toBe('lieu=Dakar');
  });
});
