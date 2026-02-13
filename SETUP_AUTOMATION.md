# Setting Up Automated Deployments

Quick guide to get automated deployments working via GitHub Actions.

## 1. Add Vercel Environment Variable (Right Now)

**Via Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select your `hermitcraft-horns` project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name:** `YTDL_INTERNAL_API_KEY`
   - **Value:** `813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73`
   - **Environment:** Production
5. Click Save
6. Redeploy from Vercel dashboard (or push code)

**Or via CLI (if project is linked):**
```bash
cd apps/app
vercel link  # Link to your project first
vercel env add YTDL_INTERNAL_API_KEY production
# Paste: 813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73
```

## 2. Update EC2 .env File (Right Now)

SSH to your EC2 instance:
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to ytdl directory
cd /home/ec2-user/ytdl  # or wherever you have it

# Edit .env
nano .env
```

Add these lines (if not already there):
```bash
YTDL_INTERNAL_API_KEY=813cea9e25ae531d76d928946ed221dfdded747edd2900f24164ec22f2d56f73
DATABASE_URL=postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require
```

Save and restart:
```bash
docker-compose down
docker-compose up -d
```

## 3. Add GitHub Secrets (For Automation)

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

### For ytdl Deployment:
- **`AWS_ACCESS_KEY_ID`** - Your AWS access key
- **`AWS_SECRET_ACCESS_KEY`** - Your AWS secret key
- **`EC2_HOST`** - Your EC2 public IP or hostname
- **`EC2_SSH_KEY`** - Your EC2 private key (entire `.pem` file contents)

### For Next.js Deployment:
- **`VERCEL_TOKEN`** - Get from https://vercel.com/account/tokens
  - Click "Create" → Name it "GitHub Actions" → Select "Full Access" → Copy token

## 4. Test Automated Deployment

```bash
# Commit the new workflows
git add .
git commit -m "Add automated deployment workflows"
git push
```

Go to GitHub → Actions tab and watch the workflows run!

## 5. Future Deployments

Now whenever you push to `main`:
- Changes in `apps/ytdl/` → automatically deploys ytdl to EC2
- Changes in `apps/app/` → automatically deploys Next.js to Vercel
- You can also trigger deployments manually from GitHub Actions tab

## Manual Test Right Now (Before Automation)

Want to test the current changes first?

**Deploy ytdl manually:**
```bash
cd apps/ytdl
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 533267405036.dkr.ecr.us-east-1.amazonaws.com
docker build --platform linux/amd64 -t ytdl .
docker tag ytdl:latest 533267405036.dkr.ecr.us-east-1.amazonaws.com/ytdl:latest
docker push 533267405036.dkr.ecr.us-east-1.amazonaws.com/ytdl:latest

# Then SSH to EC2 and run:
docker-compose pull ytdl && docker-compose down && docker-compose up -d
```

**Deploy Next.js manually:**
```bash
cd apps/app
git push  # Vercel auto-deploys from GitHub
```

---

See `.github/workflows/README.md` for detailed workflow documentation.
