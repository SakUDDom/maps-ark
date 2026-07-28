'use client';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('../components/Map'), { ssr: false });

export default function Home() {
  return (
    <main className="h-screen w-full relative flex flex-col overflow-hidden bg-slate-100">
      
      {/* Header អណ្តែត */}
      <header className="absolute top-4 left-4 right-4 z-[1000] px-6 py-3 flex justify-between items-center bg-white/60 backdrop-blur-md border border-white/40 shadow-lg rounded-2xl">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black text-indigo-800 tracking-tight drop-shadow-sm">Maps Ark</h1>
          <span className="text-xs px-3 py-1 bg-indigo-500 text-white rounded-full font-bold shadow-sm">v2.0 Modern 🚀</span>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white/80 hover:bg-white rounded-xl shadow-sm transition-all border border-slate-200">របាយការណ៍</button>
          <button className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all">ចូលគណនី</button>
        </div>
      </header>

      {/* ផ្ទាំងផែនទី */}
      <div className="flex-1 relative w-full h-full z-0">
        <MapComponent />
      </div>

    </main>
  );
}