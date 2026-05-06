import axios from 'axios';

const client = axios.create({
  withCredentials: true,
  timeout: 60000,
});

export const scanApi = {
  run: (params) => client.post('/scan', params),
  history: () => client.get('/scan/history'),
};

export const actionsApi = {
  draftReply: (email, instruction) => client.post('/actions/draft-reply', { email, instruction }),
  summarise: (email) => client.post('/actions/summarise', { email }),
  advise: (email) => client.post('/actions/advise', { email }),
};
