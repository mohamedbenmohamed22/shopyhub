###############################################################################
# Product images bucket — publicly readable (image URLs are embedded in pages).
###############################################################################

resource "aws_s3_bucket" "images" {
  bucket        = "${local.name}-images-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.s3_force_destroy
  tags          = { Name = "${local.name}-images" }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "images_public_read" {
  bucket     = aws_s3_bucket.images.id
  depends_on = [aws_s3_bucket_public_access_block.images]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.images.arn}/*"
    }]
  })
}

resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  cors_rule {
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

###############################################################################
# Frontend bucket — private, served through CloudFront (OAC).
###############################################################################

resource "aws_s3_bucket" "frontend" {
  bucket        = "${local.name}-frontend-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.s3_force_destroy
  tags          = { Name = "${local.name}-frontend" }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Only this CloudFront distribution may read the frontend bucket.
resource "aws_s3_bucket_policy" "frontend_cloudfront" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

resource "aws_s3_object" "terraform_outputs" {
  provider = aws.us_east_1
  # This is your state bucket
  bucket       = "potw-tfstate-121546003208"
  key          = "prod/outputs.json"
  content_type = "application/json"
  # We manually build the map of outputs we want to save
  content = jsonencode({
    cloudfront_url             = "https://${aws_cloudfront_distribution.main.domain_name}"
    api_base_url               = "https://${aws_cloudfront_distribution.main.domain_name}/api/v1"
    backend_public_ip          = aws_eip.backend.public_ip
    rds_endpoint               = aws_db_instance.main.address
    ecr_repository_url         = aws_ecr_repository.backend.repository_url
    frontend_bucket            = aws_s3_bucket.frontend.bucket
    images_bucket              = aws_s3_bucket.images.bucket
    github_deploy_role_arn     = aws_iam_role.github_deploy.arn
    cloudfront_distribution_id = aws_cloudfront_distribution.main.id
    backend_instance_id        = aws_instance.backend.id
  })
}