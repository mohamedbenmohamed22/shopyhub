data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "tls_private_key" "backend" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "backend" {
  key_name   = "${local.name}-key"
  public_key = tls_private_key.backend.public_key_openssh
}

# Store the private key securely so it can be retrieved by the user.
resource "aws_ssm_parameter" "ssh_private_key" {
  name        = "${local.ssm_prefix}/SSH_PRIVATE_KEY"
  description = "Private key for SSH access to backend EC2"
  type        = "SecureString"
  value       = tls_private_key.backend.private_key_pem
  tags        = { Name = "${local.name}-ssh-key" }
}

# Stable public address used as the CloudFront API origin.
resource "aws_eip" "backend" {
  domain = "vpc"
  tags   = { Name = "${local.name}-eip" }
}

resource "aws_instance" "backend" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.backend.name
  key_name               = aws_key_pair.backend.key_name

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    aws_region   = var.aws_region
    ecr_repo_url = aws_ecr_repository.backend.repository_url
    image_tag    = var.backend_image_tag
    ssm_prefix   = local.ssm_prefix
  })

  metadata_options {
    http_tokens   = "required" # IMDSv2 only (DevSecOps: blocks SSRF credential theft)
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  depends_on = [
    aws_db_instance.main,
    aws_ssm_parameter.config,
    aws_ssm_parameter.secret,
  ]

  tags = { Name = "${local.name}-backend" }
}

resource "aws_eip_association" "backend" {
  instance_id   = aws_instance.backend.id
  allocation_id = aws_eip.backend.id
}
