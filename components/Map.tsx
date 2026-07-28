'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
// 🚀 ថែម Icon Download សម្រាប់ទាញយកទិន្នន័យ
import { MapPin, Eraser, Hexagon, Scissors, RotateCw, Search, Spline, X, User, Map as MapIcon, Save, Ban, Navigation, Layers, PieChart, Download } from 'lucide-react';

import { supabaseClient } from '../utils/supabase';

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.FeatureGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ custom_id: '', status_color: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState('satellite');

  const [showReport, setShowReport] = useState(false);
  const [stats, setStats] = useState({ total: 0, yellow: 0, blue: 0, red: 0 });
  
  // 🚀 ១. State សម្រាប់ផ្ទុកទិន្នន័យទាំងអស់រង់ចាំ Export
  const [allData, setAllData] = useState<any[]>([]);

  const fetchAndRenderData = async (map: L.Map, group: L.FeatureGroup) => {
    group.clearLayers();
    const { data: households, error } = await supabaseClient.from('households').select('*');
    if (error) { console.error("Error fetching data:", error); return; }

    if (households) {
      setAllData(households); // 🚀 រក្សាទុកទិន្នន័យទាំងអស់
      let t = 0, y = 0, b = 0, r = 0;

      households.forEach((h: any) => {
        t++;
        if (h.status_color === 'yellow') y++;
        else if (h.status_color === 'blue') b++;
        else if (h.status_color === 'red') r++;

        let colorHex = h.status_color === 'blue' ? '#2563eb' : h.status_color === 'red' ? '#dc2626' : '#f59e0b';
        let layer: any;

        if (h.shape_type === 'polygon' && h.geojson) {
          layer = L.geoJSON(h.geojson, { style: { color: '#ffffff', weight: 1.5, fillColor: colorHex, fillOpacity: 0.85 } });
        } else if (h.lat && h.lng) {
          layer = L.circleMarker([h.lat, h.lng], { radius: 9, fillColor: colorHex, color: '#ffffff', weight: 2, fillOpacity: 0.95 });
        }

        if (layer) {
          if (layer.eachLayer) layer.eachLayer((l: any) => l.options.dbId = h.id);
          else layer.options.dbId = h.id;

          layer.on('click', () => {
            setSelectedHome(h);
            setEditForm({ custom_id: h.custom_id || '', status_color: h.status_color || 'yellow' });
            setIsEditing(false); 
          });
          layer.addTo(group);
        }
      });
      setStats({ total: t, yellow: y, blue: b, red: r });
    }
  };

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([11.5564, 104.9282], 14);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

      tileLayerRef.current = L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(mapInstance.current);

      mapInstance.current.pm.addControls({ position: 'topleft', drawCircle: false, drawCircleMarker: false, drawText: false, drawRectangle: false });
      mapInstance.current.pm.toggleControls();

      layerGroup.current = L.featureGroup().addTo(mapInstance.current);
      fetchAndRenderData(mapInstance.current, layerGroup.current);

      mapInstance.current.on('pm:create', async (e: any) => {
        const layer = e.layer;
        const geojson = layer.toGeoJSON();
        const center = layer.getBounds ? layer.getBounds().getCenter() : layer.getLatLng();
        let customId = 'ID#' + Math.floor(1000 + Math.random() * 9000);
        
        if (e.shape === 'Marker') await supabaseClient.from('households').insert({ lat: center.lat, lng: center.lng, custom_id: customId, status_color: 'yellow', shape_type: 'point', geojson: geojson });
        else if (e.shape === 'Polygon') await supabaseClient.from('households').insert({ lat: center.lat, lng: center.lng, custom_id: customId, status_color: 'yellow', shape_type: 'polygon', geojson: geojson });
        
        if (mapInstance.current) {
          mapInstance.current.removeLayer(layer);
          mapInstance.current.pm.disableDraw();
          if (layerGroup.current) fetchAndRenderData(mapInstance.current, layerGroup.current);
        }
      });

      mapInstance.current.on('pm:remove', async (e: any) => {
        const id = e.layer.options.dbId;
        if (id) {
          await supabaseClient.from('households').delete().eq('id', id);
          if (layerGroup.current && mapInstance.current) fetchAndRenderData(mapInstance.current, layerGroup.current);
        }
      });

      mapInstance.current.on('pm:update', async (e: any) => {
        const id = e.layer.options.dbId;
        if (id) {
          const geojson = e.layer.toGeoJSON();
          const center = e.layer.getBounds ? e.layer.getBounds().getCenter() : e.layer.getLatLng();
          await supabaseClient.from('households').update({ lat: center.lat, lng: center.lng, geojson: geojson }).eq('id', id);
        }
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const handleUpdate = async () => {
    if (!selectedHome || !selectedHome.id) return;
    const { error } = await supabaseClient.from('households').update({ custom_id: editForm.custom_id, status_color: editForm.status_color }).eq('id', selectedHome.id);
    if (!error) {
      setSelectedHome({ ...selectedHome, ...editForm });
      setIsEditing(false);
      if (mapInstance.current && layerGroup.current) fetchAndRenderData(mapInstance.current, layerGroup.current);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data, error } = await supabaseClient.from('households').select('*').ilike('custom_id', `%${searchQuery}%`).limit(1);
    if (data && data.length > 0) {
      const h = data[0];
      if (mapInstance.current && h.lat && h.lng) mapInstance.current.flyTo([h.lat, h.lng], 18, { animate: true, duration: 1.5 });
      setSelectedHome(h);
      setEditForm({ custom_id: h.custom_id || '', status_color: h.status_color || 'yellow' });
      setIsEditing(false);
    } else alert('រកមិនឃើញលេខកូដនេះទេ!');
  };

  const toggleMapStyle = () => {
    if (!tileLayerRef.current) return;
    if (mapType === 'satellite') {
      tileLayerRef.current.setUrl('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}');
      setMapType('street');
    } else {
      tileLayerRef.current.setUrl('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}');
      setMapType('satellite');
    }
  };

  const locateMe = () => {
    if (mapInstance.current) {
      mapInstance.current.locate({ setView: true, maxZoom: 18 });
      mapInstance.current.once('locationfound', (e: any) => {
        L.marker(e.latlng).addTo(mapInstance.current!).bindPopup("<b style='color:#4f46e5;'>📍 ទីតាំងរបស់បងនៅទីនេះ!</b>").openPopup();
      });
    }
  };

  // 🚀 ២. មុខងារបំប្លែងទិន្នន័យទៅជា Excel (CSV format)
  const exportToCSV = () => {
    if (!allData || allData.length === 0) return alert('គ្មានទិន្នន័យសម្រាប់ទាញយកទេបង!');
    
    // បង្កើតក្បាលតារាង (Columns)
    const headers = ['លេខរៀង(ID), លេខកូដអតិថិជន, ប្រភេទ, ពណ៌ស្ថានភាព, រយៈទទឹង(Lat), រយៈបណ្តោយ(Lng)'];
    
    // ទាញទិន្នន័យនីមួយៗរៀបជាជួរ
    const csvData = allData.map((row: any) => {
      return `${row.id},${row.custom_id || 'N/A'},${row.shape_type},${row.status_color},${row.lat},${row.lng}`;
    });
    
    // ចងក្រងជាហ្វាយ
    const csvString = [headers, ...csvData].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // \uFEFF ដើម្បីឱ្យស្គាល់អក្សរខ្មែរ
    const url = URL.createObjectURL(blob);
    
    // បញ្ជាឱ្យ Browser ទាញយកហ្វាយ
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Maps_Ark_Data_Export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const drawPoint = () => { mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Marker', { continueDrawing: false }); };
  const drawPolygon = () => { mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Polygon'); };
  const drawRoad = () => { mapInstance.current?.pm.disableDraw(); mapInstance.current?.pm.enableDraw('Line'); };
  const toggleEdit = () => mapInstance.current?.pm.toggleGlobalEditMode();
  const toggleCut = () => mapInstance.current?.pm.toggleGlobalCutMode();
  const toggleRotate = () => mapInstance.current?.pm.toggleGlobalRotateMode();
  const toggleRemove = () => mapInstance.current?.pm.toggleGlobalRemovalMode();

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-24 left-4 z-[1000] w-[340px] flex flex-col gap-4 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4 hide-scrollbar">
        
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl p-3 flex items-center gap-2">
          <input type="text" placeholder="ស្វែងរកលេខកូដ (KPC...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 bg-white/60 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700 placeholder-slate-400 shadow-inner" />
          <button onClick={handleSearch} className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md hover:bg-indigo-700 transition-colors"><Search size={20} /></button>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-5">
          <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-5">📍 ចំណុចផ្ទះ (Point)</h3>
          <div className="flex justify-around mb-2">
            <button onClick={drawPoint} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center shadow-sm text-indigo-600 group-hover:scale-105 group-hover:border-indigo-400 transition-all cursor-pointer"><MapPin size={24} /></div><span className="text-[11px] font-bold text-slate-600">Add Point</span></button>
            <button onClick={toggleRemove} className="flex flex-col items-center gap-2 group"><div className="w-12 h-12 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center shadow-sm text-rose-500 group-hover:scale-105 group-hover:border-rose-400 transition-all cursor-pointer"><Eraser size={24} /></div><span className="text-[11px] font-bold text-slate-600">Delete Point</span></button>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-5">
          <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-5">🛑 ដំបូល (Polygon)</h3>
          <div className="flex justify-between mb-2">
            <button onClick={drawPolygon} className="flex flex-col items-center gap-1.5 hover:scale-110 transition-transform text-indigo-600 cursor-pointer"><Hexagon size={22} /><span className="text-[10px] font-bold text-slate-600">Add</span></button>
            <button onClick={toggleEdit} className="flex flex-col items-center gap-1.5 hover:scale-110 transition-transform text-amber-500 cursor-pointer"><MapPin size={22} /><span className="text-[10px] font-bold text-slate-600">Edit</span></button>
            <button onClick={toggleCut} className="flex flex-col items-center gap-1.5 hover:scale-110 transition-transform text-sky-500 cursor-pointer"><Scissors size={22} /><span className="text-[10px] font-bold text-slate-600">Cut</span></button>
            <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 hover:scale-110 transition-transform text-rose-500 cursor-pointer"><Eraser size={22} /><span className="text-[10px] font-bold text-slate-600">Remove</span></button>
            <button onClick={toggleRotate} className="flex flex-col items-center gap-1.5 hover:scale-110 transition-transform text-emerald-500 cursor-pointer"><RotateCw size={22} /><span className="text-[10px] font-bold text-slate-600">Rotate</span></button>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg rounded-3xl p-4 flex justify-between items-center px-6">
          <button onClick={toggleMapStyle} className="flex flex-col items-center gap-2 hover:scale-105 transition-transform text-slate-700 cursor-pointer">
            <Layers size={24} className={mapType === 'satellite' ? 'text-indigo-600' : 'text-amber-500'} />
            <span className="text-[10px] font-black">{mapType === 'satellite' ? 'Street' : 'Satellite'}</span>
          </button>
          <div className="w-px h-8 bg-slate-300"></div>
          <button onClick={locateMe} className="flex flex-col items-center gap-2 hover:scale-105 transition-transform text-slate-700 cursor-pointer">
            <Navigation size={24} className="text-emerald-500" />
            <span className="text-[10px] font-black">ទីតាំងខ្ញុំ</span>
          </button>
          <div className="w-px h-8 bg-slate-300"></div>
          <button onClick={() => setShowReport(true)} className="flex flex-col items-center gap-2 hover:scale-105 transition-transform text-slate-700 cursor-pointer">
            <PieChart size={24} className="text-purple-600" />
            <span className="text-[10px] font-black">របាយការណ៍</span>
          </button>
        </div>
      </div>

      {selectedHome && (
        <div className="absolute top-24 right-4 z-[1000] w-[340px] bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 transition-all">
          <div className="flex justify-between items-center border-b-2 border-indigo-500/20 pb-3 mb-4">
            <h3 className="font-black text-indigo-800 text-lg flex items-center gap-2"><User size={20} /> {isEditing ? 'កែប្រែព័ត៌មាន' : 'ព័ត៌មានទីតាំង'}</h3>
            <button onClick={() => { setSelectedHome(null); setIsEditing(false); }} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={24} /></button>
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-white/60 p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-bold">លេខកូដអតិថិជន (ID)</span>
              {isEditing ? <input type="text" value={editForm.custom_id} onChange={(e) => setEditForm({...editForm, custom_id: e.target.value})} className="w-full mt-1 px-3 py-1.5 text-sm font-bold text-slate-700 bg-white border-2 border-indigo-200 rounded-lg outline-none focus:border-indigo-500" /> : <p className="font-black text-slate-700 text-sm mt-1">{selectedHome.custom_id || 'N/A'}</p>}
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-bold">ប្រភេទទីតាំង</span>
              <p className="font-black text-slate-700 text-sm mt-1 uppercase">{selectedHome.shape_type}</p>
            </div>
            <div className="bg-white/60 p-3 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs text-slate-500 font-bold">ស្ថានភាព (Status)</span>
              {isEditing ? (
                <select value={editForm.status_color} onChange={(e) => setEditForm({...editForm, status_color: e.target.value})} className="w-full mt-1 px-3 py-1.5 text-sm font-bold text-slate-700 bg-white border-2 border-indigo-200 rounded-lg outline-none focus:border-indigo-500">
                  <option value="yellow">🟡 លឿង (Yellow)</option><option value="blue">🔵 ខៀវ (Blue)</option><option value="red">🔴 ក្រហម (Red)</option>
                </select>
              ) : (
                <div className="flex items-center gap-2 mt-1"><div className={`w-4 h-4 rounded-full shadow-sm ${selectedHome.status_color === 'blue' ? 'bg-blue-600' : selectedHome.status_color === 'red' ? 'bg-red-600' : 'bg-yellow-500'}`}></div><p className="font-black text-slate-700 text-sm capitalize">{selectedHome.status_color}</p></div>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-2 mt-5">
              <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-all flex justify-center items-center gap-2"><Ban size={18} /> បោះបង់</button>
              <button onClick={handleUpdate} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-emerald-600 transition-all flex justify-center items-center gap-2"><Save size={18} /> រក្សាទុក</button>
            </div>
          ) : <button onClick={() => setIsEditing(true)} className="w-full mt-5 bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-indigo-700 transition-all flex justify-center items-center gap-2"><MapIcon size={18} /> កែប្រែព័ត៌មាន</button>}
        </div>
      )}

      {showReport && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all">
          <div className="bg-white/90 backdrop-blur-xl border border-white/50 shadow-2xl rounded-[2rem] p-8 w-[450px]">
            <div className="flex justify-between items-center border-b-2 border-indigo-500/20 pb-4 mb-6">
              <h2 className="text-2xl font-black text-indigo-800 flex items-center gap-3">
                <PieChart size={28} className="text-purple-600" /> របាយការណ៍ទូទៅ
              </h2>
              <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={28} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-2xl text-white shadow-lg flex justify-between items-center">
                <span className="font-bold text-lg">ទីតាំងសរុប (Total)</span>
                <span className="text-4xl font-black">{stats.total}</span>
              </div>
              <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-400/50 shadow-sm flex flex-col items-center">
                <span className="text-yellow-600 font-bold mb-1">ពណ៌លឿង</span>
                <span className="text-3xl font-black text-yellow-700">{stats.yellow}</span>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border-2 border-blue-500/50 shadow-sm flex flex-col items-center">
                <span className="text-blue-600 font-bold mb-1">ពណ៌ខៀវ</span>
                <span className="text-3xl font-black text-blue-700">{stats.blue}</span>
              </div>
              <div className="col-span-2 bg-red-50 p-4 rounded-2xl border-2 border-red-500/50 shadow-sm flex flex-col items-center">
                <span className="text-red-600 font-bold mb-1">ពណ៌ក្រហម (បន្ទាន់)</span>
                <span className="text-3xl font-black text-red-700">{stats.red}</span>
              </div>
            </div>
            
            {/* 🚀 ៣. ប៊ូតុង Download ទិន្នន័យ */}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReport(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl shadow-sm hover:bg-slate-300 transition-all text-sm">
                បិទផ្ទាំង
              </button>
              <button onClick={exportToCSV} className="flex-[2] bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-emerald-600 transition-all text-sm flex justify-center items-center gap-2">
                <Download size={18} /> ទាញយកទិន្នន័យ (CSV)
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={mapRef} className="w-full h-full z-0" />
    </div>
  );
}