import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!botToken || !chatId || !supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing configuration keys' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // កាលបរិច្ឆេទថ្ងៃនេះតាមម៉ោងកម្ពុជា (YYYY-MM-DD)
    const nowKh = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
    const y = nowKh.getFullYear();
    const m = String(nowKh.getMonth() + 1).padStart(2, '0');
    const d = String(nowKh.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`; // "2026-09-06"
    const displayDateStr = `${d}/${m}/${y}`; // "06/09/2026"

    // ទាញយក Payment records ទាំងអស់
    const { data: allPayments, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Filter យក Record ណាដែលបានបង់ក្នុងថ្ងៃនេះ
    const todayPayments = (allPayments || []).filter((p: any) => {
      const pDate = String(p.paid_at || p.created_at || '');
      return pDate.startsWith(todayStr);
    });

    if (todayPayments.length === 0) {
      const emptyMsg = `📊 <b>របាយការណ៍ប្រចាំថ្ងៃ (${displayDateStr})</b>\n━━━━━━━━━━━━━━━━━━━━\n⚠️ មិនទាន់មានការកត់ត្រាការបង់ប្រាក់នៅឡើយទេសម្រាប់ថ្ងៃនេះ។`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: emptyMsg, parse_mode: 'HTML' }),
      });
      return NextResponse.json({ success: true, count: 0 });
    }

    // គណនាតួលេខសរុប
    const totalAmount = todayPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const totalCount = todayPayments.length;

    // បំបែកចំណូលតាមភ្នាក់ងារ
    const byCollector: Record<string, { count: number; total: number }> = {};
    todayPayments.forEach((p: any) => {
      const name = p.collected_by || 'San sakudom';
      if (!byCollector[name]) {
        byCollector[name] = { count: 0, total: 0 };
      }
      byCollector[name].count += 1;
      byCollector[name].total += Number(p.amount || 0);
    });

    let collectorSummary = '';
    for (const [collector, stats] of Object.entries(byCollector)) {
      collectorSummary += `👮‍♂️ <b>${collector}</b>: ${stats.count} ផ្ទះ (${stats.total.toLocaleString()} ៛)\n`;
    }

    const summaryText = 
`📊 <b>របាយការណ៍សរុបការប្រមូលប្រាក់ប្រចាំថ្ងៃ</b> (Maps Ark)
━━━━━━━━━━━━━━━━━━━━
📅 <b>កាលបរិច្ឆេទ:</b> ${displayDateStr}
🏠 <b>ចំនួនផ្ទះប្រមូលបាន:</b> <b>${totalCount} ផ្ទះ</b>
💰 <b>ថវិកាសរុបទទួលបាន:</b> <b>${totalAmount.toLocaleString()} ៛</b>
━━━━━━━━━━━━━━━━━━━━
<b>លទ្ធផលតាមភ្នាក់ងារនីមួយៗ៖</b>
${collectorSummary}━━━━━━━━━━━━━━━━━━━━
⏰ ម៉ោងចេញរបាយការណ៍: ${nowKh.toLocaleTimeString('km-KH')}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: summaryText,
        parse_mode: 'HTML',
      }),
    });

    return NextResponse.json({ success: true, totalAmount, totalCount });
  } catch (err: any) {
    console.error('Daily summary error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}