# Firebase 설정 가이드

## 📋 준비물
- 구글 계정

## 🔥 Firebase 프로젝트 생성

### 1단계: Firebase 콘솔 접속
1. https://console.firebase.google.com 접속
2. 구글 계정으로 로그인

### 2단계: 새 프로젝트 만들기
1. "프로젝트 추가" 클릭
2. 프로젝트 이름 입력 (예: `bible-app-12345`)
3. Google Analytics 설정 (선택사항 - 끄거나 켜도 됨)
4. "프로젝트 만들기" 클릭
5. 완료되면 "계속" 클릭

### 3단계: 웹 앱 추가
1. 프로젝트 대시보드에서 웹 아이콘 `</>` 클릭
2. 앱 닉네임 입력 (예: `bible-web`)
3. ✅ "Firebase 호스팅 설정" 체크
4. "앱 등록" 클릭
5. **중요!** 표시되는 `firebaseConfig` 정보 복사해두기

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bible-app-12345.firebaseapp.com",
  projectId: "bible-app-12345",
  storageBucket: "bible-app-12345.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

### 4단계: Firebase 설정 파일 수정
1. `src/firebase.js` 파일 열기
2. `firebaseConfig` 부분을 복사한 값으로 교체

## 🔐 인증 설정

### Google 로그인 활성화
1. Firebase 콘솔 좌측 메뉴 → "Authentication"
2. "시작하기" 클릭
3. "Sign-in method" 탭
4. "Google" 선택
5. "사용 설정" 토글 ON
6. 프로젝트 공개용 이름 입력
7. 지원 이메일 선택
8. "저장"

### 승인된 도메인 추가
1. Authentication → Settings → 승인된 도메인
2. `localhost` 는 기본으로 추가되어 있음
3. 배포 후 도메인 추가 필요 (예: `your-app.web.app`)

## 📊 Firestore 데이터베이스 설정

### 데이터베이스 생성
1. Firebase 콘솔 좌측 메뉴 → "Firestore Database"
2. "데이터베이스 만들기" 클릭
3. **프로덕션 모드로 시작** 선택 (보안 규칙 설정 필요)
4. 위치 선택: `asia-northeast3 (서울)` 권장
5. "사용 설정" 클릭

### 보안 규칙 설정
1. Firestore → 규칙 탭
2. 아래 규칙으로 교체:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. "게시" 클릭

## 🌐 Firebase Hosting 설정 (배포)

### 터미널에서 설정
```bash
# 1. Firebase CLI 설치 (최초 1회)
npm install -g firebase-tools

# 2. Firebase 로그인
firebase login

# 3. 프로젝트 폴더에서 초기화
cd /Users/kkuk/Desktop/바이브코딩/bible-app
firebase init hosting

# 4. 설정 선택:
#    - Use an existing project → 위에서 만든 프로젝트 선택
#    - Public directory: build
#    - Single-page app: Yes
#    - GitHub deploy: No (선택사항)

# 5. 빌드
npm run build

# 6. 배포
firebase deploy --only hosting
```

### 배포 완료 후
- URL이 표시됨: `https://your-project-id.web.app`
- 이 URL로 어디서든 앱 접속 가능!

## 💾 패키지 설치

```bash
cd /Users/kkuk/Desktop/바이브코딩/bible-app
npm install firebase
```

## 💰 비용 안내

### 무료 사용량 (Spark 요금제)
- **Authentication**: 월 50,000 인증 (충분!)
- **Firestore**:
  - 저장: 1GB
  - 읽기: 일 50,000회
  - 쓰기: 일 20,000회
- **Hosting**:
  - 저장: 10GB
  - 전송: 월 360MB/일

### 개인 사용 시
- 1인 사용자가 매일 사용해도 무료 한도 내
- 가족/친구 몇 명이 사용해도 충분히 무료

## ✅ 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] 웹 앱 등록 및 config 복사
- [ ] `src/firebase.js`에 config 붙여넣기
- [ ] Authentication에서 Google 로그인 활성화
- [ ] Firestore Database 생성
- [ ] Firestore 보안 규칙 설정
- [ ] `npm install firebase` 실행
- [ ] 앱에서 로그인 테스트
- [ ] Firebase Hosting으로 배포

## 🆘 문제 해결

### "Firebase App named '[DEFAULT]' already exists" 오류
- 브라우저 새로고침

### 로그인 팝업이 안 열림
- 팝업 차단 해제 필요
- Chrome 설정 → 개인정보 → 팝업 차단 확인

### "Permission denied" 오류
- Firestore 보안 규칙 확인
- 로그인 상태 확인

### CORS 오류
- 승인된 도메인에 현재 도메인 추가
