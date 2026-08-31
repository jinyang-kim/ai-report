import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CATEGORIES = ['kr-daily', 'it-ai', 'global-ui-ux'];

for (const cat of CATEGORIES) {
  const dir = join('src/content', cat);
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    continue; // 카테고리 디렉터리 없으면 건너뜀
  }
  for (const f of files) {
    const p = join(dir, f);
    let txt = readFileSync(p, 'utf8');
    if (/^\s*generatedBy:/m.test(txt)) {
      console.log('skip (이미 처리):', p);
      continue;
    }
    const m = txt.match(/^date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/m);
    const date = m ? m[1] : f.replace(/\.md$/, '');
    const inject =
      `schemaVersion: "1.0"\n` +
      `generatedBy: "manual"\n` +
      `generatedAt: "${date}T09:00:00+09:00"`;
    // 파일 시작의 여는 --- 에는 앞 개행이 없으므로, 첫 \n---\n 이 닫는 구분선.
    const next = txt.replace(/\n---\n/, `\n${inject}\n---\n`);
    if (next === txt) {
      console.warn('skip (프론트매터 구분선 못 찾음):', p);
      continue;
    }
    writeFileSync(p, next);
    console.log('migrated:', p);
  }
}
