# ytdl Production Deployment

## Step 1: Build and Push Docker Image

```bash
cd apps/ytdl

# Login to AWS ECR (replace with your region and account)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 533267405036.dkr.ecr.us-east-1.amazonaws.com

# Build the image for amd64 (EC2 architecture)
docker build --platform linux/amd64 -t ytdl .

# Tag it
docker tag ytdl:latest 533267405036.dkr.ecr.us-east-1.amazonaws.com/ytdl:latest

# Push to ECR
docker push 533267405036.dkr.ecr.us-east-1.amazonaws.com/ytdl:latest
```

## Step 2: Update .env on EC2

SSH into your EC2 instance and update the `.env` file:

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to ytdl directory
cd /path/to/ytdl

# Edit .env file
nano .env
```

Add these lines (generate a new API key for production):
```bash
YTDL_INTERNAL_API_KEY=your_production_api_key_here
DATABASE_URL=postgres://default:WE78TkdNVexL@ep-raspy-art-a4kaeean-pooler.us-east-1.aws.neon.tech/verceldb?sslmode=require
```

## Step 3: Deploy on EC2

```bash
# Pull the latest image
docker-compose pull ytdl

# Restart services
docker-compose down
docker-compose up -d

# Check logs
docker-compose logs -f ytdl
```

Look for:
- `✅ Connected to database for logging`
- `Connected to Redis`
- `Server is running on port 3001`

## Step 4: Deploy Next.js to Vercel

```bash
cd apps/app

# Add the new env var to Vercel
vercel env add YTDL_INTERNAL_API_KEY production

# When prompted, enter: your_production_api_key_here (same as ytdl)

# Deploy
git add .
git commit -m "Add ytdl authentication and logging"
git push

# Vercel will auto-deploy
```

Or manually:
```bash
vercel --prod
```

## Step 5: Test from Command Line

```bash
cd apps/ytdl

# Set production API key
export YTDL_INTERNAL_API_KEY=your_production_api_key_here

# Test production
./test-ytdl.sh prod
```

## Step 6: Test from Next.js App

1. Visit https://hermitcrafthorns.com
2. Sign in
3. Create a horn
4. Generate it

## Step 7: Verify Logs

Visit https://hermitcrafthorns.com/admin

You should see:
- Command-line test request (userId: null)
- App-generated request (your userId)
- Both showing completed status
- Timestamps and video URLs

---

## Rollback Plan

If something breaks:

```bash
# On EC2
cd /path/to/ytdl
docker-compose down
git checkout HEAD~1
docker-compose up -d
```

For Next.js:
- Revert commit and push
- Or use Vercel dashboard to revert deployment
