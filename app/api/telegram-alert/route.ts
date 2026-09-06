import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const custom_id = body.custom_id || body.customId || 'N/A';
    const customer_name = body.customer_name || body.customerName || 'N/A';
    const amount = body.amount || 0;
    const paid_month = body.paid_month || body.paidMonth || '';
    const num_months = body.num_months || body.numMonths || 1;
    const zone = body.zone || 'ទូទៅ';
    const collector = body.collector || body.collected_by || 'San sakudom';

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ 
        success: false, 
        error: `Missing ENV keys: botToken=${!!botToken}, chatId=${!!chatId}` 
      }, { status: 500 });
    }

    const message = 
`🔔 <b>ការបង់ប្រាក់ជោគជ័យ! (Maps Ark)</b>
━━━━━━━━━━━━━━━━━━━━
🏠 <b>លេខកូដផ្ទះ:</b> <code>${custom_id}</code>
👤 <b>ឈ្មោះអតិថិជន:</b> ${customer_name}
💵 <b>ចំនួនទឹកប្រាក់:</b> <b>${Number(amount).toLocaleString()} ៛</b>
📅 <b>បង់សម្រាប់:</b> ${paid_month} (${num_months} ខែ)
📍 <b>តំបន់ (Zone):</b> ${zone}
👮‍♂️ <b>ភ្នាក់ងារប្រមូល:</b> ${collector}
⏰ <b>កាលបរិច្ឆេទ:</b> ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh' })}`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgRes.json();

    if (!tgRes.ok || !tgData.ok) {
      return NextResponse.json({ 
        success: false, 
        error: tgData.description || 'Telegram API rejected message', 
        tgData 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, tgData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}