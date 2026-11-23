import { HttpBackend, HttpClient, HttpEventType } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, EMPTY, map, mergeMap, Observable, of, throwError } from 'rxjs';
import { MessageAttachmentsService } from '../../../api/generes/notifications-messagerie/api/messageAttachments.service';
import { AttachmentKind } from '../../../api/generes/notifications-messagerie/model/attachmentKind';
import { AttachmentSettings } from '../../../api/generes/notifications-messagerie/model/attachmentSettings';
import { AttachmentUpload } from '../../../api/generes/notifications-messagerie/model/attachmentUpload';
import { AttachmentUploadTicket } from '../../../api/generes/notifications-messagerie/model/attachmentUploadTicket';
import { ErreurApi } from '../../../commun/modeles/erreur-api.model';
import { extension, taille } from './format';

/** Fichier choisi (photo, document) ou enregistré (vocal), affiché au-dessus de la saisie jusqu'à son envoi. */
export interface PieceEnPreparation {
  fichier: File;
  kind: AttachmentKind;
  /** Lien local (`blob:`) pour afficher la photo avant l'envoi. */
  apercu?: string;
  /** Durée mesurée pendant l'enregistrement d'un vocal (secondes). */
  duree?: number;
}

/** Conversation qui recevra la pièce jointe : le service vérifie que l'auteur peut y écrire avant de signer l'envoi. */
export type Cible = { groupId: string } | { recipientId: string };

/** Progression de l'envoi vers le stockage (0 à 100), puis résultat de l'envoi du message. */
export type Avancement<T> = { progression: number } | { resultat: T };

/** Réponse de Cloudinary à un envoi (champs utiles). */
interface ReponseStockage {
  public_id: string;
  version: number;
  signature: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
}

/**
 * ALUM-262 : pièces jointes de la messagerie (photos, documents, vocaux).
 * Le fichier part directement du navigateur vers le stockage (Cloudinary), avec l'autorisation signée par le service
 * (`createAttachmentUpload`) ; la réponse signée du stockage est ensuite jointe au message, que le service vérifie.
 */
@Injectable({ providedIn: 'root' })
export class PiecesJointesService {
  private readonly api = inject(MessageAttachmentsService);
  /** Sans intercepteurs : le jeton de l'application ne doit jamais partir vers le stockage. */
  private readonly stockage = new HttpClient(inject(HttpBackend));

  readonly reglages = signal<AttachmentSettings | null>(null);
  /** Faux tant que les réglages ne sont pas lus, ou si le stockage n'est pas configuré côté service. */
  readonly actives = computed(() => !!this.reglages()?.enabled);
  readonly acceptImages = computed(() => this.accept(this.reglages()?.imageExtensions, 'image/*'));
  readonly acceptDocuments = computed(() => this.accept(this.reglages()?.fileExtensions, ''));
  readonly dureeVocalMax = computed(() => this.reglages()?.maxAudioSeconds ?? 120);
  private enCours = false;

  /** Lit les réglages une fois par session (relancé à la prochaine ouverture d'un fil en cas d'échec). */
  charger(): void {
    if (this.reglages() || this.enCours) return;
    this.enCours = true;
    this.api.getAttachmentSettings().subscribe({
      next: (r) => {
        this.enCours = false;
        this.reglages.set(r);
      },
      error: () => (this.enCours = false), // sans réglages, les boutons restent masqués : le texte fonctionne toujours
    });
  }

  /** Contrôle le fichier choisi (type, taille) avant tout envoi ; lève une ErreurApi au message clair sinon. */
  preparer(fichier: File, kind: 'IMAGE' | 'FILE'): PieceEnPreparation {
    const r = this.reglages();
    const acceptees = (kind === 'IMAGE' ? r?.imageExtensions : r?.fileExtensions) ?? [];
    const ext = extension(fichier.name);
    if (acceptees.length && !acceptees.includes(ext)) {
      throw refus(kind === 'IMAGE'
        ? `Format d'image non accepté (${acceptees.join(', ')}).`
        : `Type de document non accepté (.${ext || 'sans extension'}). Formats acceptés : ${acceptees.join(', ')}.`);
    }
    const max = kind === 'IMAGE' ? r?.maxImageBytes : r?.maxFileBytes;
    if (max && fichier.size > max) throw refus(`Fichier trop volumineux (${taille(fichier.size)}) : ${taille(max)} au maximum.`);
    if (!fichier.size) throw refus('Ce fichier est vide.');
    return { fichier, kind, apercu: kind === 'IMAGE' ? URL.createObjectURL(fichier) : undefined };
  }

  /** Libère l'aperçu local d'une pièce qui ne sera plus affichée. */
  liberer(piece: PieceEnPreparation | null): void {
    if (piece?.apercu) URL.revokeObjectURL(piece.apercu);
  }

  /**
   * Envoie le fichier au stockage puis le message (`envoi`) : émet la progression, puis le message créé.
   * Les erreurs sont des ErreurApi : celles du service telles quelles, celles du stockage avec un message clair.
   */
  envoyer<T>(piece: PieceEnPreparation, cible: Cible, envoi: (upload: AttachmentUpload) => Observable<T>): Observable<Avancement<T>> {
    return this.api.createAttachmentUpload({ kind: piece.kind, fileName: piece.fichier.name, ...cible }).pipe(
      mergeMap((ticket) => this.televerser(piece, ticket)),
      mergeMap((a) => ('progression' in a ? of(a) : envoi(a.resultat).pipe(map((resultat) => ({ resultat }))))),
    );
  }

  private televerser(piece: PieceEnPreparation, ticket: AttachmentUploadTicket): Observable<Avancement<AttachmentUpload>> {
    const form = new FormData();
    form.append('file', piece.fichier, piece.fichier.name);
    form.append('api_key', ticket.apiKey ?? '');
    form.append('timestamp', String(ticket.timestamp ?? ''));
    form.append('signature', ticket.signature ?? '');
    form.append('public_id', ticket.publicId ?? '');
    form.append('type', ticket.type ?? '');
    if (ticket.allowedFormats) form.append('allowed_formats', ticket.allowedFormats);
    // signé par le service : la même autorisation ne peut pas remplacer un fichier déjà déposé
    form.append('overwrite', String(ticket.overwrite ?? false));
    return this.stockage.post<ReponseStockage>(ticket.uploadUrl ?? '', form, { reportProgress: true, observe: 'events' }).pipe(
      catchError(() =>
        throwError(() => new ErreurApi(0, 'STOCKAGE', "Le fichier n'a pas pu être envoyé. Vérifiez votre connexion et réessayez.")),
      ),
      mergeMap((ev): Observable<Avancement<AttachmentUpload>> => {
        if (ev.type === HttpEventType.UploadProgress) {
          return of({ progression: ev.total ? Math.min(100, Math.round((ev.loaded * 100) / ev.total)) : 0 });
        }
        if (ev.type !== HttpEventType.Response || !ev.body) return EMPTY;
        const r = ev.body;
        return of({
          resultat: {
            kind: piece.kind,
            publicId: r.public_id,
            version: r.version,
            signature: r.signature,
            format: r.format,
            fileName: piece.fichier.name,
            sizeBytes: r.bytes ?? piece.fichier.size,
            durationSeconds: r.duration ?? piece.duree,
            width: r.width,
            height: r.height,
          },
        });
      }),
    );
  }

  private accept(extensions: string[] | undefined, defaut: string): string {
    return extensions?.length ? extensions.map((e) => `.${e}`).join(',') : defaut;
  }
}

const refus = (message: string) => new ErreurApi(400, 'FICHIER_REFUSE', message);
