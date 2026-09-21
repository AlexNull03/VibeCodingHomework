/* Node 自测：js/crypto.js + js/stego.js（对应 target.md 10.1/10.2）
 * 运行：node test/selftest.js
 * 说明：PBKDF2 10 万次迭代较慢，共约 30+ 次派生，预计 1~3 分钟。 */
'use strict';
const SC = require('../js/crypto.js');
const SI = require('../js/stego.js');

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; console.log('PASS  ' + name); }
  else { failed++; console.log('FAIL  ' + name); }
}
async function t(name, fn) {
  try { await fn(); } catch (e) { failed++; console.log('FAIL  ' + name + '  (抛出: ' + e.code + ' ' + e.message + ')'); }
}

// ---- 合成图像：噪声图（纹理丰富、边缘多）与平滑图 ----
function makeNoiseImage(w, h, seed) {
  let s = seed >>> 0;
  const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = Math.floor(rnd() * 256);
    data[i * 4 + 1] = Math.floor(rnd() * 256);
    data[i * 4 + 2] = Math.floor(rnd() * 256);
    data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h };
}
function makeFlatImage(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 120; data[i * 4 + 1] = 130; data[i * 4 + 2] = 140; data[i * 4 + 3] = 255;
  }
  return { data, width: w, height: h };
}
function cloneImg(img) { return { data: new Uint8ClampedArray(img.data), width: img.width, height: img.height }; }

