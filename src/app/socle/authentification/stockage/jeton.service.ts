import { Injectable } from '@angular/core';
import { Session } from '../modeles/session.model';

const CLE = 'alumni.session';

@Injectable({ providedIn: 'root' })
export class JetonService {
  lire(): Session | null {
    try {
      const brut = localStorage.getItem(CLE);
      return brut ? (JSON.parse(brut) as Session) : null;
    } catch {
      return null;
    }
  }

  enregistrer(session: Session): void {
    localStorage.setItem(CLE, JSON.stringify(session));
  }

  effacer(): void {
    localStorage.removeItem(CLE);
  }
}