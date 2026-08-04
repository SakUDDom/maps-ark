'use client';

export default function BillPrint({ selectedHome, editForm, currentUser }: any) {
  if (!selectedHome) return null;

  const todayDate = new Date();
  const billDateString = `${todayDate.getDate().toString().padStart(2, '0')}-${(todayDate.getMonth()+1).toString().padStart(2, '0')}-${todayDate.getFullYear()}`;

  return (
    <div id="print-bill-container" className="hidden print:block bg-white text-black font-sans w-full max-w-[800px] mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col items-center w-1/3">
          <div className="w-24 h-24 rounded-full border-2 border-black flex items-center justify-center mb-2 overflow-hidden">
            <img src="/logo/Map Ark.png" alt="Logo" className="w-full h-full object-cover grayscale" />
          </div>
          <h2 className="font-black text-2xl tracking-wider uppercase mt-2">Maps Ark</h2>
        </div>
        <div className="w-2/3 text-right">
          <h1 className="font-black text-2xl mb-4">វិក្កយបត្រសេវាប្រមូលសំរាម</h1>
          <div className="flex flex-col items-end gap-1 text-sm font-medium">
            <div className="flex justify-between w-64"><span className="text-gray-600">លេខសម្គាល់អតិថិជន៖</span> <span className="font-bold">{editForm.custom_id || 'N/A'}</span></div>
            <div className="flex justify-between w-64"><span className="text-gray-600">ឈ្មោះអតិថិជន៖</span> <span className="font-bold">{editForm.customer_name || 'មិនមានឈ្មោះ'}</span></div>
            <div className="flex justify-between w-64"><span className="text-gray-600">លេខវិក្កយបត្រ៖</span> <span className="font-bold">INV-{Math.floor(100000 + Math.random() * 900000)}</span></div>
            <div className="flex justify-between w-64"><span className="text-gray-600">អ្នកទទួលប្រាក់៖</span> <span className="font-bold">{editForm.zone || 'N/A'}</span></div>
            <div className="flex justify-between w-64"><span className="text-gray-600">ថ្ងៃចេញវិក្កយបត្រ៖</span> <span className="font-bold">{billDateString}</span></div>
          </div>
        </div>
      </div>

      <div className="text-xs mb-4 text-gray-700 font-medium leading-relaxed">
        អាសយដ្ឋាន៖ អាគារលេខ ០០៨៨ វិថីព្រះបាទនរោត្ដម ភូមិ៣ សង្កាត់កំពង់ចាម ក្រុងកំពង់ចាម ខេត្តកំពង់ចាម <br/>
        លេខទំនាក់ទំនង៖ 096 603 7883 / 016 417 069 ទទួលទូរស័ព្ទពីថ្ងៃច័ន្ទ ដល់ថ្ងៃសុក្រ រៀងរាល់ម៉ោងធ្វើការ
      </div>

      <table className="w-full border-collapse border border-black mb-2 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left w-1/2">បរិយាយ / Description</th>
            <th className="border border-black p-2 text-center">ប្រចាំខែ / Month</th>
            <th className="border border-black p-2 text-right">ទឹកប្រាក់ / Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold">សេវាប្រមូលសំរាម ៖ {editForm.customer_name}</td>
            <td className="border border-black p-2 text-center font-bold">{editForm.payment_month}</td>
            <td className="border border-black p-2 text-right font-bold">{Number(editForm.monthly_fee).toLocaleString()} ៛</td>
          </tr>
          <tr className="bg-gray-100">
            <td colSpan={2} className="border border-black p-2 text-right font-bold">ទឹកប្រាក់ត្រូវទូទាត់ / Total Amount Due</td>
            <td className="border border-black p-2 text-right font-black text-lg">{Number(editForm.monthly_fee).toLocaleString()} ៛</td>
          </tr>
        </tbody>
      </table>
      
      <div className="text-center text-xs text-gray-600 font-medium mb-6">
        * បំណុលអតីតកាលបញ្ជូលវិញក្នុងវិក្កយបត្រ / Balance brought forward as of invoice date
      </div>

      <div className="flex justify-between items-start mb-8">
        <div className="text-xs font-medium leading-relaxed">
          <span className="font-bold">ចំណាំ៖</span>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>ប្រាក់វិក្កយបត្រទាំងអស់គ្មានការបង្វិលសង ឬសងដោះដូរយឺតយ៉ាវ</li>
            <li>ការបង់ថ្លៃសេវាត្រូវតែមានវិក្កយបត្រ</li>
            <li>សូមពិនិត្យព័ត៌មានលើវិក្កយបត្រអោយបានច្បាស់មុនពេលបង់ប្រាក់</li>
            <li>របៀបបង់ប្រាក់៖ អាចបង់ថ្លៃសេវានៅរដ្ឋបាលក្រុងកំពង់ចាម ឬតាមមួយភ្នាក់ងារទំនាក់ទំនងផ្ទាល់ ឬតាម ABA App</li>
          </ul>
        </div>
        <div className={`px-6 py-2 border-2 border-black font-black text-lg tracking-widest uppercase ${editForm.status_color === 'blue' ? 'bg-gray-200' : 'bg-gray-300'}`}>
          {editForm.status_color === 'blue' ? 'PAID' : 'PENDING'}
        </div>
      </div>

      <div className="border-t-2 border-dashed border-gray-400 my-8"></div>

      <div className="border border-black p-4 rounded-lg flex justify-between items-start">
        <div className="flex flex-col gap-1 text-sm font-medium w-2/3">
          <div className="flex"><span className="w-32">លេខសម្គាល់អតិថិជន៖</span> <span className="font-bold">{editForm.custom_id}</span></div>
          <div className="flex"><span className="w-32">ឈ្មោះអតិថិជន៖</span> <span className="font-bold">{editForm.customer_name}</span></div>
          <div className="flex"><span className="w-32">អាសយដ្ឋាន៖</span> <span className="font-bold">{editForm.zone}</span></div>
          <div className="flex"><span className="w-32">លេខទូរស័ព្ទអតិថិជន៖</span> <span className="font-bold">N/A</span></div>
          <div className="flex mt-2 pt-2 border-t border-gray-200"><span className="w-32 font-bold">ទឹកប្រាក់ត្រូវទូទាត់៖</span> <span className="font-black text-lg">{Number(editForm.monthly_fee).toLocaleString()} ៛</span></div>
        </div>
        <div className="w-1/3 flex flex-col items-end">
          <span className="font-bold mb-2">លេខសម្គាល់អតិថិជន</span>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${editForm.custom_id}`} alt="QR Code" className="w-24 h-24 border border-black p-1" />
        </div>
      </div>

      <div className="flex gap-4 mt-4 h-32">
        <div className="w-1/2 border border-black rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          {editForm.photo_url ? ( <img src={editForm.photo_url} className="w-full h-full object-cover grayscale" alt="Location" /> ) : ( <span className="text-gray-400 text-xs">គ្មានរូបថតទីតាំង</span> )}
        </div>
        <div className="w-1/2 border border-black rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-xs">Map Placeholder</span>
        </div>
      </div>
    </div>
  );
}