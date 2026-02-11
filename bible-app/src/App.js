import React, { useState, useEffect, useRef, useCallback } from 'react';

// Firebase 연동
import { auth, signInWithGoogle, logOut, onAuthChange, saveUserData, loadUserData, getBibleVerses } from './firebase';

// Bolls Life API - 개역한글(KRV) + NIV 지원
// API 형식: https://bolls.life/get-text/{번역본}/{책번호}/{장}/
// 번역본: KRV (개역한글), NIV (New International Version)

// 성경 책 목록 (한글명, Bolls API 책 번호, 장 수)
// Bolls API는 1-66 번호 체계 사용 (창세기=1, 요한계시록=66)
const bookList = [
  // 구약
  { name: '창세기', bookNum: 1, chapters: 50 },
  { name: '출애굽기', bookNum: 2, chapters: 40 },
  { name: '레위기', bookNum: 3, chapters: 27 },
  { name: '민수기', bookNum: 4, chapters: 36 },
  { name: '신명기', bookNum: 5, chapters: 34 },
  { name: '여호수아', bookNum: 6, chapters: 24 },
  { name: '사사기', bookNum: 7, chapters: 21 },
  { name: '룻기', bookNum: 8, chapters: 4 },
  { name: '사무엘상', bookNum: 9, chapters: 31 },
  { name: '사무엘하', bookNum: 10, chapters: 24 },
  { name: '열왕기상', bookNum: 11, chapters: 22 },
  { name: '열왕기하', bookNum: 12, chapters: 25 },
  { name: '역대상', bookNum: 13, chapters: 29 },
  { name: '역대하', bookNum: 14, chapters: 36 },
  { name: '에스라', bookNum: 15, chapters: 10 },
  { name: '느헤미야', bookNum: 16, chapters: 13 },
  { name: '에스더', bookNum: 17, chapters: 10 },
  { name: '욥기', bookNum: 18, chapters: 42 },
  { name: '시편', bookNum: 19, chapters: 150 },
  { name: '잠언', bookNum: 20, chapters: 31 },
  { name: '전도서', bookNum: 21, chapters: 12 },
  { name: '아가', bookNum: 22, chapters: 8 },
  { name: '이사야', bookNum: 23, chapters: 66 },
  { name: '예레미야', bookNum: 24, chapters: 52 },
  { name: '예레미야애가', bookNum: 25, chapters: 5 },
  { name: '에스겔', bookNum: 26, chapters: 48 },
  { name: '다니엘', bookNum: 27, chapters: 12 },
  { name: '호세아', bookNum: 28, chapters: 14 },
  { name: '요엘', bookNum: 29, chapters: 3 },
  { name: '아모스', bookNum: 30, chapters: 9 },
  { name: '오바댜', bookNum: 31, chapters: 1 },
  { name: '요나', bookNum: 32, chapters: 4 },
  { name: '미가', bookNum: 33, chapters: 7 },
  { name: '나훔', bookNum: 34, chapters: 3 },
  { name: '하박국', bookNum: 35, chapters: 3 },
  { name: '스바냐', bookNum: 36, chapters: 3 },
  { name: '학개', bookNum: 37, chapters: 2 },
  { name: '스가랴', bookNum: 38, chapters: 14 },
  { name: '말라기', bookNum: 39, chapters: 4 },
  // 신약
  { name: '마태복음', bookNum: 40, chapters: 28 },
  { name: '마가복음', bookNum: 41, chapters: 16 },
  { name: '누가복음', bookNum: 42, chapters: 24 },
  { name: '요한복음', bookNum: 43, chapters: 21 },
  { name: '사도행전', bookNum: 44, chapters: 28 },
  { name: '로마서', bookNum: 45, chapters: 16 },
  { name: '고린도전서', bookNum: 46, chapters: 16 },
  { name: '고린도후서', bookNum: 47, chapters: 13 },
  { name: '갈라디아서', bookNum: 48, chapters: 6 },
  { name: '에베소서', bookNum: 49, chapters: 6 },
  { name: '빌립보서', bookNum: 50, chapters: 4 },
  { name: '골로새서', bookNum: 51, chapters: 4 },
  { name: '데살로니가전서', bookNum: 52, chapters: 5 },
  { name: '데살로니가후서', bookNum: 53, chapters: 3 },
  { name: '디모데전서', bookNum: 54, chapters: 6 },
  { name: '디모데후서', bookNum: 55, chapters: 4 },
  { name: '디도서', bookNum: 56, chapters: 3 },
  { name: '빌레몬서', bookNum: 57, chapters: 1 },
  { name: '히브리서', bookNum: 58, chapters: 13 },
  { name: '야고보서', bookNum: 59, chapters: 5 },
  { name: '베드로전서', bookNum: 60, chapters: 5 },
  { name: '베드로후서', bookNum: 61, chapters: 3 },
  { name: '요한일서', bookNum: 62, chapters: 5 },
  { name: '요한이서', bookNum: 63, chapters: 1 },
  { name: '요한삼서', bookNum: 64, chapters: 1 },
  { name: '유다서', bookNum: 65, chapters: 1 },
  { name: '요한계시록', bookNum: 66, chapters: 22 }
];

const highlightColors = [
  { name: "노랑", color: "#FEF3C7", border: "#F59E0B" },
  { name: "초록", color: "#D1FAE5", border: "#10B981" },
  { name: "파랑", color: "#DBEAFE", border: "#3B82F6" },
  { name: "분홍", color: "#FCE7F3", border: "#EC4899" },
  { name: "보라", color: "#EDE9FE", border: "#8B5CF6" }
];

// 한글 초성 추출 유틸리티
const CHOSUNG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function getChosung(str) {
  return Array.from(str).map(ch => {
    const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return CHOSUNG[Math.floor((code - 0xAC00) / 588)];
    if (code >= 0x3131 && code <= 0x314E) return ch;
    return ch;
  }).join('');
}

// 성경책 약어 맵 (한국 교회 표준 약어)
const bookAbbreviations = {
  '창':'창세기','출':'출애굽기','레':'레위기','민':'민수기','신':'신명기',
  '수':'여호수아','삿':'사사기','룻':'룻기','삼상':'사무엘상','삼하':'사무엘하',
  '왕상':'열왕기상','왕하':'열왕기하','대상':'역대상','대하':'역대하',
  '스':'에스라','느':'느헤미야','에':'에스더','욥':'욥기','시':'시편',
  '잠':'잠언','전':'전도서','아':'아가','사':'이사야','렘':'예레미야',
  '애':'예레미야애가','겔':'에스겔','단':'다니엘','호':'호세아',
  '욜':'요엘','암':'아모스','옵':'오바댜','욘':'요나','미':'미가',
  '나':'나훔','합':'하박국','습':'스바냐','학':'학개','슥':'스가랴','말':'말라기',
  '마':'마태복음','막':'마가복음','눅':'누가복음','요':'요한복음',
  '행':'사도행전','롬':'로마서','고전':'고린도전서','고후':'고린도후서',
  '갈':'갈라디아서','엡':'에베소서','빌':'빌립보서','골':'골로새서',
  '살전':'데살로니가전서','살후':'데살로니가후서','딤전':'디모데전서','딤후':'디모데후서',
  '딛':'디도서','몬':'빌레몬서','히':'히브리서','약':'야고보서',
  '벧전':'베드로전서','벧후':'베드로후서','요일':'요한일서','요이':'요한이서',
  '요삼':'요한삼서','유':'유다서','계':'요한계시록'
};

// 검색 점수 반환: 0=미매칭, 4=약어, 3=부분문자열, 2=초성prefix, 1=혼합매칭
function getSearchScore(bookName, query) {
  if (!query) return 0;
  const q = query.trim();
  if (!q) return 0;
  // 1. 약어 매칭 (최우선)
  if (bookAbbreviations[q] === bookName) return 4;
  // 2. 부분 문자열 매칭
  if (bookName.includes(q)) return 3;
  // 3. 초성 prefix 매칭
  const bookChosung = getChosung(bookName);
  const queryChosung = getChosung(q);
  if (bookChosung.startsWith(queryChosung)) return 2;
  // 4. 혼합 매칭 (학ㄱ → 학개)
  const bookChars = Array.from(bookName);
  const queryChars = Array.from(q);
  let bi = 0, qi = 0;
  while (bi < bookChars.length && qi < queryChars.length) {
    const qc = queryChars[qi];
    const bc = bookChars[bi];
    const qCode = qc.charCodeAt(0);
    if (qCode >= 0x3131 && qCode <= 0x314E) {
      const bcCode = bc.charCodeAt(0);
      if (bcCode >= 0xAC00 && bcCode <= 0xD7A3) {
        if (CHOSUNG[Math.floor((bcCode - 0xAC00) / 588)] === qc) { qi++; bi++; continue; }
      }
      if (bc === qc) { qi++; bi++; continue; }
      return 0;
    } else {
      if (bc === qc) { qi++; bi++; continue; }
      return 0;
    }
  }
  return qi === queryChars.length ? 1 : 0;
}

