# tf-codebuild-github-status
a `node.js` lambda function that updates `github` PR statuses based on `codebuild` events

<p align="center">
<img src="./architecture.png" align="center" alt="architecture diagram" />
</p>

## Requirements
- [Node.js](https://nodejs.org) `>= 24.4.0` (see [.nvmrc](./.nvmrc)), or [Docker & Compose](https://docs.docker.com/compose/)

The codebase is written as native ES modules (`"type": "module"`) and runs on Node.js 24 without any transpilation. Configuration is fetched from SSM using the AWS SDK for JavaScript v3 (`@aws-sdk/client-ssm`), which is provided by the `nodejs24.x` lambda runtime.

## Installing
```shell
# clone the repo and install dependencies
$ git clone git@github.com:cludden/tf-codebuild-github-status.git
$ cd tf-codebuild-github-status
$ npm install
```

## Contributing
1. Clone it (`git clone git@github.com:cludden/tf-codebuild-github-status.git`)
1. Create your feature branch (`git checkout -b my-new-feature`)
1. Commit your changes using [conventional changelog standards](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md) (`git commit -m 'feat(my-new-feature): Add some feature'`)
1. Push to the branch (`git push origin my-new-feature`)
1. Ensure linting/security/tests are all passing
1. Create new Pull Request

## Testing
```shell
# run test suite
$ npm test

# run test suite and generate code coverage
$ npm run coverage

# run linter (eslint flat config, see eslint.config.js)
$ npm run lint

# run security scan of production dependencies
$ npm run sec
```

Or via docker:
```shell
# run test suite and generate code coverage
$ docker-compose run tf-codebuild-github-status

# run linter
$ docker-compose run tf-codebuild-github-status npm run lint
```

## Building
Bundles the function into `dist/index.js` using [esbuild](https://esbuild.github.io/). The AWS SDK v3 is excluded from the bundle because the lambda runtime provides it.
```shell
$ npm run build
```

## Releasing
1. Merge fixes & features to master
1. Run lint check `npm run lint`
1. Run security check `npm run sec`
1. Run full test suite `npm test`
1. Run release script `npm run release`
1. Push release & release tag to github `git push --follow-tags`
1. [Publish new release](https://help.github.com/articles/creating-releases/) in github, using the release notes from the [CHANGELOG](./CHANGELOG.md)

## Configuring
Define custom configuration
```json
{
  "github": {
    "url": "https://api.github.com",
    "owner": "my-org",
    "token": "xxxxxxxx"
  },
  "log": {
    "level": "info"
  }
}
```

Add JSON configuration to ssm
```shell
$ aws ssm put-parameter --name /secrets/codebuild-trigger/custom --type SecureString --value $JSONCONFIG
```

## Deploying
Via terraform
```
module "codebuild_trigger" {
  source                     = "git::git@github.com:cludden/tf-codebuild-github-status.git//terraform?ref={version}"
  config_parameter_name      = "/secrets/codebuild-trigger"
  debug                      = ""
  memory_size                = 128
  name                       = "codebuild-github-status"
  node_env                   = "production"
  region                     = "us-west-2"
  s3_bucket                  = "my-artifact-bucket"
  s3_key                     = "tf-codebuild-github-status/${var.version}/index.zip"
  timeout                    = 10
}
```

Note: Terraform for this function is executed from the `terraform-enterprise` branch, not from this branch. This codebase targets the `nodejs24.x` Lambda runtime, so the runtime there should be updated to match. AWS Lambda manages patch versions within a runtime family, so patch-level pinning (for example, `24.4.0`) is not configurable in Terraform.

## License
Licensed under the [MIT License](LICENSE.md)

Copyright (c) 2017 Chris Ludden
