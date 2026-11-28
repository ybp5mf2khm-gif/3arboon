import React, { useState, useEffect } from 'react';
import logoImg from './arboon-logo.png';

export default function ArboonLogo({ variant = 'default', onClick }) {
  const isLight = variant === 'light';
  const [cleanLogoSrc, setCleanLogoSrc] = useState(logoImg);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      let minX = canvas.width;
      let minY = canvas.height;
      let maxX = 0;
      let maxY = 0;
      let hasPixels = false;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const brightness = (r + g + b) / 3;
          if (r > 235 && g > 235 && b > 235) {
            data[i + 3] = 0;
          } else if (brightness > 210 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
            data[i + 3] = Math.round(((245 - brightness) / 35) * 255);
          }

          if (isLight && data[i + 3] > 0) {
            const isGold = r > b + 25 && g > b + 10;
            if (!isGold && brightness < 130) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
            }
          }

          if (data[i + 3] > 15) {
            hasPixels = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // قص الهوامش الشفافة الفارغة حول الشعار لإزالة الفراغ العلوي والسفلي
      if (hasPixels && maxX > minX && maxY > minY) {
        const trimW = maxX - minX + 1;
        const trimH = maxY - minY + 1;
        const trimCanvas = document.createElement('canvas');
        trimCanvas.width = trimW;
        trimCanvas.height = trimH;
        const trimCtx = trimCanvas.getContext('2d');
        trimCtx.drawImage(canvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);
        setCleanLogoSrc(trimCanvas.toDataURL('image/png'));
      } else {
        setCleanLogoSrc(canvas.toDataURL('image/png'));
      }
    };
    img.src = logoImg;
  }, [isLight]);

  const handleGoHome = (e) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <a
      href="/"
      onClick={handleGoHome}
      title="العودة إلى الصفحة الرئيسية - عربون"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        lineHeight: 0,
        transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <img
        src={cleanLogoSrc}
        alt="عربون - 3arboon"
        style={{
          height: isLight ? 74 : 44,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          filter: isLight ? 'drop-shadow(0 6px 16px rgba(15, 23, 42, 0.28))' : 'none'
        }}
      />
    </a>
  );
}
