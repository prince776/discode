const baseURL = process.env.NODE_ENV == 'production' ? 'window.location.origin' : 'http://localhost:8080';

export { baseURL };
