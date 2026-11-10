const apiPort = '5502';
const isApiServer = ['3000', apiPort].includes(window.location.port);
const isLocalPage = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const apiBaseUrl = isApiServer || !isLocalPage
  ? ''
  : `${window.location.protocol}//${window.location.hostname}:${apiPort}`;

window.apiFetch = (path, options = {}) => window.fetch(`${apiBaseUrl}${path}`, {
  ...options,
  credentials: 'include',
});