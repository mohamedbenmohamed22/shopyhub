terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Remote state. Create the bucket + DynamoDB lock table once, then uncomment
  # and run `terraform init -reconfigure`. Left commented so a fresh clone can
  # `terraform init` against local state without pre-existing infrastructure.
  #
  # backend "s3" {
  #   bucket         = "potw-tfstate-<your-account-id>"
  #   key            = "prod/terraform.tfstate"
  #   region         = "eu-west-1"
  #   dynamodb_table = "potw-tflock"
  #   encrypt        = true
  # }
}
