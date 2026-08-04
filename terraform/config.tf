terraform {
  # nodejs24.x lambda runtime support requires a recent AWS provider, which in
  # turn requires terraform >= 1.x (plugin protocol 5+); terraform 0.11 cannot
  # plan this module
  required_version = ">= 1.4.2"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0"
    }
  }
}

# explicit provider configuration: this directory runs as the root module in
# the terraform-enterprise workspace, so no consuming root supplies a provider
provider "aws" {
  region     = var.region
  access_key = var.access_key
  secret_key = var.secret_key
}

data "aws_caller_identity" "current" {
}
