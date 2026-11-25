import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all | inactive | premium | expired
  const [updatingId, setUpdatingId] = useState(null);

  const ADMIN_PIN = '2026';

  useEffect(() => {
    const link = document.createElement('link');
    link.href = ['https:', '', 'fonts.googleapis.com', 'css2?family=Cairo:wght@400;600;700;800&display=swap'].join('/');
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setIsAuthenticated(true);
      fetchProviders();
    } else {
      alert('الرمز السري غير صحيح!');
    }
  };

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        alert('خطأ من قاعدة البيانات: ' + error.message);
      } else {
        setProviders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setLoading(false);
  };

  const toggleAccountStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setUpdatingId(id);
    const { error } = await supabase
      .from('providers')
      .update({ is_active: newStatus })
      .eq('id', id);

    setUpdatingId(null);
    if (error) {
      alert('فشل تحديث الحالة: ' + error.message);
    } else {
      setProviders(providers.map(p =>
        p.id === id ? { ...p, is_active: newStatus } : p
      ));
    }
  };

  const activatePlan = async (provider, planName, days = 30) => {
    const label = planName === 'premium' ? 'Premium 👑' : 'Pro ⭐';
    if (!window.confirm('تفعيل باقة ' + label + ' لمدة ' + days + ' يوماً لمشروع "' + (provider.business_name || '') + '"؟')) return;

    setUpdatingId(provider.id);
    const now = new Date();
    const currentExp = provider.plan_expires_at ? new Date(provider.plan_expires_at) : now;
    const baseDate = (!isNaN(currentExp.getTime()) && currentExp > now) ? currentExp : now;
    const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('providers')
      .update({
        is_active: true,
        plan_type: planName,
        plan_expires_at: newExpiry
      })
      .eq('id', provider.id);

    setUpdatingId(null);
    if (error) {
      alert('فشل تحديث الباقة: ' + error.message);
    } else {
      setProviders(providers.map(p =>
        p.id === provider.id
          ? { ...p, is_active: true, plan_type: planName, plan_expires_at: newExpiry }
          : p
      ));
      alert('تم تفعيل باقة ' + label + ' بنجاح ✅');
    }
  };

  const deleteProvider = async (id, name) => {
    if (!window.confirm('هل أنت متأكد من حذف حساب "' + (name || 'هذا المشترك') + '" نهائياً؟')) return;

    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (!error) {
      setProviders(providers.filter(p => p.id !== id));
    }
  };

  const now = new Date();
  const isProviderExpired = (p) => {
    if (!p.plan_expires_at) return false;
    const d = new Date(p.plan_expires_at);
    return !isNaN(d.getTime()) && now > d;
  };

  const filteredProviders = providers.filter(p => {
    const term = searchTerm.toLowerCase();
    const name = String(p.full_name || p.owner_name || '').toLowerCase();
    const business = String(p.business_name || p.salon_name || '').toLowerCase();
    const phone = String(p.phone || '');
    const matchesSearch = name.includes(term) || business.includes(term) || phone.includes(term);

    if (!matchesSearch) return false;
    if (filterType === 'inactive') return !p.is_active;
    if (filterType === 'premium') return String(p.plan_type || '').toLowerCase() === 'premium';
    if (filterType === 'expired') return isProviderExpired(p);
    return true;
  });
  if (!isAuthenticated) {
    return React.createElement(
      'div',
      { style: styles.loginContainer, dir: 'rtl' },
      React.createElement(
        'div',
        { style: styles.loginBox },
        React.createElement(
          'div',
          { style: styles.loginHeader },
          React.createElement('div', { style: { fontSize: '30px', marginBottom: '6px' } }, '🛡️'),
          React.createElement('h2', { style: styles.title }, 'الإدارة الرئيسية - عربون'),
          React.createElement('p', { style: styles.subtitle }, 'أدخل الرمز السري للوصول إلى لوحة التحكم')
        ),
        React.createElement(
          'form',
          { onSubmit: handleLogin, style: { padding: '22px' } },
          React.createElement('input', {
            type: 'password',
            value: pinInput,
            onChange: (e) => setPinInput(e.target.value),
            placeholder: 'الرمز السري (PIN)',
            style: styles.input,
            required: true
          }),
          React.createElement('button', { type: 'submit', style: styles.loginBtn }, 'دخول للإدارة ✓')
        )
      )
    );
  }

  const premiumCount = providers.filter(p => String(p.plan_type || '').toLowerCase() === 'premium').length;
  const expiredCount = providers.filter(p => isProviderExpired(p)).length;
  const waBase = ['https:', '', 'wa.me'].join('/');

  return React.createElement(
    'div',
    { style: styles.container, dir: 'rtl' },
    React.createElement(
      'div',
      { style: styles.mainCard },
      React.createElement(
        'div',
        { style: styles.header },
        React.createElement(
          'div',
          null,
          React.createElement('span', { style: styles.headerBadge }, 'عربون • الإدارة'),
          React.createElement('h1', { style: styles.headerTitle }, 'لوحة إدارة المشتركين')
        ),
        React.createElement(
          'button',
          { onClick: fetchProviders, style: styles.refreshBtn },
          'تحديث 🔄'
        )
      ),
      React.createElement(
        'div',
        { style: styles.bodyPadding },
        React.createElement(
          'div',
          { style: styles.statsBar },
          React.createElement(
            'div',
            { style: styles.statCard },
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '800', color: '#0f172a' } }, providers.length),
            React.createElement('div', { style: { fontSize: '10px', color: '#64748b', fontWeight: '700' } }, 'الكل')
          ),
          React.createElement(
            'div',
            { style: styles.statCard },
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '800', color: '#16a34a' } }, providers.filter(p => p.is_active).length),
            React.createElement('div', { style: { fontSize: '10px', color: '#64748b', fontWeight: '700' } }, 'نشط')
          ),
          React.createElement(
            'div',
            { style: styles.statCard },
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '800', color: '#d97706' } }, premiumCount),
            React.createElement('div', { style: { fontSize: '10px', color: '#64748b', fontWeight: '700' } }, 'Premium 👑')
          ),
          React.createElement(
            'div',
            { style: styles.statCard },
            React.createElement('div', { style: { fontSize: '17px', fontWeight: '800', color: '#dc2626' } }, expiredCount),
            React.createElement('div', { style: { fontSize: '10px', color: '#64748b', fontWeight: '700' } }, 'منتهي')
          )
        ),
        React.createElement(
          'div',
          { style: { display: 'flex', gap: '5px', marginBottom: '12px' } },
          [
            { key: 'all', label: 'الكل' },
            { key: 'inactive', label: 'موقوف' },
            { key: 'premium', label: 'Premium 👑' },
            { key: 'expired', label: 'منتهي ⏳' }
          ].map(f =>
            React.createElement(
              'button',
              {
                key: f.key,
                onClick: () => setFilterType(f.key),
                style: {
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '10px',
                  border: filterType === f.key ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: filterType === f.key ? '#2563eb' : '#f8fafc',
                  color: filterType === f.key ? '#fff' : '#475569',
                  fontSize: '11px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  fontFamily: 'inherit'
                }
              },
              f.label
            )
          )
        ),
        React.createElement('input', {
          type: 'text',
          placeholder: '🔍 ابحث بالاسم، المشروع، أو رقم الهاتف...',
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          style: styles.searchInput
        }),
        loading
          ? React.createElement('p', { style: { textAlign: 'center', marginTop: '20px', color: '#2563eb', fontWeight: '700' } }, 'جاري التحميل...')
          : filteredProviders.length === 0
          ? React.createElement('p', { style: { textAlign: 'center', marginTop: '20px', color: '#64748b', background: '#f8fafc', padding: '20px', borderRadius: '12px' } }, 'لا يوجد مشتركون مطابقون')
          : React.createElement(
              'div',
              { style: styles.list },
              filteredProviders.map((provider) => {
                const phoneStr = String(provider.phone || '').replace(/\D/g, '');
                let waPhone = phoneStr;
                if (waPhone.startsWith('0')) {
                  waPhone = '212' + waPhone.slice(1);
                } else if (waPhone && !waPhone.startsWith('212')) {
                  waPhone = '212' + waPhone;
                }

                const projectTitle = provider.business_name || provider.salon_name || 'بدون اسم مشروع';
                const ownerName = provider.full_name || provider.owner_name || '-';
                const plan = String(provider.plan_type || 'trial').toLowerCase();
                const expired = isProviderExpired(provider);

                let daysLeft = null;
                if (provider.plan_expires_at) {
                  const expDate = new Date(provider.plan_expires_at);
                  if (!isNaN(expDate.getTime())) {
                    daysLeft = Math.max(0, Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  }
                }

                const planLabel =
                  plan === 'premium' ? 'Premium 👑' :
                  plan === 'pro' ? 'Pro ⭐' :
                  'شهر مجاني 🎁';

                const waMsg = expired
                  ? 'مرحبا ' + ownerName + '، انتهت صلاحية اشتراك مشروعك "' + projectTitle + '" في منصة عربون. أخبرنا بالباقة التي تفضلها (Pro أو Premium) لتجديد حسابك فوراً!'
                  : 'مرحبا ' + ownerName + '، فريق منصة عربون معك! نتمنى لك التوفيق في مشروعك "' + projectTitle + '".';

                const waUrl = waBase + '/' + waPhone + '?text=' + encodeURIComponent(waMsg);
                return React.createElement(
                  'div',
                  {
                    key: provider.id,
                    style: {
                      ...styles.card,
                      borderRight: plan === 'premium'
                        ? '5px solid #d97706'
                        : provider.is_active
                        ? '5px solid #16a34a'
                        : '5px solid #dc2626'
                    }
                  },
                  React.createElement(
                    'div',
                    { style: styles.cardHeader },
                    React.createElement('h3', { style: styles.salonName }, projectTitle),
                    React.createElement(
                      'span',
                      {
                        style: {
                          ...styles.badge,
                          backgroundColor: provider.is_active ? '#dcfce7' : '#fee2e2',
                          color: provider.is_active ? '#166534' : '#991b1b'
                        }
                      },
                      provider.is_active ? 'نشط ✓' : 'موقوف ⏳'
                    )
                  ),
                  React.createElement(
                    'div',
                    { style: styles.planRow },
                    React.createElement(
                      'span',
                      {
                        style: {
                          fontWeight: '800',
                          fontSize: '12px',
                          color: plan === 'premium' ? '#b45309' : '#1e40af'
                        }
                      },
                      'الباقة: ' + planLabel
                    ),
                    daysLeft !== null && React.createElement(
                      'span',
                      {
                        style: {
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: expired ? '#fee2e2' : '#e0f2fe',
                          color: expired ? '#991b1b' : '#0369a1'
                        }
                      },
                      expired ? 'منتهية الصلاحية ⚠️' : 'متبقي ' + daysLeft + ' يوم'
                    )
                  ),
                  React.createElement('p', { style: styles.infoText }, '👤 الاسم: ' + ownerName),
                  React.createElement('p', { style: styles.infoText }, '📞 الهاتف: ' + (provider.phone || '-')),
                  React.createElement('p', { style: styles.infoText }, '🔗 الرابط: /?p=' + (provider.slug || '')),
                  React.createElement(
                    'div',
                    { style: styles.planActions },
                    React.createElement(
                      'button',
                      {
                        disabled: updatingId === provider.id,
                        onClick: () => activatePlan(provider, 'pro', 30),
                        style: { ...styles.planBtn, backgroundColor: '#2563eb' }
                      },
                      'تفعيل Pro (+30 يوم)'
                    ),
                    React.createElement(
                      'button',
                      {
                        disabled: updatingId === provider.id,
                        onClick: () => activatePlan(provider, 'premium', 30),
                        style: { ...styles.planBtn, backgroundColor: '#d97706' }
                      },
                      'تفعيل Premium 👑'
                    )
                  ),
                  React.createElement(
                    'div',
                    { style: styles.actions },
                    React.createElement(
                      'button',
                      {
                        disabled: updatingId === provider.id,
                        onClick: () => toggleAccountStatus(provider.id, provider.is_active),
                        style: {
                          ...styles.actionBtn,
                          backgroundColor: provider.is_active ? '#64748b' : '#16a34a'
                        }
                      },
                      provider.is_active ? 'إيقاف الحساب ⛔' : 'تفعيل الحساب ✅'
                    ),
                    waPhone && React.createElement(
                      'a',
                      {
                        href: waUrl,
                        target: '_blank',
                        rel: 'noreferrer',
                        style: styles.whatsappBtn
                      },
                      'واتساب 💬'
                    ),
                    React.createElement(
                      'button',
                      {
                        onClick: () => deleteProvider(provider.id, projectTitle),
                        style: styles.deleteBtn
                      },
                      '🗑️'
                    )
                  )
                );
              })
            )
      )
    )
  );
}

