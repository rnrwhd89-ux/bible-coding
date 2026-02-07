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

// 기존 500개는 불규칙하게 있어서 건너뛰기 불가 →
// 1차 업로드에서 CSV를 순서대로 처리했고 중복 제외 후 30,569개 중 25,000개 완료
// CSV 순서대로 갔으므로 skip할 인덱스는 기존 500개 제외 후의 순서
// 하지만 안전하게 하려면: 읽기 없이 CSV에서 25,000번째 이후만 올리기
const SKIP_COUNT = parseInt(process.argv[2] || '25000');
const BATCH_SIZE = 200;
const DELAY_MS = 3000;

async function uploadFromIndex() {
  console.log(`CSV에서 ${SKIP_COUNT}번째 이후 데이터만 업로드합니다.\n`);

  // CSV 파일 읽기
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

  console.log(`CSV 총 ${results.length}개 구절`);

  // 유효한 데이터만 필터링
  const validData = results.filter(row => row.book && row.chapter && row.verse && row.text);
  console.log(`유효 데이터: ${validData.length}개`);

  // SKIP_COUNT 이후만
  const newData = validData.slice(SKIP_COUNT);
  console.log(`업로드 대상: ${newData.length}개 (인덱스 ${SKIP_COUNT}부터)\n`);

  if (newData.length === 0) {
    console.log('✅ 업로드할 데이터가 없습니다!');
    process.exit(0);
    return;
  }

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

    if (batchCount === BATCH_SIZE) {
      let success = false;
      let retries = 0;

      while (!success && retries < 5) {
        try {
          await batch.commit();
          batchNum++;
          console.log(`배치 #${batchNum}: ${totalCount}/${newData.length}개 완료 (${Math.round(totalCount/newData.length*100)}%)`);
          success = true;
        } catch (err) {
          retries++;
          const wait = DELAY_MS * retries * 3;
          console.log(`실패 (시도 ${retries}/5): ${err.message.substring(0, 80)}`);
          console.log(`${wait/1000}초 대기 후 재시도...`);
          await new Promise(resolve => setTimeout(resolve, wait));
        }
      }

      if (!success) {
        console.error(`❌ 실패. ${totalCount - BATCH_SIZE}개까지 완료.`);
        console.log(`다음 실행 시: node upload-from-index.js ${SKIP_COUNT + totalCount - BATCH_SIZE}`);
        process.exit(1);
      }

      batch = db.batch();
      batchCount = 0;
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  if (batchCount > 0) {
    try {
      await batch.commit();
      batchNum++;
      console.log(`배치 #${batchNum}: ${totalCount}/${newData.length}개 완료 (100%)`);
    } catch (err) {
      console.error('마지막 배치 실패:', err.message);
      process.exit(1);
    }
  }

  console.log(`\n✅ 업로드 완료! ${totalCount}개 추가됨`);
  process.exit(0);
}

uploadFromIndex().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
