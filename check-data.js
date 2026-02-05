const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkData() {
  try {
    // 전체 데이터 개수 확인 (간단한 쿼리)
    const snapshot = await db.collection('bible').limit(10).get();

    console.log(`Bible 컬렉션에 ${snapshot.size}개의 문서가 있습니다.`);

    if (snapshot.size > 0) {
      console.log('\n첫 10개 데이터:');
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`${data.book} ${data.chapter}:${data.verse} - ${data.text.substring(0, 30)}...`);
      });

      // 창세기 데이터가 있는지 확인
      const genesisSnapshot = await db.collection('bible')
        .where('book', '==', '창')
        .limit(5)
        .get();

      console.log(`\n창세기 데이터: ${genesisSnapshot.size}개`);
      genesisSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`${data.book} ${data.chapter}:${data.verse}`);
      });

    } else {
      console.log('❌ Bible 컬렉션에 데이터가 없습니다!');
    }

    process.exit(0);
  } catch (error) {
    console.error('오류:', error.message);
    process.exit(1);
  }
}

checkData();
