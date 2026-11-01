export class ErreurApi {
  constructor(
    public readonly statut: number,
    public readonly code: string,
    public readonly message: string,
    public readonly horodatage?: string,
  ) {}
}