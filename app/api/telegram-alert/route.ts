import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customId, customerName, amount, paidMonth, numMonths, zone, collector } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('❌ Missing Telegram ENV Keys in .env.local');
      return NextResponse.json({ error: 'Missing Telegram ENV Keys' }, { status: 500 });
    }

    const formattedAmount = Number(amount || 0).toLocaleString();
    const text = 
`🔔 <b>ការបង់ប្រាក់ជោគជ័យ!</b> (Maps Ark)
━━━━━━━━━━━━━━━━━━━━
🏠 <b>លេខកូដផ្ទះ:</b> <code>${customId || '---'}</code>
👤 <b>ឈ្មោះអតិថិជន:</b> ${customerName || 'អតិថិជនទូទៅ'}
💵 <b>ចំនួនទឹកប្រាក់:</b> <b>${formattedAmount} ៛</b>
📅 <b>បង់សម្រាប់:</b> ${paidMonth} (${numMonths} ខែ)
📍 <b>តំបន់ (Zone):</b> ${zone || 'មិនបញ្ជាក់'}
👮‍♂️ <b>ភ្នាក់ងារប្រមូល:</b> <b>${collector || '---'}</b>
⏰ ⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('km-KH', { timeZone: 'Asia/Phnom_Penh' })}
━━━━━━━━━━━━━━━━━━━━`;

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    });

    const data = await telegramRes.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}