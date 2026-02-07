const admin = require('firebase-admin');

// Firebase Admin SDK 초기화
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // already initialized
}

const db = admin.firestore();

async function checkCount() {
  console.log('Firestore bible 컬렉션 데이터 확인 중...\n');

  // 전체 문서 수 확인
  const snapshot = await db.collection('bible').get();
  console.log(`총 문서 수: ${snapshot.size}`);

  // 책별로 그룹핑
  const bookCounts = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const key = data.book;
    if (!bookCounts[key]) bookCounts[key] = new Set();
    bookCounts[key].add(`${data.chapter}_${data.verse}`);
  });

  console.log('\n책별 구절 수:');
  const sortedBooks = Object.keys(bookCounts).sort();
  for (const book of sortedBooks) {
    console.log(`  ${book}: ${bookCounts[book].size}개`);
  }

  process.exit(0);
}

checkCount().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
