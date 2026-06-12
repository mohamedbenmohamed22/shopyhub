###############################################################################
# Application configuration + secrets in SSM Parameter Store.
# The instance reads these at deploy time and writes them to the container env,
# so no secrets land in user_data. SecureString is used for sensitive values.
###############################################################################

locals {
  ssm_prefix     = "/${local.name}"
  cloudfront_url = "https://${var.domain_name}"
  database_url   = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.address}:5432/${var.db_name}?schema=public"
  images_public  = "https://${aws_s3_bucket.images.bucket}.s3.${var.aws_region}.amazonaws.com"

  # Plain (non-secret) configuration.
  config_params = {
    API_PREFIX           = "api/v1"
    PORT                 = "3000"
    JWT_EXPIRES_IN       = "1d"
    CORS_ORIGIN          = local.cloudfront_url
    DEFAULT_DELIVERY_FEE = "7"
    S3_REGION            = var.aws_region
    S3_BUCKET            = aws_s3_bucket.images.bucket
    S3_PUBLIC_URL        = local.images_public
  }

  # Sensitive configuration.
  secret_params = {
    DATABASE_URL   = local.database_url
    JWT_SECRET     = var.jwt_secret
    ADMIN_EMAIL    = var.admin_email
    ADMIN_PASSWORD = var.admin_password
  }
}

resource "aws_ssm_parameter" "config" {
  for_each = local.config_params
  name     = "${local.ssm_prefix}/${each.key}"
  type     = "String"
  value    = each.value
  tags     = { Name = "${local.name}-${each.key}" }
}

resource "aws_ssm_parameter" "secret" {
  for_each = local.secret_params
  name     = "${local.ssm_prefix}/${each.key}"
  type     = "SecureString"
  value    = each.value
  tags     = { Name = "${local.name}-${each.key}" }
}
