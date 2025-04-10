declare const process: any;

export const environment = {
  production: true,
  apiBaseUrl:
    process.env['API_URL'] ||
    'https://camps-app-back-production.up.railway.app/api/',
};
