import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  HIGHLIGHTS: 'bible_highlights',
  NOTES: 'bible_notes',
  READING_PLAN: 'bible_reading_plan',
  GEMINI_KEY: 'gemini_api_key',
  AI_CHATS: 'bible_ai_chats',
  TRANSLATION: 'bible_translation',
  LAST_BOOK: 'bible_last_book',
  LAST_CHAPTER: 'bible_last_chapter',
};

export const storage = {
  // 하이라이트
  async getHighlights() {
    try {
      const val = await AsyncStorage.getItem(KEYS.HIGHLIGHTS);
      return val ? JSON.parse(val) : {};
    } catch { return {}; }
  },
  async saveHighlights(data) {
    await AsyncStorage.setItem(KEYS.HIGHLIGHTS, JSON.stringify(data));
  },

  // 메모
  async getNotes() {
    try {
      const val = await AsyncStorage.getItem(KEYS.NOTES);
      return val ? JSON.parse(val) : {};
    } catch { return {}; }
  },
  async saveNotes(data) {
    await AsyncStorage.setItem(KEYS.NOTES, JSON.stringify(data));
  },

  // 읽기표
  async getReadingPlan() {
    try {
      const val = await AsyncStorage.getItem(KEYS.READING_PLAN);
      return val ? JSON.parse(val) : {};
    } catch { return {}; }
  },
  async saveReadingPlan(data) {
    await AsyncStorage.setItem(KEYS.READING_PLAN, JSON.stringify(data));
  },

  // Gemini API 키
  async getGeminiKey() {
    try {
      return await AsyncStorage.getItem(KEYS.GEMINI_KEY) || '';
    } catch { return ''; }
  },
  async saveGeminiKey(key) {
    await AsyncStorage.setItem(KEYS.GEMINI_KEY, key);
  },

  // AI 채팅 기록
  async getAIChats() {
    try {
      const val = await AsyncStorage.getItem(KEYS.AI_CHATS);
      return val ? JSON.parse(val) : [];
    } catch { return []; }
  },
  async saveAIChats(data) {
    await AsyncStorage.setItem(KEYS.AI_CHATS, JSON.stringify(data));
  },

  // 마지막 읽은 위치
  async getLastPosition() {
    try {
      const book = await AsyncStorage.getItem(KEYS.LAST_BOOK);
      const chapter = await AsyncStorage.getItem(KEYS.LAST_CHAPTER);
      const translation = await AsyncStorage.getItem(KEYS.TRANSLATION);
      return {
        book: book || '창세기',
        chapter: chapter ? parseInt(chapter) : 1,
        translation: translation || '개역개정',
      };
    } catch {
      return { book: '창세기', chapter: 1, translation: '개역개정' };
    }
  },
  async saveLastPosition(book, chapter, translation) {
    await AsyncStorage.setItem(KEYS.LAST_BOOK, book);
    await AsyncStorage.setItem(KEYS.LAST_CHAPTER, String(chapter));
    await AsyncStorage.setItem(KEYS.TRANSLATION, translation);
  },

  // 전체 사용자 데이터 (클라우드 싱크용)
  async getAllUserData() {
    const [highlights, notes, readingPlan, aiChats] = await Promise.all([
      this.getHighlights(),
      this.getNotes(),
      this.getReadingPlan(),
      this.getAIChats(),
    ]);
    return { highlights, notes, readingPlan, aiChats };
  },
  async setAllUserData(data) {
    await Promise.all([
      data.highlights && this.saveHighlights(data.highlights),
      data.notes && this.saveNotes(data.notes),
      data.readingPlan && this.saveReadingPlan(data.readingPlan),
      data.aiChats && this.saveAIChats(data.aiChats),
    ]);
  },
};

export default storage;
