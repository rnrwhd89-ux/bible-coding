const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Bible 컬렉션의 모든 데이터 삭제
async function deleteAllBibleData() {
  try {
    console.log('Bible 컬렉션 데이터 삭제 시작...');

    const batchSize = 500;
    let deletedCount = 0;

    while (true) {
      const snapshot = await db.collection('bible').limit(batchSize).get();

      if (snapshot.size === 0) {
        break;
      }

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      deletedCount += snapshot.size;
      console.log(`${deletedCount}개 삭제됨...`);

      // Quota 초과 방지를 위한 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ 총 ${deletedCount}개의 문서가 삭제되었습니다!`);
    process.exit(0);
  } catch (error) {
    console.error('삭제 오류:', error);
    process.exit(1);
  }
}

deleteAllBibleData();
