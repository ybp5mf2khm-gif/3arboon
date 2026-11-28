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

      // إزالة الخلفية البيضاء وجعلها شفافة تماماً
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // حساب درجة البياض لإزالة الخلفية بنعومة دون حواف حادة
        const brightness = (r + g + b) / 3;
        if (r > 235 && g > 235 && b > 235) {
          data[i + 3] = 0;
        } else if (brightness > 210 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15) {
          data[i + 3] = Math.round(((245 - brightness) / 35) * 255);
        }

        // إذا كان الشعار فوق خلفية داكنة/ملونة، نحول اللون الكحلي الداكن إلى أبيض ناصع مع الإبقاء على الذهبي
        if (isLight && data[i + 3] > 0) {
          const isGold = r > b + 25 && g > b + 10;
          if (!isGold && brightness < 130) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setCleanLogoSrc(canvas.toDataURL('image/png'));
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
        transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <img
        src={cleanLogoSrc}
        alt="عربون - 3arboon"
        style={{
          height: isLight ? 78 : 52,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          filter: isLight ? 'drop-shadow(0 4px 12px rgba(15, 23, 42, 0.25))' : 'none'
        }}
      />
    </a>
  );
}
