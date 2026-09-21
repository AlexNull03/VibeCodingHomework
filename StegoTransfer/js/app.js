/* 隐写加密传送 —— UI 编排 */
'use strict';
(function () {
  var C = window.StegoCrypto, S = window.StegoImage;
  function $(id) { return document.getElementById(id); }
  function show(el, on) { el.hidden = !on; }
  function err(el, e) {
    var msg = e && e.message ? e.message : String(e);
    if (e && e.code === 'MODE_MISMATCH') msg += '\n（推荐：时效选项改选“自动”）';
    if (e && e.code === 'WRONG_KEY_OR_EXPIRED') msg += '\n（若确认口令正确且未过期，请检查时效选项）';
    el.textContent = msg;
    show(el, true);
  }
  function yieldFrame() { return new Promise(function (r) { setTimeout(r, 0); }); }

  // ---- 背景字符雨 ----
  (function () {
    var canvas = document.getElementById('rain');
    if (!canvas || !canvas.getContext) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = canvas.getContext('2d');
    var CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF';
    var SIZE = 15;
    var drops = [];
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var cols = Math.ceil(canvas.width / SIZE);
      drops = [];
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * -canvas.height / SIZE;
    }
    resize();
    window.addEventListener('resize', resize);
    setInterval(function () {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, .1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = SIZE + 'px monospace';
      for (var i = 0; i < drops.length; i++) {
        var ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        var y = drops[i] * SIZE;
        ctx.fillStyle = 'rgba(0, 255, 157, .5)';
        ctx.fillText(ch, i * SIZE, y);
        ctx.fillStyle = 'rgba(0, 255, 157, .14)';
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * SIZE, y - SIZE);
        if (y > canvas.height && Math.random() > .975) drops[i] = 0;
        drops[i] += 0.5;
      }
    }, 66);
  })();

  // ---- Modal open / close ----
  function openModal(id) {
    var el = $(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(backdrop) {
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-modal]'), function (card) {
    card.addEventListener('click', function () { openModal(card.dataset.modal); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(card.dataset.modal); } });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.modal-close'), function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.closest('.modal-backdrop')); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.modal-backdrop'), function (bd) {
    bd.addEventListener('click', function (e) { if (e.target === bd) closeModal(bd); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = document.querySelector('.modal-backdrop.open');
      if (open) closeModal(open);
    }
  });

  // ---- 选项卡 ----
  Array.prototype.forEach.call(document.querySelectorAll('.tabs'), function (tabs) {
    tabs.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.tab');
      if (!btn) return;
      var container = tabs.closest('.modal-body') || tabs.closest('.section');
      Array.prototype.forEach.call(container.querySelectorAll('.tab'), function (t) { t.classList.toggle('active', t === btn); });
      Array.prototype.forEach.call(container.querySelectorAll('.panel'), function (p) { p.classList.toggle('active', p.id === btn.dataset.panel); });
    });
  });

  // ---- 有效性（无时效 / 设定有效时间 + 单位） ----
  function getDur(radioName) {
    var v = '';
    Array.prototype.forEach.call(document.getElementsByName(radioName), function (r) { if (r.checked) v = r.value; });
    return v;
  }
  function fmtDur(totalSec) {
    var units = [[86400, '天'], [3600, '小时'], [60, '分钟'], [1, '秒']];
    var parts = [], i, u, n;
    for (i = 0; i < units.length; i++) {
      u = units[i][0];
      n = Math.floor(totalSec / u);
      if (n > 0) { parts.push(n + units[i][1]); totalSec -= n * u; }
      if (parts.length === 2) break;
    }
    return parts.join(' ') || '0 秒';
  }
  // 返回 null=无时效；数字=有效秒数；undefined=校验失败（已提示）
  function readValidity(modeName, durId, unitId, errEl) {
    var mode = getDur(modeName);
    if (mode !== 'timed' && mode !== 'untimed') {
      err(errEl, { code: 'BAD_INPUT', message: '请选择有效性方式（无时效或设定有效时间）' });
      return undefined;
    }
    if (mode === 'untimed') return null;
    var raw = $(durId).value.trim();
    var n = parseInt(raw, 10);
    if (raw === '' || !Number.isInteger(n) || String(n) !== raw || n <= 0) {
      err(errEl, { code: 'BAD_INPUT', message: '请填写正整数的有效时间数值' });
      return undefined;
    }
    var total = n * Number($(unitId).value);
    if (total < 60 || total > 315360000) {
      err(errEl, { code: 'BAD_INPUT', message: '有效时间最短 60 秒、最长 3650 天，请调整数值或单位' });
      return undefined;
    }
    return total;
  }

  // ---- 按钮忙碌态 ----
  function busy(btn, on, label) {
    if (on) {
      btn.dataset.prev = btn.textContent;
      btn.textContent = label || '处理中，请稍候…';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.prev || btn.textContent;
      btn.disabled = false;
    }
  }

  // ---- 复制（Clipboard API，失败回退手动全选） ----
  Array.prototype.forEach.call(document.querySelectorAll('.copy-btn'), function (btn) {
    btn.addEventListener('click', function () {
      var src = $(btn.dataset.src);
      function fallback() {
        src.removeAttribute('readonly');
        src.select();
        src.setSelectionRange(0, src.value.length);
        btn.textContent = '已为您全选，请按 Ctrl+C 复制';
        setTimeout(function () { btn.textContent = '复制'; }, 4000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(src.value).then(function () {
          btn.textContent = '已复制 ✓';
          setTimeout(function () { btn.textContent = '复制'; src.setAttribute('readonly', ''); }, 2000);
        }).catch(fallback);
      } else fallback();
    });
  });

  // ---- 图片 → ImageData（统一经 Canvas 转 PNG） ----
  var MAX_FILE_BYTES = 20 * 1024 * 1024;  // 图片 ≤ 20MB
  var MAX_PIXELS = 4096 * 4096;           // 仅防超分辨率画布失控
  function fileToImageData(file) {
    if (file.size > MAX_FILE_BYTES) {
      return Promise.reject({ code: 'BAD_INPUT', message: '图片超过 20MB 限制（' + (file.size / 1048576).toFixed(1) + 'MB），请换更小的图片' });
    }
    return createImageBitmap(file).then(function (bmp) {
      if (bmp.width * bmp.height > MAX_PIXELS) {
        bmp.close();
        throw { code: 'BAD_INPUT', message: '图片像素过大（' + bmp.width + '×' + bmp.height + '），请换分辨率不超过 4096×4096 的图片' };
      }
      var canvas = document.createElement('canvas');
      canvas.width = bmp.width; canvas.height = bmp.height;
      var ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { imgData: imgData, width: canvas.width, height: canvas.height };
    }).catch(function (e) {
      if (e && e.code) throw e;
      throw { code: 'BAD_INPUT', message: '图片读取失败，请选择有效的图片文件' };
    });
  }
  function imgDataToPngBlob(imgData) {
    var canvas = document.createElement('canvas');
    canvas.width = imgData.width; canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
  }

  function fmtExpire(expireAt) {
    var d = new Date(expireAt);
    return d.toLocaleString();
  }
  function setNote(noteEl, r, dur) {
    if (r.timed) {
      noteEl.textContent = '⏳ 有效期 ' + fmtDur(dur) + '，至 ' + fmtExpire(r.expireAt) + '，过期后任何人（含本人）都无法解密';
    } else {
      noteEl.textContent = '∞ 无时效密文，任何时间均可凭口令解密';
    }
  }

  // ================= 加密 · 模式 A：纯文本 =================
  $('et-reset').addEventListener('click', function () {
    $('form-enc-text').reset();
    show($('et-out'), false); show($('et-err'), false);
  });
  $('form-enc-text').addEventListener('submit', function (ev) {
    ev.preventDefault();
    show($('et-err'), false); show($('et-out'), false);
    var pw = $('et-pw').value, pw2 = $('et-pw2').value, plain = $('et-plain').value;
    if (!pw) return err($('et-err'), { message: '口令不能为空（空口令等于只编码不加密）' });
    if (pw !== pw2) return err($('et-err'), { message: '两次输入的口令不一致' });
    if (!plain) return err($('et-err'), { message: '原文不能为空' });
    var dur = readValidity('et-mode', 'et-dur', 'et-unit', $('et-err'));
    if (dur === undefined) return;
    busy($('et-go'), true);
    C.encrypt(pw, plain, dur).then(function (r) {
      $('et-cipher').value = r.cipher;
      setNote($('et-note'), r, dur);
      show($('et-out'), true);
    }).catch(function (e) { err($('et-err'), e); })
      .then(function () { busy($('et-go'), false); });
  });

  // ================= 加密 · 模式 B：图片隐写 =================
  var eiState = null; // {orig: ImageData, report}
  $('ei-reset').addEventListener('click', function () {
    $('form-enc-image').reset();
    $('ei-file').value = '';
    eiState = null;
    show($('ei-out'), false); show($('ei-err'), false);
    show($('ei-cap'), false); show($('ei-preview-wrap'), false);
    show($('form-enc-image'), false);
  });
  $('ei-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    show($('ei-err'), false); show($('ei-out'), false);
    show($('ei-cap'), false); $('form-enc-image').hidden = true;
    var info = $('ei-cap');
    info.innerHTML = '正在读取并转换图片…'; show(info, true);
    fileToImageData(file).then(function (res) {
      return yieldFrame().then(function () {
        var rep = S.capacityReport(res.imgData);
        eiState = { orig: res.imgData, report: rep };
        var warn = rep.mMax < 200;
        info.className = 'capacity' + (warn ? ' warn' : '');
        info.innerHTML =
          '<strong>容量评估</strong>（' + res.width + '×' + res.height + '，' + (file.size / 1024).toFixed(0) + 'KB）：' +
          '本图约可写入 <strong>' + rep.mMax.toLocaleString() + '</strong> 个英文字符 / <strong>' + rep.zhChars.toLocaleString() + '</strong> 个汉字。' +
          '<ul>' +
          '<li>容量与分辨率和画面纹理丰富程度有关：照片、自然风景、复杂插画容量高；</li>' +
          '<li>纯色截图、大面积留白、大字海报可写入内容很少' + (warn ? '（本图即属此类，建议换图）' : '') + '；</li>' +
          '<li>原文一般只有几 KB，小图即可装下，用更小的图更省流量、也更日常；</li>' +
          '<li>输入原文后下方会给出选图建议；</li>' +
          '<li>JPEG 来源照片转 PNG 后嵌入没有问题，关键是载密 PNG 输出后必须原文件传输。</li>' +
          '</ul>';
        var pv = $('ei-preview');
        pv.width = res.width; pv.height = res.height;
        pv.getContext('2d', { willReadFrequently: true }).putImageData(res.imgData, 0, 0);
        show($('ei-preview-wrap'), true);
        $('form-enc-image').hidden = false;
        updateEiCount();
      });
    }).catch(function (e) { err($('ei-err'), e); show($('ei-cap'), false); });
  });

  function utf8Len(s) { return new TextEncoder().encode(s).length; }
  function updateEiCount() {
    if (!eiState) return;
    var m = utf8Len($('ei-plain').value);
    var cap = eiState.report.mMax;
    var el = $('ei-count');
    el.textContent = '已用 ' + m + ' / 可用约 ' + cap + ' 字节（UTF-8）';
    var over = m > cap || m === 0;
    el.classList.toggle('over', m > cap);
    $('ei-go').disabled = m > cap || m === 0;
    // 按原文大小给出选图建议
    var sg = $('ei-sugg');
    if (m === 0) { show(sg, false); return; }
    var cipherChars = 8 * Math.ceil((30 + m) / 5) + 16;
    var bitsNeeded = (11 + cipherChars) * 8;
    var eReq = Math.ceil(bitsNeeded / 3);
    var px = eiState.orig.width * eiState.orig.height;
    var density = eiState.report.candCount / px;
    var side = Math.ceil(Math.sqrt(eReq / Math.max(density, 1e-6) / 0.85));
    var msg;
    if (m > cap) {
      msg = '⚠ 原文超出本图容量：约需 ' + side + '×' + side + ' 像素以上且纹理丰富的图片，或换更高分辨率的图、缩短原文。';
    } else if (side * side < px * 0.5) {
      msg = '✓ 容量足够。原文仅 ' + m + ' 字节，约 ' + Math.max(64, side) + '×' + Math.max(64, side) + ' 的小图即可装下——用更小的图更省流量。';
    } else {
      msg = '✓ 容量足够，当前图片尺寸合适。';
    }
    sg.textContent = msg;
    show(sg, true);
  }
  $('ei-plain').addEventListener('input', updateEiCount);

  $('form-enc-image').addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!eiState) return err($('ei-err'), { message: '请先选择图片' });
    show($('ei-err'), false); show($('ei-out'), false);
    var pw = $('ei-pw').value, pw2 = $('ei-pw2').value, plain = $('ei-plain').value;
    if (!pw) return err($('ei-err'), { message: '口令不能为空（空口令等于只编码不加密）' });
    if (pw !== pw2) return err($('ei-err'), { message: '两次输入的口令不一致' });
    if (!plain) return err($('ei-err'), { message: '原文不能为空' });
    var dur = readValidity('ei-mode', 'ei-dur', 'ei-unit', $('ei-err'));
    if (dur === undefined) return;
    if (utf8Len(plain) > eiState.report.mMax) return err($('ei-err'), { message: '原文超出本图容量，请换更大/纹理更丰富的图，或缩短原文' });

    busy($('ei-go'), true);
    var cipher;
    C.encrypt(pw, plain, dur).then(function (r) {
      cipher = r;
      return yieldFrame();
    }).then(function () {
      var work = new ImageData(new Uint8ClampedArray(eiState.orig.data), eiState.orig.width, eiState.orig.height);
      S.embed(work, cipher.cipher);
      return yieldFrame().then(function () { return imgDataToPngBlob(work); });
    }).then(function (blob) {
      if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; }
      downloadUrl = URL.createObjectURL(blob);
      $('ei-cipher').value = cipher.cipher;
      setNote($('ei-note'), cipher, dur);
      show($('ei-out'), true);
    }).catch(function (e) { err($('ei-err'), e); })
      .then(function () { busy($('ei-go'), false); });
  });

  // 下载：button 元素设 href/download 不会触发下载，须用临时 <a> 派发点击
  var downloadUrl = null;
  $('ei-download').addEventListener('click', function () {
    if (!downloadUrl) return err($('ei-err'), { message: '请先生成载密图片' });
    var a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'stego_' + new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // ================= 解密 =================
  var diCipher = null;   // 从图片提取出的密文
  var countdownTimer = null;
  $('di-file').addEventListener('change', function () {
    var file = this.files && this.files[0];
    diCipher = null;
    show($('dc-err'), false); show($('di-extracted-wrap'), false);
    if (!file) return;
    fileToImageData(file).then(function (res) {
      return yieldFrame().then(function () {
        diCipher = S.extract(res.imgData);
        $('di-extracted').value = diCipher;
        show($('di-extracted-wrap'), true);
      });
    }).catch(function (e) { err($('dc-err'), e); });
  });

  $('dc-reset').addEventListener('click', function () {
    $('form-decrypt').reset();
    $('dt-cipher').value = '';
    $('di-file').value = '';
    diCipher = null;
    show($('di-extracted-wrap'), false);
    show($('dc-out'), false); show($('dc-err'), false); show($('dc-ok'), false);
    $('dc-countdown').textContent = '';
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  });

  $('form-decrypt').addEventListener('submit', function (ev) {
    ev.preventDefault();
    show($('dc-err'), false); show($('dc-ok'), false); show($('dc-out'), false);
    var mode = getDur('dc-dur') || 'auto';
    var pw = $('dc-pw').value;
    if (!pw) return err($('dc-err'), { message: '口令不能为空' });
    var activeText = $('dc-text').classList.contains('active');
    var cipher = activeText ? $('dt-cipher').value.trim() : diCipher;
    if (!cipher) return err($('dc-err'), { message: activeText ? '请粘贴密文，或切换到“载密图片”上传图片' : '请先上传载密 PNG 并完成提取' });

    busy($('dc-go'), true);
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    C.decrypt(cipher, pw, mode).then(function (d) {
      $('dc-plain').value = d.plaintext;
      show($('dc-out'), true);
      var okEl = $('dc-ok');
      okEl.textContent = d.timed
        ? '解密成功（有时效密文，' + (mode === 'auto' && d.modeUsed === 'timed' ? '自动模式经“有时效”分支解出' : '按有时效处理') + '）'
        : '解密成功（无时效密文）';
      show(okEl, true);
      var cd = $('dc-countdown');
      if (d.timed) {
        var remain = d.remainingSec;
        function tick() {
          var mm = Math.floor(remain / 60), ss = remain % 60;
          cd.textContent = '⏳ 剩余有效时间 ' + mm + ':' + (ss < 10 ? '0' : '') + ss + '（至 ' + fmtExpire(d.expireAt) + '）';
          if (remain <= 0) { clearInterval(countdownTimer); countdownTimer = null; cd.textContent = '⚠ 该密文已超过有效时间'; }
          remain--;
        }
        tick();
        countdownTimer = setInterval(tick, 1000);
      } else cd.textContent = '';
    }).catch(function (e) { err($('dc-err'), e); })
      .then(function () { busy($('dc-go'), false); });
  });
})();
