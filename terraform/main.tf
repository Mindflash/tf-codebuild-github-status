# lambda function that proceses incoming webhooks from github, verifies signature
# and publishes to sns
resource "aws_lambda_function" "codebuild_github_status" {
  function_name = var.name
  description   = "update github status via codebuild events"
  role          = aws_iam_role.codebuild_github_status.arn
  handler       = "index.handler"
  memory_size   = var.memory_size
  timeout       = var.timeout
  runtime       = "nodejs18.x"
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
  name               = var.name
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
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
  name   = var.name
  policy = data.aws_iam_policy_document.codebuild_github_status.json
}

data "aws_iam_policy_document" "codebuild_github_status" {
  # allow function to pull configuration from ssm
  statement {
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
    ]

    effect = "Allow"

    resources = [
      join(",",formatlist("arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter%s", split(",", var.config_parameter_names))),
    ]
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
  name       = var.name
  roles      = [aws_iam_role.codebuild_github_status.name]
  policy_arn = aws_iam_policy.codebuild_github_status.arn
}
