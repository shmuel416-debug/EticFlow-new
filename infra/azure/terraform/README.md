# EthicFlow Azure Baseline (Terraform)

This Terraform baseline provisions a minimal production host on Azure for running the existing Docker Compose production stack.

## What It Creates

- Resource Group
- Virtual Network + Subnet
- Network Security Group (ports 22, 80, 443)
- Public IP
- Linux VM (Ubuntu) with cloud-init bootstrap

## Prerequisites

- Azure subscription
- Terraform >= 1.6
- Azure CLI logged in:

```bash
az login
az account set --subscription "<SUBSCRIPTION_ID>"
```

## Usage

```bash
cd infra/azure/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars values
terraform init
terraform plan
terraform apply
```

After `terraform apply`, SSH to the created host and deploy EthicFlow with:

```bash
git clone <your-repo-url>
cd EthicFlow
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Notes

- Domain + DNS + SSL are handled separately in `docs/ops/go-live-execution-checklist.md`.
- This is intentionally lightweight to match the current Docker Compose architecture.
