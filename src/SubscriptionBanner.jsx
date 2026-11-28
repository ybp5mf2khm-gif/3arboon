import React, { useState, useEffect } from 'react';

export default function SubscriptionBanner({ provider = {}, onUpgradeClick }) {
  const plan = String(provider.plan_type || 'trial').toLowerCase();
  const expiresAt = provider.plan_expires_at ? new Date(provider.plan_expires_at) : null;
  const now = new Date();
  const isExpired = expiresAt ? now > expiresAt : false;

  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const isPremiumActive = plan === 'premium' && !isExpired;

  const features = [
    {
      title: 'التدقيق المالي بالذكاء الاصطناعي',
      desc: 'تحقق فوري من وصولات التحويل البنكي ومطابقة مبالغ العربون تلقائياً دون تدخل يدوي.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      )
    },
    {
      title: 'تحليلات النمو وصياغة الإعلانات',
      desc: 'تقارير ذكية لزيادة الإيرادات مع توليد نصوص ترويجية احترافية جاهزة للنشر.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      )
    },
    {
      title: 'أتمتة المواعيد والتذكيرات',
      desc: 'استقبال حجوزات غير محدودة مع تذكيرات ذكية تقلل نسبة تغيّب الزبائن.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5c158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 3600);
    return () => clearInterval(timer);
  }, [isPaused, features.length]);

  const currentFeature = features[activeIndex];

  return (
    <div
      className="arboon-pro-card-shell"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ marginBottom: 18 }}
    >
      <style>
        {`
          @keyframes arboonAuroraDrift {
            0% { transform: translate(0%, 0%) scale(1); opacity: 0.45; }
            50% { transform: translate(-18%, 12%) scale(1.15); opacity: 0.75; }
            100% { transform: translate(0%, 0%) scale(1); opacity: 0.45; }
          }
          @keyframes arboonBorderGradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes arboonProgressFill {
            0% { width: 0%; }
            100% { width: 100%; }
          }
          @keyframes arboonContentReveal {
            0% { opacity: 0; transform: translateY(5px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes arboonBtnShine {
            0% { left: -80%; }
            35%, 100% { left: 130%; }
          }
          .arboon-pro-card-shell {
            padding: 1px;
            border-radius: 16px;
            background: linear-gradient(125deg, rgba(212,175,55,0.65), rgba(243,229,171,0.9), rgba(30,41,59,0.8), rgba(212,175,55,0.65));
            background-size: 250% 250%;
            animation: arboonBorderGradient 6s ease infinite;
            box-shadow: 0 10px 28px -6px rgba(15, 23, 42, 0.22);
          }
          .arboon-pro-card-body {
            position: relative;
            overflow: hidden;
            background: #0b1120;
            border-radius: 15px;
            padding: 18px;
            color: #f8fafc;
          }
          .arboon-micro-grid {
            position: absolute;
            inset: 0;
            background-image: radial-gradient(rgba(229, 193, 88, 0.14) 1px, transparent 1px);
            background-size: 16px 16px;
            opacity: 0.55;
            pointer-events: none;
          }
          .arboon-aurora-glow {
            position: absolute;
            top: -40%;
            right: -15%;
            width: 240px;
            height: 240px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(212, 175, 55, 0) 70%);
            animation: arboonAuroraDrift 7s ease-in-out infinite;
            pointer-events: none;
          }
          .arboon-reveal {
            animation: arboonContentReveal 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .arboon-progress-line {
            height: 2px;
            background: linear-gradient(90deg, #b8860b, #f3e5ab);
            animation: arboonProgressFill 3.6s linear forwards;
          }
          .arboon-gold-cta {
            position: relative;
            overflow: hidden;
            width: 100%;
            background: linear-gradient(135deg, #f5e6ad 0%, #d4af37 55%, #b89024 100%);
            color: #090d16;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            font-family: inherit;
            box-shadow: 0 4px 14px rgba(212, 175, 55, 0.25);
            transition: transform 0.15s ease;
          }
          .arboon-gold-cta:active {
            transform: scale(0.99);
          }
          .arboon-gold-cta::after {
            content: '';
            position: absolute;
            top: 0;
            left: -80%;
            width: 45%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
            transform: skewX(-25deg);
            animation: arboonBtnShine 4s infinite ease-in-out;
          }
        `}
      </style>
      <div className="arboon-pro-card-body">
        <div className="arboon-micro-grid" />
        <div className="arboon-aurora-glow" />

        {/* القسم العلوي: الحالة والعد التنازلي */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 14, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.35)', padding: '3px 10px', borderRadius: 6, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e5c158' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#f3e5ab', letterSpacing: 0.5 }}>
                {isPremiumActive ? 'العضوية الذهبية نشطة' : isExpired ? 'انتهت صلاحية الاشتراك' : 'ARBOON GOLD'}
              </span>
            </div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff', lineHeight: 1.4 }}>
              {isPremiumActive
                ? 'نظام الإدارة المتكامل والذكاء الاصطناعي مفعّل'
                : 'ارتقِ بمستوى إدارة مشروعك وضاعف حجوزاتك'}
            </h4>
          </div>

          {daysLeft !== null && !isExpired && (
            <div style={{ background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(212, 175, 55, 0.3)', borderRadius: 10, padding: '6px 11px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f3e5ab', lineHeight: 1.1, fontFamily: 'monospace' }}>{daysLeft}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>يوم متبقي</div>
            </div>
          )}
        </div>

        {/* بطاقة الميزة المتغيرة مع شريط التقدم */}
        <div
          key={activeIndex}
          className="arboon-reveal"
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(30, 41, 59, 0.55)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 12
          }}
        >
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              {currentFeature.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#f8fafc', marginBottom: 3 }}>
                {currentFeature.title}
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                {currentFeature.desc}
              </p>
            </div>
          </div>

          {/* شريط التقدم الزمني */}
          <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.06)' }}>
            {!isPaused && <div key={activeIndex} className="arboon-progress-line" />}
          </div>
        </div>

        {/* أزرار التنقل بين المزايا */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isPremiumActive ? 0 : 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {features.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`ميزة ${idx + 1}`}
                style={{
                  width: activeIndex === idx ? 22 : 7,
                  height: 5,
                  borderRadius: 999,
                  border: 'none',
                  padding: 0,
                  background: activeIndex === idx ? '#d4af37' : 'rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>
            0{activeIndex + 1} / 0{features.length}
          </span>
        </div>

        {/* زر الترقية أو التجديد */}
        {!isPremiumActive && onUpgradeClick && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="arboon-gold-cta"
            style={{ position: 'relative', zIndex: 1 }}
          >
            {isExpired ? 'تجديد العضوية الذهبية' : 'الترقية إلى العضوية الذهبية'}
          </button>
        )}
      </div>
    </div>
  );
}
