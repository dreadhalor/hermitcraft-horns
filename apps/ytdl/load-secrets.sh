#!/bin/bash
# Script to load secrets from AWS Secrets Manager and export as environment variables
# This runs on EC2 before starting docker-compose

set -e

echo "🔐 Loading secrets from AWS Secrets Manager..."

# Fetch secrets
export NORDVPN_USERNAME=$(aws secretsmanager get-secret-value --region us-east-1 --secret-id hermitcraft-horns/ytdl/nordvpn-username --query SecretString --output text)
export NORDVPN_PASSWORD=$(aws secretsmanager get-secret-value --region us-east-1 --secret-id hermitcraft-horns/ytdl/nordvpn-password --query SecretString --output text)

echo "✅ Secrets loaded!"
echo "   NORDVPN_USERNAME: ${NORDVPN_USERNAME:0:3}***"
echo "   NORDVPN_PASSWORD: ***"

# Now docker-compose can use these environment variables
docker-compose up -d

echo "✅ Containers started with secrets from AWS!"
