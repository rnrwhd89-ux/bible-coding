const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkGenesis1() {
  try {
    // 창세기 1장 데이터 확인 (인덱스 없이)
    const snapshot = await db.collection('bible')
      .where('book', '==', '창')
      .limit(100)
      .get();

    console.log(`창세기 총 구절 수: ${snapshot.size}`);

    // 1장만 필터링
    const chapter1 = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.chapter === 1) {
        chapter1.push(data);
      }
    });

    console.log(`창세기 1장 구절 수: ${chapter1.length}`);

    if (chapter1.length > 0) {
      // 절 순서대로 정렬
      chapter1.sort((a, b) => a.verse - b.verse);
      console.log('\n창세기 1장 처음 5개 구절:');
      chapter1.slice(0, 5).forEach(data => {
        console.log(`${data.verse}절: ${data.text}`);
      });
    } else {
      console.log('❌ 창세기 1장 데이터가 없습니다!');
    }

    process.exit(0);
  } catch (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
}

checkGenesis1();
