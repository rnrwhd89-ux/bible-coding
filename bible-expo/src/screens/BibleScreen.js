import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { bookList, highlightColors, translations, colors, NT_START_INDEX } from '../constants';
import { getBibleVerses } from '../firebase';
import storage from '../storage';

// 성경 데이터 캐시
const bibleCache = {};

// Bolls Life API로 성경 가져오기
async function fetchBollsLife(bookNum, chapter, translationCode) {
  const url = `https://bolls.life/get-text/${translationCode}/${bookNum}/${chapter}/`;
  const res = await fetch(url);
  const data = await res.json();
  const verses = {};
  data.forEach((v) => { verses[v.verse] = v.text; });
  return verses;
}

// 성경 데이터 로드 (캐시 포함)
async function loadBibleData(bookName, bookNum, chapter, translation) {
  const key = `${bookName}_${chapter}_${translation}`;
  if (bibleCache[key]) return bibleCache[key];

  let verses = {};
  if (translation === '개역개정') {
    try {
      verses = await getBibleVerses(bookName, chapter);
      if (Object.keys(verses).length === 0) {
        verses = await fetchBollsLife(bookNum, chapter, 'KRV');
      }
    } catch {
      verses = await fetchBollsLife(bookNum, chapter, 'KRV');
    }
  } else {
    verses = await fetchBollsLife(bookNum, chapter, translation);
  }

  bibleCache[key] = verses;
  return verses;
}

