/* 隐写加密传送 —— 图像模块（浏览器与 Node 通用，零依赖） */
(function (global) {
  'use strict';

  var cryptoObj = global.crypto;
  var utf8 = new TextEncoder();
  var fromUtf8 = new TextDecoder('utf-8');

  var STEGO_MAGIC = 'STEG01';
  var STEGO_VERSION = 0x01;
  var FRAME_HDR_LEN = 6 + 1 + 4;
  var EDGE_THRESHOLD = 16;
  var QUANT_MASK = 0xF8;

  // ---- 错误 ----
  function StegoError(code, message) {
    var e = Error(message); e.name = 'StegoError'; e.code = code; return e;
  }

  function buildQuantLuma(imgData) {
    var d = imgData.data, w = imgData.width, h = imgData.height;
    var Y = new Float64Array(w * h);
    for (var i = 0; i < w * h; i++) {
      var p = i * 4;
      var r = d[p] & QUANT_MASK, g = d[p + 1] & QUANT_MASK, b = d[p + 2] & QUANT_MASK;
      Y[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
    return Y;
  }

  function candidatePixels(imgData) {
    var w = imgData.width, h = imgData.height;
    var Y = buildQuantLuma(imgData);
    var list = [];
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var idx = y * w + x;
        var g = Math.abs(Y[idx - 1] - Y[idx + 1]) + Math.abs(Y[idx - w] - Y[idx + w]);
        if (g >= EDGE_THRESHOLD) list.push(idx);
      }
    }
    return list;
  }

  function totalEmbeddableBytes(candCount) { return Math.floor(candCount * 3 / 8); }
  function payloadCapacity(candCount) { return Math.max(0, totalEmbeddableBytes(candCount) - FRAME_HDR_LEN); }
  function maxPlaintextBytes(candCount) {
    var ccap = payloadCapacity(candCount);
    if (ccap < 16 + 8) return 0;
    var v = Math.floor((ccap - 16) / 8) * 5 - 30;
    return v > 0 ? v : 0;
  }
  function utf8ByteLen(s) { return utf8.encode(s).length; }

  function capacityReport(imgData) {
    var E = candidatePixels(imgData).length;
    var mMax = maxPlaintextBytes(E);
    return {
      candCount: E,
      totalBytes: totalEmbeddableBytes(E),
      ccap: payloadCapacity(E),
      mMax: mMax,
      enChars: mMax,
      zhChars: Math.floor(mMax / 3)
    };
  }

  function embedBitOnChannel(v, bit, randDirFn) {
    var lsb = v & 1;
    if (lsb === bit) return v;
    var r3 = v & 0x07;
    var dir;
    if (r3 === 0) dir = 1;
    else if (r3 === 7) dir = -1;
    else dir = randDirFn();
    var nv = v + dir;
    if (nv < 0) nv = 0;
    if (nv > 255) nv = 255;
    return nv;
  }

  function embed(imgData, cipherText) {
    var payloadBytes = utf8.encode(cipherText);
    var N = payloadBytes.length;
    var frame = new Uint8Array(FRAME_HDR_LEN + N);
    for (var i = 0; i < STEGO_MAGIC.length; i++) frame[i] = STEGO_MAGIC.charCodeAt(i);
    frame[6] = STEGO_VERSION;
    frame[7] = (N >>> 24) & 0xff;
    frame[8] = (N >>> 16) & 0xff;
    frame[9] = (N >>> 8) & 0xff;
    frame[10] = N & 0xff;
    frame.set(payloadBytes, FRAME_HDR_LEN);

    var cands = candidatePixels(imgData);
    var need = frame.length * 8;
    var have = cands.length * 3;
    if (need > have) throw StegoError('BAD_INPUT', '容量不足，无法写入本图，请换更大/纹理更丰富的图片或缩短原文');

    var d = imgData.data;
    var bitIdx = 0;
    var rnd = new Uint8Array(1);
    var randDir = function () {
      cryptoObj.getRandomValues(rnd);
      return (rnd[0] & 1) ? 1 : -1;
    };
    for (var ci = 0; ci < cands.length && bitIdx < need; ci++) {
      var idx = cands[ci];
      var p = idx * 4;
      for (var ch = 0; ch < 3 && bitIdx < need; ch++) {
        var b = (frame[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
        d[p + ch] = embedBitOnChannel(d[p + ch], b, randDir);
        bitIdx++;
      }
    }
    return bitIdx;
  }

  // ---- 提取 ----
  function extract(imgData) {
    var cands = candidatePixels(imgData);
    var d = imgData.data;
    function readBits(n, startBit) {
      var bytes = new Uint8Array(Math.ceil(n / 8));
      var bitLimit = cands.length * 3;
      if (startBit + n > bitLimit) throw StegoError('CORRUPT_IMAGE', '图片中隐藏数据不完整，图片可能被压缩或替换');
      for (var i = 0; i < n; i++) {
        var s = startBit + i;
        var p = (cands[Math.floor(s / 3)] * 4) + (s % 3);
        var bit = d[p] & 1;
        bytes[i >> 3] |= (bit << (7 - (i & 7)));
      }
      return bytes;
    }
    var header = readBits(FRAME_HDR_LEN * 8, 0);
    var magic = fromUtf8.decode(header.slice(0, 6));
    if (magic !== STEGO_MAGIC || header[6] !== STEGO_VERSION) {
      throw StegoError('NOT_FRAME', '图片中没有隐藏数据，或不是本工具生成的载密 PNG');
    }
    var N = (header[7] * 16777216) + (header[8] << 16) + (header[9] << 8) + header[10];
    if (N <= 0 || N > cands.length * 3 / 8) {
      throw StegoError('CORRUPT_IMAGE', '隐藏数据长度异常，图片曾被压缩、截图、缩放或二次编辑，请索取 PNG 原图');
    }
    var payload = readBits(N * 8, FRAME_HDR_LEN * 8);
    var cipherStr = fromUtf8.decode(payload);
    if (!/^[A-Za-z0-9]+$/.test(cipherStr)) {
      throw StegoError('CORRUPT_IMAGE', '提取的密文含特殊字符，图片可能被压缩或损坏');
    }
    return cipherStr;
  }

  var api = {
    CONSTANTS: { STEGO_MAGIC: STEGO_MAGIC, STEGO_VERSION: STEGO_VERSION, EDGE_THRESHOLD: EDGE_THRESHOLD },
    candidatePixels: candidatePixels,
    capacityReport: capacityReport,
    embed: embed,
    extract: extract
  };
  global.StegoImage = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
