# GitHub Actions Workflows

Automated deployment workflows for Hermitcraft Horns.

## Workflows

### 1. `deploy-ytdl.yml` - Deploy ytdl Service to EC2

**Triggers:**
- Push to `main` branch with changes in `apps/ytdl/` or the workflow file itself
- Manual workflow dispatch

**What it does:**
1. Builds Docker image for amd64 (EC2 architecture)
2. Pushes to AWS ECR
3. SSHs to EC2 and generates `docker-compose.yml`
4. Fetches secrets from AWS Secrets Manager
5. Pulls latest image from ECR
6. Restarts containers with `--force-recreate --remove-orphans`

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS access key for ECR
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `EC2_HOST` - EC2 instance IP or hostname
- `EC2_SSH_KEY` - Private SSH key for EC2 access

**AWS Secrets Manager keys** (fetched at deploy time on EC2, not stored in GitHub):
- `hermitcraft-horns/ytdl/nordvpn-username`
- `hermitcraft-horns/ytdl/nordvpn-password`
- `hermitcraft-horns/ytdl/api-key`
- `hermitcraft-horns/ytdl/database-url`

### 2. Next.js Deployment - Handled by Vercel

**No GitHub Actions workflow needed!**

Vercel automatically deploys the Next.js app via its built-in GitHub integration:
- Triggers on every push to `main` branch
- No manual configuration needed
- Manages its own build and deployment
- View deployment status at: https://vercel.com/dashboard

**Environment variables** are managed via Vercel Dashboard.

## Setup Instructions

### Step 1: Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add each of these:

```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
EC2_HOST=your-ec2-ip-or-hostname
EC2_SSH_KEY=paste_your_private_key_here
```

### Step 2: Ensure AWS Secrets Manager is configured

All sensitive credentials live in AWS Secrets Manager, not in GitHub or `.env` files. The EC2 instance uses IAM roles to fetch them at deployment time.

### Step 3: Test Workflows

**Test ytdl deployment:**
```bash
# Push a change to apps/ytdl/
git push
```

Or manually trigger from the GitHub Actions tab.

## Troubleshooting

### ytdl deployment fails at ECR push
- Check AWS credentials in GitHub secrets
- Verify ECR repository exists: `aws ecr describe-repositories --repository-names ytdl`

### ytdl deployment fails at SSH step
- Verify EC2_HOST is correct (public IP or hostname)
- Check EC2_SSH_KEY is the complete private key with headers/footers
- Ensure EC2 security group allows SSH from GitHub Actions IPs

### Changes not deploying
- Check workflow triggers in `.yml` files
- Verify changes are in the correct paths (`apps/ytdl/` or `apps/app/`)
- Check GitHub Actions tab for workflow status

---

Need help? Check the Actions tab for detailed logs or create an issue.
