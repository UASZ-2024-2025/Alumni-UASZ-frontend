import { environment } from '../../../environments/environment';

export const estUrlApi = (url: string) =>
  Object.values(environment.urlsApi).some((base) => url.startsWith(base));

export const estUrlAuthPublique = (url: string) =>
  url.includes('/auth/login') || url.includes('/auth/refresh-token');