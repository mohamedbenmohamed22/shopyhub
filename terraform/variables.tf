###############################################################################
# Region / availability zones — fully parametrable.
###############################################################################

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "eu-north-1"
}

variable "availability_zones" {
  description = <<-EOT
    Availability zones to spread subnets across. Must belong to aws_region and
    contain at least two (RDS subnet groups require >= 2 AZs). The EC2 instance
    runs in the first zone.
  EOT
  type        = list(string)
  default     = ["eu-north-1a", "eu-north-1b"]

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "Provide at least two availability zones (required by the RDS subnet group)."
  }
}

###############################################################################
# Naming / tagging
###############################################################################

variable "project" {
  description = "Short project slug used to name and tag resources."
  type        = string
  default     = "potw"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "prod"
}

###############################################################################
# Network
###############################################################################

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the public subnets (one per availability zone)."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "ssh_cidr" {
  description = <<-EOT
    Optional CIDR allowed to SSH (port 22) to the instance. Defaults to "0.0.0.0/0"
    (open to the world) for easier access, but can be restricted for better security.
  EOT
  type        = string
  default     = "0.0.0.0/0"
}

###############################################################################
# Compute (backend on EC2 + docker)
###############################################################################

variable "instance_type" {
  description = "EC2 instance type for the backend."
  type        = string
  default     = "t3.small"
}

variable "backend_image_tag" {
  description = "Container image tag the instance should run (overwritten by CD)."
  type        = string
  default     = "latest"
}

###############################################################################
# Database (RDS PostgreSQL)
###############################################################################

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GiB."
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "product_of_the_week"
}

variable "db_username" {
  description = "Master database username."
  type        = string
  default     = "pow"
}

variable "db_password" {
  description = "Master database password. Supply via TF_VAR_db_password / CI secret."
  type        = string
  sensitive   = true
}

###############################################################################
# Application secrets
###############################################################################

variable "jwt_secret" {
  description = "JWT signing secret for the API. Supply via TF_VAR_jwt_secret / CI secret."
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Seed admin email for the backend."
  type        = string
  default     = "admin@potw.tn"
}

variable "admin_password" {
  description = "Seed admin password for the backend."
  type        = string
  sensitive   = true
  default     = "change-me-admin"
}

###############################################################################
# CI/CD — GitHub OIDC
###############################################################################

variable "github_repo" {
  description = "GitHub repo allowed to assume the deploy role, as \"owner/name\"."
  type        = string
  default     = "mohamedbenmohamed22/shopyhub"
}

###############################################################################
# Misc
###############################################################################

variable "s3_force_destroy" {
  description = "Allow non-empty S3 buckets to be destroyed (handy for this small project)."
  type        = bool
  default     = true
}
