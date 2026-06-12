# Cloud Architecture - Shopyhub

This document describes the cloud infrastructure for the Shopyhub e-commerce application.

## Infrastructure Diagram

```mermaid
graph TB
    subgraph Public_Internet [🌐 Public Internet]
        User((👤 User Browser))
        Dev((💻 Developer Laptop))
    end

    subgraph AWS_Cloud [☁️ AWS Cloud - Region: eu-north-1]
        
        subgraph Global_Services [🌎 Global Services]
            CF[⚡ CloudFront Distribution]
            WAF[🛡️ WAF - Security]
        end

        subgraph VPC [📂 VPC: 10.0.0.0/16]
            
            subgraph Public_Subnet [🔓 Public Subnet]
                direction TB
                EIP[📍 Elastic IP: 13.51.130.244]
                
                subgraph EC2_Instance [🖥️ EC2: Backend Server]
                    Docker[🐳 Docker Engine]
                    App[🚀 NestJS Container]
                    Agent[🤖 SSM Agent]
                    
                    App --- |Port 3000| Docker
                end
                
                SG_EC2[🔒 SG: 80, 22]
            end

            subgraph Private_Subnet [🔒 Private Subnet]
                RDS[(🐘 RDS: PostgreSQL)]
                SG_RDS[🔒 SG: 5432]
            end
        end

        subgraph Storage_Config [🛠️ Management & Storage]
            S3_Front[📦 S3: Frontend Assets]
            S3_State[📜 S3: Terraform State]
            ECR[📦 ECR: Docker Images]
            SSM[🔑 SSM Parameter Store]
        end
    end

    %% Traffic Flows
    User --> |HTTPS| CF
    CF --> |Static Assets| S3_Front
    CF --> |API Requests| EIP
    EIP --> |Port 80| App
    App --> |Private SQL| RDS

    %% Management Flows
    Dev --> |SSM Session| Agent
    Dev --> |SSH Tunnel| SG_EC2
    Agent --> |Fetch Secrets| SSM
    Docker --> |Pull Image| ECR
    
    %% Security Group Rules
    SG_EC2 -.-> |Allows| RDS
    SG_RDS -.-> |Only From| SG_EC2

    style EC2_Instance fill:#f9f,stroke:#333,stroke-width:2px
    style RDS fill:#bbf,stroke:#333,stroke-width:2px
    style CF fill:#ff9,stroke:#333,stroke-width:2px
    style S3_Front fill:#9f9,stroke:#333
```

## Component Breakdown

### 1. Networking (VPC)
- **VPC**: 10.0.0.0/16 isolated network.
- **Public Subnet**: Contains the EC2 instance and Internet Gateway.
- **Private Subnet**: Contains the RDS database (no direct internet access).

### 2. Frontend (Static)
- **S3 Bucket**: Stores the built React/Vite assets.
- **CloudFront**: Serves assets with low latency via edge locations.

### 3. Backend (Compute)
- **EC2 Instance**: Amazon Linux 2023 running Docker.
- **Docker**: Hosts the NestJS API container.
- **Elastic IP**: Provides a stable entry point for the CloudFront origin.

### 4. Database (Storage)
- **RDS PostgreSQL**: Managed database service.
- **Security**: Only accessible from the Backend Security Group.

### 5. Management & CI/CD
- **SSM Parameter Store**: Secure storage for all environment variables and the SSH Private Key.
- **ECR**: Private registry for application Docker images.
- **GitHub Actions**: Automates Terraform applies and application deployments.

## Secure Access Instructions

### SSH Access
Retrieve the private key from SSM and connect:
```bash
aws ssm get-parameter --name "/potw-prod/SSH_PRIVATE_KEY" --region eu-north-1 --with-decryption --query "Parameter.Value" --output text > backend-key.pem
chmod 400 backend-key.pem
ssh -i backend-key.pem ec2-user@13.51.130.244
```

### Database Tunneling
Access the private RDS from your local machine:
```bash
ssh -i backend-key.pem -L 5433:<RDS_ENDPOINT>:5432 -N ec2-user@13.51.130.244
```