export default function BibleScreen({ navigation }) {
  const [book, setBook] = useState('창세기');
  const [bookNum, setBookNum] = useState(1);
  const [chapter, setChapter] = useState(1);
  const [translation, setTranslation] = useState('개역개정');
  const [verses, setVerses] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [highlights, setHighlights] = useState({});
  const [notes, setNotes] = useState({});
  const [readingPlan, setReadingPlan] = useState({});

  // 선택된 절
  const [selectedVerses, setSelectedVerses] = useState([]);
  const [showVerseMenu, setShowVerseMenu] = useState(false);

  // 모달 상태
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');

  // 책/장 선택 피커
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [pickerTestament, setPickerTestament] = useState('구약');

  // 번역 선택
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);

  // 초기 로드
  useEffect(() => {
    (async () => {
      const pos = await storage.getLastPosition();
      const bookInfo = bookList.find(b => b.name === pos.book) || bookList[0];
      setBook(pos.book);
      setBookNum(bookInfo.bookNum);
      setChapter(pos.chapter);
      setTranslation(pos.translation);
    })();
    loadLocalData();
  }, []);

  const loadLocalData = async () => {
    const [h, n, rp] = await Promise.all([
      storage.getHighlights(),
      storage.getNotes(),
      storage.getReadingPlan(),
    ]);
    setHighlights(h);
    setNotes(n);
    setReadingPlan(rp);
  };

  // 성경 데이터 로드
  useEffect(() => {
    if (!book || !chapter) return;
    setIsLoading(true);
    setVerses({});
    loadBibleData(book, bookNum, chapter, translation)
      .then(v => setVerses(v))
      .catch(() => Alert.alert('오류', '성경 데이터를 불러오지 못했습니다.'))
      .finally(() => setIsLoading(false));
    storage.saveLastPosition(book, chapter, translation);
  }, [book, bookNum, chapter, translation]);

  const getVerseKey = (b, c, v) => `${b}_${c}_${v}`;
  const getChapterKey = (b, c) => `${b}_${c}`;

  // 절 선택 토글
  const toggleVerseSelect = (verseNum) => {
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) {
        const next = prev.filter(v => v !== verseNum);
        if (next.length === 0) setShowVerseMenu(false);
        return next;
      }
      return [...prev, verseNum].sort((a, b) => a - b);
    });
    setShowVerseMenu(true);
  };

  // 하이라이트 적용
  const applyHighlight = async (colorIndex) => {
    const newHL = { ...highlights };
    selectedVerses.forEach(v => {
      const key = getVerseKey(book, chapter, v);
      newHL[key] = colorIndex;
    });
    setHighlights(newHL);
    await storage.saveHighlights(newHL);
    setSelectedVerses([]);
    setShowVerseMenu(false);
  };

  // 하이라이트 제거
  const removeHighlight = async () => {
    const newHL = { ...highlights };
    selectedVerses.forEach(v => {
      delete newHL[getVerseKey(book, chapter, v)];
    });
    setHighlights(newHL);
    await storage.saveHighlights(newHL);
    setSelectedVerses([]);
    setShowVerseMenu(false);
  };

  // 메모 저장
  const saveNote = async () => {
    if (!noteText.trim() && !noteTitle.trim()) {
      setShowNoteModal(false);
      return;
    }
    const newNotes = { ...notes };
    selectedVerses.forEach(v => {
      const key = getVerseKey(book, chapter, v);
      newNotes[key] = {
        title: noteTitle,
        content: noteText,
        verseRef: `${book} ${chapter}:${v}`,
        updatedAt: new Date().toISOString(),
      };
    });
    setNotes(newNotes);
    await storage.saveNotes(newNotes);
    setShowNoteModal(false);
    setNoteTitle('');
    setNoteText('');
    setSelectedVerses([]);
    setShowVerseMenu(false);
  };

  // 읽기표 토글
  const toggleReadingPlan = async () => {
    const key = getChapterKey(book, chapter);
    const newRP = { ...readingPlan, [key]: !readingPlan[key] };
    setReadingPlan(newRP);
    await storage.saveReadingPlan(newRP);
  };

  // 책 선택
  const selectBook = (selectedBook) => {
    const bookInfo = bookList.find(b => b.name === selectedBook);
    setBook(selectedBook);
    setBookNum(bookInfo.bookNum);
    setChapter(1);
    setShowBookPicker(false);
    setSelectedVerses([]);
    setShowVerseMenu(false);
  };

  // 장 이동
  const goChapter = (dir) => {
    const bookInfo = bookList.find(b => b.name === book);
    const maxChapter = bookInfo?.chapters || 1;
    const newChapter = chapter + dir;
    if (newChapter < 1 || newChapter > maxChapter) return;
    setChapter(newChapter);
    setSelectedVerses([]);
    setShowVerseMenu(false);
  };

  const verseKeys = Object.keys(verses).map(Number).sort((a, b) => a - b);
  const chapterKey = getChapterKey(book, chapter);
  const isRead = readingPlan[chapterKey];
  const bookInfo = bookList.find(b => b.name === book);
  const maxChapter = bookInfo?.chapters || 1;

  const openNoteModal = () => {
    const existingKey = getVerseKey(book, chapter, selectedVerses[0]);
    const existing = notes[existingKey];
    if (existing && typeof existing === 'object') {
      setNoteTitle(existing.title || '');
      setNoteText(existing.content || '');
    } else if (typeof existing === 'string') {
      setNoteTitle('');
      setNoteText(existing);
    } else {
      setNoteTitle('');
      setNoteText('');
    }
    setShowNoteModal(true);
    setShowVerseMenu(false);
  };

  const renderVerse = ({ item: verseNum }) => {
    const key = getVerseKey(book, chapter, verseNum);
    const hlIndex = highlights[key];
    const hasNote = !!notes[key];
    const isSelected = selectedVerses.includes(verseNum);
    const hlColor = hlIndex !== undefined ? highlightColors[hlIndex] : null;

    return (
      <Pressable
        onPress={() => toggleVerseSelect(verseNum)}
        style={[
          styles.verseRow,
          isSelected && styles.verseRowSelected,
          hlColor && { backgroundColor: hlColor.color, borderLeftColor: hlColor.border, borderLeftWidth: 3 },
        ]}
      >
        <Text style={styles.verseNum}>{verseNum}</Text>
        <Text style={[styles.verseText, isSelected && styles.verseTextSelected]}>
          {verses[verseNum]}
          {hasNote && <Text style={styles.noteIndicator}> 📝</Text>}
        </Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.bookBtn} onPress={() => setShowBookPicker(true)}>
            <Text style={styles.bookBtnText}>{book}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.translationBtn}
              onPress={() => setShowTranslationPicker(true)}
            >
              <Text style={styles.translationBtnText}>
                {translation === 'KRV' ? '개역한글' : translation}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.readBtn, isRead && styles.readBtnActive]}
              onPress={toggleReadingPlan}
            >
              <Ionicons name={isRead ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color={isRead ? '#10B981' : colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 장 네비게이션 */}
        <View style={styles.chapterNav}>
          <TouchableOpacity onPress={() => goChapter(-1)} disabled={chapter <= 1} style={styles.chapterNavBtn}>
            <Ionicons name="chevron-back" size={22} color={chapter <= 1 ? colors.border : colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowChapterPicker(true)} style={styles.chapterBtn}>
            <Text style={styles.chapterBtnText}>{chapter}장</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => goChapter(1)} disabled={chapter >= maxChapter} style={styles.chapterNavBtn}>
            <Ionicons name="chevron-forward" size={22} color={chapter >= maxChapter ? colors.border : colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 성경 본문 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      ) : (
        <FlatList
          data={verseKeys}
          keyExtractor={(item) => String(item)}
          renderItem={renderVerse}
          contentContainerStyle={styles.verseList}
          ListHeaderComponent={
            <Text style={styles.chapterTitle}>{book} {chapter}장</Text>
          }
        />
      )}

      {/* 절 메뉴 (하단 팝업) */}
      {showVerseMenu && selectedVerses.length > 0 && (
        <View style={styles.verseMenu}>
          <View style={styles.verseMenuHeader}>
            <Text style={styles.verseMenuTitle}>
              {book} {chapter}:{selectedVerses.join(', ')}
            </Text>
            <TouchableOpacity onPress={() => { setSelectedVerses([]); setShowVerseMenu(false); }}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 하이라이트 색상 */}
          <View style={styles.highlightRow}>
            {highlightColors.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.colorBtn, { backgroundColor: c.color, borderColor: c.border }]}
                onPress={() => applyHighlight(i)}
              />
            ))}
            <TouchableOpacity style={styles.removeHLBtn} onPress={removeHighlight}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 액션 버튼 */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={openNoteModal}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.actionBtnText}>메모</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                const verseText = selectedVerses.map(v => `${v}절 ${verses[v]}`).join('\n');
                navigation.navigate('AI', {
                  verseRef: `${book} ${chapter}:${selectedVerses.join(', ')}`,
                  verseText,
                });
                setSelectedVerses([]);
                setShowVerseMenu(false);
              }}
            >
              <Ionicons name="chatbubble-outline" size={20} color={colors.primary} />
              <Text style={styles.actionBtnText}>AI 질문</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 책 선택 모달 */}
      <Modal visible={showBookPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>책 선택</Text>
              <TouchableOpacity onPress={() => setShowBookPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* 구약/신약 탭 */}
            <View style={styles.testamentTabs}>
              <TouchableOpacity
                style={[styles.testamentTab, pickerTestament === '구약' && styles.testamentTabActive]}
                onPress={() => setPickerTestament('구약')}
              >
                <Text style={[styles.testamentTabText, pickerTestament === '구약' && styles.testamentTabTextActive]}>구약</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testamentTab, pickerTestament === '신약' && styles.testamentTabActive]}
                onPress={() => setPickerTestament('신약')}
              >
                <Text style={[styles.testamentTabText, pickerTestament === '신약' && styles.testamentTabTextActive]}>신약</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.bookGrid}>
                {bookList
                  .filter((_, i) => pickerTestament === '구약' ? i < NT_START_INDEX : i >= NT_START_INDEX)
                  .map((b) => (
                    <TouchableOpacity
                      key={b.name}
                      style={[styles.bookItem, book === b.name && styles.bookItemActive]}
                      onPress={() => selectBook(b.name)}
                    >
                      <Text style={[styles.bookItemText, book === b.name && styles.bookItemTextActive]}>
                        {b.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 장 선택 모달 */}
      <Modal visible={showChapterPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{book} 장 선택</Text>
              <TouchableOpacity onPress={() => setShowChapterPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              <View style={styles.bookGrid}>
                {Array.from({ length: maxChapter }, (_, i) => i + 1).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.chapterItem,
                      chapter === c && styles.chapterItemActive,
                      readingPlan[getChapterKey(book, c)] && styles.chapterItemRead,
                    ]}
                    onPress={() => { setChapter(c); setShowChapterPicker(false); setSelectedVerses([]); }}
                  >
                    <Text style={[
                      styles.chapterItemText,
                      chapter === c && styles.chapterItemTextActive,
                      readingPlan[getChapterKey(book, c)] && styles.chapterItemTextRead,
                    ]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 번역 선택 모달 */}
      <Modal visible={showTranslationPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { height: 'auto' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>번역 선택</Text>
              <TouchableOpacity onPress={() => setShowTranslationPicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {translations.map((t) => (
              <TouchableOpacity
                key={t.code}
                style={[styles.translationItem, translation === t.code && styles.translationItemActive]}
                onPress={() => { setTranslation(t.code); setShowTranslationPicker(false); }}
              >
                <Text style={[styles.translationItemText, translation === t.code && styles.translationItemTextActive]}>
                  {t.label}
                </Text>
                {translation === t.code && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* 메모 모달 */}
      <Modal visible={showNoteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>메모 작성</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.noteVerseRef}>
              {book} {chapter}:{selectedVerses.join(', ')}
            </Text>
            <TextInput
              style={styles.noteTitleInput}
              placeholder="제목 (선택)"
              value={noteTitle}
              onChangeText={setNoteTitle}
              placeholderTextColor={colors.textLight}
            />
            <TextInput
              style={styles.noteTextInput}
              placeholder="메모 내용을 입력하세요..."
              value={noteText}
              onChangeText={setNoteText}
              multiline
              placeholderTextColor={colors.textLight}
              textAlignVertical="top"
            />
            <TouchableOpacity style={styles.saveNoteBtn} onPress={saveNote}>
              <Text style={styles.saveNoteBtnText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // 헤더
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  translationBtn: {
    backgroundColor: '#f5f5f4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  translationBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  readBtn: { padding: 2 },
  readBtnActive: {},

  // 장 네비
  chapterNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  chapterNavBtn: { padding: 4 },
  chapterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  chapterBtnText: { fontSize: 20, fontWeight: '700', color: colors.text },

  // 본문
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  verseList: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  verseRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
    gap: 8,
  },
  verseRowSelected: { backgroundColor: '#FEF3C7' },
  verseNum: { fontSize: 12, color: colors.textLight, minWidth: 22, marginTop: 2 },
  verseText: { fontSize: 16, color: colors.text, flex: 1, lineHeight: 24 },
  verseTextSelected: { color: colors.primaryDark },
  noteIndicator: { fontSize: 12 },

  // 절 메뉴
  verseMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  verseMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  verseMenuTitle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  highlightRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  colorBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
  removeHLBtn: { marginLeft: 4 },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },

  // 모달 공통
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    padding: 16,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  // 책 선택
  testamentTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  testamentTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
  },
  testamentTabActive: { backgroundColor: colors.primary },
  testamentTabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  testamentTabTextActive: { color: '#fff' },
  bookGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bookItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f4',
    minWidth: 70,
    alignItems: 'center',
  },
  bookItemActive: { backgroundColor: colors.primary },
  bookItemText: { fontSize: 12, color: colors.text },
  bookItemTextActive: { color: '#fff', fontWeight: '700' },

  // 장 선택
  chapterItem: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f5f5f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterItemActive: { backgroundColor: colors.primary },
  chapterItemRead: { backgroundColor: '#D1FAE5' },
  chapterItemText: { fontSize: 14, color: colors.text },
  chapterItemTextActive: { color: '#fff', fontWeight: '700' },
  chapterItemTextRead: { color: '#059669' },

  // 번역 선택
  translationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  translationItemActive: {},
  translationItemText: { fontSize: 16, color: colors.text },
  translationItemTextActive: { color: colors.primary, fontWeight: '700' },

  // 메모 모달
  noteVerseRef: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  noteTitleInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    marginBottom: 8,
    color: colors.text,
  },
  noteTextInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    height: 160,
    color: colors.text,
    marginBottom: 12,
  },
  saveNoteBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveNoteBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
