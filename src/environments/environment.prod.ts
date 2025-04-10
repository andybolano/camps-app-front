declare const process: any;

export const environment = {
  production: true,
  apiBaseUrl:
    process.env['API_URL'] ||
    'https://captivating-unity-production.up.railway.app/api',
};
