const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 데이터 개수 확인
async function checkData() {
  try {
    // 창세기 1장 데이터 확인
    const snapshot = await db.collection('bible')
      .where('book', '==', '창')
      .where('chapter', '==', 1)
      .orderBy('verse', 'asc')
      .get();

    console.log(`창세기 1장 구절 수: ${snapshot.size}`);

    if (snapshot.size > 0) {
      console.log('\n첫 3개 구절:');
      snapshot.docs.slice(0, 3).forEach(doc => {
        const data = doc.data();
        console.log(`${data.book} ${data.chapter}:${data.verse} - ${data.text}`);
      });
    }

    // 전체 데이터 개수
    const allSnapshot = await db.collection('bible').limit(1).get();
    console.log(`\nBible 컬렉션에 데이터 존재: ${!allSnapshot.empty}`);

    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

checkData();
