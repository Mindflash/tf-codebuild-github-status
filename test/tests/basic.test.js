import MockAdapter from 'axios-mock-adapter';
import { fromCallback } from 'bluebird';
import { expect } from 'chai';
import { before, afterEach, describe, it } from 'mocha';
import sinon from 'sinon';

import { handler, SUCCESS } from '../../src';
import container from '../../src/container';

container.register({
  name: 'ssm',
  factory: () => global.mocks.mockSSM
});
import phaseEvent from '../fixtures/build-phase-change.json';
import stateEvent from '../fixtures/build-state-change.json';

describe('basic', function () {
  before(async function () {
    const modules = await container.load({
      github: 'github',
      http: 'http',
      config: 'config',
    });
    Object.assign(this, modules);
    this.sandbox = sinon.sandbox.create();
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
    const result = await fromCallback(done => handler(invalid, {}, done));
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
    const result = await fromCallback(done => handler(stateEvent, {}, done));
    expect(result).to.equal(SUCCESS);
    expect(configs).to.have.nested.property('get.baseURL', this.config.get('github.url'));
    expect(configs).to.have.nested.property('get.headers.Authorization', `token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('get.url', '/repos/example/my-repo/pulls/6');

    expect(configs).to.have.nested.property('post.baseURL', this.config.get('github.url'));
    expect(configs).to.have.nested.property('post.headers.Authorization', `token ${this.config.get('github.token')}`);
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
    const result = await fromCallback(done => handler(phaseEvent, {}, done));
    expect(result).to.equal(SUCCESS);
    expect(configs).to.have.nested.property('get.baseURL', this.config.get('github.url'));
    expect(configs).to.have.nested.property('get.headers.Authorization', `token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('get.url', '/repos/example/my-repo/pulls/6');

    expect(configs).to.have.nested.property('post.baseURL', this.config.get('github.url'));
    expect(configs).to.have.nested.property('post.headers.Authorization', `token ${this.config.get('github.token')}`);
    expect(configs).to.have.nested.property('post.url', `/repos/example/my-repo/statuses/${sha}`);
    const body = JSON.parse(configs.post.data);
    expect(body).to.have.property('target_url', stateEvent.detail['additional-information'].logs['deep-link']);
    expect(body).to.have.property('context', this.config.get('context'));
    expect(body).to.have.property('state', 'pending');
    expect(body).to.have.property('description', 'PROVISIONING phase SUCCEEDED after 21 second(s)');
  });
});
