require('@babel/register')({
  extensions: ['.js'],
});

require('./env');

global.mocks = require('./mocks');

const AWS = require('aws-sdk');
AWS.SSM = function() {
  return require('./mocks').mockSSM;
};

const Mocha = require('mocha');
const originalRun = Mocha.Runner.prototype.run;
Mocha.Runner.prototype.run = function(fn) {
  return originalRun.call(this, function(err) {
    if (fn) {
      fn(err);
    }
    
    setTimeout(() => {
      process.exit(err ? 1 : 0);
    }, 100);
  });
};
