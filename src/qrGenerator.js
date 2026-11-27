// مولد QR قياسي (Version 2-L / Byte Mode) يعمل 100% محلياً بدون إنترنت
export function generateQrDataUrl(text, scale = 6) {
  const bytes = new TextEncoder().encode(text);
  // اختيار النسخة المناسبة لطول النص (Version 2 = 25x25 سعة 32 بايت، Version 4 = 33x33 سعة 78 بايت)
  const ver = bytes.length <= 32 ? 2 : 4;
  const size = ver * 4 + 17;
  const dataCodewords = ver === 2 ? 34 : 80;
  const ecCodewords = ver === 2 ? 10 : 20;

  // 1. بناء البيانات (Byte Mode: 0100 + طول 8 بت + البايتات + 0000 + حشو)
  const bits =;
  for (let i = 7; i >= 0; i--) bits.push((bytes.length >> i) & 1);
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);
  }
  for (let i = 0; i < 4 && bits.length < dataCodewords * 8; i++) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const cw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let val = 0;
    for (let j = 0; j < 8; j++) val = (val << 1) | bits[i + j];
    cw.push(val);
  }
  const pads = [0xec, 0x11];
  let pIdx = 0;
  while (cw.length < dataCodewords) cw.push(pads[pIdx++ % 2]);

  // 2. تصحيح الأخطاء Reed-Solomon في حقل GF(256)
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x = (x << 1) ^ (x & 128 ? 0x11d : 0);
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];

  const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : exp[log[a] + log[b]]);
  let gen =;
  for (let i = 0; i < ecCodewords; i++) {
    const next = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j];
      next[j + 1] ^= gfMul(gen[j], exp[i]);
    }
    gen = next;
  }

  const rem = [...cw, ...new Array(ecCodewords).fill(0)];
  for (let i = 0; i < cw.length; i++) {
    const coef = rem[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        rem[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  const fullCw = [...cw, ...rem.slice(cw.length)];

  // 3. مصفوفة QR والأنماط الثابتة
  const mod = Array.from({ length: size }, () => new Array(size).fill(null));
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false));

  const setMod = (r, c, v, res = true) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      mod[r][c] = v;
      if (res) reserved[r][c] = true;
    }
  };

  const addFinder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const inBox = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const onEdge = r === 0 || r === 6 || c === 0 || c === 6;
        const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setMod(r0 + r, c0 + c, inBox && (onEdge || inCore) ? 1 : 0);
      }
    }
  };

  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // محاذاة Alignment Pattern
  const alignPos = ver === 2 ? 18 : 26;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const dark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
      setMod(alignPos + r, alignPos + c, dark ? 1 : 0);
    }
  }

  for (let i = 8; i < size - 8; i++) {
    setMod(6, i, i % 2 === 0 ? 1 : 0);
    setMod(i, 6, i % 2 === 0 ? 1 : 0);
  }
  setMod(size - 8, 8, 1);

  for (let i = 0; i < 9; i++) {
    if (i !== 6) { setMod(8, i, 0); setMod(i, 8, 0); }
  }
  for (let i = 0; i < 8; i++) {
    setMod(8, size - 1 - i, 0);
    setMod(size - 1 - i, 8, 0);
  }

  // 4. تعبئة البيانات المتعرجة + قناع Mask 0 ((r + c) % 2 === 0)
  const allBits = [];
  for (const b of fullCw) {
    for (let i = 7; i >= 0; i--) allBits.push((b >> i) & 1);
  }
  let bIdx = 0;
  let up = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = up ? size - 1 - i : i;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (!reserved[r][c]) {
          const bit = bIdx < allBits.length ? allBits[bIdx++] : 0;
          mod[r][c] = bit ^ ((r + c) % 2 === 0 ? 1 : 0);
        }
      }
    }
    up = !up;
  }

  // 5. معلومات التنسيق (ECL = L '01', Mask = 0 '000' -> 111011111000100)
  const fmt =;
  const fCoords1 = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
  const fCoords2 = [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
  for (let i = 0; i < 15; i++) {
    mod[fCoords1[i][0]][fCoords1[i][1]] = fmt[i];
    mod[fCoords2[i][0]][fCoords2[i][1]] = fmt[i];
  }

  // 6. رسم الصورة على Canvas وإرجاع Data URL
  const margin = 4;
  const px = (size + margin * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, px, px);
  ctx.fillStyle = '#0f172a';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (mod[r][c] === 1) {
        ctx.fillRect((c + margin) * scale, (r + margin) * scale, scale, scale);
      }
    }
  }
  return canvas.toDataURL('image/png');
}
