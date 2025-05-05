/**
 * @file index.js
 * @overview lambda function entrypoint
 */
import 'source-map-support/register';
import get from 'lodash.get';

import container from './container';

export const ERROR = 'event:error';
export const NOOP = 'event:noop';
export const SUCCESS = 'event:success';

/**
 * Lambda function handler invoked by the lambda runtime
 * @param  {Object}   e    - lambda event
 * @param  {Object}   ctx  - lambda context object
 * @param  {Function} done - lambda callback
 * @return {Promise}
 */
export async function handler(e, ctx, done) {
  // freeze the node process immediately on exit
  // see http://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-using-old-runtime.html
  ctx.callbackWaitsForEmptyEventLoop = false;
  // load modules
  const modules = await container.load({
    config: 'config',
    github: 'github',
    log: 'log',
  });
  const log = modules.log.child({ req_id: ctx.awsRequestId });
  try {
    const result = await processEvent(e, { ...modules, log });
    log.info({ result }, SUCCESS);
    done(null, SUCCESS);
  } catch (err) {
    log.error(err, ERROR);
    done(err);
  }
}

/**
 * Extract, parse, and validate github event payloads and start builds for those
 * repositories that have a corresponding codebuild project.
 * @param  {Object}  e                 - lambda event
 * @param  {Object}  modules           - modules
 * @param  {Object}  modules.codebuild - codebuild implementation
 * @param  {Object}  modules.log       - logger implementation
 * @return {Promise}
 */
export async function processEvent(e, { config, github, log }) {
  // get source version
  const version = get(e, 'detail.additional-information.source-version');
  const PR = /^pr\//g;
  if (!PR.test(version)) {
    log.debug({ source_version: version }, 'skipping non PR event');
    return NOOP;
  }
  // extract common info and delegate to appropriate handler
  const project = get(e, 'detail.project-name');
  const type = get(e, 'detail-type');
  const context = config.get('context', 'aws/codebuild');
  if (type === 'CodeBuild Build Phase Change') {
    return processPhaseChange(e, { context, project, version }, { github, log });
  }
  if (type === 'CodeBuild Build State Change') {
    return processStateChange(e, { context, project, version }, { github, log });
  }
  log.warn({ type }, 'unknown event type');
  return NOOP;
}

/**
 * Update github pending status with new description
 * @param  {Object}  e              - cloudwatch event
 * @param  {Object}  ctx            - context
 * @param  {String}  ctx.build      - build arn
 * @param  {String}  ctx.project    - project name
 * @param  {String}  ctx.version    - source version
 * @param  {Object}  modules        - modules
 * @param  {Object}  modules.github - github module
 * @param  {Object}  modules.log    - log module
 * @return {Promise}
 */
export async function processPhaseChange(e, { context, project, version }, { github, log }) {
  const status = 'pending';
  const deepLink = get(e, 'detail.additional-information.logs.deep-link');
  const phase = get(e, 'detail.completed-phase');
  const phaseStatus = get(e, 'detail.completed-phase-status');
  const phaseDuration = get(e, 'detail.completed-phase-duration-seconds');
  const description = `${phase} phase ${phaseStatus} after ${phaseDuration} second(s)`;
  return github.updateStatus({
    version,
    context,
    project,
    targetUrl: deepLink,
    state: status,
    description,
  }, { log });
}

/**
 * Update github status with new status and description
 * @param  {Object} e              - cloudwatch event
 * @param  {Object} ctx            - context
 * @param  {String} ctx.build      - build arn
 * @param  {String} ctx.project    - project name
 * @param  {String} ctx.version    - source version
 * @param  {Object} modules        - modules
 * @param  {Object} modules.github - github module
 * @param  {Object} modules.log    - log module
 * @return {Promise}         [description]
 */
export async function processStateChange(e, { context, project, version }, { github, log }) {
  const state = get(e, 'detail.build-status');
  let status = 'failure';
  if (state === 'IN_PROGRESS') {
    status = 'pending';
  } else if (state === 'SUCCEEDED') {
    status = 'success';
  }
  const deepLink = get(e, 'detail.additional-information.logs.deep-link');
  let description;
  switch (status) {
    case 'pending':
      description = 'AWS Codebuild build in progress...';
      break;
    case 'failure':
      description = `AWS Codebuild build failed with status ${state}`;
      break;
    default:
      description = 'AWS Codebuild build succeeded.';
      break;
  }
  return github.updateStatus({
    version,
    context,
    project,
    targetUrl: deepLink,
    state: status,
    description,
  }, { log });
}
