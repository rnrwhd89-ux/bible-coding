# 개역개정 성경 CSV 업로드 가이드

## 방법 1: Firebase Storage에 업로드 (추천)

### 1단계: Firebase Storage 활성화
1. Firebase 콘솔 접속: https://console.firebase.google.com/project/bible-app-29a53
2. **Storage** 메뉴 클릭
3. **시작하기** 클릭
4. 프로덕션 모드로 시작

### 2단계: CSV 파일 업로드
1. Storage에서 **파일 업로드** 클릭
2. 개역개정.csv 파일 선택
3. 업로드 완료 후 파일 URL 복사

### 3단계: 코드 수정
`src/App.js`에서 API 호출 부분을 Firebase Storage URL로 변경

```javascript
// 기존 (Bolls Life API)
const response = await fetch(`https://bolls.life/get-text/KRV/${bookNum}/${chapter}/`);

// 변경 (Firebase Storage)
const response = await fetch('https://firebasestorage.googleapis.com/.../개역개정.json');
```

## 방법 2: JSON으로 변환하여 public 폴더에 저장

### 1단계: CSV를 JSON으로 변환
제가 변환 스크립트를 만들어드릴 수 있습니다.

CSV 파일 형식을 알려주시면:
- 열 구조 (책명, 장, 절, 본문 등)
- 파일 위치

변환 스크립트를 작성해드리겠습니다.

### 2단계: JSON 파일을 public 폴더에 저장
```bash
# 변환된 JSON 파일을 public 폴더에 복사
cp 개역개정.json public/bible/
```

### 3단계: 코드에서 사용
```javascript
const response = await fetch('/bible/개역개정.json');
const bibleData = await response.json();
```

## 방법 3: Firestore에 저장 (빠른 검색 필요 시)

### 장점
- 책/장/절별 빠른 검색
- 실시간 동기화
- 쿼리 기능

### 단점
- 업로드 시간 소요
- Firestore 읽기 횟수 제한

## 🤔 어떤 방법을 선택할까?

| 방법 | 장점 | 단점 | 추천 |
|------|------|------|------|
| Firebase Storage | 간단, 비용 저렴 | 전체 다운로드 필요 | ⭐⭐⭐⭐⭐ |
| Public 폴더 | 가장 간단 | 배포 시마다 포함 | ⭐⭐⭐⭐ |
| Firestore | 빠른 검색 | 비용 높음 | ⭐⭐ |

## 📋 다음 단계

1. CSV 파일을 보내주시면 JSON으로 변환해드리겠습니다
2. 또는 CSV 형식(열 구조)을 알려주시면 변환 스크립트를 만들어드리겠습니다
3. 변환 후 원하는 방법으로 업로드하면 됩니다!
