#!/bin/bash

# 로그 파일 경로
LOG_FILE="/Users/kkuk/Desktop/바이브코딩/upload-log-$(date +%Y%m%d).txt"

echo "=== 나머지 11,000개 자동 업로드 시작: $(date) ===" >> "$LOG_FILE"

# 디렉토리 이동
cd /Users/kkuk/Desktop/바이브코딩

# 나머지 데이터만 업로드 (삭제 없음!)
echo "나머지 11,000개 업로드 시작..." >> "$LOG_FILE"
node upload-remaining.js >> "$LOG_FILE" 2>&1

echo "=== 자동 업로드 완료: $(date) ===" >> "$LOG_FILE"
