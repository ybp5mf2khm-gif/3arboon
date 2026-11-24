const SUPABASE_URL = 'https://hqugjgirjgilhnuktuqr.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'sb_publishable_WhS2LkfbQLZRr8xNQtKuOg__4klxU_T';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const urlParams = new URLSearchParams(window.location.search);
const slug = urlParams.get('p') || 'sara-beauty';
let currentProvider = null;
let servicesList = [];

async function initPage() {
  const { data: provider, error } = await db.from('providers').select('*').eq('slug', slug).single();
  if (error || !provider || !provider.is_active) {
    document.getElementById('bizName').innerText = 'الصفحة غير متوفرة حالياً';
    document.getElementById('bookingForm').style.display = 'none';
    return;
  }

  currentProvider = provider;
  document.getElementById('bizName').innerText = provider.business_name;
  document.getElementById('bankName').innerText = provider.bank_name;
  document.getElementById('ribText').innerText = provider.rib;
  document.getElementById('bankBox').style.display = 'block';

  const { data: services } = await db.from('services').select('*').eq('provider_id', provider.id);
  servicesList = services || [];
  const select = document.getElementById('serviceSelect');
  servicesList.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.text = `${s.title} (${s.total_price} درهم - العربون: ${s.deposit_amount} درهم)`;
    select.appendChild(opt);
  });
  updateDepositDisplay();
}

function updateDepositDisplay() {
  const selectedId = document.getElementById('serviceSelect').value;
  const srv = servicesList.find(s => s.id === selectedId);
  if (srv) {
    document.getElementById('depositText').innerText = `${srv.deposit_amount} درهم مغربي`;
  }
}

document.getElementById('serviceSelect').addEventListener('change', updateDepositDisplay);

window.copyRib = function() {
  const rib = document.getElementById('ribText').innerText;
  navigator.clipboard.writeText(rib);
  alert('تم نسخ رقم الحساب البنكي!');
};

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('statusMsg');
  btn.disabled = true;
  msg.style.color = '#2563eb';
  msg.innerText = 'جاري رفع الوصل وتسجيل الحجز...';

  try {
    const fileInput = document.getElementById('receiptFile');
    const file = fileInput.files.item(0);
    if (!file) throw new Error('المرجو اختيار صورة الوصل');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;

    const { error: uploadError } = await db.storage.from('receipts').upload(fileName, file);
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = db.storage.from('receipts').getPublicUrl(fileName);

    const { error: insertError } = await db.from('bookings').insert([{
      provider_id: currentProvider.id,
      service_id: document.getElementById('serviceSelect').value,
      client_name: document.getElementById('clientName').value,
      client_phone: document.getElementById('clientPhone').value,
      booking_date: document.getElementById('bookingDate').value,
      booking_time: document.getElementById('bookingTime').value,
      receipt_url: publicUrlData.publicUrl
    }]);

    if (insertError) throw insertError;

    msg.style.color = '#16a34a';
    msg.innerText = 'تم إرسال طلبك بنجاح! سيتواصل معك صاحب الخدمة عبر واتساب لتأكيد الموعد.';
    document.getElementById('bookingForm').reset();
  } catch (err) {
    msg.style.color = '#dc2626';
    msg.innerText = 'حدث خطأ: ' + err.message;
  } finally {
    btn.disabled = false;
  }
});

initPage();
