// Firebase 설정 파일
// 아래 설정값들은 Firebase 콘솔에서 가져와야 합니다.

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  where
} from 'firebase/firestore';

// Firebase 설정값
const firebaseConfig = {
  apiKey: "AIzaSyAaHn4IQSng6gx06SFEJ1Ald7xlO74rOV8",
  authDomain: "bible-app-29a53.firebaseapp.com",
  projectId: "bible-app-29a53",
  storageBucket: "bible-app-29a53.firebasestorage.app",
  messagingSenderId: "433486691173",
  appId: "1:433486691173:web:23ddb092cfc764f393bf8c"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// 구글 로그인
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google 로그인 오류:', error);
    throw error;
  }
};

// 로그아웃
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('로그아웃 오류:', error);
    throw error;
  }
};

// 사용자 데이터 저장
export const saveUserData = async (userId, data) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('데이터 저장 오류:', error);
    throw error;
  }
};

// 사용자 데이터 불러오기
export const loadUserData = async (userId) => {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('데이터 불러오기 오류:', error);
    throw error;
  }
};

// 실시간 데이터 동기화 리스너
export const subscribeToUserData = (userId, callback) => {
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

// 인증 상태 변경 리스너
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// ===== 성경 데이터 기능 =====

// 책 이름 → CSV 약어 매핑 (Firestore에 저장된 약어와 매칭)
const bookNameToAbbr = {
  '창세기': '창', '출애굽기': '출', '레위기': '레', '민수기': '민', '신명기': '신',
  '여호수아': '수', '사사기': '삿', '룻기': '룻', '사무엘상': '삼상', '사무엘하': '삼하',
  '열왕기상': '왕상', '열왕기하': '왕하', '역대상': '대상', '역대하': '대하',
  '에스라': '스', '느헤미야': '느', '에스더': '에', '욥기': '욥', '시편': '시',
  '잠언': '잠', '전도서': '전', '아가': '아', '이사야': '사', '예레미야': '렘',
  '예레미야애가': '애', '에스겔': '겔', '다니엘': '단', '호세아': '호', '요엘': '욜',
  '아모스': '암', '오바댜': '옵', '요나': '욘', '미가': '미', '나훔': '나',
  '하박국': '합', '스바냐': '습', '학개': '학', '스가랴': '슥', '말라기': '말',
  '마태복음': '마', '마가복음': '막', '누가복음': '눅', '요한복음': '요',
  '사도행전': '행', '로마서': '롬', '고린도전서': '고전', '고린도후서': '고후',
  '갈라디아서': '갈', '에베소서': '엡', '빌립보서': '빌', '골로새서': '골',
  '데살로니가전서': '살전', '데살로니가후서': '살후', '디모데전서': '딤전', '디모데후서': '딤후',
  '디도서': '딛', '빌레몬서': '몬', '히브리서': '히', '야고보서': '약',
  '베드로전서': '벧전', '베드로후서': '벧후', '요한일서': '요일', '요한이서': '요이',
  '요한삼서': '요삼', '유다서': '유', '요한계시록': '계'
};

// 성경 데이터 가져오기 (책, 장, 번역본)
export const getBibleVerses = async (bookName, chapterNum) => {
  try {
    // 풀네임을 CSV 약어로 변환
    const abbr = bookNameToAbbr[bookName] || bookName;
    const q = query(
      collection(db, 'bible'),
      where('book', '==', abbr),
      where('chapter', '==', chapterNum),
      orderBy('verse', 'asc')
    );
    const querySnapshot = await getDocs(q);
    const verses = {};
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      verses[data.verse] = data.text;
    });
    return verses;
  } catch (error) {
    console.error('성경 데이터 불러오기 오류:', error);
    throw error;
  }
};

// ===== 멀티챗 기능 =====

// 채팅방 생성
export const createChatRoom = async (roomName, creatorId, creatorName) => {
  try {
    const chatRoomRef = await addDoc(collection(db, 'chatRooms'), {
      name: roomName,
      creatorId: creatorId,
      creatorName: creatorName,
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageAt: serverTimestamp(),
      participantCount: 1
    });
    return chatRoomRef.id;
  } catch (error) {
    console.error('채팅방 생성 오류:', error);
    throw error;
  }
};

// 채팅방 목록 가져오기
export const getChatRooms = async () => {
  try {
    const q = query(
      collection(db, 'chatRooms'),
      orderBy('lastMessageAt', 'desc'),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('채팅방 목록 불러오기 오류:', error);
    throw error;
  }
};

// 채팅방 목록 실시간 구독
export const subscribeToChatRooms = (callback) => {
  const q = query(
    collection(db, 'chatRooms'),
    orderBy('lastMessageAt', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(rooms);
  });
};

// 메시지 전송
export const sendMessage = async (roomId, userId, userName, message) => {
  try {
    // 메시지 추가
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), {
      userId: userId,
      userName: userName,
      message: message,
      createdAt: serverTimestamp()
    });

    // 채팅방의 마지막 메시지 업데이트
    await setDoc(doc(db, 'chatRooms', roomId), {
      lastMessage: message,
      lastMessageAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('메시지 전송 오류:', error);
    throw error;
  }
};

// 메시지 목록 실시간 구독
export const subscribeToMessages = (roomId, callback) => {
  const q = query(
    collection(db, 'chatRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};
