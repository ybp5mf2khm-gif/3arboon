import React from 'react';

export default function ArboonLogo({ variant = 'default', onClick }) {
  const isLight = variant === 'light';

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
        gap: 11,
        textDecoration: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {/* أيقونة اليد المدمجة مع درع التأكيد */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: isLight
            ? 'rgba(255, 255, 255, 0.16)'
            : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
          border: isLight
            ? '1px solid rgba(255, 255, 255, 0.3)'
            : '1px solid rgba(79, 70, 229, 0.2)',
          boxShadow: isLight
            ? '0 4px 14px rgba(0, 0, 0, 0.12)'
            : '0 6px 16px -4px rgba(79, 70, 229, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://w3.org">
          {/* دائرة العربون / الضمان العلوية */}
          <circle
            cx="21"
            cy="11"
            r="6.5"
            fill={isLight ? '#10b981' : '#34d399'}
            fillOpacity="0.22"
            stroke={isLight ? '#6ee7b7' : '#34d399'}
            strokeWidth="2"
          />
          <path
            d="M18.3 11L20.1 12.8L23.8 9.2"
            stroke={isLight ? '#ffffff' : '#ffffff'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* يد ممدودة بانسيابية تحتضن رمز الضمان كجزء من الشعار */}
          <path
            d="M5 23.5H10.5L15.2 21.2C16.4 20.6 17.8 20.8 18.8 21.7L20.2 22.9C20.9 23.5 20.7 24.6 19.8 25L15.5 26.8"
            stroke="#ffffff"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5 27.5H14.8C16.2 27.5 17.6 27.2 18.9 26.6L27.5 22.5C28.6 22 29.9 22.5 30.3 23.6C30.7 24.7 30.1 25.9 29 26.4L19.4 30.6C17.8 31.3 16 31.6 14.3 31.6H5"
            stroke="#ffffff"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* النص العربي والإنجليزي المدمج */}
      <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: isLight ? '#ffffff' : '#0f172a',
            letterSpacing: -0.3
          }}
        >
          عربون
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: isLight ? '#c7d2fe' : '#4f46e5',
            letterSpacing: 1.4,
            fontFamily: 'monospace'
          }}
        >
          3ARBOON
        </div>
      </div>
    </a>
  );
}
