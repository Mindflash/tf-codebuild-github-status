/**
 * @file container.js
 * @overview function di/ioc container
 */
import Container from 'app-container';

import * as config from './config';
import * as github from './github';
import * as http from './http';
import * as log from './log';
import * as ssm from './ssm';

const modules = [
  config,
  github,
  http,
  log,
  ssm,
];

const container = new Container({
  defaults: { singleton: true },
});

modules.forEach((mod) => container.register(mod, mod.inject.name, mod.inject));

export default container;
