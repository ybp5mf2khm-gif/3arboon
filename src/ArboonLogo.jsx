import React from 'react';
import logoImg from './arboon-logo.png';

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
        justifyContent: 'center',
        textDecoration: 'none',
        cursor: 'pointer',
        userSelect: 'none',
        background: isLight ? '#ffffff' : 'transparent',
        padding: isLight ? '8px 18px' : '2px 4px',
        borderRadius: isLight ? 16 : 10,
        boxShadow: isLight ? '0 8px 20px rgba(15, 23, 42, 0.16)' : 'none',
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
        src={logoImg}
        alt="عربون - 3arboon"
        style={{
          height: isLight ? 58 : 44,
          width: 'auto',
          objectFit: 'contain',
          display: 'block'
        }}
      />
    </a>
  );
}
