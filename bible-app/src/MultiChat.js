import React, { useState, useEffect, useRef } from 'react';
import {
  createChatRoom,
  getChatRooms,
  subscribeToChatRooms,
  sendMessage,
  subscribeToMessages
} from './firebase';

export default function MultiChat({ user }) {
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const messagesEndRef = useRef(null);

  // 채팅방 목록 실시간 구독
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToChatRooms((rooms) => {
      setChatRooms(rooms);
    });

    return () => unsubscribe();
  }, [user]);

  // 선택된 채팅방의 메시지 실시간 구독
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(selectedRoom.id, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  // 메시지 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 채팅방 생성
  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    try {
      await createChatRoom(newRoomName, user.uid, user.displayName || '익명');
      setNewRoomName('');
      setShowCreateRoom(false);
    } catch (error) {
      alert('채팅방 생성에 실패했습니다.');
    }
  };

  // 메시지 전송
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      await sendMessage(
        selectedRoom.id,
        user.uid,
        user.displayName || '익명',
        newMessage
      );
      setNewMessage('');
    } catch (error) {
      alert('메시지 전송에 실패했습니다.');
    }
  };

  // 시간 포맷팅
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={styles.container}>
      {/* 채팅방 목록 */}
      <div style={styles.roomList}>
        <div style={styles.roomListHeader}>
          <h3 style={styles.roomListTitle}>채팅방</h3>
          <button onClick={() => setShowCreateRoom(true)} style={styles.createRoomBtn}>
            +
          </button>
        </div>

        {showCreateRoom && (
          <div style={styles.createRoomForm}>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="채팅방 이름"
              style={styles.createRoomInput}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <div style={styles.createRoomBtns}>
              <button onClick={handleCreateRoom} style={styles.createBtn}>생성</button>
              <button onClick={() => setShowCreateRoom(false)} style={styles.cancelBtn}>취소</button>
            </div>
          </div>
        )}

        <div style={styles.roomListContent}>
          {chatRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              style={{
                ...styles.roomItem,
                ...(selectedRoom?.id === room.id ? styles.roomItemSelected : {})
              }}
            >
              <div style={styles.roomName}>{room.name}</div>
              <div style={styles.roomLastMessage}>
                {room.lastMessage || '메시지가 없습니다'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 채팅 영역 */}
      <div style={styles.chatArea}>
        {selectedRoom ? (
          <>
            <div style={styles.chatHeader}>
              <h3 style={styles.chatRoomName}>{selectedRoom.name}</h3>
            </div>

            <div style={styles.messagesArea}>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    ...styles.message,
                    ...(msg.userId === user.uid ? styles.myMessage : styles.otherMessage)
                  }}
                >
                  {msg.userId !== user.uid && (
                    <div style={styles.messageUser}>{msg.userName}</div>
                  )}
                  <div style={styles.messageContent}>{msg.message}</div>
                  <div style={styles.messageTime}>{formatTime(msg.createdAt)}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={styles.messageForm}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                style={styles.messageInput}
              />
              <button type="submit" style={styles.sendBtn}>전송</button>
            </form>
          </>
        ) : (
          <div style={styles.noRoomSelected}>
            <p>채팅방을 선택해주세요</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    backgroundColor: '#f5f5f5'
  },
  roomList: {
    width: '300px',
    borderRight: '1px solid #ddd',
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column'
  },
  roomListHeader: {
    padding: '15px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  roomListTitle: {
    margin: 0,
    fontSize: '18px'
  },
  createRoomBtn: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#4CAF50',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createRoomForm: {
    padding: '15px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#f9f9f9'
  },
  createRoomInput: {
    width: '100%',
    padding: '8px',
    marginBottom: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  createRoomBtns: {
    display: 'flex',
    gap: '5px'
  },
  createBtn: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  cancelBtn: {
    flex: 1,
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  roomListContent: {
    flex: 1,
    overflowY: 'auto'
  },
  roomItem: {
    padding: '15px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  roomItemSelected: {
    backgroundColor: '#e3f2fd'
  },
  roomName: {
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '14px'
  },
  roomLastMessage: {
    fontSize: '12px',
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#fff'
  },
  chatHeader: {
    padding: '15px',
    borderBottom: '1px solid #ddd',
    backgroundColor: '#fff'
  },
  chatRoomName: {
    margin: 0,
    fontSize: '18px'
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
    backgroundColor: '#fafafa'
  },
  message: {
    marginBottom: '15px',
    maxWidth: '70%',
    padding: '10px',
    borderRadius: '8px',
    wordWrap: 'break-word'
  },
  myMessage: {
    marginLeft: 'auto',
    backgroundColor: '#4CAF50',
    color: '#fff',
    textAlign: 'right'
  },
  otherMessage: {
    marginRight: 'auto',
    backgroundColor: '#fff',
    border: '1px solid #ddd'
  },
  messageUser: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#666'
  },
  messageContent: {
    fontSize: '14px',
    marginBottom: '5px'
  },
  messageTime: {
    fontSize: '11px',
    opacity: 0.7
  },
  messageForm: {
    display: 'flex',
    padding: '15px',
    borderTop: '1px solid #ddd',
    backgroundColor: '#fff'
  },
  messageInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    marginRight: '10px'
  },
  sendBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#4CAF50',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  noRoomSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#999',
    fontSize: '16px'
  }
};
