#!/bin/bash
# Manual deployment script for ytdl with AWS Secrets Manager

set -e

echo "🚀 Deploying ytdl to EC2..."
echo ""

# Get EC2 host from GitHub secrets
EC2_HOST="13.218.90.35"

echo "📦 Building and pushing Docker image..."
cd /Users/dreadhalor/Desktop/Coding/non-folio/hermitcraft-horns

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 851725492026.dkr.ecr.us-east-1.amazonaws.com

# Build and push
cd apps/ytdl
docker build --platform linux/amd64 -t 851725492026.dkr.ecr.us-east-1.amazonaws.com/ytdl:latest .
docker push 851725492026.dkr.ecr.us-east-1.amazonaws.com/ytdl:latest

echo "✅ Image pushed to ECR!"
echo ""
echo "🔄 Restarting services on EC2..."

# SSH to EC2 and restart
ssh -i ~/.ssh/hermitcraft-horns-ec2.pem ec2-user@$EC2_HOST << 'ENDSSH'
cd /home/ec2-user/ytdl
docker-compose pull ytdl
docker-compose down
docker-compose up -d
echo "✅ Services restarted!"
echo ""
echo "📝 Checking logs..."
sleep 5
docker-compose logs --tail=50 ytdl
ENDSSH

echo ""
echo "🎉 Deployment complete!"
