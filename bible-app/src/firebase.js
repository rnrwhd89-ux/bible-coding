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
