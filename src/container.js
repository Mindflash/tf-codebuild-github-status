/**
 * @file container.js
 * @overview function di/ioc container
 */
import Container from 'app-container';

import * as config from './config.js';
import * as github from './github.js';
import * as http from './http.js';
import * as log from './log.js';
import * as ssm from './ssm.js';

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

// native ESM namespace objects do not carry the `__esModule` marker that
// app-container relies on to unwrap default exports, so register the
// factory (default export) explicitly
modules.forEach((mod) => container.register(mod.default, mod.inject.name, mod.inject));

export default container;
