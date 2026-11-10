import { Component } from '@angular/core';
import { PageErreur } from '../../commun/components/page-erreur/page-erreur';

@Component({
  selector: 'app-introuvable',
  imports: [PageErreur],
  template: `<app-page-erreur code="404" titre="Page introuvable">Cette adresse n'existe pas.</app-page-erreur>`,
})
export class Introuvable {}
