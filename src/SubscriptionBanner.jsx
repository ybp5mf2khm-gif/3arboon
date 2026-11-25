import React from 'react';

export default function SubscriptionBanner({ provider, adminPhone = '212609016571' }) {
  const plan = String(provider.plan_type || 'trial').toLowerCase();
  const now = new Date();
  const expiresAt = provider.plan_expires_at ? new Date(provider.plan_expires_at) : null;

  let daysLeft = 0;
  if (expiresAt && !isNaN(expiresAt.getTime())) {
    daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const isExpired = expiresAt ? now > expiresAt : false;
  const waBase = ['https:', '', 'wa.me'].join('/');

  const openUpgradeWhatsApp = (targetPlan) => {
    const msg =
      'مرحبا إدارة عربون، أرغب في تفعيل / ترقية حسابي:\n' +
      'اسم المشروع: ' + (provider.business_name || '') + '\n' +
      'الهاتف: ' + (provider.phone || '') + '\n' +
      'الباقة المطلوبة: ' + targetPlan;
    window.location.assign(waBase + '/' + adminPhone + '?text=' + encodeURIComponent(msg));
  };

  if (plan === 'premium' && !isExpired) {
    return (
      <div style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', color: '#fff', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800 }}>👑 باقة Premium الذكية مفعّلة</div>
          <div style={{ fontSize: 11, color: '#fef3c7' }}>التذكير الأوتوماتيكي والمزايا الذكية نشطة • متبقي {daysLeft} يوم</div>
        </div>
        <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 800 }}>
          VIP
        </span>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#991b1b', marginBottom: 4 }}>
          ⚠️ انتهت صلاحية اشتراكك الحالي
        </div>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: '#7f1d1d' }}>
          يرجى تجديد اشتراك <strong>Pro</strong> أو الترقية إلى <strong>Premium 👑</strong> لمواصلة استقبال الحجوزات.
        </p>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => openUpgradeWhatsApp('باقة Pro')}
            style={{ flex: 1, background: '#1e293b', color: '#fff', border: 'none', padding: '9px 6px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            تجديد Pro
          </button>
          <button
            type="button"
            onClick={() => openUpgradeWhatsApp('باقة Premium 👑')}
            style={{ flex: 1, background: '#d97706', color: '#fff', border: 'none', padding: '9px 6px', borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            ترقية Premium 👑
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 14, padding: 13, marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#92400e' }}>
          {plan === 'pro' ? '⭐ باقة Pro مفعّلة' : '🎁 شهر مجاني تجريبي (Pro)'}
        </span>
        <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
          متبقي {daysLeft} يوم
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#78350f' }}>
          فعّل <strong>Premium 👑</strong> للتذكير الأوتوماتيكي وتحليلات VIP
        </span>
        <button
          type="button"
          onClick={() => openUpgradeWhatsApp('ترقية إلى باقة Premium 👑')}
          style={{ background: '#d97706', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, fontWeight: 800, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
        >
          ترقية الآن 👑
        </button>
      </div>
    </div>
  );
}
