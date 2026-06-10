output "cloudfront_url" {
  description = "Public HTTPS URL for the storefront and API (https://.../api/v1)."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution id (for cache invalidations in CD)."
  value       = aws_cloudfront_distribution.main.id
}

output "api_base_url" {
  description = "Value to bake into the frontend as VITE_API_URL."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}/api/v1"
}

output "ecr_repository_url" {
  description = "ECR repository for the backend image."
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket" {
  description = "S3 bucket that serves the built frontend."
  value       = aws_s3_bucket.frontend.bucket
}

output "images_bucket" {
  description = "S3 bucket for product images."
  value       = aws_s3_bucket.images.bucket
}

output "backend_instance_id" {
  description = "EC2 instance id (target for SSM deploys)."
  value       = aws_instance.backend.id
}

output "backend_public_ip" {
  description = "Elastic IP of the backend instance."
  value       = aws_eip.backend.public_ip
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint."
  value       = aws_db_instance.main.address
}

output "github_deploy_role_arn" {
  description = "Role ARN for the GitHub Actions deploy workflow (AWS_DEPLOY_ROLE_ARN)."
  value       = aws_iam_role.github_deploy.arn
}
