'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { MapPin, Eraser, Hexagon, Scissors, RotateCw, Search, Slash, Move, LogIn, LogOut, PieChart, Ban, X, Spline, Map as MapIcon, Clock, CheckCircle, RotateCcw, Road, Monitor, Smartphone, Navigation, Loader2, Layers } from 'lucide-react';
import { supabaseClient } from '../utils/supabase';

// 🚀 ទាញយក Components ដែលយើងបានបំបែក
import LoginModal from './LoginModal';
import BillPrint from './BillPrint';
import CustomerDetail from './CustomerDetail';
import ReportDashboard from './ReportDashboard';

const Toggle = ({ enabled, setEnabled }: { enabled: boolean, setEnabled: (val: boolean) => void }) => (
  <div onClick={() => setEnabled(!enabled)} className={`w-11 h-6 rounded-full flex items-center cursor-pointer p-1 transition-colors shadow-inner ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
  </div>
);

const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) { scaleSize = MAX_WIDTH / img.width; }
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
            resolve(compressedFile);
          } else { resolve(file); } 
        }, 'image/jpeg', 0.6); 
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export default function Map() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  
  const pointsLayer = useRef<L.FeatureGroup | null>(null);
  const polygonsLayer = useRef<L.FeatureGroup | null>(null);
  const roadsLayer = useRef<L.FeatureGroup | null>(null);
  const bordersLayer = useRef<L.FeatureGroup | null>(null);
  const locationMarkerRef = useRef<L.Marker | null>(null);

  const activeDrawTool = useRef<string>('point'); 

  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [deviceChoice, setDeviceChoice] = useState<'pc' | 'mobile' | null>(null); 

  const [isMapReady, setIsMapReady] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 

  const [activeView, setActiveView] = useState<'map' | 'report'>('map');
  const [allData, setAllData] = useState<any[]>([]);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editForm, setEditForm] = useState<any>({ custom_id: '', customer_name: '', monthly_fee: 0, zone: '', status_color: 'yellow', payment_month: 'ខែមករា', photo_url: '' });
  const [roadEditData, setRoadEditData] = useState<any>(null);
  const [payMonth, setPayMonth] = useState('ខែមករា');
  const [payNumMonths, setPayNumMonths] = useState<any>(1);
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
  const allDataRef = useRef<any[]>([]);
  const hasFetchedRef = useRef(false);

  const monthsList = ['ខែមករា', 'ខែកកុម្ភៈ', 'ខែមីនា', 'ខែមេសា', 'ខែឧសភា', 'ខែមិថុនា', 'ខែកក្កដា', 'ខែសីហា', 'ខែកញ្ញា', 'ខែតុលា', 'ខែវិច្ឆិកា', 'ខែធ្នូ'];

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        const { data: profile } = await supabaseClient.from('Profiles_Access').select('role, zone, can_edit_roof, can_edit_road, can_edit_border').eq('id', session.user.id).maybeSingle();
        const roleStr = profile?.role ? profile.role.toLowerCase().trim().replace(/\s+/g, '_') : 'user';
        const userObj = { id: session.user.id, name: profile?.zone || session.user.email, zone: profile?.zone || '', role: roleStr, can_edit_roof: profile?.can_edit_roof || false, can_edit_road: profile?.can_edit_road || false, can_edit_border: profile?.can_edit_border || false };
        setCurrentUser(userObj);
        currentUserRef.current = userObj;
        setShowLoginModal(false);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (currentUser && isMapReady && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAndRenderData(currentUser);
    }
  }, [currentUser, isMapReady]);

  useEffect(() => { allDataRef.current = allData; }, [allData]);

  useEffect(() => {
    if (deviceChoice === 'mobile' && mapInstance.current) {
        mapInstance.current.locate({ watch: true, enableHighAccuracy: true });
        mapInstance.current.on('locationfound', (e: any) => {
            if (!locationMarkerRef.current) {
                const liveIcon = L.divIcon({ className: 'clear-default-icon', html: `<div class="live-location-pulse"></div><div class="live-location-dot"></div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
                locationMarkerRef.current = L.marker(e.latlng, { icon: liveIcon }).addTo(mapInstance.current!);
                mapInstance.current?.flyTo(e.latlng, 17, { animate: true, duration: 1.5 });
            } else { locationMarkerRef.current.setLatLng(e.latlng); }
        });
        mapInstance.current.on('locationerror', (e: any) => { console.warn("មិនអាចចាប់ទីតាំងបានទេ៖ ", e.message); });
    } else if (deviceChoice === 'pc' && mapInstance.current) {
        mapInstance.current.stopLocate();
        if (locationMarkerRef.current) { mapInstance.current.removeLayer(locationMarkerRef.current); locationMarkerRef.current = null; }
    }
  }, [deviceChoice]);

  const handleLocateMe = () => {
      if (deviceChoice === 'mobile' && mapInstance.current) mapInstance.current.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
  };

  const addHouseholdToMap = (h: any) => {
    let layer: any;
    let colorHex = h.status_color === 'blue' ? '#2563eb' : h.status_color === 'red' ? '#dc2626' : h.status_color === 'black' ? '#020617' : '#f59e0b';

    if (h.shape_type === 'point' && h.lat && h.lng) {
      layer = L.circleMarker([h.lat, h.lng], { radius: 8, fillColor: colorHex, color: '#ffffff', weight: 2, fillOpacity: 0.95 });
      if (pointsLayer.current) { layer.options.dbId = h.id; layer.options.dbType = 'household'; layer.addTo(pointsLayer.current); }
    } 
    else if (h.shape_type === 'polygon' && h.geojson) {
      layer = L.geoJSON(h.geojson, { style: { color: '#ffffff', weight: 1.5, fillColor: colorHex, fillOpacity: 0.85 } });
      if (polygonsLayer.current) { layer.eachLayer((l: any) => { l.options.dbId = h.id; l.options.dbType = 'household'; }); layer.addTo(polygonsLayer.current); }
    }

    if (layer) {
      layer.on('click', () => {
        const freshData = allDataRef.current.find((item: any) => item.id === h.id) || h;
        setSelectedHome(freshData); 
        setEditForm({ custom_id: freshData.custom_id || '', customer_name: freshData.customer_name || '', monthly_fee: freshData.monthly_fee || 0, zone: freshData.zone || '', status_color: freshData.status_color || 'yellow', payment_month: freshData.payment_month || 'ខែមករា', photo_url: freshData.photo_url || '' }); 
        setPayMonth(freshData.payment_month || 'ខែមករា'); setPayNumMonths(1); setIsManualEditOpen(false); 
      });
    }
  };

  const addRoadToMap = (r: any) => {
    if (r.geojson) {
      let roadColor = '#10b981'; 
      if(r.road_type === 'Land road') roadColor = '#ec5050';
      if(r.road_type === 'Hight Ways road') roadColor = '#3b82f6';
      if(r.road_type === 'Nation road') roadColor = '#16a34a';
      if(r.road_type === 'Concrete road') roadColor = '#f6d91e';
      if(r.road_type === 'Asphalt road') roadColor = '#e01ae3';

      const layer = L.geoJSON(r.geojson, { style: { color: roadColor, weight: 6, opacity: 0.9 } }); 
      layer.bindTooltip(`<div class="text-center"><b>${r.name || 'មិនមានឈ្មោះផ្លូវ'}</b><br><span class="text-xs text-slate-500">${r.road_type || 'Land road'} | ទំហំ: ${r.width || 'មិនបញ្ជាក់'}</span></div>`, {sticky: true, className: 'font-bold'});
      layer.eachLayer((l: any) => { 
        l.options.dbId = r.id; l.options.dbType = 'road'; 
        l.on('dblclick', () => { if(!currentUserRef.current) return; setRoadEditData({ isNew: false, id: r.id, name: r.name || '', width: r.width || '', address: r.address || '', road_type: r.road_type || 'Land road' }); });
      });
      if(roadsLayer.current) layer.addTo(roadsLayer.current);
    }
  };

  const addBorderToMap = (b: any) => {
    if (b.geojson) {
      const layer = L.geoJSON(b.geojson, { style: { color: '#ec4899', weight: 5, opacity: 0.8, dashArray: '8, 8', fillOpacity: 0.1 } }); 
      layer.bindTooltip(`ព្រំដែនតំបន់៖ <b>${b.zone || 'មិនបញ្ជាក់'}</b>`, { sticky: true, className: 'font-bold text-sm bg-white px-2 py-1 shadow-md border border-slate-200 rounded' });
      layer.eachLayer((l: any) => { 
        l.options.dbId = b.id; l.options.dbType = 'border'; 
        l.on('dblclick', async () => {
          if(!currentUserRef.current) return;
          const newZoneName = prompt("កែប្រែឈ្មោះតំបន់ (Zone) សម្រាប់ព្រំដែននេះ៖", b.zone);
          if (newZoneName && newZoneName.trim() !== "" && newZoneName !== b.zone) {
              await supabaseClient.from('zone_borders').update({ zone: newZoneName.trim() }).eq('id', b.id);
              l.bindTooltip(`ព្រំដែនតំបន់៖ <b>${newZoneName.trim()}</b>`, { sticky: true, className: 'font-bold text-sm bg-white px-2 py-1 shadow-md border border-slate-200 rounded' });
          }
        });
      });
      if(bordersLayer.current) bordersLayer.current.addLayer(layer);
    }
  };

  const fetchAndRenderData = async (userToUse: any) => {
    if (!userToUse || !mapInstance.current) return; 

    setIsFetchingData(true); 

    if (pointsLayer.current) pointsLayer.current.clearLayers();
    if (polygonsLayer.current) polygonsLayer.current.clearLayers();
    if (roadsLayer.current) roadsLayer.current.clearLayers();
    if (bordersLayer.current) bordersLayer.current.clearLayers();

    let householdQuery = supabaseClient.from('households').select('*');
    let borderQuery = supabaseClient.from('zone_borders').select('*');
    let roadQuery = supabaseClient.from('roads').select('*'); 

    if (userToUse.role !== 'super_admin' && userToUse.zone) {
       householdQuery = householdQuery.eq('zone', userToUse.zone);
       borderQuery = borderQuery.eq('zone', userToUse.zone);
    }

    const [householdsRes, roadsRes, bordersRes] = await Promise.all([ householdQuery, roadQuery, borderQuery ]);

    if (householdsRes.data) { setAllData(householdsRes.data); householdsRes.data.forEach(addHouseholdToMap); }
    if (roadsRes.data) roadsRes.data.forEach(addRoadToMap); 
    if (bordersRes.data) bordersRes.data.forEach(addBorderToMap);

    setIsFetchingData(false); 
  };

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' });

    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { zoomControl: false, preferCanvas: true }).setView([11.99, 105.46], 15);
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { maxZoom: 21, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(mapInstance.current);

      if (mapInstance.current.pm) {
        const pmInstance = mapInstance.current.pm as any;
        if (typeof pmInstance.setGlobalOptions === 'function') pmInstance.setGlobalOptions({ pmIgnore: false } as any);
        if (typeof pmInstance.addControls === 'function') {
          pmInstance.addControls({ drawMarker: false, drawCircleMarker: false, drawPolyline: false, drawRectangle: false, drawPolygon: false, drawCircle: false, drawText: false, editMode: false, dragMode: false, cutPolygon: false, removalMode: false, rotateMode: false } as any);
        }
      }

      pointsLayer.current = L.featureGroup().addTo(mapInstance.current);
      polygonsLayer.current = L.featureGroup().addTo(mapInstance.current);
      roadsLayer.current = L.featureGroup().addTo(mapInstance.current);
      bordersLayer.current = L.featureGroup().addTo(mapInstance.current);

      setIsMapReady(true); 

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
            mapInstance.current?.removeLayer(e.layer);
            if (!zoneName) return; 
            const { data } = await supabaseClient.from('zone_borders').insert({ geojson: geojson, zone: zoneName }).select().single();
            if(data) { addBorderToMap(data); setBorderLive(true); }
        } 
        else {
            let dbShape = shapeType === 'polygon' ? 'polygon' : 'point';
            mapInstance.current?.removeLayer(e.layer);
            const userZone = currentUserRef.current?.role !== 'super_admin' ? currentUserRef.current?.name : '';
            const { data } = await supabaseClient.from('households').insert({ lat: center.lat, lng: center.lng, custom_id: customId, status_color: 'yellow', shape_type: dbShape, geojson: geojson, payment_month: 'ខែមករា', monthly_fee: 10000, zone: userZone }).select().single();
            if(data) { 
                setAllData(prev => [...prev, data]); 
                addHouseholdToMap(data); 
                if(dbShape === 'point') setPointToggle(true);
                if(dbShape === 'polygon') setPolygonToggle(true);
            }
        }
        (mapInstance.current?.pm as any)?.disableDraw();
      });

      mapInstance.current.on('pm:remove', async (e: any) => {
        if (!currentUserRef.current) return; 
        const id = e.layer.options.dbId; const dbType = e.layer.options.dbType; if (!id) return;
        if (dbType === 'road') await supabaseClient.from('roads').delete().eq('id', id);
        else if (dbType === 'border') await supabaseClient.from('zone_borders').delete().eq('id', id);
        else await supabaseClient.from('households').delete().eq('id', id);
      });

      mapInstance.current.on('pm:update', async (e: any) => {
        if (!currentUserRef.current) return; 
        const id = e.layer.options.dbId; const dbType = e.layer.options.dbType; if (!id) return; const geojson = e.layer.toGeoJSON();
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
      if (pointToggle) {
        if (!mapInstance.current.hasLayer(pointsLayer.current)) mapInstance.current.addLayer(pointsLayer.current);
      } else {
        if (mapInstance.current.hasLayer(pointsLayer.current)) mapInstance.current.removeLayer(pointsLayer.current);
      }
    }
  }, [pointToggle]);

  useEffect(() => {
    if (mapInstance.current && polygonsLayer.current) {
      if (polygonToggle) {
        if (!mapInstance.current.hasLayer(polygonsLayer.current)) mapInstance.current.addLayer(polygonsLayer.current);
      } else {
        if (mapInstance.current.hasLayer(polygonsLayer.current)) mapInstance.current.removeLayer(polygonsLayer.current);
      }
    }
  }, [polygonToggle]);

  useEffect(() => {
    if (mapInstance.current && roadsLayer.current) {
      if (roadToggle) {
        if (!mapInstance.current.hasLayer(roadsLayer.current)) mapInstance.current.addLayer(roadsLayer.current);
      } else {
        if (mapInstance.current.hasLayer(roadsLayer.current)) mapInstance.current.removeLayer(roadsLayer.current);
      }
    }
  }, [roadToggle]);

  useEffect(() => {
    if (mapInstance.current && bordersLayer.current) {
      if (borderLive) {
        if (!mapInstance.current.hasLayer(bordersLayer.current)) mapInstance.current.addLayer(bordersLayer.current);
      } else {
        if (mapInstance.current.hasLayer(bordersLayer.current)) mapInstance.current.removeLayer(bordersLayer.current);
      }
    }
  }, [borderLive]);

  const checkPermission = () => { if (!currentUserRef.current) { alert('🔒 សូមចុច "ចូលគណនី" (Login) ជាមុនសិន!'); setShowLoginModal(true); return false; } return true; };

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

  // 🚀 លុបចោលសញ្ញា # ចេញពីឈ្មោះ File ដើម្បីកុំឱ្យខូច URL
  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !selectedHome) return;

    try {
      setIsUploading(true);
      const compressedFile = await compressImage(file);
      
      // 🚀 លុបសញ្ញាពិសេសទាំងអស់ចេញពី ID (ឧទាហរណ៍ ID#2213 ទៅជា ID2213)
      const safeId = selectedHome.custom_id.replace(/[^a-zA-Z0-9]/g, ''); 
      const fileName = `${safeId}_${Date.now()}.jpg`;

      const { error } = await supabaseClient.storage
        .from('photos')
        .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabaseClient.storage
        .from('photos')
        .getPublicUrl(fileName);

      // 🚀 បន្ថែម ?t= ពីក្រោយដើម្បីបង្ខំឱ្យ Browser ទាញយករូបថ្មីជានិច្ច
      const newPhotoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      setEditForm({ ...editForm, photo_url: newPhotoUrl });
      
    } catch (error: any) {
      alert('❌ បរាជ័យក្នុងការបញ្ចូលរូបភាព៖ ' + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = null; // 🚀 Reset កន្លែងរើសរូបដើម្បីឱ្យអាចរើសម្តងទៀតបាន
    }
  };

  const handleUpdate = async () => {
    if (!selectedHome || !selectedHome.id) return;
    const finalFee = editForm.monthly_fee === '' ? 0 : Number(editForm.monthly_fee);

    const { error } = await supabaseClient.from('households').update({ 
        custom_id: editForm.custom_id, 
        customer_name: editForm.customer_name, 
        monthly_fee: finalFee, 
        zone: editForm.zone, 
        status_color: editForm.status_color, 
        payment_month: editForm.payment_month,
        photo_url: editForm.photo_url 
    }).eq('id', selectedHome.id);

    if (!error) { 
      let colorHex = editForm.status_color === 'blue' ? '#2563eb' : editForm.status_color === 'red' ? '#dc2626' : editForm.status_color === 'black' ? '#020617' : '#f59e0b';
      updateMarkerColorLocally(selectedHome.id, colorHex); 
      const updatedHome = { ...selectedHome, ...editForm, monthly_fee: finalFee };
      setAllData(prev => prev.map(item => item.id === selectedHome.id ? updatedHome : item));
      alert('✅ រក្សាទុកព័ត៌មានអតិថិជនបានជោគជ័យ!'); 
      setSelectedHome(null); 
    } else { alert(`❌ មានបញ្ហាក្នុងការរក្សាទុក! Error: ${error.message}`); }
  };

  const handleQuickPay = async () => {
    if (!selectedHome) return;
    const startIdx = monthsList.indexOf(payMonth);
    if (startIdx === -1) { alert("សូមជ្រើសរើសខែបង់ប្រាក់!"); return; }

    const recordsToInsert = []; let lastPaidMonthIndex = startIdx; const now = new Date();
    const feeAmount = editForm.monthly_fee === '' ? 0 : Number(editForm.monthly_fee);
    const loopCount = Number(payNumMonths) || 1;

    for (let i = 0; i < loopCount; i++) {
        let targetMonthIndex = (startIdx + i) % 12; let targetMonthNumber = targetMonthIndex + 1; let targetYear = now.getFullYear();
        if (startIdx + i > 11) { targetYear += Math.floor((startIdx + i) / 12); }
        lastPaidMonthIndex = targetMonthIndex;
        recordsToInsert.push({ household_id: selectedHome.id, custom_id: selectedHome.custom_id, customer_name: selectedHome.customer_name, amount: feeAmount, month: targetMonthNumber, year: targetYear, status: 'paid', zone: selectedHome.zone, collected_by: currentUserRef.current?.name || '', paid_at: now.toISOString() });
    }

    const { error: insertErr } = await supabaseClient.from('payments').insert(recordsToInsert);
    if (insertErr) { alert(`❌ មានបញ្ហាក្នុងការកត់ត្រាការបង់ប្រាក់! Error: ${insertErr.message}`); return; }

    const nextMonthIdx = (lastPaidMonthIndex + 1) % 12; const nextMonthStr = monthsList[nextMonthIdx];
    
    const { error } = await supabaseClient.from('households').update({ status_color: 'blue', payment_month: nextMonthStr, photo_url: editForm.photo_url }).eq('id', selectedHome.id);

    if (!error) {
      alert('✅ ការបង់ប្រាក់ទទួលបានជោគជ័យ!'); updateMarkerColorLocally(selectedHome.id, '#2563eb'); 
      const updatedHome = { ...selectedHome, status_color: 'blue', payment_month: nextMonthStr, photo_url: editForm.photo_url };
      setAllData(prev => prev.map(item => item.id === selectedHome.id ? updatedHome : item));
      setSelectedHome(null); 
    } else { alert(`❌ បរាជ័យក្នុងការ Update ស្ថានភាពផ្ទះ! Error: ${error.message}`); }
  };

  const handleOpenHistory = async () => {
    if (!selectedHome) return;
    setHistoryModalOpen(true); setIsLoadingHistory(true);
    const { data, error } = await supabaseClient.from('payments').select('*').eq('household_id', selectedHome.id).order('created_at', { ascending: false });
    if (error) { alert(`❌ មិនអាចទាញយកប្រវត្តិបានទេ! Error: ${error.message}`); } else if (data) { setHistoryData(data); }
    setIsLoadingHistory(false);
  };

  const handleUndoPayment = async (paymentId: string, monthStr: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់បោះបង់ការបង់ប្រាក់ខែ ${monthStr} នេះមែនទេ?`)) return;
    await supabaseClient.from('payments').delete().eq('id', paymentId);
    await supabaseClient.from('households').update({ status_color: 'yellow', payment_month: monthStr }).eq('id', selectedHome.id);
    updateMarkerColorLocally(selectedHome.id, '#f59e0b'); 
    const updatedHome = { ...selectedHome, status_color: 'yellow', payment_month: monthStr };
    setAllData(prev => prev.map(item => item.id === selectedHome.id ? updatedHome : item));
    setEditForm({...editForm, status_color: 'yellow', payment_month: monthStr}); setSelectedHome(updatedHome);
    handleOpenHistory(); 
  };

  const saveRoadData = async () => {
      if (roadEditData.isNew) {
          const { data } = await supabaseClient.from('roads').insert({ geojson: roadEditData.geojson, name: roadEditData.name, width: roadEditData.width, address: roadEditData.address, road_type: roadEditData.road_type }).select().single();
          if (data) { addRoadToMap(data); setRoadToggle(true); }
      } else {
          const { data } = await supabaseClient.from('roads').update({ name: roadEditData.name, width: roadEditData.width, address: roadEditData.address, road_type: roadEditData.road_type }).eq('id', roadEditData.id).select().single();
          if (data) { roadsLayer.current?.eachLayer((l: any) => { if(l.options.dbId === roadEditData.id) roadsLayer.current?.removeLayer(l); }); addRoadToMap(data); }
      }
      setRoadEditData(null); 
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabaseClient.from('households').select('*').ilike('custom_id', `%${searchQuery}%`).limit(1);
    if (data && data.length > 0) {
      const h = data[0];
      if (mapInstance.current && h.lat && h.lng) mapInstance.current.flyTo([h.lat, h.lng], 18, { animate: true, duration: 1.5 });
      const freshData = allDataRef.current.find((item: any) => item.id === h.id) || h;
      setSelectedHome(freshData); 
      setEditForm({ custom_id: freshData.custom_id || '', customer_name: freshData.customer_name || '', monthly_fee: freshData.monthly_fee || 0, zone: freshData.zone || '', status_color: freshData.status_color || 'yellow', payment_month: freshData.payment_month || 'ខែមករា', photo_url: freshData.photo_url || '' }); 
    } else alert('រកមិនឃើញលេខកូដនេះទេ!');
  };

  const openReport = async () => {
    setActiveView('report');
    if (paymentsData.length === 0) {
        let query = supabaseClient.from('payments').select('*');
        if (currentUserRef.current && currentUserRef.current.role !== 'super_admin') { query = query.eq('zone', currentUserRef.current.name); }
        const { data } = await query; if (data) setPaymentsData(data);
    }
  };

  const handleGlobalMonthChange = async (e: any) => {
    const val = e.target.value; if (!val || !currentUserRef.current) return; if (!['admin', 'super_admin'].includes(currentUserRef.current.role)) return;
    if(confirm(`តើអ្នកពិតជាចង់ប្តូរខែត្រូវបង់សម្រាប់ផ្ទះទាំងអស់ក្នុងតំបន់នេះទៅជា « ${val} » មែនទេ?`)) { 
        let query = supabaseClient.from('households').update({ payment_month: val });
        if (currentUserRef.current.role !== 'super_admin') query = query.eq('zone', currentUserRef.current.name); else if (reportZone) query = query.eq('zone', reportZone); else query = query.not('id', 'is', null); 
        await query; 
        setAllData(prev => prev.map(item => {
            if (currentUserRef.current.role !== 'super_admin' && item.zone !== currentUserRef.current.name) return item;
            if (reportZone && item.zone !== reportZone) return item;
            return { ...item, payment_month: val };
        }));
        e.target.value = "";
        alert('✅ ធ្វើបច្ចុប្បន្នភាពខែជោគជ័យ!');
    }
  };

  const handleGlobalStatusChange = async (e: any) => {
    const val = e.target.value; if (!val || !currentUserRef.current) return; if (!['admin', 'super_admin'].includes(currentUserRef.current.role)) return;
    if(confirm(`តើអ្នកពិតជាចង់ប្តូរស្ថានភាពសម្រាប់ផ្ទះទាំងអស់ក្នុងតំបន់នេះមែនទេ?`)) { 
        let query = supabaseClient.from('households').update({ status_color: val });
        if (currentUserRef.current.role !== 'super_admin') query = query.eq('zone', currentUserRef.current.name); else if (reportZone) query = query.eq('zone', reportZone); else query = query.not('id', 'is', null); 
        await query; 
        let colorHex = val === 'blue' ? '#2563eb' : val === 'red' ? '#dc2626' : val === 'black' ? '#020617' : '#f59e0b';
        pointsLayer.current?.eachLayer((layer: any) => {
            const h = allDataRef.current.find(d => d.id === layer.options.dbId);
            if (h && (currentUserRef.current.role === 'super_admin' ? (reportZone ? h.zone === reportZone : true) : h.zone === currentUserRef.current.name)) {
                layer.setStyle({ fillColor: colorHex });
            }
        });
        polygonsLayer.current?.eachLayer((layer: any) => {
            const h = allDataRef.current.find(d => d.id === layer.options.dbId);
            if (h && (currentUserRef.current.role === 'super_admin' ? (reportZone ? h.zone === reportZone : true) : h.zone === currentUserRef.current.name)) {
                layer.setStyle({ fillColor: colorHex });
            }
        });
        setAllData(prev => prev.map(item => {
            if (currentUserRef.current.role !== 'super_admin' && item.zone !== currentUserRef.current.name) return item;
            if (reportZone && item.zone !== reportZone) return item;
            return { ...item, status_color: val };
        }));
        e.target.value = "";
        alert('✅ ធ្វើបច្ចុប្បន្នភាពស្ថានភាពជោគជ័យ!');
    }
  };

  const handleExportCSV = () => {
    let csv = "\uFEFFលេខកូដ,ឈ្មោះ,តម្លៃត្រូវបង់,ខែត្រូវបង់,តំបន់,ស្ថានភាព\n"; 
    reportHouseholds.forEach(h => { csv += `"${h.custom_id}","${h.customer_name||''}","${h.monthly_fee||0}","${h.payment_month||''}","${h.zone||''}","${h.status_color}"\n`; });
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })); link.download = `Maps_Ark_Report_${new Date().toISOString().split('T')[0]}.csv`; link.click();
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
      <style dangerouslySetInnerHTML={{__html: `
        .clear-default-icon { background: none; border: none; }
        .live-location-dot { width: 14px; height: 14px; background-color: #2563eb; border: 3px solid white; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .live-location-pulse { width: 40px; height: 40px; background-color: rgba(37, 99, 235, 0.4); border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
        
        @media print {
          body * { visibility: hidden; }
          #print-bill-container, #print-bill-container * { visibility: visible; }
          #print-bill-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
          @page { size: A4 portrait; margin: 1cm; }
        }
      `}} />

      <BillPrint selectedHome={selectedHome} editForm={editForm} currentUser={currentUser} />

      <div className="print:hidden w-full h-full flex flex-col relative">
        {isFetchingData && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[3000] bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-pulse border border-indigo-400">
            <Loader2 className="animate-spin" size={18} />
            <span className="font-bold text-sm tracking-wide">កំពុងទាញយកទិន្នន័យ...</span>
            </div>
        )}

        <header className="h-[64px] absolute top-0 left-0 right-0 bg-white/95 backdrop-blur-md flex justify-between items-center px-4 sm:px-6 z-[2000] shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
            <img src="/logo/Map Ark.png" alt="Logo" onError={(e: any) => e.currentTarget.style.display='none'} className="w-8 h-8 object-contain rounded-md" />
            <h1 className="text-lg sm:text-xl font-bold text-indigo-700 hidden sm:block">Maps Ark</h1>
            {currentUser && (
                <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full font-bold border shadow-sm flex items-center gap-1 ${currentUser.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : currentUser.role === 'admin' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                {currentUser.role === 'super_admin' ? 'Super Admin 👑' : currentUser.role === 'admin' ? 'Admin' : `ប្រមូល៖ ${currentUser.name}`}
                </span>
            )}
            </div>
            <div className="flex gap-2 sm:gap-4 items-center">
            {activeView === 'map' ? (
                <button onClick={openReport} className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm cursor-pointer"><PieChart size={16} className="text-indigo-600" /> <span className="hidden sm:inline">របាយការណ៍</span></button>
            ) : (
                <button onClick={() => setActiveView('map')} className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-all shadow-sm cursor-pointer"><MapIcon size={16} /> <span className="hidden sm:inline">ផែនទី</span></button>
            )}
            {currentUser ? (
                <button onClick={async () => { await supabaseClient.auth.signOut(); setCurrentUser(null); setDeviceChoice(null); setShowLoginModal(true); setActiveView('map'); }} className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all shadow-sm border border-rose-200 cursor-pointer"><LogOut size={16} /> <span className="hidden sm:inline">ចេញ</span></button>
            ) : (
                <button onClick={() => setShowLoginModal(true)} className="flex items-center gap-1 sm:gap-2 px-3 sm:px-5 py-2 text-[11px] sm:text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all shadow-sm border border-indigo-200 cursor-pointer"><LogIn size={16} /> <span className="hidden sm:inline">ចូល</span></button>
            )}
            </div>
        </header>

        <div className={`flex-1 relative w-full h-full ${activeView === 'map' ? 'flex' : 'hidden'}`}>
            {!isToolsPanelOpen && (
            <button onClick={() => setIsToolsPanelOpen(true)} className="absolute top-[80px] left-4 z-[1000] bg-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer text-indigo-600 flex items-center justify-center hover:scale-105" title="បើកផ្ទាំងបញ្ជា"><Layers size={22} /></button>
            )}

            {deviceChoice === 'mobile' && !isToolsPanelOpen && (
            <button onClick={handleLocateMe} className="absolute top-[140px] left-4 z-[1000] bg-blue-600 p-3 sm:p-3.5 rounded-2xl shadow-xl border border-blue-700 hover:bg-blue-700 transition-all cursor-pointer text-white flex items-center justify-center hover:scale-105" title="ទីតាំងរបស់ខ្ញុំ"><Navigation size={22} /></button>
            )}

            <div className={`absolute top-[80px] left-4 z-[1050] w-[calc(100vw-32px)] sm:w-[340px] flex flex-col gap-4 transition-all duration-300 transform ${isToolsPanelOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[400px] opacity-0 pointer-events-none'} hide-scrollbar overflow-y-auto max-h-[calc(100vh-100px)] pb-6`}>
            <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-3 flex items-center gap-2">
                <input type="text" placeholder="ស្វែងរកលេខកូដ (KPC...)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="flex-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-sm font-bold text-slate-700 focus:border-indigo-500" />
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

            {(!currentUser || currentUser?.role === 'super_admin' || currentUser?.can_edit_roof) && (
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
            )}

            {(!currentUser || currentUser?.role === 'super_admin' || currentUser?.can_edit_road) && (
                <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
                <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🛣️ ផ្លូវ (Road)</h3>
                <div className="flex justify-around mb-4">
                    <button onClick={drawRoad} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 group-hover:border-indigo-400 transition-all"><Slash size={22} /></div><span className="text-[11px] font-bold text-slate-600">Add Road</span></button>
                    <button onClick={toggleEdit} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-200 group-hover:border-amber-400 transition-all"><Move size={22} /></div><span className="text-[11px] font-bold text-slate-600">Edit Road</span></button>
                    <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-slate-200 group-hover:border-rose-400 transition-all"><Ban size={22} /></div><span className="text-[11px] font-bold text-slate-600">Delete</span></button>
                </div>
                <div className="flex justify-center"><Toggle enabled={roadToggle} setEnabled={setRoadToggle} /></div>
                </div>
            )}

            {(!currentUser || currentUser?.role === 'super_admin' || currentUser?.can_edit_border) && (
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
                    <div className="flex justify-between items-center"><span className="text-[11px] font-bold text-slate-600 flex items-center gap-2"><Spline className="text-purple-500" size={16} /> ព្រំដែនគូសផ្ទាល់</span><Toggle enabled={borderLive} setEnabled={setBorderLive} /></div>
                </div>
                </div>
            )}

            </div>
            <main className="flex-1 relative z-0 h-full bg-slate-100">
            <div ref={mapRef} className="w-full h-full" />
            </main>
        </div>

        <CustomerDetail
            selectedHome={selectedHome}
            setSelectedHome={setSelectedHome}
            editForm={editForm}
            setEditForm={setEditForm}
            isUploading={isUploading}
            handlePhotoUpload={handlePhotoUpload}
            payMonth={payMonth}
            setPayMonth={setPayMonth}
            payNumMonths={payNumMonths}
            setPayNumMonths={setPayNumMonths}
            handleQuickPay={handleQuickPay}
            isManualEditOpen={isManualEditOpen}
            setIsManualEditOpen={setIsManualEditOpen}
            handleOpenHistory={handleOpenHistory}
            handleUpdate={handleUpdate}
            currentUser={currentUser}
        />

        {currentUser && !deviceChoice && !showLoginModal && (
            <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 transform transition-all text-center">
                <div className="w-20 h-20 mx-auto bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-5"><MapIcon size={40} /></div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">សូមស្វាគមន៍មកកាន់ Maps Ark</h2>
                <p className="text-sm text-slate-500 mb-8 font-medium">តើអ្នកកំពុងប្រើប្រាស់ឧបករណ៍អ្វីសម្រាប់ការងារថ្ងៃនេះ?</p>
                <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setDeviceChoice('pc')} className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer group">
                    <Monitor className="text-slate-400 group-hover:text-indigo-600 mb-3 transition-colors" size={48} />
                    <span className="font-bold text-slate-700 group-hover:text-indigo-700">Option 1: ប្រើ PC</span>
                    <span className="text-[10px] text-slate-400 mt-1">(ផែនទីធម្មតា)</span>
                </button>
                <button onClick={() => setDeviceChoice('mobile')} className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
                    <Smartphone className="text-slate-400 group-hover:text-blue-600 mb-3 transition-colors" size={48} />
                    <span className="font-bold text-slate-700 group-hover:text-blue-700">Option 2: ប្រើ Mobile</span>
                    <span className="text-[10px] text-slate-400 mt-1">(បើក Live Location 📍)</span>
                </button>
                </div>
            </div>
            </div>
        )}

        {showLoginModal && (
            <LoginModal setCurrentUser={setCurrentUser} setShowLoginModal={setShowLoginModal} />
        )}

        {activeView === 'report' && (
            <ReportDashboard
                currentUser={currentUser}
                reportZone={reportZone}
                setReportZone={setReportZone}
                uniqueZones={uniqueZones}
                handleGlobalMonthChange={handleGlobalMonthChange}
                handleGlobalStatusChange={handleGlobalStatusChange}
                handleExportCSV={handleExportCSV}
                totalHouses={totalHouses}
                paidHouses={paidHouses}
                pendingHouses={pendingHouses}
                closedHouses={closedHouses}
                monthlyRevenue={monthlyRevenue}
                dailyRevenue={dailyRevenue}
                paginatedHouseholds={paginatedHouseholds}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
            />
        )}

        {historyModalOpen && (
            <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[80%] max-h-[600px] flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-indigo-50 flex justify-between items-center"><h3 className="font-bold text-indigo-800 text-base sm:text-lg flex items-center"><History className="mr-2 text-indigo-600" size={20} />ប្រវត្តិបង់ប្រាក់</h3><button onClick={() => setHistoryModalOpen(false)} className="text-slate-400 hover:text-rose-500 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-slate-200 cursor-pointer"><X size={18} /></button></div>
                <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-slate-50">
                {isLoadingHistory ? ( <div className="flex flex-col items-center justify-center h-full text-slate-500 py-10"><Clock className="animate-spin text-indigo-500 mb-3" size={32} /><p className="font-bold">កំពុងទាញយកទិន្នន័យ...</p></div> ) : historyData.length === 0 ? ( <div className="text-center text-slate-500 font-bold py-5 bg-white rounded-xl border border-slate-200 shadow-sm">មិនមានប្រវត្តិបង់ប្រាក់ទេ</div> ) : (
                    <>
                    <div className="text-center mb-4 text-xs sm:text-sm font-bold text-slate-600 bg-white py-2 rounded-lg border border-slate-200 shadow-sm">ប្រវត្តិបង់ប្រាក់ចុងក្រោយ</div>
                    {historyData.map((record) => {
                        const dateObj = new Date(record.paid_at || record.created_at);
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}/${dateObj.getFullYear()} - ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
                        const khmerMonthDisplay = monthsList[record.month - 1] || `ខែទី ${record.month}`;
                        return (
                        <div key={record.id} className="flex justify-between items-center p-3 sm:p-4 bg-white border-l-4 border-emerald-500 rounded-xl shadow-sm mb-3">
                            <div><div className="font-bold text-slate-800 text-sm sm:text-base">{khmerMonthDisplay} ឆ្នាំ {record.year}</div><div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-1 flex items-center gap-1"><Clock size={12} /> {formattedDate}</div><div className="text-xs sm:text-sm font-bold text-emerald-600 mt-1">៛ {Number(record.amount || 0).toLocaleString()}</div></div>
                            <div className="flex items-center gap-2"><div className="text-emerald-600 font-bold bg-emerald-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs border border-emerald-100 flex items-center"><CheckCircle className="mr-1" size={14} /> បានបង់</div><button onClick={() => handleUndoPayment(record.id, khmerMonthDisplay)} className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-200 transition-colors shadow-sm cursor-pointer" title="លុបការបង់ប្រាក់ខែនេះ"><RotateCcw size={14} /></button></div>
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
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6 transform transition-all">
                    <h3 className="font-bold text-indigo-800 text-base sm:text-lg mb-4 flex items-center"><Road className="mr-2 text-indigo-500" size={20} />{roadEditData.isNew ? "បន្ថែមផ្លូវថ្មី" : "កែប្រែព័ត៌មានផ្លូវ"}</h3>
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1">ឈ្មោះផ្លូវ (Road Name):</label><input type="text" value={roadEditData.name} onChange={e => setRoadEditData({...roadEditData, name: e.target.value})} className="w-full border border-slate-300 p-2 sm:p-2.5 mb-3 rounded-lg outline-none focus:border-indigo-500 font-bold text-sm" />
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1">ទំហំផ្លូវ (Width e.g. 5m):</label><input type="text" value={roadEditData.width} onChange={e => setRoadEditData({...roadEditData, width: e.target.value})} className="w-full border border-slate-300 p-2 sm:p-2.5 mb-3 rounded-lg outline-none focus:border-indigo-500 font-bold text-sm" />
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1">អាសយដ្ឋាន (Address):</label><input type="text" value={roadEditData.address} onChange={e => setRoadEditData({...roadEditData, address: e.target.value})} className="w-full border border-slate-300 p-2 sm:p-2.5 mb-3 rounded-lg outline-none focus:border-indigo-500 font-bold text-sm" />
                    <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1">ប្រភេទផ្លូវ (Road Type):</label><select value={roadEditData.road_type} onChange={e => setRoadEditData({...roadEditData, road_type: e.target.value})} className="w-full border border-slate-300 p-2 sm:p-2.5 mb-5 rounded-lg outline-none focus:border-indigo-500 font-bold bg-slate-50 text-indigo-700 text-sm"><option value="Land road">Land road (ផ្លូវដី)</option><option value="Concrete road">Concrete road (ផ្លូវបេតុង)</option><option value="Hight Ways road">Hight Ways road (ផ្លូវហាយវេ)</option><option value="Asphalt road">Asphalt road (ផ្លូវកៅស៊ូរ)</option><option value="Nation road">Nation road (ផ្លូវជាតិ)</option></select>
                    <div className="flex gap-2"><button onClick={saveRoadData} className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 py-2 sm:py-3 rounded-lg font-bold shadow-md transition-colors cursor-pointer text-sm">រក្សាទុក</button><button onClick={() => setRoadEditData(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 flex-1 py-2 sm:py-3 rounded-lg font-bold transition-colors cursor-pointer text-sm">បោះបង់</button></div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}