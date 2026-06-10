###############################################################################
# EC2 instance role — SSM managed, pulls from ECR, reads images bucket + secrets.
###############################################################################

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "backend" {
  name               = "${local.name}-backend-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Session Manager access (no SSH keys needed) + CD via SSM Run Command.
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Pull the backend image from ECR.
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

data "aws_iam_policy_document" "backend_inline" {
  # Read/write product images.
  statement {
    sid       = "ImagesBucket"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.images.arn}/*"]
  }
  statement {
    sid       = "ImagesBucketList"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.images.arn]
  }

  # Read the app's configuration/secrets from SSM Parameter Store.
  statement {
    sid       = "AppParameters"
    actions   = ["ssm:GetParameter", "ssm:GetParametersByPath"]
    resources = ["arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${local.name}/*"]
  }
}

resource "aws_iam_role_policy" "backend_inline" {
  name   = "${local.name}-backend-inline"
  role   = aws_iam_role.backend.id
  policy = data.aws_iam_policy_document.backend_inline.json
}

resource "aws_iam_instance_profile" "backend" {
  name = "${local.name}-backend-profile"
  role = aws_iam_role.backend.name
}
