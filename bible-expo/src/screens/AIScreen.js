import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants';
import storage from '../storage';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

function buildSystemPrompt(verseRef, verseText) {
  if (verseRef && verseText) {
    return `당신은 성경 전문가입니다. 성경 말씀을 깊이 이해하고 설명해 주세요.\n\n현재 대화는 다음 성경 구절과 관련이 있습니다:\n[${verseRef}]\n${verseText}\n\n이 구절에 대한 질문에 성실하게 답변해 주세요. 한국어로 답변해 주세요.`;
  }
  return '당신은 성경 전문가입니다. 성경 말씀을 깊이 이해하고 설명해 주세요. 사용자의 질문에 성실하게 답변해 주세요. 한국어로 답변해 주세요.';
}

async function callGemini(apiKey, messages, systemPrompt) {
  const contents = messages.map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { maxOutputTokens: 2000 },
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || '응답 오류');
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default function AIScreen({ route }) {
  // route.params에서 성경 절 정보 받기 (BibleScreen에서 전달)
  const initialVerseRef = route?.params?.verseRef;
  const initialVerseText = route?.params?.verseText;

  const [chats, setChats] = useState([]);  // 채팅방 목록
  const [currentChat, setCurrentChat] = useState(null);  // 현재 채팅방
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const flatListRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // BibleScreen에서 절 정보와 함께 탭 전환 시 새 채팅 생성
  useEffect(() => {
    if (initialVerseRef && initialVerseText) {
      createNewChat(initialVerseRef, initialVerseText);
    }
  }, [initialVerseRef, initialVerseText]);

  const loadData = async () => {
    const [savedChats, savedKey] = await Promise.all([
      storage.getAIChats(),
      storage.getGeminiKey(),
    ]);
    setChats(savedChats);
    setApiKey(savedKey);
    if (!savedKey) setShowApiKeyModal(true);
  };

  const saveChats = async (updatedChats) => {
    setChats(updatedChats);
    await storage.saveAIChats(updatedChats);
  };

  // 새 채팅 생성
  const createNewChat = useCallback((verseRef = null, verseText = null) => {
    const newChat = {
      id: Date.now().toString(),
      title: verseRef || '새 채팅',
      verseRef,
      verseText,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    setCurrentChat(newChat);
    setMessages([]);
  }, []);

  // 채팅방 선택
  const openChat = (chat) => {
    setCurrentChat(chat);
    setMessages(chat.messages || []);
  };

  // 채팅방 삭제
  const deleteChat = async (chatId) => {
    Alert.alert('삭제', '이 채팅을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const updated = chats.filter(c => c.id !== chatId);
          await saveChats(updated);
          if (currentChat?.id === chatId) {
            setCurrentChat(null);
            setMessages([]);
          }
        },
      },
    ]);
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const userMsg = { role: 'user', content: input.trim(), timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // 스크롤
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const systemPrompt = buildSystemPrompt(currentChat?.verseRef, currentChat?.verseText);
      const aiText = await callGemini(apiKey, newMessages, systemPrompt);
      const aiMsg = { role: 'assistant', content: aiText, timestamp: Date.now() };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // 채팅방 저장
      let chatToSave = currentChat;
      if (!chatToSave) {
        chatToSave = {
          id: Date.now().toString(),
          title: userMsg.content.slice(0, 30),
          verseRef: null,
          verseText: null,
          createdAt: new Date().toISOString(),
          messages: [],
        };
        setCurrentChat(chatToSave);
      }
      chatToSave = { ...chatToSave, messages: finalMessages };
      setCurrentChat(chatToSave);

      const existingIdx = chats.findIndex(c => c.id === chatToSave.id);
      let updatedChats;
      if (existingIdx >= 0) {
        updatedChats = chats.map(c => c.id === chatToSave.id ? chatToSave : c);
      } else {
        updatedChats = [chatToSave, ...chats];
      }
      await saveChats(updatedChats);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      Alert.alert('오류', `응답 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // API 키 저장
  const saveApiKey = async () => {
    await storage.saveGeminiKey(apiKeyInput);
    setApiKey(apiKeyInput);
    setShowApiKeyModal(false);
    setApiKeyInput('');
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAI]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>AI</Text>
          </View>
        )}
        <View style={[styles.msgBubble, isUser ? styles.msgBubbleUser : styles.msgBubbleAI]}>
          <Text style={[styles.msgText, isUser ? styles.msgTextUser : styles.msgTextAI]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  const renderChatItem = ({ item }) => (
    <Pressable
      style={styles.chatItem}
      onPress={() => openChat(item)}
      onLongPress={() => deleteChat(item.id)}
    >
      {item.verseRef && (
        <Text style={styles.chatItemVerse}>{item.verseRef}</Text>
      )}
      <Text style={styles.chatItemTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.chatItemDate}>
        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        {' · '}
        {item.messages?.length || 0}개 메시지
      </Text>
    </Pressable>
  );

  // 채팅 목록 화면
  if (!currentChat) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>AI 성경 채팅</Text>
          <TouchableOpacity
            style={styles.newChatBtn}
            onPress={() => createNewChat()}
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.newChatBtnText}>새 채팅</Text>
          </TouchableOpacity>
        </View>

        {!apiKey && (
          <TouchableOpacity style={styles.apiKeyBanner} onPress={() => setShowApiKeyModal(true)}>
            <Ionicons name="key-outline" size={16} color="#92400e" />
            <Text style={styles.apiKeyBannerText}>Gemini API 키를 설정해 주세요</Text>
            <Ionicons name="chevron-forward" size={16} color="#92400e" />
          </TouchableOpacity>
        )}

        {chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color={colors.textLight} />
            <Text style={styles.emptyTitle}>아직 대화가 없습니다</Text>
            <Text style={styles.emptyText}>성경 본문에서 절을 선택하고 AI 질문을 누르거나{'\n'}새 채팅을 시작해 보세요.</Text>
            <TouchableOpacity style={styles.startChatBtn} onPress={() => createNewChat()}>
              <Text style={styles.startChatBtnText}>채팅 시작하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(item) => item.id}
            renderItem={renderChatItem}
            contentContainerStyle={{ padding: 16, gap: 8 }}
          />
        )}

        {/* API 키 모달 */}
        <Modal visible={showApiKeyModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Gemini API 키 설정</Text>
                <TouchableOpacity onPress={() => setShowApiKeyModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.apiKeyDesc}>
                Google AI Studio에서 무료로 발급받은 API 키를 입력해 주세요.{'\n'}
                키는 기기에만 저장됩니다.
              </Text>
              <TextInput
                style={styles.apiKeyInput}
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChangeText={setApiKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={colors.textLight}
              />
              <TouchableOpacity style={styles.saveKeyBtn} onPress={saveApiKey}>
                <Text style={styles.saveKeyBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // 채팅 화면
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => setCurrentChat(null)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          {currentChat.verseRef ? (
            <>
              <Text style={styles.chatHeaderVerse}>{currentChat.verseRef}</Text>
              <Text style={styles.chatHeaderTitle} numberOfLines={1}>{currentChat.title}</Text>
            </>
          ) : (
            <Text style={styles.chatHeaderTitle}>{currentChat.title}</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowApiKeyModal(true)} style={styles.keyBtn}>
          <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {currentChat.verseRef && currentChat.verseText && (
        <View style={styles.verseContextBox}>
          <Text style={styles.verseContextRef}>{currentChat.verseRef}</Text>
          <Text style={styles.verseContextText} numberOfLines={3}>{currentChat.verseText}</Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.emptyChatContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyChatText}>
                {currentChat.verseRef
                  ? `${currentChat.verseRef}에 대해 질문해 보세요`
                  : '성경에 대해 무엇이든 질문해 보세요'}
              </Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>AI가 답변 중...</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="질문을 입력하세요..."
            placeholderTextColor={colors.textLight}
            multiline
            maxLength={1000}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || isLoading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* API 키 모달 */}
      <Modal visible={showApiKeyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gemini API 키 설정</Text>
              <TouchableOpacity onPress={() => setShowApiKeyModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.apiKeyDesc}>
              Google AI Studio에서 무료로 발급받은 API 키를 입력해 주세요.
            </Text>
            <TextInput
              style={styles.apiKeyInput}
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.textLight}
            />
            <TouchableOpacity style={styles.saveKeyBtn} onPress={saveApiKey}>
              <Text style={styles.saveKeyBtnText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // 채팅 목록
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newChatBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  apiKeyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  apiKeyBannerText: { flex: 1, fontSize: 13, color: '#92400e' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12, marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  startChatBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  startChatBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  chatItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatItemVerse: { fontSize: 11, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  chatItemTitle: { fontSize: 15, color: colors.text, fontWeight: '600', marginBottom: 4 },
  chatItemDate: { fontSize: 12, color: colors.textLight },

  // 채팅 헤더
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backBtn: { padding: 4 },
  chatHeaderInfo: { flex: 1 },
  chatHeaderVerse: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  chatHeaderTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  keyBtn: { padding: 4 },

  verseContextBox: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  verseContextRef: { fontSize: 12, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  verseContextText: { fontSize: 13, color: colors.text, lineHeight: 18 },

  // 메시지
  messageList: { padding: 16, gap: 12, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  aiAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  msgBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  msgBubbleAI: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgText: { fontSize: 15, lineHeight: 22 },
  msgTextUser: { color: '#fff' },
  msgTextAI: { color: colors.text },

  emptyChatContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyChatText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  loadingText: { fontSize: 13, color: colors.textSecondary },

  // 입력
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.textLight },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  apiKeyDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },
  apiKeyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    color: colors.text,
  },
  saveKeyBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveKeyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
