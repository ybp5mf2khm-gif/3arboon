import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const DAYS_OF_WEEK = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' }
];

export default function HolidaysSection({ provider, onRefresh }) {
  const [weeklyOff, setWeeklyOff] = useState(
    Array.isArray(provider.weekly_off) ? provider.weekly_off : []
  );
  const [closedDates, setClosedDates] = useState(
    Array.isArray(provider.closed_dates) ? provider.closed_dates : []
  );
  const [newDate, setNewDate] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleDay = (dayId) => {
    if (weeklyOff.includes(dayId)) {
      setWeeklyOff(weeklyOff.filter((d) => d !== dayId));
    } else {
      setWeeklyOff([...weeklyOff, dayId]);
    }
  };

  const addClosedDate = () => {
    if (!newDate) return alert('اختر تاريخ الإجازة أولاً');
    if (closedDates.includes(newDate)) return alert('هذا التاريخ مضاف مسبقاً');
    setClosedDates([...closedDates, newDate].sort());
    setNewDate('');
  };

  const removeClosedDate = (dt) => {
    setClosedDates(closedDates.filter((d) => d !== dt));
  };

  const handleSaveHolidays = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('providers')
      .update({
        weekly_off: weeklyOff,
        closed_dates: closedDates
      })
      .eq('id', provider.id);

    setSaving(false);
    if (error) return alert('خطأ أثناء حفظ العطل: ' + error.message);
    alert('تم حفظ أيام العطل والإجازات بنجاح ✅');
    if (onRefresh) onRefresh();
  };

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 15, marginBottom: 16 }}>
      <strong style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#1e3a8a' }}>
        🏖️ إدارة أيام العطل والإجازات:
      </strong>
      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
        اختر أيام العطلة الأسبوعية الثابتة (الأحمر = مغلق):
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 14 }}>
        {DAYS_OF_WEEK.map((d) => {
          const isOff = weeklyOff.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDay(d.id)}
              style={{
                padding: '8px 4px',
                borderRadius: 8,
                border: isOff ? '1px solid #dc2626' : '1px solid #cbd5e1',
                background: isOff ? '#fee2e2' : '#fff',
                color: isOff ? '#991b1b' : '#334155',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {d.label} {isOff ? '🔒' : ''}
            </button>
          );
        })}
      </div>

      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#0f172a' }}>
        📅 إغلاق تاريخ محدد (عيد، سفر، مناسبة):
      </label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          type="date"
          min={new Date().toISOString().split('T').at(0)}
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          style={{ flex: 2, padding: '9px 10px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', fontSize: 13, fontFamily: 'inherit' }}
        />
        <button
          type="button"
          onClick={addClosedDate}
          style={{ flex: 1, background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + إغلاق اليوم
        </button>
      </div>

      {closedDates.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {closedDates.map((dt) => (
            <span key={dt} style={{ background: '#fee2e2', color: '#991b1b', padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {dt}
              <button
                type="button"
                onClick={() => removeClosedDate(dt)}
                style={{ background: 'none', border: 'none', color: '#dc2626', fontWeight: 800, cursor: 'pointer', padding: 0, fontSize: 13 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={handleSaveHolidays}
        style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
      >
        {saving ? 'جاري الحفظ...' : 'حفظ أيام العطل والإجازات 💾'}
      </button>
    </div>
  );
}
