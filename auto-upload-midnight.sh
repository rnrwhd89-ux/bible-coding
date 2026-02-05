#!/bin/bash

# 로그 파일 경로
LOG_FILE="/Users/kkuk/Desktop/바이브코딩/upload-log-$(date +%Y%m%d).txt"

echo "=== 자동 업로드 시작: $(date) ===" >> "$LOG_FILE"

# 디렉토리 이동
cd /Users/kkuk/Desktop/바이브코딩

# 기존 데이터 삭제
echo "기존 데이터 삭제 중..." >> "$LOG_FILE"
node delete-all-bible.js >> "$LOG_FILE" 2>&1

# 30초 대기
sleep 30

# 새로 업로드
echo "새로 업로드 시작..." >> "$LOG_FILE"
node upload-bible.js >> "$LOG_FILE" 2>&1

echo "=== 자동 업로드 완료: $(date) ===" >> "$LOG_FILE"
