/**
 * @module http
 * @overview github http client
 */
import axios from 'axios';

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
      const data = err?.response?.data;
      const status = err?.response?.status;
      const method = err?.config?.method ?? 'UNKNOWN';
      const url = err?.config?.url;
      const payload = err?.config?.data;
      const msg = `${method} -- ${url} failed with status (${status}) and data: ${JSON.stringify(data)}`;
      log.error({ data: payload }, msg);
      // the lambda runtime serializes unhandled errors (via AxiosError.toJSON)
      // into cloudwatch logs, request config included — strip credentials so
      // the github token never reaches the logs
      if (err?.config?.headers) {
        err.config.headers.Authorization = '[redacted]';
      }
      return Promise.reject(err);
    },
  );

  return client;
}
