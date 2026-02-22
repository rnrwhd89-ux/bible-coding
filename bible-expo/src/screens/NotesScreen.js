import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../constants';
import storage from '../storage';

export default function NotesScreen({ navigation }) {
  const [notes, setNotes] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // 화면 포커스 시마다 새로고침
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const loadNotes = async () => {
    const n = await storage.getNotes();
    setNotes(n);
  };

  // 메모 목록 (비어있는 것 제외, 최신순)
  const noteEntries = Object.entries(notes)
    .filter(([_, note]) => {
      if (!note) return false;
      const content = typeof note === 'object' ? (note.content || '') : note;
      const title = typeof note === 'object' ? (note.title || '') : '';
      if (!content.trim() && !title.trim()) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return content.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          (typeof note === 'object' && note.verseRef?.toLowerCase().includes(q));
      }
      return true;
    })
    .sort(([, a], [, b]) => {
      const dateA = typeof a === 'object' ? (a.updatedAt || '') : '';
      const dateB = typeof b === 'object' ? (b.updatedAt || '') : '';
      return dateB.localeCompare(dateA);
    });

  const openNote = (key) => {
    const note = notes[key];
    setSelectedKey(key);
    if (typeof note === 'object') {
      setEditTitle(note.title || '');
      setEditContent(note.content || '');
    } else {
      setEditTitle('');
      setEditContent(typeof note === 'string' ? note : '');
    }
    setEditMode(false);
    setShowDetail(true);
  };

  const saveEdit = async () => {
    if (!editContent.trim() && !editTitle.trim()) {
      Alert.alert('삭제', '내용이 없으면 메모가 삭제됩니다.', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            const newNotes = { ...notes };
            delete newNotes[selectedKey];
            setNotes(newNotes);
            await storage.saveNotes(newNotes);
            setShowDetail(false);
          },
        },
      ]);
      return;
    }
    const existing = notes[selectedKey];
    const newNotes = {
      ...notes,
      [selectedKey]: {
        ...(typeof existing === 'object' ? existing : {}),
        title: editTitle,
        content: editContent,
        updatedAt: new Date().toISOString(),
      },
    };
    setNotes(newNotes);
    await storage.saveNotes(newNotes);
    setEditMode(false);
  };

  const deleteNote = async () => {
    Alert.alert('삭제', '이 메모를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const newNotes = { ...notes };
          delete newNotes[selectedKey];
          setNotes(newNotes);
          await storage.saveNotes(newNotes);
          setShowDetail(false);
        },
      },
    ]);
  };

  const getNotePreview = (note) => {
    if (typeof note === 'object') {
      return note.content || note.title || '';
    }
    return typeof note === 'string' ? note : '';
  };

  const getNoteTitle = (note) => {
    if (typeof note === 'object') return note.title || '';
    return '';
  };

  const getNoteVerseRef = (key, note) => {
    if (typeof note === 'object' && note.verseRef) return note.verseRef;
    // key 형식: "책이름_장_절"
    const parts = key.split('_');
    if (parts.length >= 3) {
      return `${parts[0]} ${parts[1]}:${parts[2]}`;
    }
    return key;
  };

  const renderNoteItem = ({ item: [key, note] }) => {
    const title = getNoteTitle(note);
    const preview = getNotePreview(note);
    const verseRef = getNoteVerseRef(key, note);

    return (
      <TouchableOpacity style={styles.noteCard} onPress={() => openNote(key)}>
        <View style={styles.noteCardLeft}>
          <Text style={styles.noteVerseRef}>{verseRef}</Text>
          {title ? <Text style={styles.noteTitle}>{title}</Text> : null}
          <Text style={styles.notePreview} numberOfLines={2}>{preview}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>메모</Text>
        <Text style={styles.headerCount}>{noteEntries.length}개</Text>
      </View>

      {/* 검색 */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="메모 검색..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textLight}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {noteEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={60} color={colors.textLight} />
          <Text style={styles.emptyTitle}>
            {searchQuery ? '검색 결과가 없습니다' : '메모가 없습니다'}
          </Text>
          <Text style={styles.emptyText}>
            성경 탭에서 절을 선택하고{'\n'}메모를 추가해 보세요.
          </Text>
        </View>
      ) : (
        <FlatList
          data={noteEntries}
          keyExtractor={([key]) => key}
          renderItem={renderNoteItem}
          contentContainerStyle={styles.noteList}
        />
      )}

      {/* 메모 상세 모달 */}
      <Modal visible={showDetail} animationType="slide">
        <SafeAreaView style={styles.detailContainer} edges={['top', 'bottom']}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => { setShowDetail(false); setEditMode(false); }} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.detailVerseRef}>
              {selectedKey && getNoteVerseRef(selectedKey, notes[selectedKey])}
            </Text>
            <View style={styles.detailActions}>
              {editMode ? (
                <TouchableOpacity onPress={saveEdit} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>저장</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setEditMode(true)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={deleteNote} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.detailContent}>
              {editMode ? (
                <>
                  <TextInput
                    style={styles.detailTitleInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="제목"
                    placeholderTextColor={colors.textLight}
                    fontSize={20}
                    fontWeight="700"
                  />
                  <TextInput
                    style={styles.detailContentInput}
                    value={editContent}
                    onChangeText={setEditContent}
                    placeholder="내용을 입력하세요..."
                    placeholderTextColor={colors.textLight}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              ) : (
                <>
                  {editTitle ? (
                    <Text style={styles.detailTitle}>{editTitle}</Text>
                  ) : null}
                  <Text style={styles.detailText}>{editContent}</Text>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  headerCount: { fontSize: 14, color: colors.textSecondary },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    backgroundColor: '#f5f5f4',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14, color: colors.text },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  noteList: { padding: 12, gap: 8 },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  noteCardLeft: { flex: 1 },
  noteVerseRef: { fontSize: 11, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  noteTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  notePreview: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // 상세 화면
  detailContainer: { flex: 1, backgroundColor: '#fff' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  detailVerseRef: { flex: 1, fontSize: 13, color: colors.primary, fontWeight: '600' },
  detailActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  detailContent: { flex: 1, padding: 16 },
  detailTitle: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  detailText: { fontSize: 16, color: colors.text, lineHeight: 26 },
  detailTitleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailContentInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },
});
