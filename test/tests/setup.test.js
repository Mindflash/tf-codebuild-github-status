import { before } from 'mocha';
import sinon from 'sinon';

import container from '../../src/container.js';

before(async function () {
  const ssm = await container.load('ssm');
  sinon.stub(ssm, 'send').resolves({
    Parameters: [{
      Value: JSON.stringify({
        context: 'aws/codebuild',
        github: {
          url: 'https://www.example.com',
          token: 'xxxxxxxx',
          owner: 'example',
        },
        log: {
          level: process.env.LOG_LEVEL,
        },
      }),
    }],
  });
});
