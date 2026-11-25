import React, { useState } from 'react';

export default function StatsTab({ bookings, services }) {
  const [period, setPeriod] = useState('all'); // all | today | month | custom
  const [customDate, setCustomDate] = useState('');

  const serviceMap = {};
  (services || []).forEach((s) => {
    serviceMap[String(s.id)] = s;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);

  const filteredBookings = (bookings || []).filter((b) => {
    const bDate = String(b.booking_date || '');
    if (period === 'today') return bDate === todayStr;
    if (period === 'month') return bDate.startsWith(currentMonthPrefix);
    if (period === 'custom' && customDate) return bDate === customDate;
    return true;
  });

  let confirmedDeposit = 0;
  let confirmedTotal = 0;
  let pendingDeposit = 0;
  let confirmedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;

  const serviceStats = {};
  (services || []).forEach((s) => {
    serviceStats[String(s.id)] = {
      id: s.id,
      title: s.title,
      count: 0,
      depositEarned: 0,
      totalEarned: 0
    };
  });

  filteredBookings.forEach((b) => {
    const srv = serviceMap[String(b.service_id)];
    const dep = srv ? Number(srv.deposit_amount || 0) : 0;
    const tot = srv ? Number(srv.total_price || srv.price || 0) : 0;

    if (b.status === 'confirmed') {
      confirmedCount += 1;
      confirmedDeposit += dep;
      confirmedTotal += tot;

      if (srv && serviceStats[String(srv.id)]) {
        serviceStats[String(srv.id)].count += 1;
        serviceStats[String(srv.id)].depositEarned += dep;
        serviceStats[String(srv.id)].totalEarned += tot;
      }
    } else if (b.status === 'rejected') {
      rejectedCount += 1;
    } else {
      pendingCount += 1;
      pendingDeposit += dep;
    }
  });

  const sortedServiceStats = Object.values(serviceStats).sort((a, b) => b.count - a.count);
  const totalFiltered = filteredBookings.length;
  const confirmRate = totalFiltered > 0 ? Math.round((confirmedCount / totalFiltered) * 100) : 0;
  const avgOrderValue = confirmedCount > 0 ? Math.round(confirmedTotal / confirmedCount) : 0;

  const handleDownloadCSV = () => {
    const confirmedList = filteredBookings.filter((b) => b.status === 'confirmed');
    if (confirmedList.length === 0) {
      return alert('لا توجد حجوزات مؤكدة في هذه الفترة لتنزيل تقريرها.');
    }

    const headers = ['اسم الزبون', 'الهاتف', 'الخدمة', 'التاريخ', 'الساعة', 'العربون (درهم)', 'الثمن الإجمالي (درهم)'];
    const rows = confirmedList.map((b) => {
      const srv = serviceMap[String(b.service_id)];
      return [
        '"' + String(b.client_name || '').replace(/"/g, '""') + '"',
        '"' + String(b.client_phone || '') + '"',
        '"' + String(srv ? srv.title : 'غير محدد').replace(/"/g, '""') + '"',
        b.booking_date || '',
        b.booking_time || '',
        srv ? Number(srv.deposit_amount || 0) : 0,
        srv ? Number(srv.total_price || srv.price || 0) : 0
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '3arboon-profits-' + period + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const sectionCard = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 15,
    marginBottom: 14
  };

  const filterBtn = (key) => ({
    flex: 1,
    padding: '8px 4px',
    borderRadius: 9,
    border: period === key ? '1px solid #16a34a' : '1px solid #cbd5e1',
    background: period === key ? '#16a34a' : '#fff',
    color: period === key ? '#fff' : '#475569',
    fontWeight: 700,
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit'
  });

  const periodLabel =
    period === 'today' ? 'اليوم (' + todayStr + ')' :
    period === 'month' ? 'هذا الشهر (' + currentMonthPrefix + ')' :
    (period === 'custom' && customDate) ? 'يوم ' + customDate :
    'منذ البداية';

  return (
    <div>
      {/* شريط الفلترة الزمنية */}
      <div style={{ ...sectionCard, padding: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#1e3a8a', marginBottom: 8 }}>
          🗓️ تصفية الأرباح حسب الفترة:
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <button type="button" onClick={() => setPeriod('all')} style={filterBtn('all')}>الكل</button>
          <button type="button" onClick={() => setPeriod('today')} style={filterBtn('today')}>اليوم</button>
          <button type="button" onClick={() => setPeriod('month')} style={filterBtn('month')}>هذا الشهر</button>
          <button type="button" onClick={() => setPeriod('custom')} style={filterBtn('custom')}>يوم محدد</button>
        </div>

        {period === 'custom' && (
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              marginTop: 10,
              borderRadius: 10,
              border: '1px solid #cbd5e1',
              background: '#fff',
              fontSize: 13,
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        )}
      </div>

      {/* بطاقة الأرباح الرئيسية */}
      <div style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)', color: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: '0 6px 16px rgba(22,163,74,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#dcfce7', fontWeight: 700 }}>💰 العربون المؤكد (المحصّل)</span>
          <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>
            {periodLabel}
          </span>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, margin: '6px 0 8px' }}>
          {confirmedDeposit} <span style={{ fontSize: 15 }}>درهم</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.16)', padding: '8px 12px', borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span>إجمالي قيمة الخدمات المؤكدة:</span>
          <strong>{confirmedTotal} درهم</strong>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '7px 12px', borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>الباقي يُستخلص عند الحضور:</span>
          <strong>{Math.max(0, confirmedTotal - confirmedDeposit)} درهم</strong>
        </div>
      </div>

      {/* بطاقات المؤشرات السريعة */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 700 }}>⏳ عربون قيد الانتظار</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#a16207', marginTop: 4 }}>
            {pendingDeposit} <small style={{ fontSize: 12 }}>درهم</small>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            من {pendingCount} حجز معلق
          </div>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 700 }}>📊 معدل التأكيد ومتوسط الحجز</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
            {confirmRate}% <small style={{ fontSize: 11, fontWeight: 600 }}>تأكيد</small>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            متوسط الحجز: {avgOrderValue} درهم
          </div>
        </div>
      </div>

      {/* ملخص حالات الحجوزات */}
      <div style={sectionCard}>
        <strong style={{ display: 'block', fontSize: 14, color: '#1e3a8a', marginBottom: 10 }}>
          📈 ملخص الحجوزات ({totalFiltered})
        </strong>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
          <div style={{ background: '#dcfce7', padding: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{confirmedCount}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d' }}>مؤكدة ✅</div>
          </div>
          <div style={{ background: '#fef9c3', padding: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#854d0e' }}>{pendingCount}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a16207' }}>معلقة ⏳</div>
          </div>
          <div style={{ background: '#fee2e2', padding: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#991b1b' }}>{rejectedCount}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c' }}>مرفوضة ❌</div>
          </div>
        </div>
      </div>

      {/* الأرباح حسب الخدمات */}
      <div style={sectionCard}>
        <strong style={{ display: 'block', fontSize: 14, color: '#1e3a8a', marginBottom: 10 }}>
          🏆 الأرباح حسب الخدمات (المؤكدة)
        </strong>
        {sortedServiceStats.length === 0 ? (
          <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', padding: 10 }}>
            لا توجد خدمات مضافة بعد.
          </div>
        ) : (
          sortedServiceStats.map((st) => (
            <div key={st.id} style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{st.title}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>عدد الحجوزات المؤكدة: <strong>{st.count}</strong></div>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{st.depositEarned} درهم عربون</div>
                <div style={{ fontSize: 11, color: '#475569' }}>الإجمالي: {st.totalEarned} درهم</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* زر تحميل التقرير */}
      <button
        type="button"
        onClick={handleDownloadCSV}
        style={{
          width: '100%',
          background: '#1e293b',
          color: '#fff',
          border: 'none',
          padding: 13,
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8
        }}
      >
        📥 تنزيل تقرير الأرباح (Excel / CSV)
      </button>
    </div>
  );
}
