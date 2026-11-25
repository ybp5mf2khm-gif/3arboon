import React from 'react';

export default function PremiumTab({ provider, bookings, services, adminPhone = '212600000000' }) {
  const plan = String(provider.plan_type || 'trial').toLowerCase();
  const isPremium = plan === 'premium';

  const waBase = ['https:', '', 'wa.me'].join('/');
  const bookingLink = window.location.origin + '/?p=' + provider.slug;

  const formatPhone = (raw) => {
    let ph = String(raw || '').replace(/\D/g, '');
    if (ph.startsWith('0')) ph = '212' + ph.slice(1);
    else if (ph && !ph.startsWith('212')) ph = '212' + ph;
    return ph;
  };

  const sendWa = (phone, text) => {
    const ph = formatPhone(phone);
    window.location.assign(waBase + '/' + ph + '?text=' + encodeURIComponent(text));
  };

  const openUpgrade = () => {
    const msg =
      'مرحبا إدارة عربون، أود الترقية إلى باقة Premium 👑:\n' +
      'المشروع: ' + (provider.business_name || '') + '\n' +
      'الهاتف: ' + (provider.phone || '');
    sendWa(adminPhone, msg);
  };

  const serviceMap = {};
  (services || []).forEach((s) => {
    serviceMap[String(s.id)] = s;
  });

  const confirmedBookings = (bookings || []).filter((b) => b.status === 'confirmed');

  // تحليل الزبائن (الأوفياء VIP والغائبين)
  const clientsMap = {};
  const hourCounts = {};
  const dayCounts = {};
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  confirmedBookings.forEach((b) => {
    const ph = formatPhone(b.client_phone);
    const srv = serviceMap[String(b.service_id)];
    const spent = srv ? Number(srv.total_price || srv.price || 0) : 0;

    if (ph) {
      if (!clientsMap[ph]) {
        clientsMap[ph] = {
          name: b.client_name,
          phone: b.client_phone,
          visits: 0,
          totalSpent: 0,
          lastDate: b.booking_date || ''
        };
      }
      clientsMap[ph].visits += 1;
      clientsMap[ph].totalSpent += spent;
      if (b.booking_date && b.booking_date > clientsMap[ph].lastDate) {
        clientsMap[ph].lastDate = b.booking_date;
      }
    }

    if (b.booking_time) {
      hourCounts[b.booking_time] = (hourCounts[b.booking_time] || 0) + 1;
    }

    if (b.booking_date) {
      const d = new Date(b.booking_date + 'T12:00:00');
      if (!isNaN(d.getTime())) {
        const dayName = arabicDays.at(d.getDay());
        dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      }
    }
  });

  const allClients = Object.values(clientsMap);
  const vipClients = [...allClients].sort((a, b) => b.visits - a.visits || b.totalSpent - a.totalSpent).slice(0, 5);

  const nowMs = Date.now();
  const inactiveClients = allClients.filter((c) => {
    if (!c.lastDate) return false;
    const lastMs = new Date(c.lastDate + 'T12:00:00').getTime();
    if (isNaN(lastMs)) return false;
    const daysAgo = Math.floor((nowMs - lastMs) / (1000 * 60 * 60 * 24));
    c.daysAgo = daysAgo;
    return daysAgo >= 25;
  });

  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]).at(0);
  const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]).at(0);
  const cardStyle = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14
  };

  if (!isPremium) {
    return (
      <div style={{ background: 'linear-gradient(180deg, #fffbeb 0%, #fff 100%)', border: '2px solid #f59e0b', borderRadius: 18, padding: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>👑</div>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: '#92400e' }}>
          باقة Premium الذكية
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
          ضاعف أرباح مشروعك ووفّر وقتك عبر تفعيل أدوات الأتمتة والذكاء التجاري:
        </p>

        <div style={{ textAlign: 'right', background: '#fff', borderRadius: 14, padding: 14, border: '1px solid #fde68a', marginBottom: 16, fontSize: 12, lineHeight: 2 }}>
          <div>✅ <strong>تذكير وتأكيد أوتوماتيكي:</strong> إرسال رسائل واتساب تلقائياً قبل الموعد بساعتين.</div>
          <div>✅ <strong>استرجاع الزبائن الغائبين:</strong> تنبيهك بمن غاب +25 يوماً لدعوته بضغطة زر.</div>
          <div>✅ <strong>قائمة الزبائن الأوفياء VIP:</strong> معرفة أكثر الزبائن إنفاقاً وإرسال عروض لهم.</div>
          <div>✅ <strong>تحليل أوقات الذروة:</strong> اكتشاف أكثر الأيام والساعات طلباً في محلك.</div>
          <div>✅ <strong>شارة التوثيق 👑:</strong> تثبيت مشروعك في أعلى فضاء الزبائن.</div>
        </div>

        <button
          type="button"
          onClick={openUpgrade}
          style={{ width: '100%', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', color: '#fff', border: 'none', padding: 13, borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }}
        >
          اطلب تفعيل باقة Premium الآن 💬
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 1. حالة التذكير الأوتوماتيكي */}
      <div style={{ background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', color: '#fff', borderRadius: 16, padding: 15, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: 14 }}>🤖 التذكير الأوتوماتيكي نشط</strong>
          <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 800 }}>يعمل 24/7</span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#fef3c7', lineHeight: 1.5 }}>
          يقوم النظام تلقائياً بإرسال رسائل التذكير لزبائنك قبل موعدهم بساعتين دون الحاجة لتدخلك.
        </p>
      </div>

      {/* 2. أوقات الذروة الذكية */}
      <div style={cardStyle}>
        <strong style={{ display: 'block', fontSize: 14, color: '#1e3a8a', marginBottom: 10 }}>
          ⚡ تحليل أوقات الذروة في محلك
        </strong>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>أكثر يوم ازدحاماً</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 3 }}>
              {peakDay ? peakDay.at(0) : 'لا يوجد بعد'}
            </div>
            {peakDay && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>{peakDay.at(1)} حجوزات</div>}
          </div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>أكثر ساعة طلباً</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#2563eb', marginTop: 3 }}>
              {peakHour ? peakHour.at(0) : 'لا يوجد بعد'}
            </div>
            {peakHour && <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 700 }}>{peakHour.at(1)} حجوزات</div>}
          </div>
        </div>
      </div>

      {/* 3. استرجاع الزبائن الغائبين */}
      <div style={cardStyle}>
        <strong style={{ display: 'block', fontSize: 14, color: '#1e3a8a', marginBottom: 6 }}>
          🔄 استرجاع الزبائن الغائبين ({inactiveClients.length})
        </strong>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#64748b' }}>
          زبائن لم يحجزوا منذ أكثر من 25 يوماً — ادعهم للعودة بضغطة زر:
        </p>
        {inactiveClients.length === 0 ? (
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 8 }}>
            ممتاز! جميع زبائنك نشطون حالياً.
          </div>
        ) : (
          inactiveClients.map((c, idx) => (
            <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#dc2626' }}>آخر زيارة منذ {c.daysAgo} يوم</div>
              </div>
              <button
                type="button"
                onClick={() => sendWa(
                  c.phone,
                  'مرحبا ' + c.name + '، اشتقنا لزيارتك في ' + provider.business_name + '! يسعدنا استقبالك مجدداً، يمكنك حجز موعدك بسهولة من هنا:\n' + bookingLink
                )}
                style={{ background: '#25D366', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                دعوة للعودة 💬
              </button>
            </div>
          ))
        )}
      </div>

      {/* 4. قائمة الزبائن الأوفياء VIP */}
      <div style={cardStyle}>
        <strong style={{ display: 'block', fontSize: 14, color: '#1e3a8a', marginBottom: 10 }}>
          💎 أفضل الزبائن الأوفياء (VIP)
        </strong>
        {vipClients.length === 0 ? (
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 8 }}>
            ستظهر قائمة أفضل زبائنك بعد تأكيد الحجوزات.
          </div>
        ) : (
          vipClients.map((c, idx) => (
            <div key={idx} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>#{idx + 1} {c.name}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>
                  {c.visits} زيارات • إجمالي: <strong style={{ color: '#16a34a' }}>{c.totalSpent} درهم</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => sendWa(
                  c.phone,
                  'مرحبا ' + c.name + '، بصفتك من زبائننا المميزين في ' + provider.business_name + '، يسعدنا تقديم معاملة خاصة لك في زيارتك القادمة! احجز من هنا:\n' + bookingLink
                )}
                style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '7px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                إرسال عرض 🎁
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
