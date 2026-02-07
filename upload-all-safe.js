const admin = require('firebase-admin');
const fs = require('fs');
const csv = require('csv-parser');

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

async function uploadBibleData() {
  // 1단계: 기존 데이터에서 이미 있는 구절 키 수집
  console.log('1단계: 기존 Firestore 데이터 확인 중...');
  const existingSnapshot = await db.collection('bible').get();
  const existingKeys = new Set();
  existingSnapshot.docs.forEach(doc => {
    const d = doc.data();
    existingKeys.add(`${d.book}_${d.chapter}_${d.verse}`);
  });
  console.log(`기존 데이터: ${existingKeys.size}개 구절 (유지됨)\n`);

  // 2단계: CSV 파일 읽기
  console.log('2단계: CSV 파일 읽는 중...');
  const results = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream('./bible.csv')
      .pipe(csv({ skipLines: 0 }))
      .on('data', (data) => {
        const cleanData = {};
        for (const key in data) {
          const cleanKey = key.replace(/^\uFEFF/, '');
          cleanData[cleanKey] = data[key];
        }
        results.push(cleanData);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`CSV에서 ${results.length}개 구절 읽음`);

  // 3단계: 중복 제외하고 새 데이터만 필터링
  const newData = results.filter(row => {
    if (!row.book || !row.chapter || !row.verse || !row.text) return false;
    const key = `${row.book.trim()}_${parseInt(row.chapter)}_${parseInt(row.verse)}`;
    return !existingKeys.has(key);
  });

  console.log(`새로 업로드할 구절: ${newData.length}개\n`);

  if (newData.length === 0) {
    console.log('✅ 모든 데이터가 이미 업로드되어 있습니다!');
    process.exit(0);
    return;
  }

  // 4단계: 배치 업로드
  console.log('3단계: 업로드 시작...');
  let batch = db.batch();
  let batchCount = 0;
  let totalCount = 0;
  let batchNum = 0;

  for (const row of newData) {
    const docRef = db.collection('bible').doc();
    batch.set(docRef, {
      book: row.book.trim(),
      chapter: parseInt(row.chapter),
      verse: parseInt(row.verse),
      text: row.text.trim()
    });

    batchCount++;
    totalCount++;

    if (batchCount === 500) {
      try {
        await batch.commit();
        batchNum++;
        console.log(`배치 #${batchNum}: ${totalCount}/${newData.length}개 완료 (${Math.round(totalCount/newData.length*100)}%)`);
      } catch (err) {
        console.error(`배치 #${batchNum + 1} 실패:`, err.message);
        console.log('3초 후 재시도...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
          await batch.commit();
          batchNum++;
          console.log(`배치 #${batchNum}: ${totalCount}/${newData.length}개 완료 (재시도 성공)`);
        } catch (retryErr) {
          console.error('재시도 실패:', retryErr.message);
          process.exit(1);
        }
      }
      batch = db.batch();
      batchCount = 0;

      // Quota 초과 방지 딜레이
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  // 남은 데이터 커밋
  if (batchCount > 0) {
    await batch.commit();
    batchNum++;
    console.log(`배치 #${batchNum}: ${totalCount}/${newData.length}개 완료 (100%)`);
  }

  console.log(`\n✅ 업로드 완료!`);
  console.log(`   기존 유지: ${existingKeys.size}개`);
  console.log(`   새로 추가: ${totalCount}개`);
  console.log(`   총 구절 수: ${existingKeys.size + totalCount}개`);
  process.exit(0);
}

uploadBibleData().catch(err => {
  console.error('오류 발생:', err);
  process.exit(1);
});
