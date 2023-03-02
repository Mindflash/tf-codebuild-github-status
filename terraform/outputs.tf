output "arn" {
  value = aws_lambda_function.codebuild_github_status.arn
}

output "function_name" {
  value = aws_lambda_function.codebuild_github_status.function_name
}

output "invoke_arn" {
  value = aws_lambda_function.codebuild_github_status.invoke_arn
}

output "qualified_arn" {
  value = aws_lambda_function.codebuild_github_status.qualified_arn
}

output "version" {
  value = aws_lambda_function.codebuild_github_status.version
}
