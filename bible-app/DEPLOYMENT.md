# 바이브 앱 배포 가이드

이 문서는 바이브 앱을 Firebase Hosting에 배포하여 핸드폰에서 테스트할 수 있도록 하는 방법을 설명합니다.

## 사전 준비

Firebase CLI와 프로젝트 설정이 이미 완료되어 있습니다:
- ✅ Firebase CLI 설치 완료 (firebase-tools)
- ✅ Firebase 프로젝트 설정 완료 (.firebaserc, firebase.json)
- ✅ 프로덕션 빌드 생성 완료 (build 폴더)

## 배포 방법

### 1단계: Firebase 로그인

터미널에서 다음 명령어를 실행하여 Firebase에 로그인하세요:

```bash
cd bible-app
npx firebase login
```

브라우저가 열리면서 Google 계정으로 로그인하게 됩니다.

### 2단계: 배포 실행

로그인이 완료되면 다음 명령어로 배포하세요:

```bash
npm run deploy
```

또는 개별 명령어로:

```bash
npm run build
npx firebase deploy
```

### 3단계: 배포 완료

배포가 완료되면 다음과 같은 URL이 표시됩니다:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/bible-app-29a53/overview
Hosting URL: https://bible-app-29a53.web.app
```

## 핸드폰에서 테스트

배포 완료 후 표시된 URL을 핸드폰 브라우저에서 열면 앱을 테스트할 수 있습니다.

예상 URL: **https://bible-app-29a53.web.app**

### PWA (Progressive Web App) 설치

1. 핸드폰 브라우저(Chrome, Safari 등)에서 앱 접속
2. 브라우저 메뉴에서 "홈 화면에 추가" 선택
3. 네이티브 앱처럼 사용 가능

## Firebase 콘솔 확인

Firebase 콘솔에서 배포 상태와 사용 통계를 확인할 수 있습니다:

https://console.firebase.google.com/project/bible-app-29a53/hosting

## 문제 해결

### 로그인 오류
```bash
npx firebase login --reauth
```

### 배포 오류
```bash
npx firebase deploy --debug
```

### 빌드 다시 생성
```bash
npm run build
```

## 추가 설정

### Firestore 보안 규칙

Firebase 콘솔에서 Firestore 보안 규칙을 설정해야 합니다:

1. Firebase 콘솔 접속: https://console.firebase.google.com/project/bible-app-29a53
2. Firestore Database 선택
3. Rules 탭 선택
4. 다음 규칙 추가:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 데이터
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 채팅방 목록 (로그인한 사용자 누구나 읽기 가능)
    match /chatRooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;

      // 채팅방 내 메시지
      match /messages/{messageId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null;
      }
    }
  }
}
```

### Firebase Authentication 설정

1. Firebase 콘솔 → Authentication
2. Sign-in method 탭
3. Google 로그인 활성화
4. 승인된 도메인에 `bible-app-29a53.web.app` 추가 (자동으로 추가될 수 있음)

## 업데이트 배포

코드 수정 후 다시 배포하려면:

```bash
npm run deploy
```

이 명령어는 자동으로 빌드를 다시 생성하고 배포합니다.
