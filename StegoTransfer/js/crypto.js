/* 隐写加密传送 —— 密码模块（浏览器与 Node 通用，零依赖） */
(function (global) {
  'use strict';

  var DOMAIN_SEP = 'alexcn.work/stegov1';
  var PBKDF2_ITER = 100000;
  var KEY_LEN = 256;
  var IV_LEN = 12;
  var TS_MUL = 15485863;
  var TS_ADD = 982451653;
  var FRAME_VERSION = 0x01;
  var FLAG_TIMED = 0x01;
  var SALT_FIELD_LEN = 16;
  var MIN_DURATION = 60;
  var MAX_DURATION = 315360000;
  var GCM_TAG_LEN = 16;
  var FRAME_HEADER_LEN = 1 + 1 + IV_LEN;
  var INSERT_AT = 16;

  var cryptoObj = global.crypto;
  var utf8 = new TextEncoder();
  var fromUtf8 = new TextDecoder('utf-8');

  // ---- 错误 ----
  // code: NOT_FRAME | WRONG_KEY_OR_EXPIRED | MODE_MISMATCH | BAD_INPUT
  function StegoError(code, message) {
    var e = Error(message);
    e.name = 'StegoError';
    e.code = code;
    return e;
  }

  // ---- 字母数字编码 ----
  var B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  function b32encode(bytes) {
    var out = '', value = 0, bits = 0;
    for (var i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i]; bits += 8;
      while (bits >= 5) { bits -= 5; out += B32[(value >>> bits) & 31]; }
    }
    if (bits > 0) out += B32[(value << (5 - bits)) & 31];
    return out;
  }
  function b32decode(str) {
    if (/[^A-Z2-7]/.test(str)) throw StegoError('NOT_FRAME', '密文含非法字符，应为纯字母数字密文');
    var rem = str.length % 8;
    if (rem === 1 || rem === 3 || rem === 6) throw StegoError('NOT_FRAME', '密文长度异常，可能被截断或损坏');
    var out = [], value = 0, bits = 0;
    for (var i = 0; i < str.length; i++) {
      value = (value << 5) | B32.indexOf(str[i]); bits += 5;
      if (bits >= 8) { bits -= 8; out.push((value >>> bits) & 255); }
    }
    if (bits > 0 && (value & ((1 << bits) - 1)) !== 0) throw StegoError('NOT_FRAME', '密文尾部编码校验失败，可能被截断或损坏');
    return new Uint8Array(out);
  }

  function nowSec() { return Math.floor(Date.now() / 1000); }

  // ---- S 字段 ----
  function randomSaltField() {
    var b = new Uint8Array(10);
    cryptoObj.getRandomValues(b);
    return { field: b32encode(b), bytes: b };
  }
  function masksFor(R) {
    var k = [];
    for (var i = 0; i < 4; i++) k.push(((R + i + 3) * (41 * i + 17) + 29 * i + 5) & 0xFF);
    return k;
  }
  function timedSaltField(duration) {
    if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
      throw StegoError('BAD_INPUT', '有效时间参数超出可编码范围');
    }
    var b = new Uint8Array(10);
    cryptoObj.getRandomValues(b);
    var R = b[0], k = masksFor(R);
    b[1] = (duration & 0xFF) ^ k[0];
    b[2] = ((duration >>> 8) & 0xFF) ^ k[1];
    b[3] = ((duration >>> 16) & 0xFF) ^ k[2];
    b[4] = ((((duration >>> 24) & 0xFF) << 3) | (R & 7)) ^ k[3];
    b[5] = (duration % 251 + R) % 251;
    b[6] = (duration % 241 + (2 * R) % 241) % 241;
    return b32encode(b);
  }
  function parseDuration(field) {
    if (!/^[A-Z2-7]{16}$/.test(field)) return NaN;
    var b;
    try { b = b32decode(field); } catch (e) { return NaN; }
    if (b.length !== 10) return NaN;
    var R = b[0], k = masksFor(R);
    var q4 = b[4] ^ k[3];
    if ((q4 & 7) !== (R & 7)) return NaN;
    var d = (b[1] ^ k[0]) | ((b[2] ^ k[1]) << 8) | ((b[3] ^ k[2]) << 16) | ((q4 >>> 3) << 24);
    if (!Number.isInteger(d) || d < MIN_DURATION || d > MAX_DURATION) return NaN;
    if (b[5] !== (d % 251 + R) % 251) return NaN;
    if (b[6] !== (d % 241 + (2 * R) % 241) % 241) return NaN;
    return d;
  }
  function decodeRandomSalt(field) {
    if (!/^[A-Z2-7]{16}$/.test(field)) return null;
    try { return b32decode(field); } catch (e) { return null; }
  }

  // ---- 时效参数 ----
  function timeSalt(seed) {
    return cryptoObj.subtle.digest('SHA-256', utf8.encode(DOMAIN_SEP + ':' + (seed * TS_MUL + TS_ADD)));
  }

  // ---- 密钥派生 ----
  function deriveKey(passphrase, saltBytes) {
    return cryptoObj.subtle.importKey('raw', utf8.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return cryptoObj.subtle.deriveKey(
          { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: KEY_LEN }, false, ['encrypt', 'decrypt']);
      });
  }

  // ---- 加密 ----
  function encrypt(passphrase, plaintext, duration) {
    return Promise.resolve().then(function () {
      if (typeof passphrase !== 'string' || passphrase === '') throw StegoError('BAD_INPUT', '口令不能为空');
      if (typeof plaintext !== 'string' || plaintext === '') throw StegoError('BAD_INPUT', '原文不能为空');
      var timed = (duration !== null && duration !== undefined && duration !== '');
      if (timed) {
        duration = Number(duration);
        if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
          throw StegoError('BAD_INPUT', '有效时间必须是 ' + MIN_DURATION + ' ~ ' + MAX_DURATION + ' 秒之间的整数');
        }
      }
      var iv = new Uint8Array(IV_LEN);
      cryptoObj.getRandomValues(iv);

      var saltPromise, saltField, flag = 0, windowNo = null, encryptTs = 0;
      if (timed) {
        encryptTs = nowSec();
        iv[0] = (encryptTs >>> 24) & 0xff;
        iv[1] = (encryptTs >>> 16) & 0xff;
        iv[2] = (encryptTs >>> 8) & 0xff;
        iv[3] = encryptTs & 0xff;
        saltField = timedSaltField(duration);
        saltPromise = timeSalt(encryptTs);
      } else {
        var rs = randomSaltField();
        saltField = rs.field;
        saltPromise = Promise.resolve(rs.bytes);
      }

      return saltPromise.then(function (saltBytes) {
        return deriveKey(passphrase, saltBytes);
      }).then(function (key) {
        return cryptoObj.subtle.encrypt(
          { name: 'AES-GCM', iv: iv }, key, utf8.encode(plaintext));
      }).then(function (ctBuf) {
        var ct = new Uint8Array(ctBuf);
        var frame = new Uint8Array(FRAME_HEADER_LEN + ct.length);
        frame[0] = FRAME_VERSION;
        frame[1] = timed ? FLAG_TIMED : 0;
        frame.set(iv, 2);
        frame.set(ct, FRAME_HEADER_LEN);

        var B = b32encode(frame);
        var C = B.slice(0, INSERT_AT) + saltField + B.slice(INSERT_AT);
        return {
          cipher: C,
          timed: timed,
          duration: timed ? duration : null,
          window: windowNo,
          expireAt: timed ? (encryptTs + duration) * 1000 : null
        };
      });
    });
  }

  // ---- 解密 ----
  function decrypt(C, passphrase, mode) {
    if (mode === undefined || mode === null) mode = 'auto';
    if (['auto', 'timed', 'untimed'].indexOf(mode) < 0) throw StegoError('BAD_INPUT', '无效的时效选项');

    var S, frame, timed, iv, ct;
    return Promise.resolve().then(function () {
      if (typeof C !== 'string') throw StegoError('NOT_FRAME', '密文格式异常');
      C = C.replace(/\s+/g, '');
      if (!/^[A-Z0-9]+$/i.test(C)) throw StegoError('NOT_FRAME', '密文含空格以外的特殊字符，应为纯字母数字密文');
      C = C.toUpperCase();
      if (C.length < INSERT_AT * 2 + 4) throw StegoError('NOT_FRAME', '密文过短，不是本工具生成的密文');
      S = C.slice(16, 32);
      var B = C.slice(0, 16) + C.slice(32);
      frame = b32decode(B);
      if (frame.length < FRAME_HEADER_LEN + GCM_TAG_LEN || frame[0] !== FRAME_VERSION) {
        throw StegoError('NOT_FRAME', '不是本工具生成的密文（版本或结构异常）');
      }
      timed = (frame[1] & FLAG_TIMED) !== 0;
      if (frame[1] & ~FLAG_TIMED) throw StegoError('NOT_FRAME', '密文结构异常，疑似非本工具生成的密文');
      iv = frame.slice(2, 2 + IV_LEN);
      ct = frame.slice(FRAME_HEADER_LEN);

      if (mode === 'timed' && !timed) throw StegoError('MODE_MISMATCH', '该密文未设有效时间，请改选“自动”或“无时效”重试');
      if (mode === 'untimed' && timed) throw StegoError('MODE_MISMATCH', '该密文设有有效时间，请改选“自动”或“有时效”重试');

      var duration = NaN, ets = -1;
      if (timed || mode === 'auto') {
        duration = parseDuration(S);
        if (Number.isInteger(duration) && duration >= MIN_DURATION && duration <= MAX_DURATION) {
          ets = (iv[0] << 24) | (iv[1] << 16) | (iv[2] << 8) | iv[3];
        } else if (mode === 'timed') {
          throw StegoError('NOT_FRAME', '时效密文的有效时间参数非法（过短或格式错误）');
        }
      }
      var timedP = ets >= 0 ? timeSalt(ets) : null;
      return Promise.resolve(timedP).then(function (salt) {
        var timedCand = salt ? [{ saltBytes: salt, encryptTs: ets, duration: duration }] : [];
        var randomCand = [];
        if (mode === 'auto' || !timed) {
          var rb = decodeRandomSalt(S);
          if (rb && rb.length === 10) randomCand = [{ saltBytes: rb }];
        }
        // 帧内标记指明优先尝试哪一支，另一种仅作兜底
        var list = timed ? timedCand.concat(randomCand) : randomCand.concat(timedCand);
        if (list.length === 0) throw StegoError('NOT_FRAME', '密文格式异常，无法继续解密');
        return list;
      });
    }).then(function (cands) {
      if (!cands || cands.length === 0) cands = [];
      var i = 0;
      function tryNext() {
        if (i >= cands.length) {
          throw StegoError('WRONG_KEY_OR_EXPIRED', '口令错误；或密文已过期（请确认双方设备时间准确）');
        }
        var cand = cands[i++];
        return deriveKey(passphrase, cand.saltBytes)
          .then(function (key) {
            return cryptoObj.subtle.decrypt({ name: 'AES-GCM', iv: iv, tagLength: 128 }, key, ct);
          })
          .then(function (plainBuf) {
            var out = {
              plaintext: fromUtf8.decode(plainBuf),
              timed: cand.encryptTs !== undefined,
              modeUsed: cand.encryptTs !== undefined ? 'timed' : 'untimed'
            };
            if (cand.encryptTs !== undefined) {
              out.duration = cand.duration;
              out.expireAt = (cand.encryptTs + cand.duration) * 1000;
              out.remainingSec = Math.max(0, Math.ceil((out.expireAt - Date.now()) / 1000));
              if (out.remainingSec <= 0) {
                throw StegoError('WRONG_KEY_OR_EXPIRED', '密文已过期（请确认双方设备时间准确）');
              }
            }
            return out;
          })
          .catch(tryNext);
      }
      return tryNext();
    });
  }

  // ---- 内部原语 ----
  function insertSalt(B, S) { return B.slice(0, INSERT_AT) + S + B.slice(INSERT_AT); }
  function extractSalt(C) { return C.slice(16, 32); }
  function restoreB(C) { return C.slice(0, 16) + C.slice(32); }

  var api = {
    CONSTANTS: {
      DOMAIN_SEP: DOMAIN_SEP, PBKDF2_ITER: PBKDF2_ITER, TS_MUL: TS_MUL, TS_ADD: TS_ADD,
      FRAME_VERSION: FRAME_VERSION, MIN_DURATION: MIN_DURATION, MAX_DURATION: MAX_DURATION,
      SALT_FIELD_LEN: SALT_FIELD_LEN, INSERT_AT: INSERT_AT
    },
    encrypt: encrypt,
    decrypt: decrypt,
    b32encode: b32encode,
    b32decode: b32decode,
    insertSalt: insertSalt,
    extractSalt: extractSalt,
    restoreB: restoreB,
    timedSaltField: timedSaltField,
    parseDuration: parseDuration
  };

  global.StegoCrypto = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
