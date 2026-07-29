'use client';
import dynamic from 'next/dynamic';

// ហៅហ្វាយ Map.tsx មកបង្ហាញដោយបិទ SSR (ចាំបាច់សម្រាប់ Leaflet)
const Map = dynamic(() => import('../components/Map'), { 
  ssr: false,
  loading: () => <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-indigo-600 font-bold text-xl">កំពុងរៀបចំផែនទី... 🚀</div>
});

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden m-0 p-0">
      <Map />
    </main>
  );
}