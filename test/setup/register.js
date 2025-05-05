require('@babel/register')({
  extensions: ['.js'],
});

require('./env');

global.mocks = require('./mocks');
