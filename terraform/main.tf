# lambda function that proceses incoming webhooks from github, verifies signature
# and publishes to sns
resource "aws_lambda_function" "codebuild_github_status" {
  function_name = var.name
  description   = "update github status via codebuild events"
  role          = aws_iam_role.codebuild_github_status.arn
  handler       = "index.handler"
  memory_size   = var.memory_size
  timeout       = var.timeout
  runtime       = "nodejs24.x"
  s3_bucket     = var.s3_bucket
  s3_key        = var.s3_key

  environment {
    variables = {
      "CONFIG_PARAMETER_NAMES" = var.config_parameter_names
      "DEBUG"                  = var.debug
      "NODE_ENV"               = var.node_env
    }
  }
}

# include cloudwatch log group resource definition in order to ensure it is
# removed with function removal
resource "aws_cloudwatch_log_group" "codebuild_github_status" {
  name = "/aws/lambda/${var.name}"
}

# iam role for publish lambda function
resource "aws_iam_role" "codebuild_github_status" {
  name               = "${var.name}"
  assume_role_policy = "${data.aws_iam_policy_document.assume_role.json}"
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# iam policy for lambda function allowing it to trigger builds for all
# codebuild projects
resource "aws_iam_policy" "codebuild_github_status" {
  name   = "${var.name}"
  policy = "${data.aws_iam_policy_document.codebuild_github_status.json}"
}

data "aws_iam_policy_document" "codebuild_github_status" {
  # allow function to pull configuration from ssm
  statement {
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]

    effect = "Allow"

    resources = formatlist("arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter%s", split(",", var.config_parameter_names))
  }

  # allow function to manage cloudwatch logs
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]

    effect    = "Allow"
    resources = ["*"]
  }
}

# attach trigger policy to trigger role
resource "aws_iam_policy_attachment" "codebuild_github_status" {
  name       = "${var.name}"
  roles      = ["${aws_iam_role.codebuild_github_status.name}"]
  policy_arn = "${aws_iam_policy.codebuild_github_status.arn}"
}

# account-wide rule matching all codebuild build state changes: per-project
# filtering is unnecessary because the function ignores any build whose
# source version is not a pull request (pr/N)
resource "aws_cloudwatch_event_rule" "codebuild_state" {
  name        = "${var.name}-state"
  description = "invoke ${var.name} on codebuild build state changes"

  event_pattern = jsonencode({
    source        = ["aws.codebuild"]
    "detail-type" = ["CodeBuild Build State Change"]
  })
}

# connect the rule above to the lambda function
resource "aws_cloudwatch_event_target" "codebuild_state" {
  rule = aws_cloudwatch_event_rule.codebuild_state.name
  arn  = aws_lambda_function.codebuild_github_status.arn
}

# a single permission scoped to the one account-wide rule stays far below the
# 20 KB resource-based policy limit that per-pipeline statements once exhausted
resource "aws_lambda_permission" "codebuild_state" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.codebuild_github_status.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.codebuild_state.arn
}
