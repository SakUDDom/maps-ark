'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { MapPin, Eraser, Hexagon, Scissors, RotateCw, Search, Slash, Move, ShieldAlert, LogIn, LogOut, User, PieChart, Ban, Save, X, Spline, Download, Map as MapIcon } from 'lucide-react';
import { supabaseClient } from '../utils/supabase';

const Toggle = ({ enabled, setEnabled }: { enabled: boolean, setEnabled: (val: boolean) => void }) => (
  <div onClick={() => setEnabled(!enabled)} className={`w-11 h-6 rounded-full flex items-center cursor-pointer p-1 transition-colors shadow-inner ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
);

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  
  const pointsLayer = useRef<L.FeatureGroup | null>(null);
  const polygonsLayer = useRef<L.FeatureGroup | null>(null);
  const roadsLayer = useRef<L.FeatureGroup | null>(null);
  const bordersLayer = useRef<L.FeatureGroup | null>(null);

  const activeDrawTool = useRef<string>(''); 

  const [currentUser, setCurrentUser] = useState<any>(null); // ចាប់ផ្តើមមកគឺ Guest
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState({ total: 0, yellow: 0, blue: 0, red: 0 });
  const [allData, setAllData] = useState<any[]>([]);

  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ custom_id: '', status_color: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [pointToggle, setPointToggle] = useState(true);
  const [polygonToggle, setPolygonToggle] = useState(true);
  const [roadToggle, setRoadToggle] = useState(true);
  const [borderLive, setBorderLive] = useState(true);
  const [borderAuto, setBorderAuto] = useState(false);

  const fetchAndRenderData = async () => {
    if (pointsLayer.current) pointsLayer.current.clearLayers();
    if (polygonsLayer.current) polygonsLayer.current.clearLayers();
    if (roadsLayer.current) roadsLayer.current.clearLayers();
    if (bordersLayer.current) bordersLayer.current.clearLayers();

    const { data: households } = await supabaseClient.from('households').select('*');
    if (households) {
      setAllData(households);
      let t = 0, y = 0, b = 0, r = 0;

      households.forEach((h: any) => {
        t++;
        if (h.status_color === 'yellow') y++;
        else if (h.status_color === 'blue') b++;
        else if (h.status_color === 'red') r++;

        let layer: any;
        let colorHex = h.status_color === 'blue' ? '#2563eb' : h.status_color === 'red' ? '#dc2626' : '#f59e0b';

        if (h.shape_type === 'point' && h.lat && h.lng) {
          layer = L.circleMarker([h.lat, h.lng], { radius: 8, fillColor: colorHex, color: '#ffffff', weight: 2, fillOpacity: 0.95 });
          if (layer && pointsLayer.current) { layer.options.dbId = h.id; layer.addTo(pointsLayer.current); }
        } 
        else if (h.shape_type === 'road' && h.geojson) {
          layer = L.geoJSON(h.geojson, { style: { color: '#10b981', weight: 5, opacity: 0.9 } }); 
          if (layer && roadsLayer.current) { layer.eachLayer((l: any) => l.options.dbId = h.id); layer.addTo(roadsLayer.current); }
        }
        else if (h.shape_type === 'border' && h.geojson) {
          layer = L.geoJSON(h.geojson, { style: { color: '#d946ef', weight: 5, fillOpacity: 0.3 } }); 
          if (layer && bordersLayer.current) { layer.eachLayer((l: any) => l.options.dbId = h.id); layer.addTo(bordersLayer.current); }
        }
        else if (h.shape_type === 'polygon' && h.geojson) {
          layer = L.geoJSON(h.geojson, { style: { color: '#ffffff', weight: 1.5, fillColor: colorHex, fillOpacity: 0.85 } });
          if (layer && polygonsLayer.current) { layer.eachLayer((l: any) => l.options.dbId = h.id); layer.addTo(polygonsLayer.current); }
        }

        if (layer) {
          layer.on('click', () => {
            setSelectedHome(h); setEditForm({ custom_id: h.custom_id || '', status_color: h.status_color || 'yellow' }); setIsEditing(false); 
          });
        }
      });
      setStats({ total: t, yellow: y, blue: b, red: r });
    }
  };

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([11.99, 105.46], 15);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(mapInstance.current);

      // 🚀 លាក់ផ្ទាំង Geoman Default ដើម្បីកុំឱ្យច្រឡំ
      mapInstance.current.pm.setGlobalOptions({ pmIgnore: false });

      pointsLayer.current = L.featureGroup().addTo(mapInstance.current);
      polygonsLayer.current = L.featureGroup().addTo(mapInstance.current);
      roadsLayer.current = L.featureGroup().addTo(mapInstance.current);
      bordersLayer.current = L.featureGroup().addTo(mapInstance.current);

      fetchAndRenderData();

      mapInstance.current.on('pm:create', async (e: any) => {
        if (!currentUser) {
          alert('🔒 សុំទោសបង! សូមចូលគណនី (Login) ជាមុនសិន ទើបអាចគូសបាន។');
          mapInstance.current?.removeLayer(e.layer);
          return;
        }

        const layer = e.layer;
        const geojson = layer.toGeoJSON();
        const center = layer.getBounds ? layer.getBounds().getCenter() : layer.getLatLng();
        let customId = 'ID#' + Math.floor(1000 + Math.random() * 9000);
        
        let shapeType = activeDrawTool.current || 'point';

        await supabaseClient.from('households').insert({ lat: center.lat, lng: center.lng, custom_id: customId, status_color: 'yellow', shape_type: shapeType, geojson: geojson });
        
        if (mapInstance.current) {
          mapInstance.current.removeLayer(layer);
          mapInstance.current.pm.disableDraw();
          fetchAndRenderData();
        }
      });

      mapInstance.current.on('pm:remove', async (e: any) => {
        if (!currentUser) { alert('🔒 សុំទោសបង! សូមចូលគណនី (Login) ជាមុនសិន។'); fetchAndRenderData(); return; }
        const id = e.layer.options.dbId;
        if (id) await supabaseClient.from('households').delete().eq('id', id);
      });
      mapInstance.current.on('pm:update', async (e: any) => {
        if (!currentUser) { alert('🔒 សុំទោសបង! សូមចូលគណនី (Login) ជាមុនសិន។'); fetchAndRenderData(); return; }
        const id = e.layer.options.dbId;
        if (id) {
          const geojson = e.layer.toGeoJSON();
          const center = e.layer.getBounds ? e.layer.getBounds().getCenter() : e.layer.getLatLng();
          await supabaseClient.from('households').update({ lat: center.lat, lng: center.lng, geojson: geojson }).eq('id', id);
        }
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (mapInstance.current && pointsLayer.current) {
      if (pointToggle && !mapInstance.current.hasLayer(pointsLayer.current)) mapInstance.current.addLayer(pointsLayer.current);
      else if (!pointToggle && mapInstance.current.hasLayer(pointsLayer.current)) mapInstance.current.removeLayer(pointsLayer.current);
    }
  }, [pointToggle]);

  useEffect(() => {
    if (mapInstance.current && polygonsLayer.current) {
      if (polygonToggle && !mapInstance.current.hasLayer(polygonsLayer.current)) mapInstance.current.addLayer(polygonsLayer.current);
      else if (!polygonToggle && mapInstance.current.hasLayer(polygonsLayer.current)) mapInstance.current.removeLayer(polygonsLayer.current);
    }
  }, [polygonToggle]);

  useEffect(() => {
    if (mapInstance.current && roadsLayer.current) {
      if (roadToggle && !mapInstance.current.hasLayer(roadsLayer.current)) mapInstance.current.addLayer(roadsLayer.current);
      else if (!roadToggle && mapInstance.current.hasLayer(roadsLayer.current)) mapInstance.current.removeLayer(roadsLayer.current);
    }
  }, [roadToggle]);

  useEffect(() => {
    if (mapInstance.current && bordersLayer.current) {
      if (borderLive && !mapInstance.current.hasLayer(bordersLayer.current)) mapInstance.current.addLayer(bordersLayer.current);
      else if (!borderLive && mapInstance.current.hasLayer(bordersLayer.current)) mapInstance.current.removeLayer(bordersLayer.current);
    }
  }, [borderLive]);


  const checkPermission = () => {
    if (!currentUser) { alert('🔒 សូមចុច "ចូលគណនី" (Login) នៅខាងស្តាំខាងលើ ជាមុនសិន!'); return false; }
    return true;
  };

  const drawPoint = () => { if(checkPermission()){ activeDrawTool.current = 'point'; mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Marker', { continueDrawing: false }); }};
  const drawPolygon = () => { if(checkPermission()){ activeDrawTool.current = 'polygon'; mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Polygon'); }};
  const drawRoad = () => { if(checkPermission()){ activeDrawTool.current = 'road'; mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Line'); }};
  const drawBorder = () => { if(checkPermission()){ activeDrawTool.current = 'border'; mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Polygon'); }};
  
  const toggleEdit = () => { if(checkPermission()) mapInstance.current?.pm.toggleGlobalEditMode(); };
  const toggleCut = () => { if(checkPermission()) mapInstance.current?.pm.toggleGlobalCutMode(); };
  const toggleRotate = () => { if(checkPermission()) mapInstance.current?.pm.toggleGlobalRotateMode(); };
  const toggleRemove = () => { if(checkPermission()) mapInstance.current?.pm.toggleGlobalRemovalMode(); };

  const handleUpdate = async () => {
    if (!selectedHome || !selectedHome.id) return;
    const { error } = await supabaseClient.from('households').update({ custom_id: editForm.custom_id, status_color: editForm.status_color }).eq('id', selectedHome.id);
    if (!error) { setSelectedHome({ ...selectedHome, ...editForm }); setIsEditing(false); fetchAndRenderData(); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabaseClient.from('households').select('*').ilike('custom_id', `%${searchQuery}%`).limit(1);
    if (data && data.length > 0) {
      const h = data[0];
      if (mapInstance.current && h.lat && h.lng) mapInstance.current.flyTo([h.lat, h.lng], 18, { animate: true, duration: 1.5 });
      setSelectedHome(h); setEditForm({ custom_id: h.custom_id || '', status_color: h.status_color || 'yellow' }); setIsEditing(false);
    } else alert('រកមិនឃើញលេខកូដនេះទេ!');
  };

  const exportToCSV = () => {
    if (!allData || allData.length === 0) return alert('គ្មានទិន្នន័យទេ!');
    const headers = ['លេខរៀង(ID), លេខកូដ, ប្រភេទ, ពណ៌, ឡាតីត្យុត, ឡុងជីត្យុត'];
    const csvData = allData.map((row: any) => `${row.id},${row.custom_id || 'N/A'},${row.shape_type},${row.status_color},${row.lat},${row.lng}`);
    const blob = new Blob(['\uFEFF' + [headers, ...csvData].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', 'Maps_Data.csv');
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleRealLogin = (e: any) => {
    e.preventDefault(); // 🚀 ការពារកុំឱ្យ Page Refresh ពេលចុច Login
    setCurrentUser({ name: 'មេធំ', role: 'super_admin' });
    setShowLoginModal(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">
      
      {/* 🚀 Header ពណ៌សច្បាស់លាស់ (មិនអណ្តែត) */}
      <header className="h-[70px] shrink-0 bg-white border-b border-slate-200 flex justify-between items-center px-6 z-[2000] shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-indigo-800 tracking-tight">Maps Ark</h1>
          <span className="text-xs px-2 py-0.5 bg-indigo-500 text-white rounded-full font-bold">v2.0</span>
          {currentUser?.role === 'super_admin' && (
            <span className="ml-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-black rounded-full flex items-center gap-1 shadow-sm border border-purple-200">
              Super Admin 👑
            </span>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => setShowReport(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm cursor-pointer">
            <PieChart size={18} className="text-indigo-600" /> របាយការណ៍
          </button>
          
          {currentUser ? (
            <button onClick={() => setCurrentUser(null)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all shadow-sm cursor-pointer">
              <LogOut size={18} /> ចេញពីគណនី
            </button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-all shadow-sm cursor-pointer">
              <LogIn size={18} /> ចូលគណនី
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 relative w-full h-[calc(100vh-70px)]">
        
        {/* 🚀 Sidebar ពណ៌ស (មិនអណ្តែត) */}
        <aside className="w-[360px] h-full bg-white border-r border-slate-200 flex flex-col z-[1000] shadow-xl shrink-0">
          <div className="p-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2">
              <input type="text" placeholder="ស្វែងរកលេខកូដ (KPC...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500 transition-colors" />
              <button onClick={handleSearch} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 cursor-pointer"><Search size={20} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 hide-scrollbar bg-slate-50/50">
            
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
              <h3 className="text-center font-black text-slate-800 text-sm border-b-2 border-indigo-600 pb-3 mb-5">Add and Deleted point</h3>
              <div className="flex justify-around mb-5">
                <button onClick={drawPoint} className="flex flex-col items-center gap-2 group cursor-pointer"><div className="w-12 h-12 border border-slate-300 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-slate-50 shadow-sm"><MapPin size={20} /></div><span className="text-[11px] font-bold text-slate-600">Add point</span></button>
                <button onClick={toggleRemove} className="flex flex-col items-center gap-2 group cursor-pointer"><div className="w-12 h-12 border border-slate-300 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-slate-50 shadow-sm"><Eraser size={20} /></div><span className="text-[11px] font-bold text-slate-600">Delete point</span></button>
              </div>
              <div className="flex justify-center"><Toggle enabled={pointToggle} setEnabled={setPointToggle} /></div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
              <h3 className="text-center font-black text-slate-800 text-sm border-b-2 border-indigo-600 pb-3 mb-5">Polygon</h3>
              <div className="flex justify-between mb-5">
                <button onClick={drawPolygon} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Hexagon size={20} /><span className="text-[10px] font-bold">Add</span></button>
                <button onClick={toggleEdit} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Move size={20} /><span className="text-[10px] font-bold">Edite</span></button>
                <button onClick={toggleCut} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Scissors size={20} /><span className="text-[10px] font-bold">Cut</span></button>
                <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Eraser size={20} /><span className="text-[10px] font-bold">Remove</span></button>
                <button onClick={toggleRotate} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><RotateCw size={20} /><span className="text-[10px] font-bold">Rotate</span></button>
              </div>
              <div className="flex justify-center"><Toggle enabled={polygonToggle} setEnabled={setPolygonToggle} /></div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5">
              <h3 className="text-center font-black text-slate-800 text-sm border-b-2 border-indigo-600 pb-3 mb-5">Road</h3>
              <div className="flex justify-around mb-5">
                <button onClick={drawRoad} className="flex flex-col items-center gap-2 group cursor-pointer"><div className="w-12 h-12 border border-slate-300 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-slate-50 shadow-sm"><Slash size={22} /></div><span className="text-[11px] font-bold text-slate-600">Add</span></button>
                <button onClick={toggleEdit} className="flex flex-col items-center gap-2 group cursor-pointer"><div className="w-12 h-12 border border-slate-300 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-slate-50 shadow-sm"><Move size={20} /></div><span className="text-[11px] font-bold text-slate-600">Edit</span></button>
                <button onClick={toggleRemove} className="flex flex-col items-center gap-2 group cursor-pointer"><div className="w-12 h-12 border border-slate-300 rounded-xl flex items-center justify-center text-slate-700 group-hover:bg-slate-50 shadow-sm"><Ban size={20} /></div><span className="text-[11px] font-bold text-slate-600">Delete</span></button>
              </div>
              <div className="flex justify-center"><Toggle enabled={roadToggle} setEnabled={setRoadToggle} /></div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 mb-10">
              <h3 className="text-center font-black text-slate-800 text-sm border-b-2 border-indigo-600 pb-3 mb-5">Border</h3>
              <div className="flex justify-between mb-6">
                <button onClick={drawBorder} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Hexagon size={20} /><span className="text-[10px] font-bold">Add</span></button>
                <button onClick={toggleEdit} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Move size={20} /><span className="text-[10px] font-bold">Edite</span></button>
                <button onClick={toggleCut} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Scissors size={20} /><span className="text-[10px] font-bold">Cut</span></button>
                <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><Eraser size={20} /><span className="text-[10px] font-bold">Remove</span></button>
                <button onClick={toggleRotate} className="flex flex-col items-center gap-1.5 cursor-pointer text-slate-600 hover:text-indigo-600"><RotateCw size={20} /><span className="text-[10px] font-bold">Rotate</span></button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-700 flex items-center gap-2"><Spline size={16} className="text-purple-500"/> ព្រំដែនគូសផ្ទាល់</span><Toggle enabled={borderLive} setEnabled={setBorderLive} /></div>
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-700 flex items-center gap-2"><ShieldAlert size={16} className="text-emerald-500"/> ព្រំដែន Auto</span><Toggle enabled={borderAuto} setEnabled={setBorderAuto} /></div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 relative z-0 h-full bg-slate-100">
          <div ref={mapRef} className="w-full h-full" />
        </main>
      </div>

      {/* 🚀 Login Modal (z-[9999] ធានាមិនឱ្យគាំង) */}
      {showLoginModal && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-[#2e3176]/90 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-10 w-[420px] flex flex-col items-center relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 cursor-pointer"><X size={24} /></button>
            <div className="w-24 h-24 bg-white border border-slate-200 rounded-full shadow-md flex flex-col items-center justify-center mb-6">
              <MapIcon size={36} className="text-blue-500" />
              <span className="text-[12px] font-black text-blue-800 mt-1">Map Ark</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-8">ចូលប្រើប្រព័ន្ធ</h2>
            <form onSubmit={handleRealLogin} className="w-full flex flex-col gap-5">
              <input type="email" placeholder="Email" required className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              <input type="password" placeholder="Password" required className="w-full border border-slate-300 rounded-lg px-4 py-3 outline-none text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              <button type="submit" className="w-full bg-[#5252d6] hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg shadow-md transition-colors mt-2 cursor-pointer">ចូល</button>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 w-[450px]">
            <div className="flex justify-between items-center border-b-2 border-indigo-500/20 pb-4 mb-6">
              <h2 className="text-2xl font-black text-indigo-800 flex items-center gap-3"><PieChart size={28} className="text-purple-600" /> របាយការណ៍ទូទៅ</h2>
              <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-rose-500 cursor-pointer"><X size={28} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg flex justify-between items-center"><span className="font-bold text-lg">ទីតាំងសរុប (Total)</span><span className="text-4xl font-black">{stats.total}</span></div>
              <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-400/50 shadow-sm flex flex-col items-center"><span className="text-yellow-600 font-bold mb-1">ពណ៌លឿង</span><span className="text-3xl font-black text-yellow-700">{stats.yellow}</span></div>
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-500/50 shadow-sm flex flex-col items-center"><span className="text-blue-600 font-bold mb-1">ពណ៌ខៀវ</span><span className="text-3xl font-black text-blue-700">{stats.blue}</span></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReport(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-300">បិទផ្ទាំង</button>
              <button onClick={exportToCSV} className="flex-[2] bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 flex justify-center items-center gap-2"><Download size={18} /> ទាញយក (CSV)</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Panel */}
      {selectedHome && (
        <div className="absolute top-24 right-4 z-[9999] w-[340px] bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-6 transition-all">
          <div className="flex justify-between items-center border-b-2 border-indigo-500/20 pb-3 mb-4">
            <h3 className="font-black text-indigo-800 text-lg flex items-center gap-2"><User size={20} /> {isEditing ? 'កែប្រែព័ត៌មាន' : 'ព័ត៌មានទីតាំង'}</h3>
            <button onClick={() => { setSelectedHome(null); setIsEditing(false); }} className="text-slate-400 hover:text-rose-500 cursor-pointer"><X size={24} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm"><span className="text-xs text-slate-500 font-bold">លេខកូដអតិថិជន (ID)</span>{isEditing ? <input type="text" value={editForm.custom_id} onChange={(e) => setEditForm({...editForm, custom_id: e.target.value})} className="w-full mt-1 px-3 py-1.5 text-sm font-bold border-2 border-indigo-200 rounded-lg outline-none focus:border-indigo-500" /> : <p className="font-black text-slate-700 text-sm mt-1">{selectedHome.custom_id || 'N/A'}</p>}</div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm"><span className="text-xs text-slate-500 font-bold">ស្ថានភាព (Status)</span>{isEditing ? (<select value={editForm.status_color} onChange={(e) => setEditForm({...editForm, status_color: e.target.value})} className="w-full mt-1 px-3 py-1.5 text-sm font-bold border-2 border-indigo-200 rounded-lg outline-none"><option value="yellow">🟡 លឿង (Yellow)</option><option value="blue">🔵 ខៀវ (Blue)</option><option value="red">🔴 ក្រហម (Red)</option></select>) : (<div className="flex items-center gap-2 mt-1"><div className={`w-4 h-4 rounded-full shadow-sm ${selectedHome.status_color === 'blue' ? 'bg-blue-600' : selectedHome.status_color === 'red' ? 'bg-red-600' : 'bg-yellow-500'}`}></div><p className="font-black text-slate-700 text-sm capitalize">{selectedHome.status_color}</p></div>)}</div>
          </div>
          {isEditing ? (
            <div className="flex gap-2 mt-5">
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 flex justify-center gap-2"><Ban size={18} /> បោះបង់</button>
              <button onClick={handleUpdate} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 flex justify-center gap-2"><Save size={18} /> រក្សាទុក</button>
            </div>
          ) : <button onClick={() => setIsEditing(true)} className="w-full mt-5 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 flex justify-center gap-2 cursor-pointer"><MapIcon size={18} /> កែប្រែព័ត៌មាន</button>}
        </div>
      )}
    </div>
  );
}