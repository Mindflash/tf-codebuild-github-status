const mockSSM = {
  getParameters: () => ({
    promise: () => Promise.resolve({
      Parameters: [
        {
          Value: JSON.stringify({
            github: {
              owner: 'example',
              token: 'test-token',
              url: 'https://api.github.com'
            },
            context: 'aws/codebuild'
          })
        }
      ]
    })
  })
};

module.exports = {
  mockSSM
};