// 최고 점수 매칭 책 인덱스 찾기
function findBestMatch(bookList, query) {
  let bestIdx = -1, bestScore = 0;
  for (let i = 0; i < bookList.length; i++) {
    const score = getSearchScore(bookList[i].name, query);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  return bestIdx;
}

// 구약/신약 경계 인덱스 (마태복음 = index 39)
const NT_START_INDEX = 39;

export default function BibleApp() {
  const [currentTab, setCurrentTab] = useState('bible');
  const [translation, setTranslation] = useState('개역개정');
  const [book, setBook] = useState('창세기');
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [highlights, setHighlights] = useState({});
  const [notes, setNotes] = useState({});
  const [readingPlan, setReadingPlan] = useState({});
  const [selectedVerses, setSelectedVerses] = useState([]);
  const [showVerseMenu, setShowVerseMenu] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [showNoteDetail, setShowNoteDetail] = useState(false);
  const [selectedNoteKey, setSelectedNoteKey] = useState(null);
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [pickerBook, setPickerBook] = useState('창세기');
  const [pickerChapter, setPickerChapter] = useState(1);
  const bookPickerRef = useRef(null);
  const chapterPickerRef = useRef(null);
  const pickerBookRef = useRef('창세기');
  const pickerChapterRef = useRef(1);
  const pickerScrollingRef = useRef(false);
  const pickerItemHeight = 40;
  const bookScrollSettleTimer = useRef(null);
  // 검색바 (uncontrolled input - 한글 조합 깨짐 방지)
  const searchInputRef = useRef(null);
  // 구약/신약 셀렉터
  const testamentPickerRef = useRef(null);
  const [pickerTestament, setPickerTestament] = useState('구약');
  const pickerTestamentRef = useRef('구약');

  // pickerBook 상태 변경 후 스크롤 위치 복원 (리렌더로 DOM 재생성되므로)
  useEffect(() => {
    if (!showBookDropdown) return;
    const bookIdx = bookList.findIndex(b => b.name === pickerBook);
    if (bookPickerRef.current && bookIdx >= 0) {
      pickerScrollingRef.current = true;
      bookPickerRef.current.scrollTop = bookIdx * pickerItemHeight;
      // 구약/신약 스크롤 위치도 복원
      const testament = bookIdx >= NT_START_INDEX ? '신약' : '구약';
      pickerTestamentRef.current = testament;
      if (testamentPickerRef.current) {
        testamentPickerRef.current.scrollTop = (testament === '신약' ? 1 : 0) * pickerItemHeight;
      }
      // 리렌더 후 검색 input 포커스 복원 (DOM이 재생성되므로)
      requestAnimationFrame(() => {
        if (searchInputRef.current && searchInputRef.current.value) {
          searchInputRef.current.focus();
        }
        setTimeout(() => { pickerScrollingRef.current = false; }, 50);
      });
    }
  }, [pickerBook, showBookDropdown]);

  // 드래그 선택 관련
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartVerse, setDragStartVerse] = useState(null);
  const [dragEndVerse, setDragEndVerse] = useState(null);
  const [dragMoved, setDragMoved] = useState(false);
  const dragStartTimeRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  // 채팅방 관리
  const [chatRooms, setChatRooms] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatLoadingStates, setChatLoadingStates] = useState({});
  const [unreadMessages, setUnreadMessages] = useState({});
  const [attachedVerses, setAttachedVerses] = useState([]); // AI 채팅 말씀 첨부 (탭 간 공유)

  // 데이터 캐시
  const [bibleCache, setBibleCache] = useState({});

  // Firebase 인증 관련 (설정 완료 후 사용)
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [firebaseEnabled, setFirebaseEnabled] = useState(true); // Firebase 설정 완료

  // 현재 책 정보 가져오기
  const currentBook = bookList.find(b => b.name === book) || bookList[0];
  const chapters = Array.from({ length: currentBook.chapters }, (_, i) => i + 1);

  // Firebase 데이터 동기화 함수 (Firebase 설정 완료 후 활성화)
  const syncToCloud = useCallback(async () => {
    if (!firebaseEnabled || !user) return;

    setIsSyncing(true);
    try {
      await saveUserData(user.uid, {
        highlights,
        notes,
        readingPlan,
        chatRooms,
        unreadMessages
      });
      setLastSyncTime(new Date().toISOString());
    } catch (error) {
      console.error('동기화 오류:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [firebaseEnabled, user, highlights, notes, readingPlan, chatRooms, unreadMessages]);

  // 클라우드에서 데이터 불러오기
  const loadFromCloud = useCallback(async () => {
    if (!firebaseEnabled || !user) return;

    try {
      const data = await loadUserData(user.uid);
      if (data) {
        if (data.highlights) setHighlights(data.highlights);
        if (data.notes) setNotes(data.notes);
        if (data.readingPlan) setReadingPlan(data.readingPlan);
        if (data.chatRooms) setChatRooms(data.chatRooms);
        if (data.unreadMessages) setUnreadMessages(data.unreadMessages);
      }
    } catch (error) {
      console.error('데이터 불러오기 오류:', error);
    }
  }, [firebaseEnabled, user]);

  // 로그인 처리
  const handleGoogleLogin = async () => {
    if (!firebaseEnabled) {
      alert('Firebase 설정이 필요합니다. FIREBASE_SETUP.md 파일을 참고하세요.');
      return;
    }

    try {
      const loggedInUser = await signInWithGoogle();
      setUser(loggedInUser);
      setShowLoginModal(false);
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('로그인에 실패했습니다.');
    }
  };

  // 채팅에서 사용할 로그인 핸들러
  const handleGoogleSignIn = handleGoogleLogin;

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await logOut();
      setUser(null);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // Firebase 인증 상태 감지
  useEffect(() => {
    if (!firebaseEnabled) return;

    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadFromCloud();
      }
    });
    return () => unsubscribe();
  }, [firebaseEnabled, loadFromCloud]);

  // 데이터 변경 시 자동 동기화 (디바운스)
  useEffect(() => {
    if (!firebaseEnabled || !user) return;

    const timeoutId = setTimeout(() => {
      syncToCloud();
    }, 2000); // 2초 후 동기화

    return () => clearTimeout(timeoutId);
  }, [firebaseEnabled, user, highlights, notes, readingPlan, chatRooms, syncToCloud]);

  // 성경 데이터 가져오기 (Firestore 또는 Bolls Life API)
  const fetchBibleData = async (bookNum, chapterNum, translationCode, bookName) => {
    const cacheKey = `${translationCode}_${bookNum}_${chapterNum}`;

    // 캐시에 있으면 캐시에서 반환
    if (bibleCache[cacheKey]) {
      return bibleCache[cacheKey];
    }

    // 개역개정이면 Firestore에서 가져오기 (실패 시 KRV API 폴백)
    if (translationCode === 'REVISED') {
      try {
        const verses = await getBibleVerses(bookName, chapterNum);
        // 데이터가 있으면 사용
        if (Object.keys(verses).length > 0) {
          const data = Object.entries(verses).map(([verse, text]) => ({
            pk: `${bookName}_${chapterNum}_${verse}`,
            verse: parseInt(verse),
            text: text
          }));
          setBibleCache(prev => ({ ...prev, [cacheKey]: data }));
          return data;
        }
      } catch (error) {
        console.error('Firestore 로드 실패, KRV API로 폴백:', error);
      }
      // Firestore 실패 또는 빈 결과 → Bolls KRV API로 폴백
      try {
        const fallbackUrl = `https://bolls.life/get-text/KRV/${bookNum}/${chapterNum}/`;
        const response = await fetch(fallbackUrl);
        if (response.ok) {
          const data = await response.json();
          setBibleCache(prev => ({ ...prev, [cacheKey]: data }));
          return data;
        }
      } catch (fallbackError) {
        console.error('KRV 폴백도 실패:', fallbackError);
      }
      throw new Error('성경 데이터를 불러올 수 없습니다.');
    }

    // Bolls Life API: https://bolls.life/get-text/{번역본}/{책번호}/{장}/
    const url = `https://bolls.life/get-text/${translationCode}/${bookNum}/${chapterNum}/`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // 캐시에 저장
      setBibleCache(prev => ({ ...prev, [cacheKey]: data }));
      return data;
    } catch (error) {
      console.error('Failed to fetch bible data:', error);
      throw error;
    }
  };

  // 현재 장의 절들 로드
  useEffect(() => {
    const loadVerses = async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        // 번역본 코드 결정: 개역개정 = REVISED, 개역한글 = KRV, NIV = NIV
        let translationCode = 'KRV';
        if (translation === '개역개정') {
          translationCode = 'REVISED';
        } else if (translation === 'NIV') {
          translationCode = 'NIV';
        }
        const data = await fetchBibleData(currentBook.bookNum, chapter, translationCode, book);

        // Bolls API 응답: [{pk, verse, text}, ...]
        if (data && Array.isArray(data)) {
          const versesObj = {};
          data.forEach((item) => {
            // HTML 태그 제거 (예: <br/>)
            const cleanText = item.text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            versesObj[item.verse] = cleanText;
          });
          setVerses(versesObj);
        } else {
          setVerses({});
        }
      } catch (error) {
        setLoadError('성경 데이터를 불러오는데 실패했습니다.');
        setVerses({});
      } finally {
        setIsLoading(false);
      }
    };

    loadVerses();
  }, [book, chapter, translation, currentBook.bookNum]);

  // Load data from localStorage
  useEffect(() => {
    const savedHighlights = localStorage.getItem('bible_highlights');
    const savedNotes = localStorage.getItem('bible_notes');
    const savedReadingPlan = localStorage.getItem('bible_reading_plan');
    const savedChatRooms = localStorage.getItem('bible_chat_rooms');
    const savedUnreadMessages = localStorage.getItem('bible_unread_messages');
    if (savedHighlights) setHighlights(JSON.parse(savedHighlights));
    if (savedNotes) setNotes(JSON.parse(savedNotes));
    if (savedReadingPlan) setReadingPlan(JSON.parse(savedReadingPlan));
    if (savedChatRooms) setChatRooms(JSON.parse(savedChatRooms));
    if (savedUnreadMessages) setUnreadMessages(JSON.parse(savedUnreadMessages));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('bible_highlights', JSON.stringify(highlights));
  }, [highlights]);

  useEffect(() => {
    localStorage.setItem('bible_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('bible_reading_plan', JSON.stringify(readingPlan));
  }, [readingPlan]);

  useEffect(() => {
    // 이미지 blob URL은 새로고침 후 무효해지므로 null로 치환하여 저장
    const sanitizedRooms = chatRooms.map(room => ({
      ...room,
      messages: room.messages.map(msg => {
        if (msg.images) {
          return { ...msg, images: msg.images.map(img => ({ mimeType: img.mimeType, preview: null })) };
        }
        return msg;
      })
    }));
    localStorage.setItem('bible_chat_rooms', JSON.stringify(sanitizedRooms));
  }, [chatRooms]);

  useEffect(() => {
    localStorage.setItem('bible_unread_messages', JSON.stringify(unreadMessages));
  }, [unreadMessages]);

  // AI 탭 이탈 시 채팅 목록으로 복귀
  useEffect(() => {
    if (currentTab !== 'ai') {
      setCurrentChatId(null);
    }
  }, [currentTab]);

  // 현재 채팅방 열람 시 읽음 처리
  useEffect(() => {
    if (currentChatId && currentTab === 'ai') {
      setUnreadMessages(prev => {
        const updated = { ...prev };
        delete updated[currentChatId];
        return updated;
      });
    }
  }, [currentChatId, currentTab]);

  const getVerseKey = (book, chapter, verse) => `${book}_${chapter}_${verse}`;
  const getChapterKey = (book, chapter) => `${book}_${chapter}`;

  // 현재 채팅방 가져오기
  const currentChat = chatRooms.find(room => room.id === currentChatId);

  // 읽지 않은 메시지 총 개수 계산
  const totalUnreadCount = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  // 특정 절에 연결된 채팅 찾기
  const getChatForVerse = (bookName, chapterNum, verseNum) => {
    const verseRef = `${bookName} ${chapterNum}:${verseNum}`;
    return chatRooms.find(room => {
      // 정확히 해당 절만 선택한 채팅
      if (room.verseRef === verseRef) return true;
      // 범위에 포함된 경우 (예: "창세기 1:1-5")
      const rangeMatch = room.verseRef.match(/(.+) (\d+):(\d+)-(\d+)/);
      if (rangeMatch) {
        const [, roomBook, roomChapter, startV, endV] = rangeMatch;
        if (roomBook === bookName && parseInt(roomChapter) === chapterNum) {
          const start = parseInt(startV);
          const end = parseInt(endV);
          if (verseNum >= start && verseNum <= end) return true;
        }
      }
      return false;
    });
  };

  // 드래그 시작
  const handleDragStart = (verse, e) => {
    // 마우스 이벤트만 기본 동작 방지 (터치는 스크롤 허용)
    if (e.type === 'mousedown') {
      e.preventDefault();
    }
    dragStartTimeRef.current = Date.now();
    // 터치 이벤트는 즉시 드래그 모드로 전환하지 않음 (스크롤 우선)
    if (e.type === 'mousedown') {
      setIsDragging(true);
    }
    setDragStartVerse(verse);
    setDragEndVerse(verse);
    setDragMoved(false);
  };

  // 드래그 중 (마우스/터치 이동)
  const handleDragMove = (verse) => {
    if (isDragging && dragStartVerse !== null) {
      setDragEndVerse(verse);
      // 드래그가 실제로 이동했을 때만 범위 선택
      if (verse !== dragStartVerse) {
        setDragMoved(true);
        const start = Math.min(dragStartVerse, verse);
        const end = Math.max(dragStartVerse, verse);
        const range = [];
        for (let i = start; i <= end; i++) {
          range.push(i);
        }
        setSelectedVerses(range);
        setShowVerseMenu(false);
      }
    }
  };

  // 드래그 종료
  const handleDragEnd = () => {
    // 드래그가 실제로 이동했고 범위 선택된 경우에만 메뉴 표시
    if (dragMoved && selectedVerses.length > 0) {
      setShowVerseMenu(true);
    }

    setIsDragging(false);
    setDragStartVerse(null);
    setDragEndVerse(null);
    setDragMoved(false);
    dragStartTimeRef.current = null;
  };

  // 절 선택/해제 토글 (단일 클릭)
  const handleVersePress = (verse, e) => {
    // Shift+Click: 범위 선택
    if (e?.shiftKey && selectedVerses.length > 0) {
      const lastSelected = selectedVerses[selectedVerses.length - 1];
      const start = Math.min(lastSelected, verse);
      const end = Math.max(lastSelected, verse);
      const rangeVerses = Array.from({ length: end - start + 1 }, (_, i) => start + i);
      setSelectedVerses(rangeVerses);
      setShowVerseMenu(true);
      return;
    }

    // 토글 선택: 클릭할 때마다 개별 구절 추가/제거 (Cmd 키 불필요)
    setSelectedVerses(prev => {
      if (prev.includes(verse)) {
        // 이미 선택된 구절 클릭 → 선택 해제
        const newSelection = prev.filter(v => v !== verse);
        if (newSelection.length === 0) {
          setShowVerseMenu(false);
        } else {
          setShowVerseMenu(true);
        }
        return newSelection;
      } else {
        // 새 구절 클릭 → 기존 선택에 추가
        setShowVerseMenu(true);
        return [...prev, verse].sort((a, b) => a - b);
      }
    });
  };

  // 메모 아이콘 클릭 -> 메모 상세보기 페이지로 이동
  const handleNoteIndicatorClick = (e, verseKey) => {
    e.stopPropagation();
    setSelectedNoteKey(verseKey);
    setShowNoteDetail(true);
    setCurrentTab('notes');
  };

  // 채팅 아이콘 클릭 -> 해당 절 선택하고 메뉴 표시
  const handleChatIndicatorClick = (e, verseNum) => {
    e.stopPropagation();
    setSelectedVerses([verseNum]);
    setShowVerseMenu(true);
  };

  // 기존 메모 열기
  const openExistingNote = (verseKey) => {
    const note = notes[verseKey];
    // 새 형식(객체)과 기존 형식(문자열) 호환 처리
    setNoteText(typeof note === 'object' ? note.content : (note || ''));
    setShowNoteModal(true);
  };

  // 기존 채팅으로 이동
  const goToExistingChat = (chatRoom) => {
    setCurrentChatId(chatRoom.id);
    setShowVerseMenu(false);
    setSelectedVerses([]);
    setCurrentTab('ai');
  };

  // 선택된 절들에 대한 기존 메모 가져오기
  const getExistingNotes = () => {
    return selectedVerses
      .map(v => {
        const key = getVerseKey(book, chapter, v);
        if (!notes[key]) return null;
        const note = notes[key];
        // 새 형식(객체)과 기존 형식(문자열) 호환 처리
        const content = typeof note === 'object' ? note.content : note;
        return { verse: v, key, content };
      })
      .filter(Boolean);
  };

  // 선택된 절들에 대한 기존 채팅 가져오기
  const getExistingChats = () => {
    const chats = [];
    selectedVerses.forEach(v => {
      const chat = getChatForVerse(book, chapter, v);
      if (chat && !chats.find(c => c.id === chat.id)) {
        chats.push(chat);
      }
    });
    return chats;
  };

  // 선택된 절들의 텍스트 가져오기
  const getSelectedVersesText = () => {
    return selectedVerses.map(v => `${v}절: ${verses[v]}`).join('\n');
  };

  // 선택된 절들의 레퍼런스 문자열
  const getSelectedVersesRef = () => {
    if (selectedVerses.length === 0) return '';
    if (selectedVerses.length === 1) return `${book} ${chapter}:${selectedVerses[0]}`;

    const ranges = [];
    let start = selectedVerses[0];
    let end = selectedVerses[0];

    for (let i = 1; i < selectedVerses.length; i++) {
      if (selectedVerses[i] === end + 1) {
        end = selectedVerses[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = selectedVerses[i];
        end = selectedVerses[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);

    return `${book} ${chapter}:${ranges.join(',')}`;
  };

  const handleHighlight = (colorIndex) => {
    selectedVerses.forEach(verse => {
      const key = getVerseKey(book, chapter, verse);
      setHighlights(prev => ({
        ...prev,
        [key]: colorIndex
      }));
    });
    setShowVerseMenu(false);
    setSelectedVerses([]);
  };

  const handleRemoveHighlight = () => {
    selectedVerses.forEach(verse => {
      const key = getVerseKey(book, chapter, verse);
      setHighlights(prev => {
        const newHighlights = { ...prev };
        delete newHighlights[key];
        return newHighlights;
      });
    });
    setShowVerseMenu(false);
    setSelectedVerses([]);
  };

  const handleAddNote = () => {
    setShowVerseMenu(false);
    if (selectedVerses.length === 1) {
      const key = getVerseKey(book, chapter, selectedVerses[0]);
      const note = notes[key];
      if (note && typeof note === 'object') {
        setNoteTitle(note.title || '');
        setNoteText(note.content || '');
      } else if (typeof note === 'string') {
        // 기존 문자열 형식 메모 호환
        setNoteTitle('');
        setNoteText(note);
      } else {
        setNoteTitle('');
        setNoteText('');
      }
    } else {
      setNoteTitle('');
      setNoteText('');
    }
    setShowNoteModal(true);
  };

  const saveNote = () => {
    if (selectedVerses.length > 0) {
      const key = getVerseKey(book, chapter, selectedVerses[0]);
      if (noteText.trim()) {
        const verseRef = getSelectedVersesRef();
        setNotes(prev => ({
          ...prev,
          [key]: {
            title: noteTitle.trim() || verseRef,
            content: noteText,
            verseRef: verseRef
          }
        }));
      } else {
        setNotes(prev => {
          const newNotes = { ...prev };
          delete newNotes[key];
          return newNotes;
        });
      }
    }
    setShowNoteModal(false);
    setSelectedVerses([]);
    setNoteText('');
    setNoteTitle('');
  };

  // 새 채팅방 생성하고 AI 탭으로 이동
  const handleAskAI = () => {
    const versesText = getSelectedVersesText();
    const verseRef = getSelectedVersesRef();

    // 새 채팅방 생성
    const newChatRoom = {
      id: Date.now().toString(),
      title: verseRef,
      verseRef: verseRef,
      versesText: versesText,
      translation: translation,
      createdAt: new Date().toISOString(),
      messages: []
    };

    setChatRooms(prev => [newChatRoom, ...prev]);
    setCurrentChatId(newChatRoom.id);
    setShowVerseMenu(false);
    setSelectedVerses([]);
    setCurrentTab('ai');
  };

  // AI 탭에서 자유 대화 시작
  const handleNewFreeChat = () => {
    const newChatRoom = {
      id: Date.now().toString(),
      title: '새 대화',
      verseRef: '',
      versesText: '',
      translation: translation,
      createdAt: new Date().toISOString(),
      messages: []
    };
    setChatRooms(prev => [newChatRoom, ...prev]);
    setCurrentChatId(newChatRoom.id);
  };

  // 채팅방 삭제
  const deleteChatRoom = (chatId) => {
    setChatRooms(prev => prev.filter(room => room.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(chatRooms.length > 1 ? chatRooms.find(r => r.id !== chatId)?.id : null);
    }
    setUnreadMessages(prev => {
      const updated = { ...prev };
      delete updated[chatId];
      return updated;
    });
  };

  const toggleReadingPlan = (bookName, chapterNum) => {
    const key = getChapterKey(bookName, chapterNum);
    setReadingPlan(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // AI 시스템 프롬프트
  const getAISystemPrompt = (chatRoom) => {
    return `당신은 성경에 대해 깊이 있는 지식을 가진 신뢰할 수 있는 성경 선생님입니다.

## 핵심 원칙
1. **팩트체크 우선**: 답변하기 전에 반드시 성경적 정확성을 확인하세요.
2. **근거 제시**: 모든 주장에는 성경 구절이나 신뢰할 수 있는 출처를 명시하세요.
3. **겸손한 태도**: 확실하지 않은 부분은 솔직히 인정하세요.

## 답변 형식
답변할 때 다음 구조를 따라주세요:

### 답변
[질문에 대한 명확하고 이해하기 쉬운 답변]

### 성경적 근거
- [관련 성경 구절 1] - 간단한 설명
- [관련 성경 구절 2] - 간단한 설명

### 참고 배경
- 역사적/문화적 맥락 (해당되는 경우)
- 원어(히브리어/그리스어) 의미 (해당되는 경우)

### 유의사항
[해석의 다양성이나 주의할 점이 있다면 언급]

---

${chatRoom.verseRef
  ? `현재 사용자가 선택한 말씀: ${chatRoom.verseRef} (${chatRoom.translation})\n${chatRoom.versesText}`
  : '사용자가 특정 말씀을 선택하지 않고 자유 대화를 시작했습니다. 성경 전반에 대한 질문에 답해주세요.'}

답변은 한국어로 해주시고, 따뜻하면서도 신뢰할 수 있는 톤으로 대화해주세요.
불확실한 해석이나 논쟁이 있는 부분은 여러 관점을 균형 있게 제시해주세요.`;
  };

  const sendMessage = async (message, chatId, attachments = null) => {
    if (!message.trim() && !attachments) return;
    if (chatLoadingStates[chatId]) return;

    const chatRoom = chatRooms.find(r => r.id === chatId);
    if (!chatRoom) return;

    // 사용자 메시지 객체 생성
    const userMessage = { role: 'user', content: message };
    if (attachments?.images?.length > 0) {
      userMessage.images = attachments.images.map(img => ({ mimeType: img.mimeType, preview: img.preview }));
    }
    if (attachments?.verses?.length > 0) {
      userMessage.attachedVerses = attachments.verses;
    }

    const updatedMessages = [...chatRoom.messages, userMessage];
    setChatRooms(prev => prev.map(room =>
      room.id === chatId ? { ...room, messages: updatedMessages } : room
    ));

    setChatLoadingStates(prev => ({ ...prev, [chatId]: true }));

    try {
      const GEMINI_API_KEY = localStorage.getItem('gemini_api_key');

      if (!GEMINI_API_KEY) {
        setChatRooms(prev => prev.map(room =>
          room.id === chatId
            ? { ...room, messages: [...updatedMessages, {
                role: 'assistant',
                content: `🔑 AI 기능을 사용하려면 Gemini API 키가 필요합니다.

**무료로 API 키 받는 방법:**
1. https://aistudio.google.com/apikey 접속
2. 구글 계정으로 로그인
3. "Create API Key" 버튼 클릭
4. 아래 설정 버튼을 눌러 API 키 입력

API 키를 받으면 무료로 AI 질문 기능을 사용할 수 있습니다!`
              }] }
            : room
        ));
        setChatLoadingStates(prev => ({ ...prev, [chatId]: false }));
        return;
      }

      // Gemini API 요청 형식으로 변환
      const geminiContents = [];
      const systemPrompt = getAISystemPrompt(chatRoom);

      // 대화 히스토리를 Gemini 형식으로 변환 (멀티모달 지원)
      for (let i = 0; i < updatedMessages.length; i++) {
        const m = updatedMessages[i];
        const parts = [];

        // 첨부된 말씀 텍스트를 content 앞에 추가
        let textContent = m.content;
        if (m.attachedVerses?.length > 0) {
          const verseContext = m.attachedVerses.map(v =>
            `[첨부된 말씀: ${v.verseRef} (${v.translation})]\n${Object.entries(v.verses).map(([num, text]) => `${num}절: ${text}`).join('\n')}`
          ).join('\n\n');
          textContent = verseContext + (textContent ? '\n\n' + textContent : '');
        }
        parts.push({ text: textContent || '(이미지)' });

        // 마지막 사용자 메시지에 이미지 첨부 (base64는 attachments에서 직접 가져옴)
        if (i === updatedMessages.length - 1 && m.role === 'user' && attachments?.images?.length > 0) {
          for (const img of attachments.images) {
            parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
          }
        }

        geminiContents.push({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: parts
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 2000
          }
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'API 오류');
      }

      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '죄송합니다. 응답을 가져오는 중 문제가 발생했습니다.';

      setChatRooms(prev => prev.map(room =>
        room.id === chatId
          ? { ...room, messages: [...updatedMessages, { role: 'assistant', content: aiResponse }] }
          : room
      ));

      if (chatId !== currentChatId || currentTab !== 'ai') {
        setUnreadMessages(prev => ({
          ...prev,
          [chatId]: (prev[chatId] || 0) + 1
        }));
      }
    } catch (error) {
      console.error('AI Error:', error);
      setChatRooms(prev => prev.map(room =>
        room.id === chatId
          ? { ...room, messages: [...updatedMessages, { role: 'assistant', content: `죄송합니다. 오류가 발생했습니다: ${error.message}\n\n다시 시도해주세요.` }] }
          : room
      ));
    }

    setChatLoadingStates(prev => ({ ...prev, [chatId]: false }));
  };

  const closeVerseMenu = () => {
    setShowVerseMenu(false);
    setSelectedVerses([]);
  };

  // Tab Components
  const BibleTab = () => (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0, height: '100%' }}>
      {/* Navigation Header */}
      <div className="bg-gradient-to-r from-amber-800 to-amber-900 text-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => {
                pickerBookRef.current = book;
                pickerChapterRef.current = chapter;
                setPickerBook(book);
                setPickerChapter(chapter);
                if (searchInputRef.current) searchInputRef.current.value = '';
                const currentBookIdx = bookList.findIndex(b => b.name === book);
                const initialTestament = currentBookIdx >= NT_START_INDEX ? '신약' : '구약';
                setPickerTestament(initialTestament);
                pickerTestamentRef.current = initialTestament;
                setShowBookDropdown(!showBookDropdown);
                // 열릴 때 스크롤 위치 설정
                setTimeout(() => {
                  const bookIdx = bookList.findIndex(b => b.name === book);
                  if (bookPickerRef.current && bookIdx >= 0) {
                    bookPickerRef.current.scrollTop = bookIdx * pickerItemHeight;
                  }
                  if (chapterPickerRef.current) {
                    chapterPickerRef.current.scrollTop = (chapter - 1) * pickerItemHeight;
                  }
                  if (testamentPickerRef.current) {
                    testamentPickerRef.current.scrollTop = (initialTestament === '신약' ? 1 : 0) * pickerItemHeight;
                  }
                  if (searchInputRef.current) searchInputRef.current.focus();
                }, 50);
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-all"
            >
              <span className="font-semibold">{book} {chapter}장</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 휠 피커 드롭다운 */}
            {showBookDropdown && (() => {
              const pickerBookData = bookList.find(b => b.name === pickerBook) || bookList[0];
              const pickerChapters = Array.from({ length: pickerBookData.chapters }, (_, i) => i + 1);
              const ITEM_H = pickerItemHeight;
              const VISIBLE = 5;
              const CENTER = Math.floor(VISIBLE / 2);
              return (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden" style={{ width: '340px', animation: 'pickerFadeIn 0.2s ease-out' }}>
                  {/* 검색바 */}
                  <div className="px-3 pt-3 pb-1">
                    <div className="relative">
                      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="검색 후 Enter (예: 로마, 창세기)"
                        defaultValue=""
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter 무시
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = searchInputRef.current?.value;
                            if (!val || !val.trim()) return;
                            const matchIdx = findBestMatch(bookList, val);
                            if (matchIdx >= 0 && bookPickerRef.current) {
                              pickerScrollingRef.current = true;
                              const targetBook = bookList[matchIdx].name;
                              pickerBookRef.current = targetBook;
                              pickerChapterRef.current = 1;
                              bookPickerRef.current.scrollTo({ top: matchIdx * ITEM_H, behavior: 'smooth' });
                              if (chapterPickerRef.current) chapterPickerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                              const newTestament = matchIdx >= NT_START_INDEX ? '신약' : '구약';
                              pickerTestamentRef.current = newTestament;
                              setPickerTestament(newTestament);
                              if (testamentPickerRef.current) testamentPickerRef.current.scrollTo({ top: (newTestament === '신약' ? 1 : 0) * ITEM_H, behavior: 'smooth' });
                              setTimeout(() => { setPickerBook(targetBook); }, 50);
                              setTimeout(() => { pickerScrollingRef.current = false; }, 350);
                            }
                          }
                        }}
                        className="w-full pl-8 pr-3 py-1.5 text-xs text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 bg-gray-50"
                      />
                    </div>
                  </div>
                  {/* 피커 영역 */}
                  <div className="flex relative" style={{ height: `${ITEM_H * VISIBLE}px` }}>
                    {/* 중앙 하이라이트 바 */}
                    <div className="absolute left-2 right-2 rounded-lg bg-amber-50 border border-amber-200/40 pointer-events-none" style={{ top: `${ITEM_H * CENTER}px`, height: `${ITEM_H}px` }} />
                    {/* 상하 페이드 */}
                    <div className="absolute left-0 right-0 top-0 pointer-events-none z-10" style={{ height: `${ITEM_H * 1.5}px`, background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(255,255,255,0))' }} />
                    <div className="absolute left-0 right-0 bottom-0 pointer-events-none z-10" style={{ height: `${ITEM_H * 1.5}px`, background: 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0))' }} />

                    {/* 구약/신약 피커 */}
                    <div
                      ref={testamentPickerRef}
                      className="w-14 overflow-y-auto relative picker-scroll"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                      onScroll={(e) => {
                        const el = e.target;
                        clearTimeout(el._scrollTimer);
                        el._scrollTimer = setTimeout(() => {
                          const idx = Math.round(el.scrollTop / ITEM_H);
                          const clamped = Math.max(0, Math.min(idx, 1));
                          el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
                          const newT = clamped === 0 ? '구약' : '신약';
                          if (newT !== pickerTestamentRef.current) {
                            pickerTestamentRef.current = newT;
                            setPickerTestament(newT);
                            const targetIdx = newT === '신약' ? NT_START_INDEX : 0;
                            if (bookPickerRef.current) {
                              pickerScrollingRef.current = true;
                              pickerBookRef.current = bookList[targetIdx].name;
                              pickerChapterRef.current = 1;
                              bookPickerRef.current.scrollTo({ top: targetIdx * ITEM_H, behavior: 'smooth' });
                              if (chapterPickerRef.current) chapterPickerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                              setPickerBook(bookList[targetIdx].name);
                              setTimeout(() => { pickerScrollingRef.current = false; }, 400);
                            }
                          }
                        }, 150);
                      }}
                    >
                      <div style={{ height: `${ITEM_H * CENTER}px` }} />
                      {['구약', '신약'].map((t, i) => (
                        <div
                          key={t}
                          className="flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ height: `${ITEM_H}px` }}
                          onClick={() => {
                            const targetIdx = t === '신약' ? NT_START_INDEX : 0;
                            pickerTestamentRef.current = t;
                            setPickerTestament(t);
                            if (testamentPickerRef.current) testamentPickerRef.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                            if (bookPickerRef.current) {
                              pickerScrollingRef.current = true;
                              pickerBookRef.current = bookList[targetIdx].name;
                              pickerChapterRef.current = 1;
                              bookPickerRef.current.scrollTo({ top: targetIdx * ITEM_H, behavior: 'smooth' });
                              if (chapterPickerRef.current) chapterPickerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                              setPickerBook(bookList[targetIdx].name);
                              setTimeout(() => { pickerScrollingRef.current = false; }, 400);
                            }
                          }}
                        >
                          <span className={`transition-all duration-150 ${pickerTestament === t ? 'text-gray-900 font-bold text-xs' : 'text-gray-400 text-xs'}`}>
                            {t}
                          </span>
                        </div>
                      ))}
                      <div style={{ height: `${ITEM_H * CENTER}px` }} />
                    </div>

                    {/* 구분선 */}
                    <div className="w-px bg-gray-200 my-3" />

                    {/* 책 피커 */}
                    <div
                      ref={bookPickerRef}
                      className="flex-1 overflow-y-auto relative picker-scroll"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                      onScroll={(e) => {
                        if (pickerScrollingRef.current) return;
                        const el = e.target;
                        // 스크롤 중 실시간으로 중앙 아이템 표시 업데이트 (DOM 직접 조작)
                        const liveIdx = Math.round(el.scrollTop / ITEM_H);
                        const liveClamped = Math.max(0, Math.min(liveIdx, bookList.length - 1));
                        const liveName = bookList[liveClamped].name;
                        pickerBookRef.current = liveName;
                        el.querySelectorAll('[data-book]').forEach(node => {
                          const span = node.querySelector('span');
                          if (!span) return;
                          if (node.dataset.book === liveName) {
                            span.className = 'transition-all duration-150 text-gray-900 font-bold text-sm';
                          } else {
                            span.className = 'transition-all duration-150 text-gray-400 text-xs';
                          }
                        });
                        // 구약/신약 자동 동기화 (실시간)
                        const liveTestament = liveClamped >= NT_START_INDEX ? '신약' : '구약';
                        if (liveTestament !== pickerTestamentRef.current) {
                          pickerTestamentRef.current = liveTestament;
                          if (testamentPickerRef.current) {
                            testamentPickerRef.current.scrollTo({ top: (liveTestament === '신약' ? 1 : 0) * ITEM_H, behavior: 'smooth' });
                          }
                        }
                        // 스크롤이 완전히 멈춘 후 스냅 + state 업데이트
                        clearTimeout(bookScrollSettleTimer.current);
                        bookScrollSettleTimer.current = setTimeout(() => {
                          const idx = Math.round(el.scrollTop / ITEM_H);
                          const clamped = Math.max(0, Math.min(idx, bookList.length - 1));
                          const newBookName = bookList[clamped].name;
                          pickerScrollingRef.current = true;
                          pickerBookRef.current = newBookName;
                          pickerChapterRef.current = 1;
                          el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
                          if (chapterPickerRef.current) {
                            chapterPickerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                          // state 업데이트 → 리렌더 → useEffect에서 스크롤 위치 복원
                          setPickerBook(newBookName);
                          setPickerTestament(clamped >= NT_START_INDEX ? '신약' : '구약');
                        }, 250);
                      }}
                    >
                      <div style={{ height: `${ITEM_H * CENTER}px` }} />
                      {bookList.map((b, i) => {
                        const isSelected = pickerBook === b.name;
                        return (
                        <div
                          key={b.name}
                          data-book={b.name}
                          className="flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ height: `${ITEM_H}px` }}
                          onClick={() => {
                            pickerScrollingRef.current = true;
                            pickerBookRef.current = b.name;
                            pickerChapterRef.current = 1;
                            setPickerBook(b.name);
                            if (bookPickerRef.current) bookPickerRef.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                            if (chapterPickerRef.current) chapterPickerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                            setTimeout(() => { pickerScrollingRef.current = false; }, 300);
                          }}
                        >
                          <span className={`transition-all duration-150 ${isSelected ? 'text-gray-900 font-bold text-sm' : 'text-gray-400 text-xs'}`}>
                            {b.name}
                          </span>
                        </div>
                        );
                      })}
                      <div style={{ height: `${ITEM_H * CENTER}px` }} />
                    </div>

                    {/* 구분선 */}
                    <div className="w-px bg-gray-200 my-3" />

                    {/* 장 피커 */}
                    <div
                      ref={chapterPickerRef}
                      className="w-16 overflow-y-auto relative picker-scroll"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                      onScroll={(e) => {
                        const el = e.target;
                        clearTimeout(el._scrollTimer);
                        el._scrollTimer = setTimeout(() => {
                          const idx = Math.round(el.scrollTop / ITEM_H);
                          const clamped = Math.max(0, Math.min(idx, pickerChapters.length - 1));
                          el.scrollTo({ top: clamped * ITEM_H, behavior: 'smooth' });
                          pickerChapterRef.current = clamped + 1;
                        }, 80);
                      }}
                    >
                      <div style={{ height: `${ITEM_H * CENTER}px` }} />
                      {pickerChapters.map((c) => (
                        <div
                          key={c}
                          className="flex items-center justify-center shrink-0 cursor-pointer"
                          style={{ height: `${ITEM_H}px` }}
                          onClick={() => {
                            pickerChapterRef.current = c;
                            if (chapterPickerRef.current) chapterPickerRef.current.scrollTo({ top: (c - 1) * ITEM_H, behavior: 'smooth' });
                          }}
                        >
                          <span className="text-gray-700 text-xs">
                            {c}장
                          </span>
                        </div>
                      ))}
                      <div style={{ height: `${ITEM_H * CENTER}px` }} />
                    </div>
                  </div>
                  {/* 확인 버튼 */}
                  <div className="border-t border-gray-100 px-3 py-2 flex justify-end">
                    <button onClick={() => {
                      const confirmBook = pickerBookRef.current;
                      const confirmBookData = bookList.find(b => b.name === confirmBook) || bookList[0];
                      setBook(confirmBook);
                      setChapter(Math.min(pickerChapterRef.current, confirmBookData.chapters));
                      setShowBookDropdown(false);
                      if (searchInputRef.current) searchInputRef.current.value = '';
                      setSelectedVerses([]);
                      setShowVerseMenu(false);
                    }} className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">확인</button>
                  </div>
              </div>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            {/* 동기화 상태 표시 */}
            {user && (
              <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                {isSyncing ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            )}

            {/* 로그인/프로필 버튼 */}
            <button
              onClick={() => user ? setShowLoginModal(true) : setShowLoginModal(true)}
              className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
              title={user ? user.displayName : '로그인'}
            >
              {user ? (
                <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </button>

            <button
              onClick={() => setShowTranslationPicker(true)}
              className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-all"
            >
              {translation}
            </button>
          </div>
        </div>
      </div>

      {/* 피커 열려있을 때 배경 클릭으로 닫기 */}
      {showBookDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setShowBookDropdown(false); if (searchInputRef.current) searchInputRef.current.value = ''; }}
        />
      )}

      {/* Bible Content */}
      <div className="flex-1 overflow-y-auto scroll-container bg-gradient-to-b from-amber-50/50 to-white" style={{ minHeight: 0, WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
        <div className="p-4 max-w-2xl mx-auto">
          <h2 className="text-center text-xl font-serif text-amber-900 mb-6 pb-3 border-b border-amber-200">
            {book} {chapter}장
          </h2>

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500">말씀을 불러오는 중...</p>
            </div>
          )}

          {/* 에러 상태 */}
          {loadError && !isLoading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-red-600 mb-2">{loadError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                다시 시도
              </button>
            </div>
          )}

          {/* 성경 내용 */}
          {!isLoading && !loadError && (
            <>
              <div
                className="space-y-4 pb-6 select-none touch-pan-y"
                style={{
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  touchAction: 'pan-y'
                }}
              >
                {Object.entries(verses).map(([verse, text]) => {
                  const verseNum = parseInt(verse);
                  const key = getVerseKey(book, chapter, verse);
                  const highlightIndex = highlights[key];
                  const hasNote = notes[key];
                  const linkedChat = getChatForVerse(book, chapter, verseNum);
                  const isSelected = selectedVerses.includes(verseNum);
                  const highlightStyle = highlightIndex !== undefined
                    ? {
                        backgroundColor: highlightColors[highlightIndex].color,
                        borderLeft: `3px solid ${highlightColors[highlightIndex].border}`
                      }
                    : {};

                  return (
                    <div
                      key={verse}
                      onMouseDown={(e) => {
                        // 버튼 클릭이 아닐 때만 기본 동작 방지
                        if (e.target.tagName !== 'BUTTON') {
                          e.preventDefault();
                        }
                        handleDragStart(verseNum, e);
                      }}
                      onMouseUp={(e) => {
                        // 버튼 클릭이 아닐 때만 구절 선택 처리
                        if (e.target.tagName !== 'BUTTON' && !dragMoved) {
                          handleVersePress(verseNum, e);
                        }
                        handleDragEnd();
                      }}
                      onMouseEnter={() => {
                        if (isDragging) {
                          handleDragMove(verseNum);
                        }
                      }}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        touchStartPosRef.current = {
                          x: touch.clientX,
                          y: touch.clientY,
                          time: Date.now()
                        };
                        handleDragStart(verseNum, e);
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

                        // 가로 드래그가 세로보다 크고 10px 이상이면 범위 선택 모드
                        if (deltaX > deltaY && deltaX > 10) {
                          e.preventDefault(); // 스크롤 방지
                          if (!isDragging) {
                            setIsDragging(true); // 이제 드래그 모드 활성화
                          }
                          const element = document.elementFromPoint(touch.clientX, touch.clientY);
                          const verseEl = element?.closest('[data-verse]');
                          if (verseEl) {
                            handleDragMove(parseInt(verseEl.dataset.verse));
                          }
                        }
                        // 세로 스크롤은 자연스럽게 허용 (preventDefault 안 함)
                      }}
                      onTouchEnd={(e) => {
                        const touch = e.changedTouches[0];
                        const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
                        const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);
                        const deltaTime = Date.now() - touchStartPosRef.current.time;

                        // 짧은 탭 (300ms 이하, 10px 이하 이동) = 절 선택
                        const isTap = deltaTime < 300 && deltaX < 10 && deltaY < 10;

                        if (e.target.tagName !== 'BUTTON' && isTap && !dragMoved) {
                          handleVersePress(verseNum, e);
                        }
                        handleDragEnd();
                      }}
                      data-verse={verseNum}
                      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 select-none ${
                        isSelected ? 'ring-2 ring-amber-400 bg-amber-100/50' : ''
                      }`}
                      style={{
                        ...(isSelected ? { ...highlightStyle, backgroundColor: '#FEF3C7' } : highlightStyle),
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none',
                        touchAction: 'pan-y'
                      }}
                    >
                      <div className="flex gap-2">
                        <span className={`font-bold text-sm min-w-[24px] ${isSelected ? 'text-amber-700' : 'text-amber-600'}`}>
                          {isSelected && '✓'}{verse}
                        </span>
                        <p
                          className="text-gray-800 leading-relaxed font-serif text-lg flex-1"
                          style={{
                            WebkitTouchCallout: 'none',
                            WebkitUserSelect: 'none',
                            userSelect: 'none'
                          }}
                        >
                          {text}
                        </p>
                        {/* 메모/채팅 표시 아이콘 */}
                        <div className="flex items-start gap-1 flex-shrink-0">
                          {hasNote && (
                            <button
                              onClick={(e) => handleNoteIndicatorClick(e, key)}
                              className="w-2.5 h-2.5 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors"
                              title="메모 보기"
                            />
                          )}
                          {linkedChat && (
                            <button
                              onClick={(e) => handleChatIndicatorClick(e, verseNum)}
                              className="w-2.5 h-2.5 rounded-full bg-indigo-400 hover:bg-indigo-500 transition-colors"
                              title="채팅 보기"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 읽기 완료 버튼 */}
              {Object.keys(verses).length > 0 && (
                <div className="py-6 border-t border-amber-200">
                  <button
                    onClick={() => toggleReadingPlan(book, chapter)}
                    className={`w-full py-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      readingPlan[getChapterKey(book, chapter)]
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                  >
                    {readingPlan[getChapterKey(book, chapter)] ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        이 장 읽기 완료
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        이 장 읽기 완료 표시
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Chapter Navigation */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-amber-200 pb-20">
                <button
                  onClick={() => chapter > 1 && setChapter(chapter - 1)}
                  disabled={chapter <= 1}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    chapter > 1
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  이전
                </button>
                <span className="text-amber-700 font-medium">{chapter} / {currentBook.chapters}</span>
                <button
                  onClick={() => chapter < currentBook.chapters && setChapter(chapter + 1)}
                  disabled={chapter >= currentBook.chapters}
                  className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                    chapter < currentBook.chapters
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  다음
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Verse Action Menu */}
      {showVerseMenu && (
        <div className="bg-white border-t border-gray-200 shadow-lg animate-slide-up">
          <div className="p-4 max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800">
                {getSelectedVersesRef()}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({selectedVerses.length}절 선택)
                </span>
              </h3>
              <button
                onClick={closeVerseMenu}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-2">하이라이트</p>
              <div className="flex gap-2">
                {highlightColors.map((color, index) => (
                  <button
                    key={index}
                    onClick={() => handleHighlight(index)}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: color.color, borderColor: color.border }}
                  />
                ))}
                <button
                  onClick={handleRemoveHighlight}
                  className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white flex items-center justify-center hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 기존 메모/채팅 표시 */}
            {(getExistingNotes().length > 0 || getExistingChats().length > 0) && (
              <div className="mb-3 space-y-2">
                {getExistingNotes().length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">기존 메모</p>
                    {getExistingNotes().map(note => (
                      <button
                        key={note.key}
                        onClick={() => openExistingNote(note.key)}
                        className="w-full text-left p-2 bg-yellow-50 border border-yellow-200 rounded-lg mb-1 hover:bg-yellow-100 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                          <span className="text-xs text-yellow-700 font-medium">{note.verse}절</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-1 ml-4">{note.content}</p>
                      </button>
                    ))}
                  </div>
                )}
                {getExistingChats().length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">기존 채팅</p>
                    {getExistingChats().map(chat => (
                      <button
                        key={chat.id}
                        onClick={() => goToExistingChat(chat)}
                        className="w-full text-left p-2 bg-indigo-50 border border-indigo-200 rounded-lg mb-1 hover:bg-indigo-100 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                          <span className="text-xs text-indigo-700 font-medium">{chat.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-4">{chat.messages.length}개 메시지</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddNote}
                className="flex items-center justify-center gap-2 p-3 bg-amber-100 rounded-xl text-amber-800 hover:bg-amber-200 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                새 메모
              </button>
              <button
                onClick={handleAskAI}
                className="flex items-center justify-center gap-2 p-3 bg-indigo-100 rounded-xl text-indigo-700 hover:bg-indigo-200 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                새 AI 채팅
              </button>
              <button
                onClick={() => {
                  const versesText = getSelectedVersesText();
                  const verseRef = getSelectedVersesRef();
                  setAttachedVerses(prev => [...prev, {
                    id: Date.now().toString(),
                    bookName: book,
                    chapter: chapter,
                    verses: Object.fromEntries(
                      selectedVerses.sort((a, b) => a - b).map(v => [v, verses[v]])
                    ),
                    verseRef: verseRef,
                    versesText: versesText,
                    translation: translation
                  }]);
                  setShowVerseMenu(false);
                  setSelectedVerses([]);
                  setCurrentTab('ai');
                }}
                className="flex items-center justify-center gap-2 p-3 bg-purple-100 rounded-xl text-purple-700 hover:bg-purple-200 transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                채팅에 첨부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Note Modal - BibleTab 외부에서 렌더링하여 재생성 방지 */}

      {/* Translation Picker */}
      {showTranslationPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" onClick={() => setShowTranslationPicker(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-center text-lg font-semibold text-gray-800 mb-4">번역 선택</h3>
            <div className="space-y-2">
              {['개역개정', '개역한글', 'NIV'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTranslation(t); setShowTranslationPicker(false); }}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    translation === t
                      ? 'bg-amber-100 text-amber-800 font-semibold'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t}
                  {(t === '개역개정' || t === '개역한글') && <span className="text-sm text-gray-500 ml-2">(한국어)</span>}
                  {t === 'NIV' && <span className="text-sm text-gray-500 ml-2">(English)</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Login/Profile Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            {user ? (
              // 로그인된 상태 - 프로필 표시
              <div className="text-center">
                <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-800">{user.displayName}</h3>
                <p className="text-sm text-gray-500 mb-4">{user.email}</p>

                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">클라우드 동기화 활성화</span>
                  </div>
                  {lastSyncTime && (
                    <p className="text-xs text-green-600 mt-1">
                      마지막 동기화: {new Date(lastSyncTime).toLocaleTimeString('ko-KR')}
                    </p>
                  )}
                </div>

                <button
                  onClick={syncToCloud}
                  disabled={isSyncing}
                  className="w-full py-3 bg-indigo-100 text-indigo-700 rounded-xl mb-2 hover:bg-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                      동기화 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      지금 동기화
                    </>
                  )}
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              // 로그인 안된 상태
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">클라우드 동기화</h3>
                <p className="text-sm text-gray-500 mb-4">
                  로그인하면 다른 기기에서도<br/>
                  동일한 하이라이트, 메모, 읽기표를<br/>
                  사용할 수 있습니다.
                </p>

                {!firebaseEnabled && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
                    <p className="text-sm text-amber-700 font-medium mb-1">⚠️ Firebase 설정 필요</p>
                    <p className="text-xs text-amber-600">
                      클라우드 동기화를 사용하려면 Firebase 설정이 필요합니다.
                      프로젝트 폴더의 <strong>FIREBASE_SETUP.md</strong> 파일을 참고하세요.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleGoogleLogin}
                  className="w-full py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-gray-700 font-medium">Google로 로그인</span>
                </button>

                <button
                  onClick={() => setShowLoginModal(false)}
                  className="w-full py-3 text-gray-500 mt-2"
                >
                  나중에 하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const AiTab = () => {
    const [localInput, setLocalInput] = useState('');
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState(localStorage.getItem('gemini_api_key') || '');
    const chatEndRef = useRef(null);

    // 첨부 기능 state
    const [attachedImages, setAttachedImages] = useState([]);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const imageInputRef = useRef(null);
    const pendingMessageRef = useRef(null);

    const saveApiKey = () => {
      localStorage.setItem('gemini_api_key', apiKeyInput);
      setShowApiKeyModal(false);
    };

    useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentChat?.messages]);

    // 채팅방 자동 생성 후 대기 중인 메시지 전송
    useEffect(() => {
      if (currentChatId && pendingMessageRef.current) {
        const { text, attachments } = pendingMessageRef.current;
        pendingMessageRef.current = null;
        sendMessage(text || '(첨부 파일)', currentChatId, attachments);
        setLocalInput('');
        setAttachedImages([]);
        setAttachedVerses([]);
      }
    }, [currentChatId]);

    // 이미지 선택 핸들러
    const handleImageSelect = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        if (!file.type.startsWith('image/')) return;
        if (attachedImages.length >= 4) return;
        if (file.size > 4 * 1024 * 1024) {
          alert('이미지는 4MB 이하만 첨부할 수 있습니다.');
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result.split(',')[1];
          setAttachedImages(prev => [...prev, {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            base64: base64Data,
            mimeType: file.type,
            preview: URL.createObjectURL(file)
          }]);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    };

    const removeAttachedImage = (imageId) => {
      setAttachedImages(prev => {
        const removed = prev.find(img => img.id === imageId);
        if (removed) URL.revokeObjectURL(removed.preview);
        return prev.filter(img => img.id !== imageId);
      });
    };

    const removeAttachedVerse = (verseId) => {
      setAttachedVerses(prev => prev.filter(v => v.id !== verseId));
    };

    const handleSend = () => {
      const hasText = localInput.trim().length > 0;
      const hasAttachments = attachedImages.length > 0 || attachedVerses.length > 0;
      if (!hasText && !hasAttachments) return;

      if (!currentChatId) {
        // 채팅방 없으면 자동 생성 후 전송
        const attachments = hasAttachments ? { images: [...attachedImages], verses: [...attachedVerses] } : null;
        pendingMessageRef.current = { text: localInput.trim(), attachments };
        handleNewFreeChat();
        return;
      }

      const messageText = localInput.trim() || '(첨부 파일)';
      const attachments = hasAttachments ? { images: [...attachedImages], verses: [...attachedVerses] } : null;
      sendMessage(messageText, currentChatId, attachments);
      setLocalInput('');
      setAttachedImages([]);
      setAttachedVerses([]);
      setShowAttachMenu(false);
    };

    const handleKeyDown = (e) => {
      // 한글 조합 중(isComposing)일 때는 무시
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    return (
      <div className="flex-1 flex flex-col bg-gradient-to-b from-indigo-50 to-white">
        {/* AI Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 채팅방 열람 중일 때만 뒤로 가기 버튼 표시 */}
              {currentChat && (
                <button
                  onClick={() => setCurrentChatId(null)}
                  className="bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-sm">성경 AI 도우미</h2>
                <p className="text-xs text-white/80">
                  {currentChat ? currentChat.title : `채팅 ${chatRooms.length}개`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!currentChat && (
                <button
                  onClick={handleNewFreeChat}
                  className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
                  title="새 대화"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all"
                title="API 키 설정"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto scroll-container p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
          {!currentChat ? (
            /* 채팅 목록 화면 */
            <div className="space-y-3">
              {chatRooms.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">채팅이 없습니다</h3>
                  <p className="text-gray-500 text-sm mb-4">
                    성경에 대해 자유롭게 질문하거나,<br/>
                    말씀을 첨부하여 대화를 시작해보세요.
                  </p>
                  <button
                    onClick={handleNewFreeChat}
                    className="px-6 py-3 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition-all shadow-md"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      새 대화 시작하기
                    </div>
                  </button>
                </div>
              ) : (
                chatRooms.map(room => {
                  const lastMsg = room.messages[room.messages.length - 1];
                  const lastMsgPreview = lastMsg
                    ? (lastMsg.role === 'user' ? '나: ' : 'AI: ') + (lastMsg.content?.slice(0, 50) || '(첨부 파일)')
                    : '새 대화';
                  const unread = unreadMessages[room.id] || 0;

                  return (
                    <button
                      key={room.id}
                      onClick={() => setCurrentChatId(room.id)}
                      className="w-full bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left relative"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">{room.title}</h3>
                          {room.verseRef && (
                            <p className="text-xs text-amber-600 mb-1">📖 {room.verseRef}</p>
                          )}
                          <p className="text-xs text-gray-500 truncate">{lastMsgPreview}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-xs text-gray-400">
                            {new Date(room.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                          {unread > 0 && (
                            <span className="w-5 h-5 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {unread}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('이 채팅을 삭제하시겠습니까?')) {
                                deleteChatRoom(room.id);
                              }
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* 채팅창 화면 */
            <>
              {/* 선택한 말씀 표시 (말씀 기반 채팅일 때만) */}
              {currentChat.verseRef && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-2 text-amber-700 mb-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="font-medium text-sm">{currentChat.verseRef}</span>
                    <span className="text-xs text-amber-600">({currentChat.translation})</span>
                  </div>
                  <p className="text-amber-900 text-sm whitespace-pre-wrap">{currentChat.versesText}</p>
                </div>
              )}

              {/* 메시지가 없을 때 질문 예시 */}
              {currentChat.messages.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-gray-500 text-sm mb-3">
                    {currentChat.verseRef ? '이 말씀에 대해 질문해보세요' : '성경에 대해 자유롭게 질문해보세요'}
                  </p>
                  <div className="space-y-2">
                    {(currentChat.verseRef
                      ? ["이 구절의 의미가 뭔가요?", "역사적 배경이 궁금해요", "다른 번역본과 비교해주세요"]
                      : ["성경에서 사랑에 대해 알려주세요", "기도하는 방법을 알려주세요", "시편 23편을 설명해주세요"]
                    ).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (currentChatId) {
                            sendMessage(q, currentChatId);
                          }
                        }}
                        className="w-full text-left p-3 bg-white rounded-xl text-sm text-gray-700 hover:bg-indigo-50 transition-all shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 채팅 메시지들 */}
              {currentChat.messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] p-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : 'bg-white shadow-md text-gray-800 rounded-bl-md'
                  }`}>
                    {/* 첨부된 말씀 */}
                    {msg.attachedVerses?.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {msg.attachedVerses.map((v, vi) => (
                          <div key={vi} className={`p-2 rounded-lg text-xs ${
                            msg.role === 'user' ? 'bg-white/15' : 'bg-amber-50 border border-amber-200'
                          }`}>
                            <span className="font-medium">{v.verseRef}</span>
                            <p className="mt-1 opacity-80 line-clamp-2">
                              {Object.entries(v.verses).sort(([a],[b]) => parseInt(a) - parseInt(b)).map(([n, t]) => `${n}절: ${t}`).join(' ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* 첨부된 이미지 */}
                    {msg.images?.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {msg.images.map((img, ii) => (
                          img.preview ? (
                            <img key={ii} src={img.preview} alt="" className="w-20 h-20 object-cover rounded-lg" />
                          ) : (
                            <div key={ii} className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {chatLoadingStates[currentChatId] && (
                <div className="flex justify-start">
                  <div className="bg-white shadow-md rounded-2xl rounded-bl-md p-4">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Chat Input */}
        {currentChat && (
          <div className="border-t border-gray-200 bg-white">
            {/* 첨부 스테이징 영역 */}
            {(attachedImages.length > 0 || attachedVerses.length > 0) && (
              <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2">
                {attachedImages.map(img => (
                  <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeAttachedImage(img.id)}
                      className="absolute top-0 right-0 w-5 h-5 bg-black/50 text-white rounded-bl-lg flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                {attachedVerses.map(v => (
                  <div key={v.id} className="relative px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg max-w-[200px]">
                    <p className="text-xs font-medium text-amber-700 truncate pr-4">{v.verseRef}</p>
                    <p className="text-xs text-amber-600 truncate">{v.translation}</p>
                    <button onClick={() => removeAttachedVerse(v.id)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 text-amber-500 hover:text-amber-700">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* 입력 행 */}
            <div className="p-4 flex gap-2 items-end">
              {/* + 버튼 */}
              <div className="relative">
                <button onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl transition-all flex-shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                {showAttachMenu && (
                  <div className="absolute bottom-12 left-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20 w-40">
                    <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      이미지 추가
                    </button>
                    <button onClick={() => { setCurrentTab('bible'); setShowAttachMenu(false); }}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 text-sm text-gray-700 border-t border-gray-100">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      말씀 추가
                    </button>
                  </div>
                )}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              <input
                type="text"
                value={localInput}
                onChange={(e) => setLocalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
                placeholder="질문을 입력하세요..."
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800"
                style={{ touchAction: 'manipulation' }}
              />
              <button
                onClick={handleSend}
                disabled={chatLoadingStates[currentChatId] || (!localInput.trim() && attachedImages.length === 0 && attachedVerses.length === 0)}
                className={`px-4 py-3 rounded-xl transition-all flex-shrink-0 ${
                  chatLoadingStates[currentChatId] || (!localInput.trim() && attachedImages.length === 0 && attachedVerses.length === 0)
                    ? 'bg-gray-200 text-gray-400'
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* API Key Modal */}
        {showApiKeyModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowApiKeyModal(false)}>
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔑 Gemini API 키 설정</h3>
              <p className="text-sm text-gray-500 mb-4">
                무료 AI 기능을 사용하려면 Gemini API 키가 필요합니다.
              </p>

              <div className="bg-indigo-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-indigo-700 font-medium mb-2">API 키 받는 방법:</p>
                <ol className="text-xs text-indigo-600 space-y-1">
                  <li>1. <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a> 접속</li>
                  <li>2. 구글 계정으로 로그인 (무료)</li>
                  <li>3. Create API Key 클릭</li>
                  <li>4. 생성된 키를 아래에 붙여넣기</li>
                </ol>
              </div>

              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-800 mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={saveApiKey}
                  className="flex-1 py-3 bg-indigo-500 rounded-xl text-white hover:bg-indigo-600 transition-all"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const NotesTab = () => {
    // 빈 메모나 잘못된 형식 필터링
    const allNotes = Object.entries(notes).filter(([key, note]) => {
      if (!note) return false;
      // 객체 형식의 메모만 표시
      if (typeof note === 'object' && note.content && note.content.trim()) {
        return true;
      }
      // 문자열 형식의 메모 (이전 버전 호환)
      if (typeof note === 'string' && note.trim()) {
        return true;
      }
      return false;
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    // 메모 상세 보기
    if (showNoteDetail && selectedNoteKey) {
      const note = notes[selectedNoteKey];
      const noteData = typeof note === 'object' ? note : { title: '', content: note, verseRef: '' };
      const [b, c, v] = selectedNoteKey.split('_');
      const verseRef = noteData.verseRef || `${b} ${c}:${v}`;

      return (
        <div className="flex-1 flex flex-col bg-yellow-50/50">
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                setShowNoteDetail(false);
                setSelectedNoteKey(null);
                setIsEditing(false);
              }}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold">메모</h2>
            <button
              onClick={() => {
                if (isEditing) {
                  // 저장
                  setNotes(prev => ({
                    ...prev,
                    [selectedNoteKey]: {
                      title: editTitle.trim() || verseRef,
                      content: editContent,
                      verseRef: verseRef
                    }
                  }));
                  setIsEditing(false);
                } else {
                  // 편집 모드
                  setEditTitle(noteData.title);
                  setEditContent(noteData.content);
                  setIsEditing(true);
                }
              }}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium"
            >
              {isEditing ? '저장' : '편집'}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scroll-container p-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
            <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <span
                onClick={() => {
                  setBook(b);
                  setChapter(parseInt(c));
                  setCurrentTab('bible');
                  setShowNoteDetail(false);
                  setSelectedNoteKey(null);
                }}
                className="inline-block px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-amber-200 transition-all"
              >
                {verseRef}
              </span>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="메모 제목"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 font-semibold"
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="메모 내용"
                  className="w-full h-96 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800 leading-relaxed"
                />
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{noteData.title}</h3>
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">{noteData.content}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 메모 목록
    return (
      <div className="flex-1 flex flex-col bg-yellow-50/50">
        {/* Notes Header */}
        <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-4 py-4 sticky top-0 z-10">
          <h2 className="text-lg font-semibold">내 메모</h2>
          <p className="text-sm text-white/80">{allNotes.length}개의 메모</p>
        </div>
        <div className="flex-1 overflow-y-auto scroll-container p-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
          {allNotes.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-gray-500">아직 메모가 없습니다.<br/>말씀을 읽으며 메모를 추가해보세요.</p>
            </div>
          ) : (
            <div className="space-y-3 pb-20">
              {allNotes.map(([key, note]) => {
                const [b, c, v] = key.split('_');
                // 새로운 형식과 기존 형식 호환
                const noteData = typeof note === 'object' ? note : { title: `${b} ${c}:${v}`, content: note, verseRef: `${b} ${c}:${v}` };
                const contentStr = noteData.content || '';
                const preview = contentStr.substring(0, 80) + (contentStr.length > 80 ? '...' : '');

                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedNoteKey(key);
                      setShowNoteDetail(true);
                    }}
                    className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium">
                        {noteData.verseRef}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-1">{noteData.title}</h4>
                    <p className="text-gray-600 text-sm line-clamp-2">{preview}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PlanTab = () => {
    const completedCount = Object.values(readingPlan).filter(Boolean).length;
    const totalChapters = bookList.reduce((acc, b) => acc + b.chapters, 0);

    return (
      <div className="flex-1 flex flex-col bg-emerald-50/50 min-h-0">
        {/* Plan Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-4 sticky top-0 z-10">
          <h2 className="text-lg font-semibold">읽기표</h2>
          <p className="text-sm text-white/80">{completedCount} / {totalChapters} 장 완료</p>
          <div className="mt-3 bg-white/20 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalChapters) * 100}%` }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scroll-container p-4" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
          <div className="space-y-4 pb-20">
            {bookList.map(b => {
              const bookChapters = Array.from({ length: b.chapters }, (_, i) => i + 1);
              const bookCompleted = bookChapters.filter(c => readingPlan[getChapterKey(b.name, c)]).length;
              return (
                <div key={b.name} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">{b.name}</h3>
                    <span className="text-sm text-emerald-600">{bookCompleted}/{b.chapters}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {bookChapters.map(c => {
                      const isCompleted = readingPlan[getChapterKey(b.name, c)];
                      return (
                        <button
                          key={c}
                          onClick={() => toggleReadingPlan(b.name, c)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                            isCompleted
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {isCompleted ? '✓' : c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 메모용 ref (포커스 유지)
  const noteTextareaRef = useRef(null);

  // 메모 텍스트 변경 핸들러
  const handleNoteTextChange = (e) => {
    setNoteText(e.target.value);
  };

  return (
    <div className="flex flex-col bg-white font-sans overflow-hidden" style={{ height: '100dvh', height: 'calc(var(--vh, 1vh) * 100)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap');

        * {
          font-family: 'Noto Sans KR', sans-serif;
        }

        .font-serif {
          font-family: 'Noto Serif KR', serif;
        }

        /* #root 높이만 지정 (html, body는 index.html에서 관리) */
        #root {
          height: 100%;
          overflow: hidden;
        }
      `}</style>

      {/* Main Content - 성경탭은 display:none으로 숨겨서 스크롤 위치 유지 */}
      <div style={{ display: currentTab === 'bible' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <BibleTab />
      </div>
      {currentTab === 'ai' && <AiTab />}
      {currentTab === 'notes' && <NotesTab />}
      {currentTab === 'plan' && <PlanTab />}

      {/* Note Modal - 최상위 레벨에서 렌더링 (재생성 방지) */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {getSelectedVersesRef()} 메모
            </h3>
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="메모 제목 (선택사항)"
              className="w-full p-3 mb-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800"
            />
            <textarea
              ref={noteTextareaRef}
              value={noteText}
              onChange={handleNoteTextChange}
              placeholder="이 말씀에 대한 생각을 적어보세요..."
              className="w-full h-32 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-800"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowNoteModal(false); setSelectedVerses([]); setNoteText(''); setNoteTitle(''); }}
                className="flex-1 py-3 bg-gray-100 rounded-xl text-gray-700 hover:bg-gray-200 transition-all"
              >
                취소
              </button>
              <button
                onClick={saveNote}
                className="flex-1 py-3 bg-amber-500 rounded-xl text-white hover:bg-amber-600 transition-all"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-200 flex-shrink-0" style={{ padding: '12px 8px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', minHeight: '60px' }}>
        <div className="flex justify-around items-center">
          {[
            { id: 'bible', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', label: '성경', color: 'amber' },
            { id: 'ai', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'AI 채팅', color: 'indigo', badge: totalUnreadCount || null },
            { id: 'notes', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: '메모', color: 'yellow' },
            { id: 'plan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: '읽기표', color: 'emerald' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center rounded-xl transition-all relative ${
                currentTab === tab.id
                  ? `bg-${tab.color}-100 text-${tab.color}-600`
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              style={{
                minWidth: '60px',
                minHeight: '44px',
                padding: '8px 16px',
                touchAction: 'manipulation',
                ...(currentTab === tab.id ? {
                  backgroundColor: tab.color === 'amber' ? '#FEF3C7' :
                                   tab.color === 'indigo' ? '#E0E7FF' :
                                   tab.color === 'blue' ? '#DBEAFE' :
                                   tab.color === 'yellow' ? '#FEF9C3' : '#D1FAE5',
                  color: tab.color === 'amber' ? '#D97706' :
                         tab.color === 'indigo' ? '#4F46E5' :
                         tab.color === 'blue' ? '#3B82F6' :
                         tab.color === 'yellow' ? '#CA8A04' : '#059669'
                } : {})
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
              {tab.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
