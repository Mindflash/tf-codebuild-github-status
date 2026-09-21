# offline regression tests: the aws provider is mocked, so no credentials or
# network access are needed. run "terraform test" from the terraform/ directory
# after "terraform init -backend=false".
# the mock still runs the real provider's schema validation, and a random
# string is not a valid IAM policy document, so give policy documents a
# well-formed json default
mock_provider "aws" {
  mock_data "aws_iam_policy_document" {
    defaults = {
      json = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"sts:AssumeRole\",\"Principal\":{\"Service\":\"lambda.amazonaws.com\"}}]}"
    }
  }
}

variables {
  name                   = "codebuild-github-status"
  region                 = "us-east-1"
  config_parameter_names = "/secrets/ops/us-east-1/tf-codebuild-github-status,/secrets/ops/us-east-1/other"
  s3_bucket              = "artifacts"
  s3_key                 = "tf-codebuild-github-status/v2.0.1/index.zip"
}

run "plan" {
  command = plan

  assert {
    condition     = aws_lambda_function.codebuild_github_status.runtime == "nodejs24.x"
    error_message = "lambda runtime must be nodejs24.x"
  }

  assert {
    condition     = aws_lambda_function.codebuild_github_status.function_name == var.name
    error_message = "function name must follow var.name"
  }

  assert {
    condition     = aws_cloudwatch_log_group.codebuild_github_status.name == "/aws/lambda/${var.name}"
    error_message = "log group must be the lambda's default log group so it is removed with the function"
  }

  assert {
    condition     = jsondecode(aws_cloudwatch_event_rule.codebuild_state.event_pattern)["detail-type"][0] == "CodeBuild Build State Change"
    error_message = "event rule must match codebuild build state changes"
  }

  assert {
    condition     = jsondecode(aws_cloudwatch_event_rule.codebuild_state.event_pattern)["source"][0] == "aws.codebuild"
    error_message = "event rule must be scoped to the codebuild event source"
  }

  assert {
    condition     = aws_lambda_permission.codebuild_state.principal == "events.amazonaws.com"
    error_message = "invoke permission must be granted to eventbridge"
  }

  assert {
    condition     = aws_lambda_permission.codebuild_state.function_name == var.name
    error_message = "invoke permission must target this function"
  }
}
