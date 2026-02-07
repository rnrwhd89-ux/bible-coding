# Bible App - Claude Code 프로젝트 가이드

## 프로젝트 개요
성경 읽기/학습 웹앱. 성경 읽기, 하이라이트, 메모, AI 질문, 채팅방, 읽기표 기능 포함.

## 라이브 URL
https://bible-app-29a53.web.app

## 기술 스택
- **프론트엔드**: React 18 + Tailwind CSS (CDN)
- **백엔드**: Firebase (Auth, Firestore, Hosting)
- **AI**: Groq API (성경 Q&A 챗봇)
- **성경 API**: Bolls Life API (KRV, NIV), Firestore (개역개정)

## 프로젝트 구조
```
바이브코딩/
├── bible-app/              # 메인 React 앱
│   ├── src/
│   │   ├── App.js          # 메인 컴포넌트 (~2020줄) - 거의 모든 로직 여기
│   │   ├── firebase.js     # Firebase 설정 & API
│   │   ├── MultiChat.js    # 채팅방 컴포넌트
│   │   └── index.js        # React 엔트리
│   ├── public/index.html   # Tailwind CDN 포함
│   ├── firebase.json       # Firebase Hosting 설정
│   ├── firestore.rules     # Firestore 보안 규칙
│   └── package.json
├── bible.csv               # 성경 데이터 (4.8MB)
├── upload-*.js             # Firestore 업로드 유틸리티
├── serviceAccountKey.json  # Firebase Admin 키
└── CLAUDE.md               # 이 파일
```

## 핵심 파일
- `bible-app/src/App.js` - **가장 중요**. 4개 탭(성경, AI, 메모, 읽기표) 전부 여기
- `bible-app/src/firebase.js` - Firebase 설정, 인증, Firestore CRUD
- `bible-app/src/MultiChat.js` - 채팅방 기능

## 앱 구조 (4개 탭)
1. **성경 탭**: 책/장 선택, 번역(개역개정/NIV/개역한글), 절 선택, 하이라이트(5색), 메모
2. **AI 탭**: Groq API 기반 성경 Q&A 챗봇, 채팅방
3. **메모 탭**: 절별 메모 목록, 미리보기
4. **읽기표 탭**: 66권 읽기 진도 추적, 진행률 바

## Firebase 설정
- **프로젝트 ID**: bible-app-29a53
- **인증**: Google 로그인
- **Firestore 컬렉션**: `/bible`, `/users/{uid}`, `/chatRooms/{id}/messages`
- **설정값은 firebase.js에 하드코딩**됨 (.env 불필요)

## 데이터 저장 전략
- **로컬 우선**: localStorage에 저장 (오프라인 동작)
- **클라우드 동기화**: 로그인 시 Firestore와 싱크
- **localStorage 키**: `bible_highlights`, `bible_notes`, `bible_reading_plan`, `bible_chat_rooms`, `groq_api_key`

## 개발 명령어
```bash
cd bible-app
npm install          # 의존성 설치
npm start            # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run deploy       # 빌드 + Firebase 배포
```

## 배포
```bash
cd bible-app
npm run deploy       # 자동으로 build + firebase deploy
```

## 최근 수정 이력 (2025.02)
1. 개역개정 번역 Firestore 연동
2. 절 클릭 시 흰 페이지 이동 버그 수정 (BUG #5)
3. QA 테스팅 후 크리티컬 버그 수정
4. 메모 형식 호환성 처리 (객체/문자열)
5. 읽기표 레이아웃 수정 (min-h-0)

## 코딩 컨벤션
- 한국어 주석 사용
- 커밋 메시지: 영어 (Fix/Add/Update 시작)
- Tailwind CSS 유틸리티 클래스 사용
- React Hooks 패턴 (useState, useEffect, useCallback)
- 모든 상태/로직이 App.js에 집중됨 (단일 파일 아키텍처)

## 주의사항
- App.js가 2000줄+ 이므로 수정 시 정확한 위치 확인 필요
- Groq API 키는 사용자가 직접 입력 (localStorage 저장)
- 모바일 터치 제스처 지원 (탭, 드래그, 멀티셀렉트)
- serviceAccountKey.json은 절대 GitHub에 올리면 안 됨 (이미 .gitignore에 포함)
