/**
 * @module http
 * @overview github http client
 */
import axios from 'axios';
import get from 'lodash.get';

export const inject = {
  name: 'http',
  require: ['config', 'log'],
};

export default function (config, log) {
  const client = axios.create({
    baseURL: config.get('github.url'),
    timeout: 1000,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${config.get('github.token')}`,
      'Content-Type': 'application/json',
    },
  });

  // configure failed response logging
  client.interceptors.response.use(
    (res) => Promise.resolve(res),
    (err) => {
      const data = get(err, 'response.data');
      const status = get(err, 'response.status');
      const method = get(err, 'config.method', 'UNKNOWN');
      const url = get(err, 'config.url');
      const payload = get(err, 'config.data');
      const msg = `${method} -- ${url} failed with status (${status}) and data: ${JSON.stringify(data)}`;
      log.error({ data: payload }, msg);
      return Promise.reject(err);
    },
  );

  return client;
}
