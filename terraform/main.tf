locals {
  name = "${var.project}-${var.environment}"
}

# Account / region context used to build ARNs and URLs.
data "aws_caller_identity" "current" {}