const styles = {
  loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9', padding: '16px', fontFamily: "'Cairo', sans-serif" },
  loginBox: { backgroundColor: '#fff', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.07)', width: '100%', maxWidth: '380px', textAlign: 'center' },
  loginHeader: { background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '24px 20px' },
  title: { margin: '0 0 6px', color: '#fff', fontSize: '20px', fontWeight: '800' },
  subtitle: { margin: 0, color: '#dbeafe', fontSize: '13px' },
  input: { width: '100%', padding: '13px', marginBottom: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#0f172a', fontSize: '18px', letterSpacing: '6px', textAlign: 'center', boxSizing: 'border-box', fontFamily: 'inherit' },
  loginBtn: { width: '100%', padding: '13px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' },
  container: { maxWidth: '520px', margin: '0 auto', padding: '12px', fontFamily: "'Cairo', sans-serif", minHeight: '100vh' },
  mainCard: { backgroundColor: '#fff', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.06)' },
  header: { background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#fff', padding: '22px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerBadge: { background: 'rgba(255,255,255,0.18)', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' },
  headerTitle: { fontSize: '20px', margin: '6px 0 0', color: '#fff', fontWeight: '800' },
  refreshBtn: { padding: '8px 14px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'inherit' },
  bodyPadding: { padding: '18px' },
  statsBar: { display: 'flex', gap: '6px', marginBottom: '12px' },
  statCard: { flex: 1, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 4px', borderRadius: '14px', textAlign: 'center' },
  searchInput: { width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#0f172a', marginBottom: '16px', fontSize: '14px', boxSizing: 'border-box', fontFamily: 'inherit' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  salonName: { margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: '800' },
  badge: { padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' },
  planRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '7px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '8px' },
  infoText: { margin: '4px 0', fontSize: '13px', color: '#475569' },
  planActions: { display: 'flex', gap: '6px', marginTop: '10px' },
  planBtn: { flex: 1, padding: '9px 6px', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  actions: { display: 'flex', gap: '6px', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' },
  actionBtn: { flex: 2, padding: '9px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' },
  whatsappBtn: { flex: 1, padding: '9px', backgroundColor: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: '10px', textAlign: 'center', fontWeight: '700', fontSize: '12px' },
  deleteBtn: { padding: '9px 11px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px' }
};
