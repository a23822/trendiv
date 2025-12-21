#!/bin/bash

echo "🚀 Trendiv Backend 배포를 시작합니다..."

echo ""
echo "📦 1. Docker Image Build..."
docker build --platform linux/amd64 -t asia-northeast3-docker.pkg.dev/trendiv/trendiv-repo/trendiv-backend:latest .

echo ""
echo "📤 2. Docker Image Push..."
docker push asia-northeast3-docker.pkg.dev/trendiv/trendiv-repo/trendiv-backend:latest

echo ""
echo "✅ 배포 완료!"