import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { bookList, colors, NT_START_INDEX } from '../constants';
import storage from '../storage';

export default function PlanScreen() {
  const [readingPlan, setReadingPlan] = useState({});
  const [expandedBook, setExpandedBook] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
    }, [])
  );

  const loadPlan = async () => {
    const rp = await storage.getReadingPlan();
    setReadingPlan(rp);
  };

  const getChapterKey = (bookName, ch) => `${bookName}_${ch}`;

  const toggleChapter = async (bookName, ch) => {
    const key = getChapterKey(bookName, ch);
    const newRP = { ...readingPlan, [key]: !readingPlan[key] };
    setReadingPlan(newRP);
    await storage.saveReadingPlan(newRP);
  };

  // 전체 통계
  const totalChapters = bookList.reduce((sum, b) => sum + b.chapters, 0);
  const completedChapters = bookList.reduce((sum, b) => {
    let count = 0;
    for (let c = 1; c <= b.chapters; c++) {
      if (readingPlan[getChapterKey(b.name, c)]) count++;
    }
    return sum + count;
  }, 0);
  const progressPercent = Math.round((completedChapters / totalChapters) * 100);

  const renderBook = ({ item: bookInfo, index }) => {
    const isNTStart = index === NT_START_INDEX;
    const completedInBook = Array.from({ length: bookInfo.chapters }, (_, i) => i + 1)
      .filter(c => readingPlan[getChapterKey(bookInfo.name, c)]).length;
    const isCompleted = completedInBook === bookInfo.chapters;
    const isExpanded = expandedBook === bookInfo.name;

    return (
      <View>
        {isNTStart && (
          <View style={styles.testamentDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>신약</Text>
            <View style={styles.dividerLine} />
          </View>
        )}

        <TouchableOpacity
          style={[styles.bookRow, isCompleted && styles.bookRowCompleted]}
          onPress={() => setExpandedBook(isExpanded ? null : bookInfo.name)}
        >
          <View style={styles.bookInfo}>
            <Text style={[styles.bookName, isCompleted && styles.bookNameCompleted]}>
              {bookInfo.name}
            </Text>
            <Text style={styles.bookProgress}>
              {completedInBook}/{bookInfo.chapters}장
            </Text>
          </View>

          {/* 진행률 바 */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${(completedInBook / bookInfo.chapters) * 100}%`,
                  backgroundColor: isCompleted ? '#10B981' : colors.primary,
                },
              ]}
            />
          </View>

          <Text style={[styles.bookPercent, isCompleted && styles.bookPercentCompleted]}>
            {isCompleted ? '✓' : `${Math.round((completedInBook / bookInfo.chapters) * 100)}%`}
          </Text>
        </TouchableOpacity>

        {/* 장 그리드 (펼침) */}
        {isExpanded && (
          <View style={styles.chapterGrid}>
            {Array.from({ length: bookInfo.chapters }, (_, i) => i + 1).map((c) => {
              const isDone = readingPlan[getChapterKey(bookInfo.name, c)];
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chapterBtn, isDone && styles.chapterBtnDone]}
                  onPress={() => toggleChapter(bookInfo.name, c)}
                >
                  <Text style={[styles.chapterBtnText, isDone && styles.chapterBtnTextDone]}>
                    {isDone ? '✓' : c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 전체 진행률 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>읽기표</Text>
        <View style={styles.overallProgress}>
          <View style={styles.overallStats}>
            <Text style={styles.overallNum}>{completedChapters}</Text>
            <Text style={styles.overallDenom}>/{totalChapters} 장</Text>
            <Text style={styles.overallPercent}>{progressPercent}%</Text>
          </View>
          <View style={styles.overallBarContainer}>
            <View style={[styles.overallBar, { width: `${progressPercent}%` }]} />
          </View>
        </View>
      </View>

      {/* 구약 레이블 */}
      <View style={styles.testamentLabel}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>구약</Text>
        <View style={styles.dividerLine} />
      </View>

      <FlatList
        data={bookList}
        keyExtractor={(item) => item.name}
        renderItem={renderBook}
        contentContainerStyle={styles.bookList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 12 },
  overallProgress: { gap: 8 },
  overallStats: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  overallNum: { fontSize: 28, fontWeight: '700', color: colors.primary },
  overallDenom: { fontSize: 14, color: colors.textSecondary },
  overallPercent: { fontSize: 16, fontWeight: '600', color: colors.primary, marginLeft: 8 },
  overallBarContainer: {
    height: 8,
    backgroundColor: '#e7e5e4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  testamentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  testamentDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    marginTop: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },

  bookList: { paddingHorizontal: 12, paddingBottom: 40 },

  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookRowCompleted: { borderColor: '#10B981', backgroundColor: '#f0fdf4' },
  bookInfo: { width: 90 },
  bookName: { fontSize: 14, fontWeight: '600', color: colors.text },
  bookNameCompleted: { color: '#059669' },
  bookProgress: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },

  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#e7e5e4',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', borderRadius: 3 },

  bookPercent: { fontSize: 13, fontWeight: '700', color: colors.primary, minWidth: 30, textAlign: 'right' },
  bookPercentCompleted: { color: '#10B981' },

  chapterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: '#fafaf9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#e7e5e4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterBtnDone: { backgroundColor: '#10B981' },
  chapterBtnText: { fontSize: 13, color: colors.text },
  chapterBtnTextDone: { color: '#fff', fontWeight: '700' },
});
