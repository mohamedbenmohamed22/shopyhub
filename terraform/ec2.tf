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

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    aws_region     = var.aws_region
    ecr_repo_url   = aws_ecr_repository.backend.repository_url
    image_tag      = var.backend_image_tag
    ssm_prefix     = local.ssm_prefix
  })

  metadata_options {
    http_tokens   = "required" # IMDSv2 only (DevSecOps: blocks SSRF credential theft)
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = 20
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
