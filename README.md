# tf-codebuild-github-status
a `node.js` lambda function that updates `github` PR statuses based on `codebuild` events

<p align="center">
<img src="./architecture.png" align="center" alt="architecture diagram" />
</p>

## Installing
```shell
# clone the repo and install dependencies
$ git clone git@github.com:cludden/tf-codebuild-github-status.git
```

## Contributing
1. Clone it (`git clone git@github.com:cludden/tf-codebuild-github-status.git`)
1. Create your feature branch (`git checkout -b my-new-feature`)
1. Commit your changes using [conventional changelog standards](https://github.com/bcoe/conventional-changelog-standard/blob/master/convention.md) (`git commit -m 'feat(my-new-feature): Add some feature'`)
1. Push to the branch (`git push origin my-new-feature`)
1. Ensure linting/security/tests are all passing
1. Create new Pull Request

## Testing
Prerequisites:
- [Docker & Compose](https://store.docker.com/search?offering=community&type=edition))

```shell
# run test suite and generate code coverage
$ docker-compose run tf-codebuild-github-status

# run linter
$ docker-compose run tf-codebuild-github-status npm run lint

# run security scan
$ docker-compose run tf-codebuild-github-status npm run sec
```

## Building
```
$ docker-compose run tf-codebuild-github-status
```

## Releasing
1. Merge fixes & features to master
1. Run lint check `npm run lint`
1. Run security check `npm run sec`
1. Run full test suite `docker-compose run tf-codebuild-github-status`
1. Run release script `npm run release`
1. Push release & release tag to github `git push --follow-tags`
1. [Publish new release](https://help.github.com/articles/creating-releases/) in github, using the release notes from the [CHANGELOG](./CHANGELOG)

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
Via terraform. The module includes an account-wide EventBridge rule forwarding
every `CodeBuild Build State Change` event to the function, plus the matching
invoke permission — consumers do not create per-project rules or permissions.
The function ignores builds whose source version is not a pull request (`pr/N`),
and resolves the GitHub repository from the CodeBuild project name, so project
names must match repository names.
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

## License
Licensed under the [MIT License](LICENSE.md)

Copyright (c) 2017 Chris Ludden
