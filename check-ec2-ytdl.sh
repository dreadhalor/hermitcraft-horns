#!/bin/bash

# Check EC2 ytdl service status via GitHub Actions SSH

echo "🔍 Checking ytdl service status on EC2..."
echo ""

gh workflow run .github/workflows/check-ytdl-status.yml

sleep 5

echo "Check the workflow run at:"
echo "https://github.com/dreadhalor/hermitcraft-horns/actions"