(async () => {
  const PW = 'correct horse battery staple';

  // 固定时钟：严格时效下窗口边界会让用例抖动，这里钉在"整点+30s"（对 60/300/3600 秒窗口都落在窗口内部）
  const REAL_NOW = Date.now;
  const T0 = Math.floor(REAL_NOW() / 3600000) * 3600 + 1830; // 秒（对 60/300/3600 窗口都在窗口内部）
  const at = (sec) => { Date.now = () => sec * 1000; };
  at(T0);

  // ===== 1. 盐字段插入/取出互逆（纯字符串层） =====
  {
    const B = SC.b32encode(crypto.getRandomValues(new Uint8Array(90))); // base32 无填充，纯 A-Z2-7
    const S = SC.timedSaltField(3600);
    const C = SC.insertSalt(B, S);
    ok(C.length === B.length + 16, '1.1 插入后长度 +16（非替换）');
    ok(SC.extractSalt(C) === S, '1.2 盐字段按字符索引 16..31 取出');
    ok(SC.restoreB(C) === B, '1.3 复原 B 与原 B 逐字符相同');
    ok(/^[A-Z0-9]+$/.test(C), '1.4 密文字符集不含任何特殊字符');
    let rt = true;
    for (let n = 0; n <= 40; n++) { const bytes = crypto.getRandomValues(new Uint8Array(n)); if (SC.b32decode(SC.b32encode(bytes)).join(',') !== bytes.join(',')) rt = false; }
    ok(rt, '1.5 base32 编码/解码 0~40 字节往返一致');
    let rp = true, durs = [60, 61, 3599, 3600, 86399, 86400, 315359999, 315360000, 1 << 28];
    for (const d of durs) { const f = SC.timedSaltField(d); if (!/^[A-Z2-7]{16}$/.test(f) || SC.parseDuration(f) !== d) rp = false; }
    ok(rp, '1.6 有效时间在 60~315360000 全范围编/解互逆，字段恒为 16 位 base32');
    let fp = 0;
    for (let i = 0; i < 2000; i++) { const f = SC.b32encode(crypto.getRandomValues(new Uint8Array(10))); if (Number.isInteger(SC.parseDuration(f))) fp++; }
    ok(fp <= 4, '1.7 随机盐字段极少被误认成时效参数（误读 ' + fp + '/2000，且最终以解密验签为准）');
  }

  // ===== 2. 无时效往返 =====
  {
    const r = await SC.encrypt(PW, '你好，世界 hello', null);
    ok(/^[A-Z0-9]+$/.test(r.cipher) && r.cipher.length > 32, '2.1 密文为纯字母数字且已插入盐字段');
    const d = await SC.decrypt(r.cipher, PW, 'untimed');
    ok(d.plaintext === '你好，世界 hello' && !d.timed, '2.2 无时效 加/解密 往返一致');
    const da = await SC.decrypt(r.cipher, PW, 'auto');
    ok(da.plaintext === '你好，世界 hello' && da.modeUsed === 'untimed', '2.3 自动模式先按无时效解出');
    await t('2.4 错误口令被拒', async () => {
      try { await SC.decrypt(r.cipher, 'wrong pw', 'untimed'); ok(false, '2.4 未抛错'); }
      catch (e) { ok(e.code === 'WRONG_KEY_OR_EXPIRED', '2.4 错误口令 → WRONG_KEY_OR_EXPIRED'); }
    });
    await t('2.5 篡改密文被拒', async () => {
      const bad = r.cipher.slice(0, 40) + (r.cipher[40] === 'A' ? 'B' : 'A') + r.cipher.slice(41);
      try { await SC.decrypt(bad, PW, 'untimed'); ok(false, '2.5 未抛错'); }
      catch (e) { ok(e.code === 'WRONG_KEY_OR_EXPIRED' || e.code === 'NOT_FRAME', '2.5 篡改 → GCM 验签/结构失败'); }
    });
    await t('2.6 选项与密文不符 → 定向提示', async () => {
      try { await SC.decrypt(r.cipher, PW, 'timed'); ok(false, '2.6 未抛错'); }
      catch (e) { ok(e.code === 'MODE_MISMATCH', '2.6 无时效密文选手动"有时效" → MODE_MISMATCH'); }
    });
  }

  // ===== 3. 有时效往返 =====
  {
    const r = await SC.encrypt(PW, '时效消息 timed message', 60);
    const S3 = r.cipher.slice(16, 32);
    ok(/^[A-Z2-7]{16}$/.test(S3), '3.1 有时效盐字段与无时效盐字段同为纯 base32 形态（不可区分）');
    ok(!/^\d+$/.test(S3) && !/0{6,}/.test(S3), '3.1b 盐字段不含连续数字/零串等可识别特征');
    ok(SC.parseDuration(S3) === 60, '3.2 反解 duration=60');
    const d = await SC.decrypt(r.cipher, PW, 'timed');
    ok(d.plaintext === '时效消息 timed message' && d.timed && d.remainingSec === 60,
      '3.3 有时效 加/解密 往返 + 剩余时间精确等于设定值 (' + d.remainingSec + 's)');
    const da = await SC.decrypt(r.cipher, PW, 'auto');
    ok(da.plaintext === '时效消息 timed message' && da.modeUsed === 'timed', '3.4 自动模式按帧内标记直接走有时效分支');
    await t('3.5 严格时效：超过设定秒数即无法解密', async () => {
      // r 在 T0 加密，duration=60 → 绝对过期时刻 = T0+60
      at(T0 + 61); // 刚过有效期
      try {
        await SC.decrypt(r.cipher, PW, 'auto');
        ok(false, '3.5 已过期却解密成功');
      } catch (e) {
        ok(e.code === 'WRONG_KEY_OR_EXPIRED', '3.5 过期 → WRONG_KEY_OR_EXPIRED');
      } finally { at(T0); }
    });
    await t('3.5b 有效期内可解（剩余时间准确）', async () => {
      at(T0 + 30); // 加密后 30 秒
      try {
        const dd = await SC.decrypt(r.cipher, PW, 'auto');
        ok(dd.timed && dd.remainingSec === 30, '3.5b 剩余 30s（精确等于 duration - elapsed）');
      } finally { at(T0); }
    });
    await t('3.6 有效期 <60s 被拒', async () => {
      try { await SC.encrypt(PW, 'x', 30); ok(false, '3.6 未抛错'); }
      catch (e) { ok(e.code === 'BAD_INPUT', '3.6 30 秒 → BAD_INPUT'); }
    });
  }

  // ===== 4. 隐写：量化不变量 + 往返 + 容量 =====
  {
    const img = makeNoiseImage(96, 96, 42);
    const rep = SI.capacityReport(img);
    ok(rep.candCount > 8 * 3 * 8, '4.1 噪声图候选像素充足 (' + rep.candCount + ')');

    const CT = SC.b32encode(new Uint8Array(Array.from({ length: 47 }, (_, i) => (i * 37 + 11) & 255))); // 纯字母数字载荷
    const carrier = cloneImg(img);
    SI.embed(carrier, CT);
    const back = SI.extract(carrier);
    ok(back === CT, '4.2 隐写 嵌入/提取 往返一致');

    // 关键不变量：嵌入前后量化边缘图/候选集逐像素一致
    const before = SI.candidatePixels(img).join(',');
    const after = SI.candidatePixels(carrier).join(',');
    ok(before === after, '4.3 嵌入前后候选像素集合完全一致（量化不变量）');
    // alpha 未被改动
    let alphaOK = true;
    for (let i = 0; i < carrier.data.length; i += 4) if (carrier.data[i + 3] !== 255) alphaOK = false;
    ok(alphaOK, '4.4 alpha 通道全程保持 255');

    // 空图（无数据）提取报错
    await t('4.5 无隐藏数据图片 → NOT_FRAME', async () => {
      try { SI.extract(makeNoiseImage(96, 96, 7)); ok(false, '4.5 未抛错'); }
      catch (e) { ok(e.code === 'NOT_FRAME', '4.5 随机噪声图提取 → NOT_FRAME'); }
    });
    // 平滑图容量=0
    const flat = SI.capacityReport(makeFlatImage(64, 64));
    ok(flat.candCount === 0 && flat.mMax === 0, '4.6 纯色平滑图容量为 0（选图建议依据）');
  }

  // ===== 5. 端到端：加密 → 隐写 → 提取 → 解密（图片模式双输出等价） =====
  {
    const img = makeNoiseImage(160, 160, 99);
    const rep = SI.capacityReport(img);
    const plain = '端到端测试 e2e。' + '混合中英文 mixed content! ';
    const needBytes = (8 * Math.ceil((14 + new TextEncoder().encode(plain).length + 16) / 5)) + 16; // base32 帧长 + 盐字段
    ok(needBytes + 11 <= rep.totalBytes, '5.1 容量公式覆盖实际密文 (' + needBytes + '+11 <= ' + rep.totalBytes + ')');
    const enc = await SC.encrypt(PW, plain, 300);
    const carrier = cloneImg(img);
    SI.embed(carrier, enc.cipher);
    const cipherFromImg = SI.extract(carrier);
    ok(cipherFromImg === enc.cipher, '5.2 图中提取的密文 = 双输出 base64（语义等价）');
    const d = await SC.decrypt(cipherFromImg, PW, 'auto');
    ok(d.plaintext === plain && d.timed && d.remainingSec === 300, '5.3 图片密文自动模式解出有时效原文（剩余精确 300s）');
    // 篡改像素后魔数/验签链路
    carrier.data[(SI.candidatePixels(carrier)[5] * 4)] ^= 1; // 破坏一个已用像素
    await t('5.4 像素被改动 → 提取或解密明确报错', async () => {
      try {
        const c2 = SI.extract(carrier);
        await SC.decrypt(c2, PW, 'auto');
        ok(false, '5.4 未抛错');
      } catch (e) {
        ok(['CORRUPT_IMAGE', 'NOT_FRAME', 'WRONG_KEY_OR_EXPIRED'].includes(e.code), '5.4 损坏图 → ' + e.code);
      }
    });
  }

  console.log('\n==== 自测结束: ' + passed + ' 通过, ' + failed + ' 失败 ====');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('自测崩溃:', e); process.exit(2); });
