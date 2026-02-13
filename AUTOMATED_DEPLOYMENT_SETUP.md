# Automated Deployment Setup (5-Minute Guide)

Follow these steps to enable fully automated deployments. After this, every push to `main` will automatically deploy without your intervention.

## Step 1: Get Your Credentials

### 1.1 AWS Credentials
```bash
# If you have AWS CLI configured:
cat ~/.aws/credentials

# Look for:
# aws_access_key_id = AKIA...
# aws_secret_access_key = ...
```

Don't have AWS CLI set up? Get keys from:
- AWS Console → IAM → Users → Your User → Security credentials → Create access key

### 1.2 EC2 Information
```bash
# Your EC2 public IP or hostname
# Example: 3.84.123.45
# or: ec2-3-84-123-45.compute-1.amazonaws.com
```

### 1.3 EC2 SSH Key
```bash
# Your .pem file used to SSH to EC2
cat ~/path/to/your-key.pem

# Copy the ENTIRE output including:
# -----BEGIN RSA PRIVATE KEY-----
# ... key content ...
# -----END RSA PRIVATE KEY-----
```

### 1.4 NordVPN Credentials
Your existing NordVPN credentials (already in EC2 .env file)

### 1.5 ytdl Secrets
```
YTDL_INTERNAL_API_KEY=813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73
DATABASE_URL=postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require
```

### 1.6 Vercel Token
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: "GitHub Actions"
4. Scope: "Full Access"
5. Copy the token (starts with `vercel_...`)

## Step 2: Add GitHub Secrets

Go to: https://github.com/YOUR_USERNAME/hermitcraft-horns/settings/secrets/actions

Click **"New repository secret"** for each:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS credentials file or IAM console |
| `AWS_SECRET_ACCESS_KEY` | Long string | AWS credentials file or IAM console |
| `EC2_HOST` | `3.84.123.45` | AWS EC2 console or your SSH command |
| `EC2_SSH_KEY` | Entire .pem file | Your local .pem file |
| `NORDVPN_USERNAME` | Your NordVPN email | Your NordVPN account |
| `NORDVPN_PASSWORD` | Your NordVPN password | Your NordVPN account |
| `YTDL_INTERNAL_API_KEY` | `813cea9e...` | See above (production API key) |
| `DATABASE_URL` | `postgres://...` | From apps/app/.env.local |
| `VERCEL_TOKEN` | `vercel_...` | https://vercel.com/account/tokens |

## Step 3: No EC2 Setup Needed! 🎉

The workflow now automatically writes the `.env` file from GitHub Secrets on every deploy.

You never need to SSH to update environment variables!

## Step 3: Test Automated Deployment

### Test ytdl deployment:
```bash
# Make a small change to trigger deployment
cd apps/ytdl
echo "# Test deployment" >> README.md
git add .
git commit -m "Test ytdl automated deployment"
git push
```

Go to GitHub → Actions tab and watch the `Deploy ytdl Service` workflow run.

### Test Next.js deployment:
```bash
# Make a small change
cd apps/app
echo "// Test deployment" >> src/app/layout.tsx
git add .
git commit -m "Test Next.js automated deployment"
git push
```

Watch the `Deploy Next.js App` workflow run.

## Step 4: Verify Everything Works

After deployments complete:

### Check ytdl service:
```bash
cd apps/ytdl
export YTDL_INTERNAL_API_KEY=813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73
./test-ytdl.sh prod
```

### Check Next.js app:
1. Visit https://hermitcrafthorns.com
2. Create a horn
3. Check https://hermitcrafthorns.com/admin for logs

## That's It! 🎉

From now on:
- ✅ Push to `main` → automatic deploy
- ✅ No SSH needed
- ✅ No manual commands
- ✅ Check GitHub Actions for status

## Troubleshooting

### Workflow fails at "Configure AWS credentials"
- Double-check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in GitHub secrets
- Make sure there are no extra spaces or newlines

### Workflow fails at "Deploy to EC2" (SSH step)
- Verify `EC2_HOST` is correct (public IP, not private)
- Check `EC2_SSH_KEY` contains the ENTIRE .pem file including header/footer
- Make sure EC2 security group allows SSH from GitHub Actions IPs

### Workflow fails at "Login to Amazon ECR"
- Check AWS credentials have ECR permissions
- Verify ECR repository exists: `aws ecr describe-repositories --repository-names ytdl`

### Next.js workflow fails
- Verify `VERCEL_TOKEN` is valid
- Check token hasn't expired
- Make sure project is linked (should have `.vercel/project.json`)

### ytdl service doesn't start after deployment
- SSH to EC2 and check logs: `docker-compose logs ytdl`
- Verify `.env` file has all required variables
- Check Docker Compose is using the new image: `docker-compose ps`

---

## Quick Reference: What Happens On Push

```
Push to main branch
    ↓
GitHub Actions detects changes
    ↓
┌─────────────────┬──────────────────┐
│  apps/ytdl/     │    apps/app/     │
│   changed?      │     changed?     │
└─────────────────┴──────────────────┘
    ↓                      ↓
Build Docker         Build Next.js
Push to ECR         Deploy to Vercel
SSH to EC2                ↓
Pull new image         Done! ✅
Restart service
    ↓
Done! ✅
```

Need help? Check the GitHub Actions logs for detailed error messages.
