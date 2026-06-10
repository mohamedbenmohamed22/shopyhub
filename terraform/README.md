# Infrastructure (Terraform · AWS)

Provisions everything needed to run **Product of the Week** on AWS, with the
region and availability zones fully parametrizable.

## Architecture

```
                       ┌──────────────────────── CloudFront (HTTPS) ────────────────────────┐
   Browser  ─────────► │  default  →  S3 (React build, private via OAC)                      │
                       │  /api/*   →  EC2 (NestJS container, :80)  ──►  RDS PostgreSQL        │
                       └────────────────────────────────────────────────────────────────────┘
                                                   │
                              EC2 also ──► S3 (product images, public read)
                                       └──► ECR  (pulls the backend image)
```

One HTTPS domain (the CloudFront default `*.cloudfront.net`) serves both the SPA
and the API, so there's **no CORS and no mixed-content** problem and you don't
need to own a domain. Swap in an ACM cert + `aliases` later for a custom domain.

| Concern        | Resource                                              |
| -------------- | ----------------------------------------------------- |
| Frontend       | S3 (private) + CloudFront OAC                          |
| API            | EC2 (Amazon Linux 2023 + Docker) behind CloudFront    |
| Database       | RDS PostgreSQL 16 (private, SG-locked to the backend) |
| Image storage  | S3 bucket (public read)                               |
| Image registry | ECR (scan-on-push, lifecycle to last 10)              |
| Secrets/config | SSM Parameter Store (SecureString)                    |
| CI/CD identity | GitHub OIDC provider + scoped deploy role             |

## Parametrizing the zone / region

Everything keys off two variables — change them and the whole stack moves:

```hcl
aws_region         = "eu-central-1"
availability_zones = ["eu-central-1a", "eu-central-1b"]
```

`availability_zones` must list **≥ 2** zones (RDS subnet groups require it); the
EC2 instance runs in the first one. See `variables.tf` for every knob.

## Prerequisites

- Terraform ≥ 1.5, AWS credentials with permission to create the resources.
- (Recommended) a remote state backend. Create an S3 bucket + DynamoDB lock
  table once, then uncomment the `backend "s3"` block in `versions.tf`.

## First deploy

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit non-secret values

# Secrets via env (never commit them):
export TF_VAR_db_password='…'
export TF_VAR_jwt_secret='…'
export TF_VAR_admin_password='…'

terraform init
terraform apply
```

On first apply the EC2 instance boots before any image exists in ECR — that's
expected. The container starts on the **first run of the Deploy workflow**.

## Wire up GitHub Actions

After `apply`, read the outputs:

```bash
terraform output
```

Set these on the GitHub repo:

**Secrets**
- `AWS_DEPLOY_ROLE_ARN` → `github_deploy_role_arn`
- `AWS_TERRAFORM_ROLE_ARN` → a role you create for IaC changes (broad perms)
- `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD` → used by the Terraform workflow

**Variables**
- `AWS_REGION`
- `ECR_REPOSITORY_URL` → `ecr_repository_url`
- `BACKEND_INSTANCE_ID` → `backend_instance_id`
- `FRONTEND_BUCKET` → `frontend_bucket`
- `CLOUDFRONT_DISTRIBUTION_ID` → `cloudfront_distribution_id`
- `VITE_API_URL` → `api_base_url`

Push to `main` and the **Deploy** workflow builds/pushes the backend image,
redeploys it over SSM, builds the frontend against `VITE_API_URL`, syncs it to
S3 and invalidates the CDN.

## How deploys reach the box

No SSH. The instance has the SSM agent + an instance role; CD calls
`ssm send-command` to run `/usr/local/bin/deploy-backend.sh <tag>`, which pulls
the new image, rebuilds the env file from SSM parameters, and restarts the
container. Open a shell with `aws ssm start-session --target <instance-id>`.

## Teardown

```bash
terraform destroy
```

`s3_force_destroy = true` lets non-empty buckets be removed. Set it to `false`
for anything you care about keeping.

## Notes / hardening backlog

- The image bucket is world-readable by design (image URLs are public). Keep
  only product images there.
- For a custom domain: request an ACM cert in `us-east-1`, add `aliases` +
  `viewer_certificate` to the distribution.
- `deletion_protection`/`skip_final_snapshot` on RDS are tuned for a disposable
  demo — flip them for production data.
