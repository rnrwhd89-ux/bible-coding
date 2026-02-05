# 🚀 GitHub 업로드 가이드

다른 컴퓨터에서도 개발하려면 GitHub에 코드를 올려야 합니다!

## 1단계: Git 사용자 정보 설정

터미널에서 다음 명령어 실행:

```bash
git config --global user.name "내이름"
git config --global user.email "내이메일@example.com"
```

## 2단계: GitHub 저장소 생성

1. https://github.com 접속 및 로그인
2. 우측 상단 **+** 버튼 → **New repository** 클릭
3. Repository name: `bible-app` 입력
4. Private 또는 Public 선택
5. **Create repository** 클릭

## 3단계: 로컬 코드를 GitHub에 업로드

터미널에서 다음 명령어 실행:

```bash
cd /Users/kkuk/Desktop/바이브코딩/bible-app

# 이미 git init은 완료됨

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit: 바이브 성경 앱"

# GitHub 저장소 연결 (YOUR-USERNAME을 본인 GitHub 아이디로 변경)
git remote add origin https://github.com/YOUR-USERNAME/bible-app.git

# 업로드
git branch -M main
git push -u origin main
```

## 4단계: 다른 컴퓨터에서 개발하기

### 처음 시작할 때
```bash
# 저장소 복제
git clone https://github.com/YOUR-USERNAME/bible-app.git
cd bible-app

# 패키지 설치
npm install

# Firebase 로그인
npx firebase login

# 개발 서버 실행
npm start
```

### 최신 코드 가져오기
```bash
git pull origin main
```

### 변경사항 업로드
```bash
git add .
git commit -m "변경 내용 설명"
git push origin main
```

## 🔐 민감 정보 보호

Firebase API 키가 코드에 포함되어 있는데, 걱정하지 마세요!
- Firebase API 키는 공개되어도 안전합니다
- Firestore 보안 규칙으로 데이터를 보호합니다
- 실제 위험한 정보는 Firebase 콘솔에만 있습니다

## 📱 협업하기

다른 사람과 함께 개발하려면:

1. GitHub 저장소 → **Settings** → **Collaborators**
2. 협업자 이메일 추가
3. 협업자도 위 4단계 따라하면 됨!

## ⚡ 빠른 명령어 요약

```bash
# 로컬 변경사항 확인
git status

# 변경사항 저장
git add .
git commit -m "메시지"
git push

# 최신 코드 가져오기
git pull

# 배포
npm run deploy
```

## 🎯 완료!

이제 어디서든 개발 가능합니다! 🚀
