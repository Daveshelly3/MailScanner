import axios from 'axios';

const client = axios.create({
  withCredentials: true,
  timeout: 60000,
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/') {
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  getMode:     ()    => client.get('/auth/mode'),
  getMe:       ()    => client.get('/auth/me'),
  getLoginUrl: ()    => client.get('/auth/login'),
  logout:      ()    => client.post('/auth/logout'),
};

export const scanApi = {
  run:     (params) => client.post('/scan', params),
  history: ()       => client.get('/scan/history'),
};

export const actionsApi = {
  draftReply: (email, instruction) => client.post('/actions/draft-reply', { email, instruction }),
  summarise:  (email)              => client.post('/actions/summarise',  { email }),
  advise:     (email)              => client.post('/actions/advise',     { email }),
};
