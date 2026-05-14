import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const CSV_PATH  = path.join(ROOT, 'image-mapping.csv');
const SRC_DIR   = path.join(ROOT, 'raw-product-images');
const DEST_DIR  = path.join(ROOT, 'public', 'images', 'products');

// product-{두 자리 상품 ID}-{color}.png
const TARGET_RE     = /^product-\d{2}-[a-z0-9-]+\.png$/;
const EXPECTED_ROWS = 60;

// ── CSV parser (따옴표로 감싼 필드 지원) ──────────────────────
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  const rows  = [];
  let headerSkipped = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!headerSkipped) {
      // 헤더 행 검증
      if (!/^source\s*,\s*target/i.test(line)) {
        throw new Error(`CSV 헤더가 올바르지 않습니다: "${line}"\n예상 형식: source,target`);
      }
      headerSkipped = true;
      continue;
    }

    let source, target;

    if (line.startsWith('"')) {
      // 따옴표로 감싼 source 파싱
      let i = 1;
      let buf = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { buf += '"'; i += 2; } // escaped quote
          else { i++; break; }
        } else {
          buf += line[i++];
        }
      }
      if (line[i] !== ',') {
        throw new Error(`CSV 행 파싱 오류 (쉼표 없음): ${line}`);
      }
      source = buf;
      target = line.slice(i + 1).trim();
    } else {
      const comma = line.indexOf(',');
      if (comma === -1) throw new Error(`CSV 행에 쉼표가 없습니다: ${line}`);
      source = line.slice(0, comma).trim();
      target = line.slice(comma + 1).trim();
    }

    // 따옴표 제거 (target에 따옴표가 있는 경우)
    if (target.startsWith('"') && target.endsWith('"')) {
      target = target.slice(1, -1);
    }

    rows.push({ source, target });
  }

  return rows;
}

// ── 검증 ──────────────────────────────────────────────────────
function validate(rows) {
  const errors = [];

  // 총 행 수 확인
  if (rows.length !== EXPECTED_ROWS) {
    errors.push(`총 행 수가 ${EXPECTED_ROWS}개여야 합니다 (현재: ${rows.length}개)`);
  }

  // source 파일 존재 여부 + target 형식 확인
  const missingSources = [];
  for (const { source, target } of rows) {
    const srcPath = path.join(SRC_DIR, source);
    if (!fs.existsSync(srcPath)) {
      missingSources.push(`  - ${source}`);
    }
    if (!TARGET_RE.test(target)) {
      errors.push(`target 파일명 형식 오류: "${target}"\n  올바른 형식: product-{두 자리 ID}-{color}.png (예: product-01-black.png)`);
    }
  }

  if (missingSources.length > 0) {
    errors.push(`source 파일이 존재하지 않습니다:\n${missingSources.join('\n')}`);
  }

  return errors;
}

// ── 메인 ──────────────────────────────────────────────────────
function main() {
  console.log('=== KEEP 상품 이미지 매핑 스크립트 ===\n');

  // CSV 읽기
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`오류: CSV 파일이 없습니다: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  if (!csvContent.trim()) {
    console.error('오류: image-mapping.csv 파일이 비어 있습니다.');
    console.error('      파일에 source,target 형식의 매핑을 채워주세요.');
    process.exit(1);
  }

  let rows;
  try {
    rows = parseCSV(csvContent);
  } catch (err) {
    console.error(`CSV 파싱 오류: ${err.message}`);
    process.exit(1);
  }

  console.log(`CSV 파싱 완료: ${rows.length}개 행\n`);

  // 검증 (source 파일 부재 시 즉시 중단)
  const errors = validate(rows);
  if (errors.length > 0) {
    console.error('검증 실패 — 오류를 수정 후 다시 실행해주세요:\n');
    errors.forEach(e => console.error(`✗ ${e}\n`));
    process.exit(1);
  }

  console.log('검증 통과\n');

  // 대상 폴더 생성
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
    console.log(`폴더 생성: ${DEST_DIR}\n`);
  }

  // 복사
  let copied  = 0;
  let skipped = 0;

  for (const { source, target } of rows) {
    const srcPath  = path.join(SRC_DIR, source);
    const destPath = path.join(DEST_DIR, target);

    if (fs.existsSync(destPath)) {
      console.warn(`[WARN] 덮어쓰기: ${target}`);
      skipped++;
    }

    fs.copyFileSync(srcPath, destPath);
    console.log(`  [OK] ${source} -> ${target}`);
    copied++;
  }

  console.log(`\n완료: ${copied}개 복사 (${skipped}개 덮어쓰기)`);
  console.log(`대상 폴더: ${DEST_DIR}`);
}

main();
