import QRCode from 'qrcode';

export async function generateQrDataUrl(text) {
  return await QRCode.toDataURL(text, {
    width: 220,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' }
  });
}
