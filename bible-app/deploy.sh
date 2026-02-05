#!/bin/bash

echo "🚀 바이브 앱 배포 시작..."
echo ""

# 1. 빌드 생성
echo "📦 프로덕션 빌드 생성 중..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ 빌드 실패"
  exit 1
fi

echo "✅ 빌드 완료"
echo ""

# 2. Firebase 배포
echo "🔥 Firebase에 배포 중..."
npx firebase deploy

if [ $? -ne 0 ]; then
  echo "❌ 배포 실패"
  exit 1
fi

echo ""
echo "✅ 배포 완료!"
echo ""
echo "📱 핸드폰에서 테스트: https://bible-app-29a53.web.app"
echo "🎛️  Firebase 콘솔: https://console.firebase.google.com/project/bible-app-29a53"
