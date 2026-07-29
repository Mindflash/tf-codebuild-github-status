/**
 * @module log
 * @overview lambda function logger
 */
import bunyan from 'bunyan';

import pkg from '../package.json' with { type: 'json' };

export const inject = {
  name: 'log',
  require: ['config'],
};

export default function (config) {
  const options = config.get('log');
  return bunyan.createLogger({ ...options, name: pkg.name, version: pkg.version });
}
