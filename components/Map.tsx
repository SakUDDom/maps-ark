'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { MapPin, Eraser, Hexagon, Scissors, RotateCw, Search, Slash, Move, ShieldAlert, LogIn, LogOut, User, PieChart, Ban, Save, X, Spline, Download, Printer, History, Edit3, DollarSign, Clock, Camera, Road, Sliders, CheckCircle, RotateCcw, Home, XCircle, Wallet, CalendarDays, ChevronLeft, ChevronRight, List, Layers, Map } from 'lucide-react';
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

  const activeDrawTool = useRef<string>('point'); 

  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [activeView, setActiveView] = useState<'map' | 'report'>('map');
  const [allData, setAllData] = useState<any[]>([]);

  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);

  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editForm, setEditForm] = useState({ 
    custom_id: '', customer_name: '', monthly_fee: 0, zone: '', status_color: 'yellow', payment_month: 'ខែមករា', photo_url: ''
  });

  const [roadEditData, setRoadEditData] = useState<any>(null);
  const [payMonth, setPayMonth] = useState('ខែមករា');
  const [payNumMonths, setPayNumMonths] = useState(1);
  const [isManualEditOpen, setIsManualEditOpen] = useState(false);
  
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [reportZone, setReportZone] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [pointToggle, setPointToggle] = useState(false);
  const [polygonToggle, setPolygonToggle] = useState(false);
  const [roadToggle, setRoadToggle] = useState(false);
  const [borderLive, setBorderLive] = useState(false);

  const currentUserRef = useRef<any>(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const monthsList = ['ខែមករា', 'ខែកក្កដា', 'ខែមីនា', 'ខែមេសា', 'ខែឧសភា', 'ខែមិថុនា', 'ខែកក្កដា', 'ខែសីហា', 'ខែកញ្ញា', 'ខែតុលា', 'ខែវិច្ឆិកា', 'ខែធ្នូ'];

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        const { data: profile } = await supabaseClient.from('Profiles_Access').select('role, zone').eq('id', session.user.id).maybeSingle();
        setCurrentUser({ id: session.user.id, name: profile?.zone || session.user.email, role: profile?.role || 'admin' });
        setShowLoginModal(false);
      }
    };
    checkSession();
  }, []);

  const fetchAndRenderData = async () => {
    if (pointsLayer.current) pointsLayer.current.clearLayers();
    if (polygonsLayer.current) polygonsLayer.current.clearLayers();
    if (roadsLayer.current) roadsLayer.current.clearLayers();
    if (bordersLayer.current) bordersLayer.current.clearLayers();

    const { data: households } = await supabaseClient.from('households').select('*');
    if (households) {
      setAllData(households);
      households.forEach((h: any) => {
        let layer: any;
        let colorHex = h.status_color === 'blue' ? '#2563eb' : h.status_color === 'red' ? '#dc2626' : h.status_color === 'black' ? '#020617' : '#f59e0b';

        if (h.shape_type === 'point' && h.lat && h.lng) {
          layer = L.circleMarker([h.lat, h.lng], { radius: 8, fillColor: colorHex, color: '#ffffff', weight: 2, fillOpacity: 0.95, pane: 'pointsPane' });
          if (layer && pointsLayer.current) { layer.options.dbId = h.id; layer.options.dbType = 'household'; layer.addTo(pointsLayer.current); }
        } 
        else if (h.shape_type === 'polygon' && h.geojson) {
          layer = L.geoJSON(h.geojson, { style: { color: '#ffffff', weight: 1.5, fillColor: colorHex, fillOpacity: 0.85 }, pane: 'polygonsPane' });
          if (layer && polygonsLayer.current) { layer.eachLayer((l: any) => { l.options.dbId = h.id; l.options.dbType = 'household'; }); layer.addTo(polygonsLayer.current); }
        }

        if (layer) {
          layer.on('click', () => {
            setSelectedHome(h); 
            setEditForm({ custom_id: h.custom_id || '', customer_name: h.customer_name || '', monthly_fee: h.monthly_fee || 0, zone: h.zone || '', status_color: h.status_color || 'yellow', payment_month: h.payment_month || 'ខែមករា', photo_url: h.photo_url || '' }); 
            setPayMonth(h.payment_month || 'ខែមករា'); 
            setPayNumMonths(1);
            setIsManualEditOpen(false); 
          });
        }
      });
    }

    const { data: roads } = await supabaseClient.from('roads').select('*');
    if (roads) {
      roads.forEach((r: any) => {
        if (r.geojson) {
          let roadColor = '#10b981'; 
          if(r.road_type === 'Land road') roadColor = '#ec5050';
          if(r.road_type === 'Hight Ways road') roadColor = '#3b82f6';
          if(r.road_type === 'Nation road') roadColor = '#16a34a';
          if(r.road_type === 'Concrete road') roadColor = '#f6d91e';
          if(r.road_type === 'Asphalt road') roadColor = '#e01ae3';

          const layer = L.geoJSON(r.geojson, { style: { color: roadColor, weight: 6, opacity: 0.9 }, pane: 'roadsPane' }); 
          layer.bindTooltip(`<div class="text-center"><b>${r.name || 'មិនមានឈ្មោះផ្លូវ'}</b><br><span class="text-xs text-slate-500">${r.road_type || 'Land road'} | ទំហំ: ${r.width || 'មិនបញ្ជាក់'}</span></div>`, {sticky: true, className: 'font-bold'});
          layer.eachLayer((l: any) => { 
            l.options.dbId = r.id; l.options.dbType = 'road'; 
            l.on('dblclick', () => {
              if(!currentUserRef.current) return;
              setRoadEditData({ isNew: false, id: r.id, name: r.name || '', width: r.width || '', address: r.address || '', road_type: r.road_type || 'Land road' });
            });
          });
          layer.addTo(roadsLayer.current!);
        }
      });
    }

    const { data: borders } = await supabaseClient.from('zone_borders').select('*');
    if (borders) {
      borders.forEach((b: any) => {
        if (b.geojson) {
          const layer = L.geoJSON(b.geojson, { style: { color: '#ec4899', weight: 5, opacity: 0.8, dashArray: '8, 8', fillOpacity: 0.1 }, pane: 'bordersPane' }); 
          layer.bindTooltip(`ព្រំដែនតំបន់៖ <b>${b.zone || 'មិនបញ្ជាក់'}</b>`, { sticky: true, className: 'font-bold text-sm bg-white px-2 py-1 shadow-md border border-slate-200 rounded' });
          layer.eachLayer((l: any) => { 
            l.options.dbId = b.id; l.options.dbType = 'border'; 
            l.on('dblclick', async () => {
              if(!currentUserRef.current) return;
              const newZoneName = prompt("កែប្រែឈ្មោះតំបន់ (Zone) សម្រាប់ព្រំដែននេះ៖", b.zone);
              if (newZoneName && newZoneName.trim() !== "" && newZoneName !== b.zone) {
                  await supabaseClient.from('zone_borders').update({ zone: newZoneName.trim() }).eq('id', b.id);
                  fetchAndRenderData();
              }
            });
          });
          layer.addTo(bordersLayer.current!);
        }
      });
    }
  };

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView([11.99, 105.46], 15);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(mapInstance.current);

      if (mapInstance.current.pm) {
        const pmInstance = mapInstance.current.pm as any;
        if (typeof pmInstance.setGlobalOptions === 'function') pmInstance.setGlobalOptions({ pmIgnore: false } as any);
        if (typeof pmInstance.addControls === 'function') {
          pmInstance.addControls({ drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false } as any);
        }
      }

      if (!mapInstance.current.getPane('bordersPane')) {
        mapInstance.current.createPane('bordersPane').style.zIndex = '400';
        mapInstance.current.createPane('roadsPane').style.zIndex = '410';
        mapInstance.current.createPane('polygonsPane').style.zIndex = '420';
        mapInstance.current.createPane('pointsPane').style.zIndex = '430'; 
      }

      pointsLayer.current = L.featureGroup();
      polygonsLayer.current = L.featureGroup();
      roadsLayer.current = L.featureGroup();
      bordersLayer.current = L.featureGroup();

      fetchAndRenderData();

      mapInstance.current.on('pm:create', async (e: any) => {
        if (!currentUserRef.current) { alert('🔒 សូមចូលគណនី (Login) ជាមុនសិន។'); mapInstance.current?.removeLayer(e.layer); return; }

        const layer = e.layer;
        const geojson = layer.toGeoJSON();
        const center = layer.getBounds ? layer.getBounds().getCenter() : layer.getLatLng();
        let customId = 'ID#' + Math.floor(1000 + Math.random() * 9000);
        let shapeType = activeDrawTool.current;

        if (shapeType === 'road') {
            setRoadEditData({ isNew: true, geojson: geojson, name: '', width: '', address: '', road_type: 'Land road' });
            mapInstance.current?.removeLayer(e.layer);
            (mapInstance.current?.pm as any)?.disableDraw();
            return;
        } 
        else if (shapeType === 'border') {
            const zoneName = prompt("សូមបញ្ចូលឈ្មោះតំបន់ (Zone) សម្រាប់ព្រំដែននេះ៖");
            if (!zoneName) { mapInstance.current?.removeLayer(e.layer); return; }
            await supabaseClient.from('zone_borders').insert({ geojson: geojson, zone: zoneName });
        } 
        else {
            let dbShape = shapeType === 'polygon' ? 'polygon' : 'point';
            await supabaseClient.from('households').insert({ lat: center.lat, lng: center.lng, custom_id: customId, status_color: 'yellow', shape_type: dbShape, geojson: geojson, payment_month: 'ខែមករា', monthly_fee: 10000 });
        }
        
        if (mapInstance.current) {
          mapInstance.current.removeLayer(layer);
          (mapInstance.current.pm as any)?.disableDraw();
          fetchAndRenderData();
        }
      });

      mapInstance.current.on('pm:remove', async (e: any) => {
        if (!currentUserRef.current) { alert('🔒 សូមចូលគណនីជាមុនសិន។'); fetchAndRenderData(); return; }
        const id = e.layer.options.dbId;
        const dbType = e.layer.options.dbType;
        
        if (dbType === 'road') await supabaseClient.from('roads').delete().eq('id', id);
        else if (dbType === 'border') await supabaseClient.from('zone_borders').delete().eq('id', id);
        else await supabaseClient.from('households').delete().eq('id', id);
      });

      mapInstance.current.on('pm:update', async (e: any) => {
        if (!currentUserRef.current) { alert('🔒 សូមចូលគណនីជាមុនសិន។'); fetchAndRenderData(); return; }
        const id = e.layer.options.dbId;
        const dbType = e.layer.options.dbType;
        const geojson = e.layer.toGeoJSON();
        
        if (dbType === 'road') await supabaseClient.from('roads').update({ geojson: geojson }).eq('id', id);
        else if (dbType === 'border') await supabaseClient.from('zone_borders').update({ geojson: geojson }).eq('id', id);
        else {
            const center = e.layer.getBounds ? e.layer.getBounds().getCenter() : e.layer.getLatLng();
            await supabaseClient.from('households').update({ lat: center.lat, lng: center.lng, geojson: geojson }).eq('id', id);
        }
      });
    }
  }, []);

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
    if (!currentUserRef.current) { alert('🔒 សូមចុច "ចូលគណនី" (Login) ជាមុនសិន!'); setShowLoginModal(true); return false; }
    return true;
  };

  const drawPoint = () => { if(checkPermission()){ activeDrawTool.current = 'point'; (mapInstance.current?.pm as any)?.disableDraw(); (mapInstance.current?.pm as any)?.enableDraw('Marker', { snappable: true }); }};
  const drawPolygon = () => { if(checkPermission()){ activeDrawTool.current = 'polygon'; (mapInstance.current?.pm as any)?.disableDraw(); (mapInstance.current?.pm as any)?.enableDraw('Polygon', { snappable: true }); }};
  const drawRoad = () => { if(checkPermission()){ activeDrawTool.current = 'road'; (mapInstance.current?.pm as any)?.disableDraw(); (mapInstance.current?.pm as any)?.enableDraw('Line', { snappable: true }); }};
  const drawBorder = () => { if(checkPermission()){ activeDrawTool.current = 'border'; (mapInstance.current?.pm as any)?.disableDraw(); (mapInstance.current?.pm as any)?.enableDraw('Polygon', { snappable: true }); }};
  
  const toggleEdit = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalEditMode(); };
  const toggleCut = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalCutMode(); };
  const toggleRotate = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalRotateMode(); };
  const toggleRemove = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalRemovalMode(); };

  const updateMarkerColorLocally = (id: string, colorHex: string) => {
    pointsLayer.current?.eachLayer((layer: any) => { if (layer.options.dbId === id) layer.setStyle({ fillColor: colorHex }); });
    polygonsLayer.current?.eachLayer((layer: any) => { if (layer.options.dbId === id) layer.setStyle({ fillColor: colorHex }); });
  };

  const handleUpdate = async () => {
    if (!selectedHome || !selectedHome.id) return;
    const { error } = await supabaseClient.from('households').update({ 
      custom_id: editForm.custom_id, customer_name: editForm.customer_name, monthly_fee: editForm.monthly_fee, zone: editForm.zone, status_color: editForm.status_color, payment_month: editForm.payment_month
    }).eq('id', selectedHome.id);
    
    if (!error) { 
      let colorHex = editForm.status_color === 'blue' ? '#2563eb' : editForm.status_color === 'red' ? '#dc2626' : editForm.status_color === 'black' ? '#020617' : '#f59e0b';
      updateMarkerColorLocally(selectedHome.id, colorHex);
      setSelectedHome({ ...selectedHome, ...editForm }); alert('✅ រក្សាទុកព័ត៌មានអតិថិជនបានជោគជ័យ!'); 
    } else { alert(`❌ មានបញ្ហាក្នុងការរក្សាទុក! Error: ${error.message}`); }
  };

  const handleQuickPay = async () => {
    if (!selectedHome) return;
    const startIdx = monthsList.indexOf(payMonth);
    if (startIdx === -1) { alert("សូមជ្រើសរើសខែបង់ប្រាក់!"); return; }

    const recordsToInsert = [];
    let lastPaidMonthIndex = startIdx;
    const now = new Date();

    for (let i = 0; i < payNumMonths; i++) {
        let targetMonthIndex = (startIdx + i) % 12;
        let targetMonthNumber = targetMonthIndex + 1; 
        let targetYear = now.getFullYear();
        if (startIdx + i > 11) { targetYear += Math.floor((startIdx + i) / 12); }
        lastPaidMonthIndex = targetMonthIndex;
        
        recordsToInsert.push({ household_id: selectedHome.id, custom_id: selectedHome.custom_id, customer_name: selectedHome.customer_name, amount: Number(selectedHome.monthly_fee) || 0, month: targetMonthNumber, year: targetYear, status: 'paid', zone: selectedHome.zone, collected_by: currentUserRef.current?.name || '', paid_at: now.toISOString() });
    }

    const { error: insertErr } = await supabaseClient.from('payments').insert(recordsToInsert);
    if (insertErr) { alert(`❌ មានបញ្ហាក្នុងការកត់ត្រាការបង់ប្រាក់! Error: ${insertErr.message}`); return; }

    const nextMonthIdx = (lastPaidMonthIndex + 1) % 12;
    const nextMonthStr = monthsList[nextMonthIdx];

    const { error } = await supabaseClient.from('households').update({ status_color: 'blue', payment_month: nextMonthStr }).eq('id', selectedHome.id);

    if (!error) {
      alert('✅ ការបង់ប្រាក់ទទួលបានជោគជ័យ!');
      updateMarkerColorLocally(selectedHome.id, '#2563eb'); 
      setEditForm({...editForm, status_color: 'blue', payment_month: nextMonthStr});
      setSelectedHome({...selectedHome, status_color: 'blue', payment_month: nextMonthStr});
    } else { alert(`❌ បរាជ័យក្នុងការ Update ស្ថានភាពផ្ទះ! Error: ${error.message}`); }
  };

  const handleOpenHistory = async () => {
    if (!selectedHome) return;
    setHistoryModalOpen(true);
    setIsLoadingHistory(true);
    const { data, error } = await supabaseClient.from('payments').select('*').eq('household_id', selectedHome.id).order('created_at', { ascending: false });
    if (error) { alert(`❌ មិនអាចទាញយកប្រវត្តិបានទេ! Error: ${error.message}`); } else if (data) { setHistoryData(data); }
    setIsLoadingHistory(false);
  };

  const handleUndoPayment = async (paymentId: string, monthStr: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់បោះបង់ការបង់ប្រាក់ខែ ${monthStr} នេះមែនទេ?`)) return;
    await supabaseClient.from('payments').delete().eq('id', paymentId);
    await supabaseClient.from('households').update({ status_color: 'yellow', payment_month: monthStr }).eq('id', selectedHome.id);
    updateMarkerColorLocally(selectedHome.id, '#f59e0b'); 
    setEditForm({...editForm, status_color: 'yellow', payment_month: monthStr});
    setSelectedHome({...selectedHome, status_color: 'yellow', payment_month: monthStr});
    handleOpenHistory(); 
  };

  const saveRoadData = async () => {
      if (roadEditData.isNew) {
          await supabaseClient.from('roads').insert({ geojson: roadEditData.geojson, name: roadEditData.name, width: roadEditData.width, address: roadEditData.address, road_type: roadEditData.road_type });
          setRoadToggle(true);
      } else {
          await supabaseClient.from('roads').update({ name: roadEditData.name, width: roadEditData.width, address: roadEditData.address, road_type: roadEditData.road_type }).eq('id', roadEditData.id);
      }
      setRoadEditData(null); fetchAndRenderData();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabaseClient.from('households').select('*').ilike('custom_id', `%${searchQuery}%`).limit(1);
    if (data && data.length > 0) {
      const h = data[0];
      if (mapInstance.current && h.lat && h.lng) mapInstance.current.flyTo([h.lat, h.lng], 18, { animate: true, duration: 1.5 });
      setSelectedHome(h); setEditForm({ custom_id: h.custom_id || '', customer_name: h.customer_name || '', monthly_fee: h.monthly_fee || 0, zone: h.zone || '', status_color: h.status_color || 'yellow', payment_month: h.payment_month || 'ខែមករា', photo_url: h.photo_url || '' }); 
    } else alert('រកមិនឃើញលេខកូដនេះទេ!');
  };

  const handleRealLogin = async (e: any) => {
    e.preventDefault();
    const email = e.target[0].value;
    const password = e.target[1].value;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) { alert('❌ មិនអាចចូលបានទេ៖ ' + error.message); } 
    else if (data.session) {
      const { data: profile } = await supabaseClient.from('Profiles_Access').select('role, zone').eq('id', data.user.id).maybeSingle();
      const roleStr = profile?.role ? profile.role.toLowerCase().replace(' ', '_') : 'user';
      setCurrentUser({ name: profile?.zone || email, role: roleStr, id: data.user.id });
      setShowLoginModal(false); fetchAndRenderData();
    }
  };

  const openReport = async () => {
    setActiveView('report');
    const { data } = await supabaseClient.from('payments').select('*');
    if (data) setPaymentsData(data);
  };

  const handleGlobalMonthChange = async (e: any) => {
    const val = e.target.value;
    if (!val || !currentUserRef.current) return;
    if (!['admin', 'super_admin'].includes(currentUserRef.current.role)) return;
    if(confirm(`តើអ្នកពិតជាចង់ប្តូរខែត្រូវបង់សម្រាប់ផ្ទះទាំងអស់ក្នុងតំបន់នេះទៅជា « ${val} » មែនទេ?`)) { 
        let query = supabaseClient.from('households').update({ payment_month: val });
        if (currentUserRef.current.role !== 'super_admin') query = query.eq('zone', currentUserRef.current.name);
        else if (reportZone) query = query.eq('zone', reportZone);
        else query = query.not('id', 'is', null); 
        await query; fetchAndRenderData(); e.target.value = "";
    }
  };

  const handleGlobalStatusChange = async (e: any) => {
    const val = e.target.value;
    if (!val || !currentUserRef.current) return;
    if (!['admin', 'super_admin'].includes(currentUserRef.current.role)) return;
    if(confirm(`តើអ្នកពិតជាចង់ប្តូរស្ថានភាពសម្រាប់ផ្ទះទាំងអស់ក្នុងតំបន់នេះមែនទេ?`)) { 
        let query = supabaseClient.from('households').update({ status_color: val });
        if (currentUserRef.current.role !== 'super_admin') query = query.eq('zone', currentUserRef.current.name);
        else if (reportZone) query = query.eq('zone', reportZone);
        else query = query.not('id', 'is', null); 
        await query; fetchAndRenderData(); e.target.value = "";
    }
  };

  const handleExportCSV = () => {
    let csv = "\uFEFFលេខកូដ,ឈ្មោះ,តម្លៃត្រូវបង់,ខែត្រូវបង់,តំបន់,ស្ថានភាព\n"; 
    reportHouseholds.forEach(h => { csv += `"${h.custom_id}","${h.customer_name||''}","${h.monthly_fee||0}","${h.payment_month||''}","${h.zone||''}","${h.status_color}"\n`; });
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `Maps_Ark_Report_${new Date().toISOString().split('T')[0]}.csv`; link.click();
  };

  let reportHouseholds = allData;
  if (currentUser?.role !== 'super_admin') reportHouseholds = reportHouseholds.filter(h => h.zone === currentUser?.name);
  else if (reportZone) reportHouseholds = reportHouseholds.filter(h => h.zone === reportZone);
  
  const totalHouses = reportHouseholds.length;
  const paidHouses = reportHouseholds.filter(h => h.status_color === 'blue').length;
  const pendingHouses = reportHouseholds.filter(h => h.status_color === 'yellow').length;
  const closedHouses = reportHouseholds.filter(h => h.status_color === 'red').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  let filteredPayments = paymentsData;
  if (currentUser?.role !== 'super_admin') filteredPayments = filteredPayments.filter(p => p.zone === currentUser?.name);
  else if (reportZone) filteredPayments = filteredPayments.filter(p => p.zone === reportZone);

  const monthlyRevenue = filteredPayments.filter(p => p.month === currentMonthNum && p.year === currentYearNum).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const dailyRevenue = filteredPayments.filter(p => p.paid_at && p.paid_at.startsWith(todayStr)).reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const uniqueZones = Array.from(new Set(allData.map(h => h.zone).filter(Boolean)));
  const paginatedHouseholds = reportHouseholds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(totalHouses / itemsPerPage);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans relative">
      <header className="h-[64px] absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-md flex justify-between items-center px-6 z-[2000] shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo/Map Ark.png" alt="Logo" onError={(e) => e.currentTarget.style.display='none'} className="w-8 h-8 object-contain rounded-md" />
          <h1 className="text-xl font-bold text-indigo-700">Maps Ark</h1>
          {currentUser && (
            <span className={`text-xs px-2 py-1 rounded-full font-bold border shadow-sm flex items-center gap-1 ${
              currentUser.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border-purple-200' :
              currentUser.role === 'admin' ? 'bg-rose-100 text-rose-700 border-rose-200' :
              'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}>
              {currentUser.role === 'super_admin' ? 'Super Admin 👑' : 
               currentUser.role === 'admin' ? 'Admin' : 
               `អ្នកប្រមូល៖ ${currentUser.name}`}
            </span>
          )}
        </div>
        <div className="flex gap-4 items-center">
          {activeView === 'map' ? (
            <button onClick={openReport} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm cursor-pointer"><PieChart size={18} className="text-indigo-600" /> របាយការណ៍</button>
          ) : (
            <button onClick={() => setActiveView('map')} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-all shadow-sm cursor-pointer"><Map size={18} /> ត្រឡប់ទៅផែនទី</button>
          )}
          {currentUser ? (
            <button onClick={async () => { await supabaseClient.auth.signOut(); setCurrentUser(null); setShowLoginModal(true); setActiveView('map'); }} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all shadow-sm border border-rose-200 cursor-pointer"><LogOut size={18} /> ចេញ</button>
          ) : (
            <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all shadow-sm border border-indigo-200 cursor-pointer"><LogIn size={18} /> ចូលគណនី</button>
          )}
        </div>
      </header>

      <div className={`flex-1 relative w-full h-full ${activeView === 'map' ? 'flex' : 'hidden'}`}>
        {!isToolsPanelOpen && (
          <button 
            onClick={() => setIsToolsPanelOpen(true)} 
            className="absolute top-[80px] left-4 z-[1000] bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer text-indigo-600 flex items-center justify-center hover:scale-105"
            title="បើកផ្ទាំងបញ្ជា"
          >
            <Layers size={22} />
          </button>
        )}

        <div className={`absolute top-[80px] left-4 z-[1050] w-[340px] flex flex-col gap-4 transition-all duration-300 transform ${isToolsPanelOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[380px] opacity-0 pointer-events-none'} hide-scrollbar overflow-y-auto max-h-[calc(100vh-90px)] pb-6`}>
          <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-3 flex items-center gap-2">
            <input type="text" placeholder="ស្វែងរកលេខកូដ (KPC...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500" />
            <button onClick={handleSearch} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 cursor-pointer shadow-md"><Search size={20} /></button>
            <button onClick={() => setIsToolsPanelOpen(false)} className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 cursor-pointer border border-rose-200 shadow-sm" title="បិទផ្ទាំង"><X size={20} /></button>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
            <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">📍 ចំណុចផ្ទះ (Point)</h3>
            <div className="flex justify-around mb-4">
              <button onClick={drawPoint} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 group-hover:border-indigo-400 transition-all"><MapPin size={22} /></div><span className="text-[11px] font-bold text-slate-600">Add Point</span></button>
              <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-slate-200 group-hover:border-rose-400 transition-all"><Eraser size={22} /></div><span className="text-[11px] font-bold text-slate-600">Delete Point</span></button>
            </div>
            <div className="flex justify-center"><Toggle enabled={pointToggle} setEnabled={setPointToggle} /></div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
            <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🛑 ដំបូល (Polygon)</h3>
            <div className="flex justify-between mb-4">
              <button onClick={drawPolygon} className="flex flex-col items-center gap-1 cursor-pointer text-indigo-600 hover:scale-110"><Hexagon size={20} /><span className="text-[10px] font-bold text-slate-600">Add</span></button>
              <button onClick={toggleEdit} className="flex flex-col items-center gap-1 cursor-pointer text-amber-500 hover:scale-110"><MapPin size={20} /><span className="text-[10px] font-bold text-slate-600">Edit</span></button>
              <button onClick={toggleCut} className="flex flex-col items-center gap-1 cursor-pointer text-sky-500 hover:scale-110"><Scissors size={20} /><span className="text-[10px] font-bold text-slate-600">Cut</span></button>
              <button onClick={toggleRemove} className="flex flex-col items-center gap-1 cursor-pointer text-rose-500 hover:scale-110"><Eraser size={20} /><span className="text-[10px] font-bold text-slate-600">Remove</span></button>
              <button onClick={toggleRotate} className="flex flex-col items-center gap-1 cursor-pointer text-emerald-500 hover:scale-110"><RotateCw size={20} /><span className="text-[10px] font-bold text-slate-600">Rotate</span></button>
            </div>
            <div className="flex justify-center"><Toggle enabled={polygonToggle} setEnabled={setPolygonToggle} /></div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
            <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🛣️ ផ្លូវ (Road)</h3>
            <div className="flex justify-around mb-4">
              <button onClick={drawRoad} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 group-hover:border-indigo-400 transition-all"><Slash size={22} /></div><span className="text-[11px] font-bold text-slate-600">Add Road</span></button>
              <button onClick={toggleEdit} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-200 group-hover:border-amber-400 transition-all"><Move size={22} /></div><span className="text-[11px] font-bold text-slate-600">Edit Road</span></button>
              <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-slate-200 group-hover:border-rose-400 transition-all"><Ban size={22} /></div><span className="text-[11px] font-bold text-slate-600">Delete</span></button>
            </div>
            <div className="flex justify-center"><Toggle enabled={roadToggle} setEnabled={setRoadToggle} /></div>
          </div>

          <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
            <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🌐 ព្រំដែន (Border)</h3>
            <div className="flex justify-between mb-5">
              <button onClick={drawBorder} className="flex flex-col items-center gap-1 cursor-pointer text-indigo-600 hover:scale-110"><Hexagon size={20} /><span className="text-[10px] font-bold text-slate-600">Add</span></button>
              <button onClick={toggleEdit} className="flex flex-col items-center gap-1 cursor-pointer text-amber-500 hover:scale-110"><MapPin size={20} /><span className="text-[10px] font-bold text-slate-600">Edite</span></button>
              <button onClick={toggleCut} className="flex flex-col items-center gap-1 cursor-pointer text-sky-500 hover:scale-110"><Scissors size={20} /><span className="text-[10px] font-bold text-slate-600">Cut</span></button>
              <button onClick={toggleRemove} className="flex flex-col items-center gap-1 cursor-pointer text-rose-500 hover:scale-110"><Eraser size={20} /><span className="text-[10px] font-bold text-slate-600">Remove</span></button>
              <button onClick={toggleRotate} className="flex flex-col items-center gap-1 cursor-pointer text-emerald-500 hover:scale-110"><RotateCw size={20} /><span className="text-[10px] font-bold text-slate-600">Rotate</span></button>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-600 flex items-center gap-2"><Spline size={16} className="text-purple-500"/> ព្រំដែនគូសផ្ទាល់</span><Toggle enabled={borderLive} setEnabled={setBorderLive} /></div>
            </div>
          </div>
        </div>
        <main className="flex-1 relative z-0 h-full bg-slate-100">
          <div ref={mapRef} className="w-full h-full" />
        </main>
      </div>

      {activeView === 'report' && (
        <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50 pt-[100px] p-6 lg:p-10 relative z-10">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">របាយការណ៍ទូទៅ</h2>
                <p className="text-sm text-slate-500 mt-1">ទិន្នន័យស្ថិតិ និងការគ្រប់គ្រង</p>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {currentUser?.role === 'super_admin' && (
                  <select value={reportZone} onChange={e => setReportZone(e.target.value)} className="px-4 py-2 border rounded-lg text-sm bg-indigo-50 font-bold text-indigo-700 outline-none shadow-sm border-indigo-200 cursor-pointer">
                    <option value="">🗺️ គ្រប់តំបន់ទាំងអស់</option>
                    {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                )}
                {['admin', 'super_admin'].includes(currentUser?.role || '') && (
                  <>
                    <select onChange={handleGlobalMonthChange} defaultValue="" className="px-4 py-2 border rounded-lg text-sm bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer">
                      <option value="" disabled>⚙️ ប្តូរខែរួម</option>
                      {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select onChange={handleGlobalStatusChange} defaultValue="" className="px-4 py-2 border rounded-lg text-sm bg-slate-50 font-bold text-slate-700 outline-none cursor-pointer">
                      <option value="" disabled>⚙️ ប្តូរស្ថានភាពរួម</option>
                      <option value="blue">🔵 បានបង់</option>
                      <option value="yellow">🟡 មិនទាន់បង់</option>
                      <option value="red">🔴 បិទ</option>
                      <option value="black">⚫ បង់តែទុកសិន</option>
                    </select>
                  </>
                )}
                <button onClick={handleExportCSV} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 shadow-sm flex items-center cursor-pointer">
                  <Download size={16} className="mr-1" /> ទាញយក CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">ផ្ទះសរុប</span><div className="p-2 bg-indigo-50 rounded-lg text-indigo-500"><Home size={20}/></div></div>
                <div className="text-3xl font-black text-slate-800">{totalHouses}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">បានបង់</span><div className="p-2 bg-emerald-50 rounded-lg text-emerald-500"><CheckCircle size={20}/></div></div>
                <div className="text-3xl font-black text-emerald-600">{paidHouses}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">រង់ចាំបង់</span><div className="p-2 bg-amber-50 rounded-lg text-amber-500"><Clock size={20}/></div></div>
                <div className="text-3xl font-black text-amber-500">{pendingHouses}</div>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2"><span className="text-sm font-bold text-slate-500">បិទ</span><div className="p-2 bg-rose-50 rounded-lg text-rose-500"><XCircle size={20}/></div></div>
                <div className="text-3xl font-black text-rose-600">{closedHouses}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800">ចំណូលប្រចាំខែនេះ</h3><div className="p-2 bg-emerald-50 rounded-lg text-emerald-500"><Wallet size={24}/></div></div>
                <div className="text-4xl font-black text-emerald-600">{monthlyRevenue.toLocaleString()} ៛</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-indigo-500">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800">ចំណូលប្រចាំថ្ងៃនេះ (Today)</h3><div className="p-2 bg-indigo-50 rounded-lg text-indigo-500"><CalendarDays size={24}/></div></div>
                <div className="text-4xl font-black text-indigo-600">{dailyRevenue.toLocaleString()} ៛</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center"><List size={18} className="mr-2 text-indigo-500"/>បញ្ជីឈ្មោះអតិថិជន</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">បង្ហាញ៖</span>
                  <select value={itemsPerPage} onChange={e => {setItemsPerPage(Number(e.target.value)); setCurrentPage(1);}} className="border px-2 py-1 rounded text-sm outline-none font-bold text-indigo-700 bg-white shadow-sm cursor-pointer">
                    <option value="10">10 ជួរ</option><option value="50">50 ជួរ</option><option value="100">100 ជួរ</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="bg-slate-100/50 text-slate-500 font-bold border-b">
                    <tr><th className="px-6 py-4">លេខកូដ</th><th className="px-6 py-4">ឈ្មោះ</th><th className="px-6 py-4">តំបន់</th><th className="px-6 py-4">ខែត្រូវបង់</th><th className="px-6 py-4">ស្ថានភាព</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedHouseholds.length === 0 && <tr><td colSpan={5} className="text-center py-6 font-bold text-slate-400">គ្មានទិន្នន័យទេ</td></tr>}
                    {paginatedHouseholds.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{h.custom_id}</td>
                        <td className="px-6 py-4 font-bold">{h.customer_name || '---'}</td>
                        <td className="px-6 py-4">{h.zone || '---'}</td>
                        <td className="px-6 py-4">{h.payment_month}</td>
                        <td className="px-6 py-4">
                          {h.status_color === 'blue' ? <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">🔵 បានបង់</span> :
                           h.status_color === 'yellow' ? <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">🟡 មិនទាន់បង់</span> :
                           h.status_color === 'red' ? <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">🔴 បិទ</span> :
                           <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300">⚫ ទុកសិន</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="text-xs text-slate-500 font-bold">កំពុងបង្ហាញ {(currentPage-1)*itemsPerPage + 1} - {Math.min(currentPage*itemsPerPage, totalHouses)} នៃ {totalHouses}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white border rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-sm font-bold flex items-center cursor-pointer"><ChevronLeft size={16} className="mr-1"/> ថយក្រោយ</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="px-3 py-1 bg-white border rounded text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-sm font-bold flex items-center cursor-pointer">ទៅមុខ <ChevronRight size={16} className="ml-1"/></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedHome && activeView === 'map' && (
        <div className="absolute top-[80px] right-4 z-[9999] w-[380px] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-100px)] border border-slate-200">
          <div className="bg-white p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-indigo-900 text-sm flex items-center gap-2"><User size={18} className="text-indigo-600"/> ព័ត៌មានអតិថិជន</h3>
            <button onClick={() => setSelectedHome(null)} className="text-slate-400 hover:text-rose-500 cursor-pointer"><X size={20} /></button>
          </div>
          
          <div className="p-5 flex flex-col gap-4 overflow-y-auto hide-scrollbar bg-white pb-10">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1"><Camera size={14}/> រូបថត៖</span>
              <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                {editForm.photo_url ? ( <img src={editForm.photo_url} className="w-full h-full object-cover" alt="Customer" /> ) : ( <span className="text-slate-400 text-xs font-bold">គ្មានរូបថត</span> )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">លេខកូដផ្ទះ៖</span><input type="text" value={editForm.custom_id} onChange={(e) => setEditForm({...editForm, custom_id: e.target.value})} className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" /></div>
            <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">ឈ្មោះអតិថិជន (ម្ចាស់ហាង/សំអាង)៖</span><input type="text" value={editForm.customer_name} onChange={(e) => setEditForm({...editForm, customer_name: e.target.value})} className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" /></div>
            <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">តម្លៃសេវា (៛)៖</span><input type="number" value={editForm.monthly_fee} onChange={(e) => setEditForm({...editForm, monthly_fee: parseFloat(e.target.value)})} className="w-full px-3 py-2.5 text-sm font-black text-emerald-600 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 transition-colors" /></div>
            <div className="flex flex-col gap-1.5"><span className="text-[11px] text-slate-700 font-bold">តំបន់ (Zone)៖</span><input type="text" value={editForm.zone} onChange={(e) => setEditForm({...editForm, zone: e.target.value})} className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg outline-none" disabled={currentUser?.role !== 'super_admin'} /></div>

            {editForm.status_color === 'blue' ? (
              <div className="w-full mt-2 p-3 rounded-xl font-bold bg-emerald-50 text-emerald-700 text-[13px] border border-emerald-100 flex items-center justify-center gap-2 shadow-sm">
                <CheckCircle size={16} /> បានបង់រួចរាល់ (ខែបន្ទាប់៖ {editForm.payment_month})
              </div>
            ) : (
              <div className="w-full mt-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-100 shadow-sm flex flex-col items-center">
                <div className="font-bold flex items-center gap-2 mb-1 text-[12px]"><Clock size={14}/> ស្ថានភាពបច្ចុប្បន្ន</div>
                <div className="font-black text-amber-700 text-[13px]">{editForm.payment_month} (មិនទាន់បានបង់)</div>
              </div>
            )}

            {editForm.status_color !== 'blue' && (
              <div className="mt-2 p-4 rounded-xl border border-indigo-100 bg-indigo-50 shadow-sm">
                <label className="block text-[11px] font-black text-indigo-900 mb-2">បង់ប្រាក់ (រើសខែ និងចំនួនខែ)៖</label>
                <select value={payMonth} onChange={(e) => setPayMonth(e.target.value)} className="w-full mb-3 border border-indigo-200 px-3 py-2 rounded-lg font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer">
                  {monthsList.map(m => <option key={m} value={m}>បង់ចាប់ពី៖ {m}</option>)}
                </select>
                <div className="flex items-center gap-3">
                  <input type="number" value={payNumMonths} onChange={(e) => setPayNumMonths(parseInt(e.target.value) || 1)} min="1" max="12" className="w-20 border border-indigo-200 px-3 py-2.5 rounded-lg font-bold text-lg text-center outline-none focus:ring-2 focus:ring-amber-400 bg-white shadow-inner" />
                  <button onClick={handleQuickPay} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-lg hover:bg-amber-600 transition-colors shadow-md flex justify-center items-center gap-2 text-[13px] cursor-pointer">
                    <DollarSign size={16}/> បង់ប្រាក់
                  </button>
                </div>
              </div>
            )}

            <div className="mt-2 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
              <div onClick={() => setIsManualEditOpen(!isManualEditOpen)} className="p-3 font-bold text-slate-700 text-[12px] cursor-pointer hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors rounded-xl">
                <Sliders size={16} className="text-indigo-500"/> ជម្រើសកែប្រែដោយដៃ (Manual Edit)
              </div>
              {isManualEditOpen && (
                <div className="p-4 border-t border-slate-200 space-y-3 bg-white rounded-b-xl">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">ខែត្រូវបង់បន្ទាប់៖</label>
                    <select value={editForm.payment_month} onChange={e => setEditForm({...editForm, payment_month: e.target.value})} className="w-full border px-3 py-2 rounded-lg font-bold text-indigo-700 bg-slate-50 outline-none cursor-pointer">
                      {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">ស្ថានភាពបង់ប្រាក់៖</label>
                    <select value={editForm.status_color} onChange={e => setEditForm({...editForm, status_color: e.target.value})} className="w-full border px-3 py-2 rounded-lg bg-slate-50 font-bold outline-none cursor-pointer">
                      <option value="blue">🔵 បានបង់</option>
                      <option value="yellow">🟡 មិនទាន់បានបង់</option>
                      <option value="red">🔴 ទីតាំងបិទ</option>
                      <option value="black">⚫ បានបង់តែទុកសិន</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleOpenHistory} className="w-full mt-1 py-3 rounded-xl font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-sm flex justify-center items-center gap-2 text-[12px] cursor-pointer">
              <History size={16}/> មើលប្រវត្តិបង់ប្រាក់
            </button>
          </div>
          
          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <button onClick={handleUpdate} className="flex-1 bg-[#5252d6] text-white font-bold py-3 rounded-xl hover:bg-indigo-700 flex justify-center items-center gap-2 cursor-pointer shadow-md text-[13px] transition-colors">
              <Save size={16} /> រក្សាទុក
            </button>
            <button onClick={() => window.print()} className="flex-1 bg-[#0ea5e9] text-white font-bold py-3 rounded-xl hover:bg-sky-500 flex justify-center items-center gap-2 cursor-pointer shadow-md text-[13px] transition-colors">
              <Printer size={16} /> បោះពុម្ព
            </button>
          </div>
        </div>
      )}

      {historyModalOpen && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[80%] max-h-[600px] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center">
              <h3 className="font-bold text-indigo-800 text-lg flex items-center"><History className="mr-2 text-indigo-600" size={20}/>ប្រវត្តិបង់ប្រាក់</h3>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-slate-200 cursor-pointer"><X size={18}/></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50">
              {isLoadingHistory ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10">
                  <Clock className="animate-spin text-indigo-500 mb-3" size={32}/>
                  <p className="font-bold">កំពុងទាញយកទិន្នន័យ...</p>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center text-slate-500 font-bold py-5 bg-white rounded-xl border border-slate-200 shadow-sm">មិនមានប្រវត្តិបង់ប្រាក់ទេ</div>
              ) : (
                <>
                  <div className="text-center mb-4 text-sm font-bold text-slate-600 bg-white py-2 rounded-lg border border-slate-200 shadow-sm">ប្រវត្តិបង់ប្រាក់ចុងក្រោយ</div>
                  {historyData.map((record) => {
                    const dateObj = new Date(record.paid_at || record.created_at);
                    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}/${dateObj.getFullYear()} - ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                    const khmerMonthDisplay = monthsList[record.month - 1] || `ខែទី ${record.month}`;

                    return (
                      <div key={record.id} className="flex justify-between items-center p-4 bg-white border-l-4 border-emerald-500 rounded-xl shadow-sm mb-3">
                        <div>
                          <div className="font-bold text-slate-800 text-base">{khmerMonthDisplay} ឆ្នាំ {record.year}</div>
                          <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-1"><Clock size={12}/> {formattedDate}</div>
                          <div className="text-sm font-bold text-emerald-600 mt-1">៛ {Number(record.amount || 0).toLocaleString()}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-full text-xs border border-emerald-100 flex items-center"><CheckCircle size={14} className="mr-1"/> បានបង់</div>
                          <button onClick={() => handleUndoPayment(record.id, khmerMonthDisplay)} className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200 transition-colors shadow-sm cursor-pointer" title="លុបការបង់ប្រាក់ខែនេះ">
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {roadEditData && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
                <h3 className="font-bold text-indigo-800 text-lg mb-4 flex items-center"><Road className="mr-2 text-indigo-500" size={20}/>{roadEditData.isNew ? "បន្ថែមផ្លូវថ្មី" : "កែប្រែព័ត៌មានផ្លូវ"}</h3>
                <label className="block text-xs font-bold text-slate-500 mb-1">ឈ្មោះផ្លូវ (Road Name):</label>
                <input type="text" value={roadEditData.name} onChange={e => setRoadEditData({...roadEditData, name: e.target.value})} className="w-full border border-slate-300 p-2.5 mb-3 rounded-lg outline-none focus:border-indigo-500 font-bold" />
                <label className="block text-xs font-bold text-slate-500 mb-1">ទំហំផ្លូវ (Width e.g. 5m):</label>
                <input type="text" value={roadEditData.width} onChange={e => setRoadEditData({...roadEditData, width: e.target.value})} className="w-full border border-slate-300 p-2.5 mb-3 rounded-lg outline-none focus:border-indigo-500 font-bold" />
                <label className="block text-xs font-bold text-slate-500 mb-1">អាសយដ្ឋាន (Address):</label>
                <input type="text" value={roadEditData.address} onChange={e => setRoadEditData({...roadEditData, address: e.target.value})} className="w-full border border-slate-300 p-2.5 mb-3 rounded-lg outline-none focus:border-indigo-500 font-bold" />
                <label className="block text-xs font-bold text-slate-500 mb-1">ប្រភេទផ្លូវ (Road Type):</label>
                <select value={roadEditData.road_type} onChange={e => setRoadEditData({...roadEditData, road_type: e.target.value})} className="w-full border border-slate-300 p-2.5 mb-5 rounded-lg outline-none focus:border-indigo-500 font-bold bg-slate-50 text-indigo-700">
                    <option value="Land road">Land road (ផ្លូវដី)</option>
                    <option value="Concrete road">Concrete road (ផ្លូវបេតុង)</option>
                    <option value="Hight Ways road">Hight Ways road (ផ្លូវហាយវេ)</option>
                    <option value="Asphalt road">Asphalt road (ផ្លូវកៅស៊ូរ)</option>
                    <option value="Nation road">Nation road (ផ្លូវជាតិ)</option>
                </select>
                <div className="flex gap-2">
                    <button onClick={saveRoadData} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 py-3 rounded-lg font-bold shadow-md transition-colors cursor-pointer">រក្សាទុក</button>
                    <button onClick={() => setRoadEditData(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 flex-1 py-3 rounded-lg font-bold transition-colors cursor-pointer">បោះបង់</button>
                </div>
            </div>
        </div>
      )}

      {showLoginModal && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-indigo-900">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 m-4">
            <div className="text-center mb-6">
              <img src="/logo/Map Ark.png" alt="Maps Ark Logo" onError={(e) => e.currentTarget.style.display='none'} className="w-24 h-24 mx-auto mb-4 object-contain rounded-full shadow-md border-2 border-indigo-100" />
              <h1 className="text-2xl font-bold text-slate-800">ចូលប្រើប្រព័ន្ធ</h1>
            </div>
            <form onSubmit={handleRealLogin} className="space-y-4">
              <input type="email" placeholder="Email" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" />
              <input type="password" placeholder="Password" required className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" />
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-md cursor-pointer">ចូល</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}