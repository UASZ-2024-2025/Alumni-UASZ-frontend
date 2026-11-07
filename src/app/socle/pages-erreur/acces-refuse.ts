import { Component } from '@angular/core';
import { PageErreur } from '../../commun/components/page-erreur/page-erreur';

@Component({
  selector: 'app-acces-refuse',
  imports: [PageErreur],
  template: `<app-page-erreur code="403" titre="Accès refusé">Votre rôle ne donne pas accès à cette page.</app-page-erreur>`,
})
export class AccesRefuse {}
