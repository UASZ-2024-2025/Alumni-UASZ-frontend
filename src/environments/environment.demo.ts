// Environnement de démo (ALUM-215) : le front et l'API sont servis par le même domaine
// (Caddy route /<service>/v1 vers chaque microservice), d'où des URLs relatives.
export const environment = {
  production: true,
  urlsApi: {
    utilisateurs: '/user-service/v1',
    alumni: '/alumni-student-company-service/v1',
    offres: '/job-offer-service/v1',
    analyses: '/analytics-matching-service/v1',
    messagerie: '/notification-messaging-service/v1',
  },
};
