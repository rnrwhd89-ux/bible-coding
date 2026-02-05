const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

// Firebase Admin SDK 초기화
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// CSV 파일 읽기 및 Firestore에 업로드 (20,000개 이후부터)
async function uploadBibleData() {
  const results = [];

  console.log('CSV 파일을 읽는 중...');

  fs.createReadStream('./bible.csv')
    .pipe(csv({ skipLines: 0 }))
    .on('data', (data) => {
      // BOM 제거
      const cleanData = {};
      for (const key in data) {
        const cleanKey = key.replace(/^\uFEFF/, '');
        cleanData[cleanKey] = data[key];
      }
      results.push(cleanData);
    })
    .on('end', async () => {
      console.log(`총 ${results.length}개의 구절을 읽었습니다.`);

      // 20,000개 건너뛰기
      const skipCount = 20000;
      const remainingData = results.slice(skipCount);
      console.log(`${skipCount}개를 건너뛰고 ${remainingData.length}개를 업로드합니다.`);

      let batch = db.batch();
      let batchCount = 0;
      let totalCount = skipCount;

      for (const row of remainingData) {
        // 빈 데이터 건너뛰기
        if (!row.book || !row.chapter || !row.verse || !row.text) {
          console.log('빈 데이터 건너뜀:', row);
          continue;
        }

        const docRef = db.collection('bible').doc();
        batch.set(docRef, {
          book: row.book.trim(),
          chapter: parseInt(row.chapter),
          verse: parseInt(row.verse),
          text: row.text.trim()
        });

        batchCount++;
        totalCount++;

        // Firestore batch는 최대 500개까지만 가능
        if (batchCount === 500) {
          await batch.commit();
          console.log(`${totalCount}개 업로드 완료...`);
          batch = db.batch(); // 새로운 배치 생성
          batchCount = 0;

          // Quota 초과 방지를 위한 딜레이 (2초)
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // 남은 데이터 커밋
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`✅ 총 ${totalCount}개의 구절이 성공적으로 업로드되었습니다!`);
      process.exit(0);
    });
}

uploadBibleData().catch(console.error);
