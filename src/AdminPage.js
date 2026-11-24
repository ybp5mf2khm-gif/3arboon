import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_PIN = '2026';

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
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('خطأ في جلب البيانات:', error);
      alert('حدث خطأ أثناء تحميل المشتركين');
    } else {
      setProviders(data || []);
    }
    setLoading(false);
  };

  const toggleAccountStatus = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('providers')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (error) {
      alert('فشل تحديث حالة الحساب');
      console.error(error);
    } else {
      setProviders(providers.map(p => 
        p.id === id ? { ...p, is_active: newStatus } : p
      ));
    }
  };

  const deleteProvider = async (id, name) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب "${name}" نهائياً؟`)) return;
    
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (!error) {
      setProviders(providers.filter(p => p.id !== id));
    }
  };

  const filteredProviders = providers.filter(p => 
    (p.business_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.business_name && p.salon_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.phone && p.phone.includes(searchTerm))
  );

  if (!isAuthenticated) {
    return React.createElement(
      'div',
      { style: styles.loginContainer, dir: 'rtl' },
      React.createElement(
        'form',
        { onSubmit: handleLogin, style: styles.loginBox },
        React.createElement('h2', { style: styles.title }, 'الإدارة الرئيسية - عربون'),
        React.createElement('p', { style: styles.subtitle }, 'أدخل الرمز السري للوصول إلى لوحة التحكم'),
        React.createElement('input', {
          type: 'password',
          value: pinInput,
          onChange: (e) => setPinInput(e.target.value),
          placeholder: 'الرمز السري (PIN)',
          style: styles.input,
          required: true
        }),
        React.createElement('button', { type: 'submit', style: styles.loginBtn }, 'دخول')
      )
    );
  }
    return React.createElement(
    'div',
    { style: styles.container, dir: 'rtl' },
    React.createElement(
      'div',
      { style: styles.header },
      React.createElement('h1', { style: styles.headerTitle }, 'لوحة إدارة المشتركين'),
      React.createElement(
        'button',
        { onClick: fetchProviders, style: styles.refreshBtn },
        'تحديث 🔄'
      )
    ),
    React.createElement(
      'div',
      { style: styles.statsBar },
      React.createElement('div', { style: styles.statCard }, `الكل: ${providers.length}`),
      React.createElement('div', { style: { ...styles.statCard, color: '#16a34a' } }, `مفعّل: ${providers.filter(p => p.is_active).length}`),
      React.createElement('div', { style: { ...styles.statCard, color: '#dc2626' } }, `موقوف: ${providers.filter(p => !p.is_active).length}`)
    ),
    React.createElement('input', {
      type: 'text',
      placeholder: 'ابحث بالاسم، المشروع، أو رقم الهاتف...',
      value: searchTerm,
      onChange: (e) => setSearchTerm(e.target.value),
      style: styles.searchInput
    }),
    loading
      ? React.createElement('p', { style: { textAlign: 'center', marginTop: '20px' } }, 'جاري التحميل...')
      : React.createElement(
          'div',
          { style: styles.list },
          filteredProviders.map((provider) =>
            React.createElement(
              'div',
              {
                key: provider.id,
                style: {
                  ...styles.card,
                  borderRight: provider.is_active ? '5px solid #16a34a' : '5px solid #dc2626'
                }
              },
              React.createElement(
                'div',
                { style: styles.cardHeader },
                React.createElement('h3', { style: styles.salonName }, provider.salon_name || 'بدون اسم مشروع'),
                React.createElement(
                  'span',
                  {
                    style: {
                      ...styles.badge,
                      backgroundColor: provider.is_active ? '#dcfce7' : '#fee2e2',
                      color: provider.is_active ? '#166534' : '#991b1b'
                    }
                  },
                  provider.is_active ? 'حساب نشط' : 'بانتظار التفعيل / موقوف'
                )
              ),
              React.createElement('p', { style: styles.infoText }, `👤 الاسم: ${provider.full_name || '-'}`),
              React.createElement('p', { style: styles.infoText }, `📞 الهاتف: ${provider.phone || '-'}`),
              React.createElement('p', { style: styles.infoText }, `🔗 الرابط: /${provider.slug || provider.custom_url || ''}`),
              React.createElement('p', { style: styles.infoText }, `🏦 RIB: ${provider.rib || '-'}`),
              React.createElement(
                'div',
                { style: styles.actions },
                React.createElement(
                  'button',
                  {
                    onClick: () => toggleAccountStatus(provider.id, provider.is_active),
                    style: {
                      ...styles.actionBtn,
                      backgroundColor: provider.is_active ? '#ef4444' : '#22c55e'
                    }
                  },
                  provider.is_active ? 'إيقاف الحساب ⛔' : 'تفعيل الحساب ✅'
                ),
                provider.phone && React.createElement(
                  'a',
                  {
                    href: `https://wa.me{provider.phone.replace(/^0/, '')}`,
                    target: '_blank',
                    rel: 'noreferrer',
                    style: styles.whatsappBtn
                  },
                  'واتساب 💬'
                ),
                React.createElement(
                  'button',
                  {
                    onClick: () => deleteProvider(provider.id, provider.business_name),
                    style: styles.deleteBtn
                  },
                  '🗑️'
                )
              )
            )
          )
        )
  );
}

const styles = {
  loginContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '20px', fontFamily: 'sans-serif' },
  loginBox: { backgroundColor: '#fff', padding: '30px 20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: '360px', textAlign: 'center' },
  title: { margin: '0 0 10px', color: '#111827', fontSize: '20px' },
  subtitle: { margin: '0 0 20px', color: '#6b7280', fontSize: '14px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '16px', textAlign: 'center', boxSizing: 'border-box' },
  loginBtn: { width: '100%', padding: '12px', backgroundColor: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  container: { maxWidth: '600px', margin: '0 auto', padding: '15px', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  headerTitle: { fontSize: '20px', margin: 0, color: '#111827' },
  refreshBtn: { padding: '8px 12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  statsBar: { display: 'flex', gap: '10px', marginBottom: '15px' },
  statCard: { flex: 1, backgroundColor: '#fff', padding: '10px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  searchInput: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginBottom: '15px', fontSize: '14px', boxSizing: 'border-box' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: { backgroundColor: '#fff', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  salonName: { margin: 0, fontSize: '17px', color: '#111827' },
  badge: { padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
  infoText: { margin: '4px 0', fontSize: '14px', color: '#4b5563' },
  actions: { display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f3f4f6' },
  actionBtn: { flex: 2, padding: '10px', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' },
  whatsappBtn: { flex: 1, padding: '10px', backgroundColor: '#25D366', color: '#fff', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' },
  deleteBtn: { padding: '10px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }
};
