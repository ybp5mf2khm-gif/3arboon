import React from 'react';

export default function StatsTab({ bookings, services }) {
  const serviceMap = {};
  (services || []).forEach((s) => {
    serviceMap[String(s.id)] = s;
  });

  const currentMonthPrefix = new Date().toISOString().slice(0, 7);

  let confirmedDeposit = 0;
  let confirmedTotal = 0;
  let pendingDeposit = 0;
  let monthlyDeposit = 0;
  let monthlyTotal = 0;

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

  (bookings || []).forEach((b) => {
    const srv = serviceMap[String(b.service_id)];
    const dep = srv ? Number(srv.deposit_amount || 0) : 0;
    const tot = srv ? Number(srv.total_price || srv.price || 0) : 0;

    if (b.status === 'confirmed') {
      confirmedCount += 1;
      confirmedDeposit += dep;
      confirmedTotal += tot;

      if (b.booking_date && String(b.booking_date).startsWith(currentMonthPrefix)) {
        monthlyDeposit += dep;
        monthlyTotal += tot;
      }

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

  const sectionCard = {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 15,
    marginBottom: 16
  };

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)', color: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, boxShadow: '0 6px 16px rgba(22,163,74,0.2)' }}>
        <div style={{ fontSize: 12, color: '#dcfce7', fontWeight: 700 }}>💰 إجمالي العربون المؤكد (المحصّل)</div>
        <div style={{ fontSize: 30, fontWeight: 800, margin: '4px 0 8px' }}>
          {confirmedDeposit} <span style={{ fontSize: 15 }}>درهم</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.16)', padding: '8px 12px', borderRadius: 10, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span>إجمالي قيمة الخدمات المؤكدة:</span>
          <strong>{confirmedTotal} درهم</strong>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 700 }}>📅 عربون هذا الشهر</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8', marginTop: 4 }}>
            {monthlyDeposit} <small style={{ fontSize: 12 }}>درهم</small>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            قيمة الخدمات: {monthlyTotal} درهم
          </div>
        </div>

        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 700 }}>⏳ عربون قيد الانتظار</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#a16207', marginTop: 4 }}>
            {pendingDeposit} <small style={{ fontSize: 12 }}>درهم</small>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
            من {pendingCount} حجز معلق
          </div>
        </div>
      </div>

      <div style={sectionCard}>
        <strong style={{ display: 'block', fontSize: 14, color: '#1e3a8a', marginBottom: 10 }}>
          📈 ملخص الحجوزات ({(bookings || []).length})
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
    </div>
  );
}
