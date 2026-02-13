# GitHub Actions Workflows

Automated deployment workflows for Hermitcraft Horns.

## Workflows

### 1. `deploy-ytdl.yml` - Deploy ytdl Service to EC2

**Triggers:**
- Push to `main` branch with changes in `apps/ytdl/`
- Manual workflow dispatch

**What it does:**
1. Builds Docker image for amd64 (EC2 architecture)
2. Pushes to AWS ECR
3. SSHs to EC2 and restarts docker-compose
4. Shows deployment logs

**Required Secrets:**
- `AWS_ACCESS_KEY_ID` - AWS access key for ECR
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `EC2_HOST` - EC2 instance IP or hostname
- `EC2_SSH_KEY` - Private SSH key for EC2 access

### 2. `deploy-nextjs.yml` - Deploy Next.js App to Vercel

**Triggers:**
- Push to `main` branch with changes in `apps/app/`
- Manual workflow dispatch

**What it does:**
1. Builds Next.js app with Vercel CLI
2. Deploys to Vercel production

**Required Secrets:**
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Your Vercel team/org ID (optional)
- `VERCEL_PROJECT_ID` - Your Vercel project ID (optional)

## Setup Instructions

### Step 1: Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Add each of these:

**For ytdl deployment:**
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
EC2_HOST=your-ec2-ip-or-hostname
EC2_SSH_KEY=paste_your_private_key_here
```

**For Next.js deployment:**
```
VERCEL_TOKEN=your_vercel_token
```

### Step 2: Get Vercel Token

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login and generate token
vercel login

# Get token from: https://vercel.com/account/tokens
# Create a new token with scope: "Full Access"
```

### Step 3: Get EC2 SSH Key

Your existing EC2 private key (the `.pem` file you use to SSH).

```bash
# Copy the entire contents
cat your-key.pem

# Paste into GitHub secret EC2_SSH_KEY
```

### Step 4: Test Workflows

**Test ytdl deployment:**
```bash
git add .
git commit -m "Test ytdl deployment"
git push
```

Or manually trigger from GitHub Actions tab.

**Test Next.js deployment:**
```bash
# Make a change in apps/app
git add .
git commit -m "Test Next.js deployment"
git push
```

### Step 5: Monitor Deployments

Go to GitHub → Actions tab to see workflow runs and logs.

## Environment Variables on EC2

Make sure your EC2 `.env` file has:

```bash
NORDVPN_USERNAME=your_username
NORDVPN_PASSWORD=your_password
YTDL_INTERNAL_API_KEY=813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73
DATABASE_URL=postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require
```

## Environment Variables on Vercel

Add via Vercel Dashboard or CLI:

```bash
YTDL_INTERNAL_API_KEY=813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73
ADMIN_USER_ID=your_clerk_user_id
```

## Manual Deployment

You can still deploy manually if needed:

**ytdl:**
```bash
cd apps/ytdl
./deploy.sh  # (create this script if you want)
```

**Next.js:**
```bash
cd apps/app
vercel --prod
```

## Troubleshooting

### ytdl deployment fails at ECR push
- Check AWS credentials in GitHub secrets
- Verify ECR repository exists: `aws ecr describe-repositories --repository-names ytdl`

### ytdl deployment fails at SSH step
- Verify EC2_HOST is correct (public IP or hostname)
- Check EC2_SSH_KEY is the complete private key with headers/footers
- Ensure EC2 security group allows SSH from GitHub Actions IPs

### Next.js deployment fails
- Check VERCEL_TOKEN is valid
- Run `vercel link` locally first to connect project
- Verify environment variables are set on Vercel

### Changes not deploying
- Check workflow triggers in `.yml` files
- Verify changes are in the correct paths (`apps/ytdl/` or `apps/app/`)
- Check GitHub Actions tab for workflow status

---

Need help? Check the Actions tab for detailed logs or create an issue.
