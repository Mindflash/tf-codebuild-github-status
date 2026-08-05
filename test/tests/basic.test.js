import MockAdapter from 'axios-mock-adapter';
import { expect } from 'chai';
import { before, afterEach, describe, it } from 'mocha';
import sinon from 'sinon';

import { handler, processEvent, SUCCESS, NOOP } from '../../src/index.js';
import container from '../../src/container.js';
import phaseEvent from '../fixtures/build-phase-change.json' with { type: 'json' };
import stateEvent from '../fixtures/build-state-change.json' with { type: 'json' };

describe('basic', function () {
  before(async function () {
    const modules = await container.load({
      github: 'github',
      http: 'http',
      config: 'config',
      log: 'log',
    });
    Object.assign(this, modules);
    this.sandbox = sinon.createSandbox();
    this.mock = new MockAdapter(this.http);
  });

  afterEach(function () {
    this.sandbox.restore();
    this.mock.reset();
  });

  it('should skip invalid messages', async function () {
    const invalid = {
      detail: { 'additional-information': { 'source-version': 'v1.0.0' } },
    };
    const spy = this.sandbox.spy(this.github, 'updateStatus');
    const result = await handler(invalid, {});
    expect(result).to.equal(SUCCESS);
    expect(spy.callCount).to.equal(0);
  });

  it('should update status on state change (SUCCEEDED)', async function () {
    const sha = '6dcb09b5b57875f334f61aebed695e2e4193db5e';
    const configs = {};
    this.mock.onGet(/.+/g).reply((c) => {
      configs.get = c;
      return [200, {
        head: {
          sha,
        },
      }];
    });
    this.mock.onPost(/.+/g).reply((c) => {
      configs.post = c;
      return [200, {}];
    });
    const result = await handler(stateEvent, {});
    expect(result).to.equal(SUCCESS);
    expect(configs).to.have.nested.property('get.baseURL', this.config.get('github.url'));
    expect(configs.get.headers.Authorization).to.equal(`token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('get.url', '/repos/example/my-repo/pulls/6');

    expect(configs).to.have.nested.property('post.baseURL', this.config.get('github.url'));
    expect(configs.post.headers.Authorization).to.equal(`token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('post.url', `/repos/example/my-repo/statuses/${sha}`);
    const body = JSON.parse(configs.post.data);
    expect(body).to.have.property('target_url', stateEvent.detail['additional-information'].logs['deep-link']);
    expect(body).to.have.property('context', this.config.get('context'));
    expect(body).to.have.property('state', 'success');
    expect(body).to.have.property('description', 'AWS Codebuild build succeeded.');
  });

  it('should update status on phase change (PROVISIONING)', async function () {
    const sha = '6dcb09b5b57875f334f61aebed695e2e4193db5e';
    const configs = {};
    this.mock.onGet(/.+/g).reply((c) => {
      configs.get = c;
      return [200, {
        head: {
          sha,
        },
      }];
    });
    this.mock.onPost(/.+/g).reply((c) => {
      configs.post = c;
      return [200, {}];
    });
    const result = await handler(phaseEvent, {});
    expect(result).to.equal(SUCCESS);
    expect(configs).to.have.nested.property('get.baseURL', this.config.get('github.url'));
    expect(configs.get.headers.Authorization).to.equal(`token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('get.url', '/repos/example/my-repo/pulls/6');

    expect(configs).to.have.nested.property('post.baseURL', this.config.get('github.url'));
    expect(configs.post.headers.Authorization).to.equal(`token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('post.url', `/repos/example/my-repo/statuses/${sha}`);
    const body = JSON.parse(configs.post.data);
    expect(body).to.have.property('target_url', stateEvent.detail['additional-information'].logs['deep-link']);
    expect(body).to.have.property('context', this.config.get('context'));
    expect(body).to.have.property('state', 'pending');
    expect(body).to.have.property('description', 'PROVISIONING phase SUCCEEDED after 21 second(s)');
  });

  it('should skip events without detail', async function () {
    const spy = this.sandbox.spy(this.github, 'updateStatus');
    const result = await handler({}, {});
    expect(result).to.equal(SUCCESS);
    expect(spy.callCount).to.equal(0);
  });

  it('should ignore unknown event types', async function () {
    const unknown = structuredClone(stateEvent);
    unknown['detail-type'] = 'CodeBuild Build Queue Change';
    const spy = this.sandbox.spy(this.github, 'updateStatus');
    const result = await handler(unknown, {});
    expect(result).to.equal(SUCCESS);
    expect(spy.callCount).to.equal(0);
  });

  it('should update status on state change (IN_PROGRESS)', async function () {
    const sha = '6dcb09b5b57875f334f61aebed695e2e4193db5e';
    const configs = {};
    this.mock.onGet(/.+/g).reply(() => [200, { head: { sha } }]);
    this.mock.onPost(/.+/g).reply((c) => {
      configs.post = c;
      return [200, {}];
    });
    const inProgress = structuredClone(stateEvent);
    inProgress.detail['build-status'] = 'IN_PROGRESS';
    const result = await handler(inProgress, {});
    expect(result).to.equal(SUCCESS);
    expect(configs).to.have.nested.property('post.url', `/repos/example/my-repo/statuses/${sha}`);
    const body = JSON.parse(configs.post.data);
    expect(body).to.have.property('state', 'pending');
    expect(body).to.have.property('description', 'AWS Codebuild build in progress...');
  });

  it('should update status on state change (FAILED)', async function () {
    const sha = '6dcb09b5b57875f334f61aebed695e2e4193db5e';
    const configs = {};
    this.mock.onGet(/.+/g).reply(() => [200, { head: { sha } }]);
    this.mock.onPost(/.+/g).reply((c) => {
      configs.post = c;
      return [200, {}];
    });
    const failed = structuredClone(stateEvent);
    failed.detail['build-status'] = 'FAILED';
    const result = await handler(failed, {});
    expect(result).to.equal(SUCCESS);
    expect(configs).to.have.nested.property('post.url', `/repos/example/my-repo/statuses/${sha}`);
    const body = JSON.parse(configs.post.data);
    expect(body).to.have.property('state', 'failure');
    expect(body).to.have.property('description', 'AWS Codebuild build failed with status FAILED');
  });

  it('should default the status context to aws/codebuild', async function () {
    const config = { get: (path, dflt) => dflt };
    const github = { updateStatus: this.sandbox.stub().resolves(SUCCESS) };
    const log = { debug: this.sandbox.stub(), warn: this.sandbox.stub() };
    await processEvent(stateEvent, { config, github, log });
    expect(github.updateStatus.callCount).to.equal(1);
    expect(github.updateStatus.firstCall.args[0]).to.include({
      context: 'aws/codebuild',
      project: 'my-repo',
      version: 'pr/6',
      state: 'success',
    });
  });

  it('should return NOOP from processEvent for unknown event types', async function () {
    const unknown = structuredClone(stateEvent);
    unknown['detail-type'] = 'CodeBuild Build Queue Change';
    const config = { get: (path, dflt) => dflt };
    const github = { updateStatus: this.sandbox.stub().resolves(SUCCESS) };
    const log = { debug: this.sandbox.stub(), warn: this.sandbox.stub() };
    const result = await processEvent(unknown, { config, github, log });
    expect(result).to.equal(NOOP);
    expect(github.updateStatus.callCount).to.equal(0);
    expect(log.warn.callCount).to.equal(1);
  });

  it('should log and propagate github api errors', async function () {
    this.mock.onGet(/.+/g).reply(500, { message: 'boom' });
    const spy = this.sandbox.spy(this.log, 'error');
    let err;
    try {
      await handler(stateEvent, {});
    } catch (e) {
      err = e;
    }
    expect(err).to.be.an.instanceOf(Error);
    expect(err).to.have.nested.property('response.status', 500);
    expect(spy.callCount).to.equal(1);
    expect(spy.firstCall.args[1]).to.match(/failed with status \(500\)/);
    expect(err.config.headers.Authorization).to.equal('[redacted]');
    expect(JSON.stringify(err.toJSON())).to.not.include(this.config.get('github.token'));
  });
});
