import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { bookNameToAbbr } from './constants';

const firebaseConfig = {
  apiKey: 'AIzaSyAaHn4IQSng6gx06SFEJ1Ald7xlO74rOV8',
  authDomain: 'bible-app-29a53.firebaseapp.com',
  projectId: 'bible-app-29a53',
  storageBucket: 'bible-app-29a53.firebasestorage.app',
  messagingSenderId: '433486691173',
  appId: '1:433486691173:web:23ddb092cfc764f393bf8c',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 성경 데이터 (개역개정 - Firestore)
export const getBibleVerses = async (bookName, chapterNum) => {
  const abbr = bookNameToAbbr[bookName] || bookName;
  const q = query(
    collection(db, 'bible'),
    where('book', '==', abbr),
    where('chapter', '==', chapterNum),
    orderBy('verse', 'asc')
  );
  const snapshot = await getDocs(q);
  const verses = {};
  snapshot.docs.forEach((d) => {
    const data = d.data();
    verses[data.verse] = data.text;
  });
  return verses;
};
