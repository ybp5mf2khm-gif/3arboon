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
      title: 'تدقيق فوري لوصولات الدفع',
      desc: 'التحقق التلقائي من صحة التحويلات البنكية ومطابقة المبالغ بالذكاء الاصطناعي'
    },
    {
      title: 'أدوات تسويق وتحليل ذكية',
      desc: 'إنشاء نصوص ترويجية وتقارير مالية لزيادة الحجوزات وتنظيم الأرباح'
    },
    {
      title: 'حجوزات غير محدودة وتذكيرات',
      desc: 'إدارة كاملة للمواعيد مع إرسال تذكيرات تلقائية للزبائن قبل الموعد'
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % features.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [features.length]);

  const currentFeature = features[activeIndex];

  return (
    <div className="arboon-gold-wrapper" style={{ marginBottom: 16 }}>
      <style>
        {`
          @keyframes arboonBorderFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes arboonGoldSweep {
            0% { transform: translateX(130%) skewX(-20deg); }
            100% { transform: translateX(-230%) skewX(-20deg); }
          }
          @keyframes arboonSlideFade {
            0% { opacity: 0; transform: translateY(6px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes arboonBadgePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 55, 0.45); }
            50% { box-shadow: 0 0 0 5px rgba(212, 175, 55, 0); }
          }
          .arboon-gold-wrapper {
            padding: 1.5px;
            border-radius: 15px;
            background: linear-gradient(120deg, #927022, #f3e5ab, #d4af37, #1e293b, #d4af37);
            background-size: 300% 300%;
            animation: arboonBorderFlow 5s ease infinite;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
          }
          .arboon-gold-inner {
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #0f172a 0%, #172033 100%);
            border-radius: 13.5px;
            padding: 16px 18px;
            color: #f8fafc;
          }
          .arboon-sweep-light {
            position: absolute;
            top: 0;
            left: 0;
            width: 40%;
            height: 100%;
            background: linear-gradient(
              90deg,
              rgba(243, 229, 171, 0) 0%,
              rgba(243, 229, 171, 0.16) 50%,
              rgba(243, 229, 171, 0) 100%
            );
            animation: arboonGoldSweep 3.5s infinite linear;
            pointer-events: none;
          }
          .arboon-feature-slide {
            animation: arboonSlideFade 0.45s ease forwards;
          }
          .arboon-badge-glow {
            animation: arboonBadgePulse 2.5s infinite;
          }
        `}
      </style>

      <div className="arboon-gold-inner">
        <div className="arboon-sweep-light" />

        {/* الترويسة */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative', zIndex: 1 }}>
          <div>
            <span
              className="arboon-badge-glow"
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.5,
                color: '#0f172a',
                background: 'linear-gradient(135deg, #f3e5ab 0%, #d4af37 100%)',
                padding: '3px 10px',
                borderRadius: 6,
                marginBottom: 5
              }}
            >
              {isPremiumActive ? 'العضوية الذهبية مفعّلة' : isExpired ? 'انتهت صلاحية الاشتراك' : 'باقة عربون الذهبية'}
            </span>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
              {isPremiumActive
                ? 'إدارة متكاملة بأدوات الذكاء الاصطناعي'
                : 'ارتقِ بأداء مشروعك وضاعف حجوزاتك'}
            </h4>
          </div>

          {daysLeft !== null && !isExpired && (
            <div
              style={{
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(212, 175, 55, 0.35)',
                borderRadius: 10,
                padding: '5px 10px',
                minWidth: 58
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: '#f3e5ab', lineHeight: 1.1 }}>{daysLeft}</div>
              <div style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>يوم متبقي</div>
            </div>
          )}
        </div>

        {/* بطاقة عرض المزايا المتحركة */}
        <div
          key={activeIndex}
          className="arboon-feature-slide"
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(212, 175, 55, 0.22)',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#d4af37', flexShrink: 0 }} />
            <strong style={{ fontSize: 13, color: '#f3e5ab' }}>{currentFeature.title}</strong>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', lineHeight: 1.5, paddingRight: 15 }}>
            {currentFeature.desc}
          </p>
        </div>

        {/* مؤشرات التنقل بين المزايا */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: isPremiumActive ? 0 : 12, position: 'relative', zIndex: 1 }}>
          {features.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`ميزة ${idx + 1}`}
              style={{
                width: activeIndex === idx ? 20 : 6,
                height: 6,
                borderRadius: 999,
                border: 'none',
                padding: 0,
                background: activeIndex === idx ? '#d4af37' : 'rgba(255, 255, 255, 0.25)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>

        {/* زر التفعيل أو التجديد */}
        {!isPremiumActive && onUpgradeClick && (
          <button
            type="button"
            onClick={onUpgradeClick}
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              background: 'linear-gradient(135deg, #f3e5ab 0%, #d4af37 100%)',
              color: '#0f172a',
              border: 'none',
              borderRadius: 10,
              padding: '9px 14px',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            {isExpired ? 'تجديد العضوية الذهبية' : 'تفعيل العضوية الذهبية'}
          </button>
        )}
      </div>
    </div>
  );
}
