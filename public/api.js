window.apiFetch = (path, options = {}) => window.fetch(path, {
  ...options,
  credentials: 'include',
});