import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService as AuthApi } from '../../../api/generes/utilisateurs/api/auth.service';
import { MessageResponse } from '../../../api/generes/utilisateurs/model/messageResponse';
import { RegisterRequest } from '../../../api/generes/utilisateurs/model/registerRequest';
import { User } from '../../../api/generes/utilisateurs/model/user';

@Injectable({ providedIn: 'root' })
export class CompteService {
  private readonly api = inject(AuthApi);

  inscrire(donnees: RegisterRequest): Observable<User> {
    return this.api.registerUser(donnees);
  }
  confirmerEmail(token: string): Observable<MessageResponse> {
    return this.api.confirmEmail({ token });
  }
  renvoyerConfirmation(email: string): Observable<MessageResponse> {
    return this.api.resendConfirmation({ email });
  }
  motDePasseOublie(email: string): Observable<MessageResponse> {
    return this.api.forgotPassword({ email });
  }
  reinitialiserMotDePasse(token: string, newPassword: string): Observable<MessageResponse> {
    return this.api.resetPassword({ token, newPassword });
  }
}