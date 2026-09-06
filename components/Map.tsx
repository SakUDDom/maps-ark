'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { 
  MapPin, Eraser, Hexagon, Scissors, RotateCw, Search, Slash, Move, 
  LogIn, LogOut, PieChart, Ban, X, Spline, Map as MapIcon, 
  Road, Monitor, Smartphone, Navigation, Loader2, Layers, Building, Shield,
  Route as RouteIcon
} from 'lucide-react';
import { supabaseClient } from '../utils/supabase';
import { KHMER_MONTHS } from '../constants/months';
import { optimizeRouteOrder, fetchOSRMRoute, PointCoord } from '../utils/routing';

import LoginModal from './LoginModal';
import BillPrint from './BillPrint';
import CustomerDetail from './CustomerDetail';
import ReportDashboard from './ReportDashboard';
import HistoryModal from './HistoryModal';
import RoadEditModal from './RoadEditModal';
import UserManagementModal from './UserManagementModal';

function isPointInPoly(point: [number, number], vs: Array<[number, number]>) {
  if (!vs || vs.length === 0) return false;
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function extractPolyCoords(geojson: any) {
  if (!geojson) return null;
  if (geojson.geometry && geojson.geometry.coordinates) {
    return geojson.geometry.coordinates[0];
  }
  if (geojson.coordinates) {
    return geojson.coordinates[0];
  }
  return null;
}

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
  const zoneBordersLayer = useRef<L.FeatureGroup | null>(null);
  const adminBordersLayer = useRef<L.FeatureGroup | null>(null);
  
  const smartRouteLayer = useRef<L.GeoJSON | null>(null);
  const [isRoutingActive, setIsRoutingActive] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const locationMarkerRef = useRef<L.Marker | null>(null);
  const locationAccuracyRef = useRef<L.Circle | null>(null);
  const hasCenteredGPSRef = useRef<boolean>(false);

  const activeDrawTool = useRef<string>('point'); 
  const borderModeRef = useRef<'zone' | 'admin'>('zone'); 

  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [deviceChoice, setDeviceChoice] = useState<'pc' | 'mobile' | null>(null); 
  const [userModalOpen, setUserModalOpen] = useState(false);

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

  // Default OFF Layers
  const [pointToggle, setPointToggle] = useState(false);
  const [polygonToggle, setPolygonToggle] = useState(false);
  const [roadToggle, setRoadToggle] = useState(false);
  const [zoneBorderToggle, setZoneBorderToggle] = useState(false);
  const [adminBorderToggle, setAdminBorderToggle] = useState(false);

  const currentUserRef = useRef<any>(null);
  const allDataRef = useRef<any[]>([]);
  const deviceChoiceRef = useRef<'pc' | 'mobile' | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { deviceChoiceRef.current = deviceChoice; }, [deviceChoice]);
  useEffect(() => { allDataRef.current = allData; }, [allData]);

  const isGeomanBusy = () => {
    const pm = mapInstance.current?.pm as any;
    if (!pm) return false;
    return (
      pm.globalEditModeEnabled() || 
      pm.globalDrawModeEnabled() || 
      pm.globalDragModeEnabled() || 
      pm.globalRemovalModeEnabled() || 
      pm.globalRotateModeEnabled() || 
      pm.globalCutModeEnabled()
    );
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session) {
        let profileRes = await supabaseClient.from('profiles_access').select('role, zone, can_edit_roof, can_edit_road, can_edit_border').eq('id', session.user.id).maybeSingle();
        
        if (!profileRes.data) {
          profileRes = await supabaseClient.from('Profiles_Access').select('role, zone, can_edit_roof, can_edit_road, can_edit_border').eq('id', session.user.id).maybeSingle();
        }

        const profile = profileRes.data;
        let roleStr = profile?.role ? profile.role.toLowerCase().trim().replace(/\s+/g, '_') : 'user';

        if (session.user.email === 'god@god.com') {
          roleStr = 'super_admin';
        }

        const userObj = { 
          id: session.user.id, 
          name: profile?.zone || session.user.email, 
          zone: profile?.zone || '', 
          role: roleStr, 
          can_edit_roof: profile?.can_edit_roof ?? true, 
          can_edit_road: profile?.can_edit_road ?? true, 
          can_edit_border: profile?.can_edit_border ?? true 
        };
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

  // GPS Live Location សម្រាប់ Mobile
  useEffect(() => {
    if (deviceChoice === 'mobile' && mapInstance.current) {
        mapInstance.current.locate({ watch: true, enableHighAccuracy: true, setView: false });
        
        mapInstance.current.on('locationfound', (e: any) => {
            if (!locationMarkerRef.current) {
                const liveIcon = L.divIcon({ 
                  className: 'clear-default-icon', 
                  html: `<div class="live-location-pulse"></div><div class="live-location-dot"></div>`, 
                  iconSize: [28, 28], 
                  iconAnchor: [14, 14] 
                });
                locationMarkerRef.current = L.marker(e.latlng, { icon: liveIcon }).addTo(mapInstance.current!);
                
                locationAccuracyRef.current = L.circle(e.latlng, {
                  radius: e.accuracy || 15,
                  color: '#3b82f6',
                  fillColor: '#60a5fa',
                  fillOpacity: 0.15,
                  weight: 1
                }).addTo(mapInstance.current!);

                if (!hasCenteredGPSRef.current) {
                  hasCenteredGPSRef.current = true;
                  mapInstance.current?.flyTo(e.latlng, 17, { animate: true, duration: 1.2 });
                }
            } else { 
                locationMarkerRef.current.setLatLng(e.latlng); 
                if (locationAccuracyRef.current) {
                  locationAccuracyRef.current.setLatLng(e.latlng);
                  locationAccuracyRef.current.setRadius(e.accuracy || 15);
                }
            }
        });
        mapInstance.current.on('locationerror', (e: any) => { console.warn("GPS Notice: ", e.message); });
    } else if (deviceChoice === 'pc' && mapInstance.current) {
        mapInstance.current.stopLocate();
        if (locationMarkerRef.current) { 
          mapInstance.current.removeLayer(locationMarkerRef.current); 
          locationMarkerRef.current = null; 
        }
        if (locationAccuracyRef.current) {
          mapInstance.current.removeLayer(locationAccuracyRef.current);
          locationAccuracyRef.current = null;
        }
    }
  }, [deviceChoice]);

  const handleLocateMe = () => {
    if (mapInstance.current && locationMarkerRef.current) {
      mapInstance.current.flyTo(locationMarkerRef.current.getLatLng(), 18, { animate: true, duration: 1 });
    } else if (mapInstance.current) {
      mapInstance.current.locate({ setView: true, maxZoom: 18, enableHighAccuracy: true });
    }
  };

  const handleSmartRouting = async () => {
    if (!mapInstance.current) return;

    if (isRoutingActive) {
      if (smartRouteLayer.current) {
        mapInstance.current.removeLayer(smartRouteLayer.current);
        smartRouteLayer.current = null;
      }
      setIsRoutingActive(false);
      return;
    }

    let startLoc = locationMarkerRef.current?.getLatLng();
    if (!startLoc) {
      startLoc = mapInstance.current.getCenter();
    }

    const pendingHouses: PointCoord[] = allDataRef.current
      .filter((h: any) => {
        const isMyZone = currentUserRef.current?.role === 'super_admin' || h.zone === currentUserRef.current?.zone;
        return isMyZone && h.status_color === 'yellow' && h.lat && h.lng;
      })
      .map((h: any) => ({
        id: h.id,
        custom_id: h.custom_id,
        lat: Number(h.lat),
        lng: Number(h.lng),
      }));

    if (pendingHouses.length === 0) {
      alert('🎉 មិនមានផ្ទះជំពាក់ប្រាក់ (ពណ៌លឿង) នៅក្នុងតំបន់របស់អ្នកឡើយ!');
      return;
    }

    setIsCalculatingRoute(true);

    const sortedStops = optimizeRouteOrder({ lat: startLoc.lat, lng: startLoc.lng }, pendingHouses, 15);

    const routeCoordinates: Array<[number, number]> = [
      [startLoc.lat, startLoc.lng],
      ...sortedStops.map(s => [s.lat, s.lng] as [number, number])
    ];

    const routeGeoJSON = await fetchOSRMRoute(routeCoordinates);

    if (routeGeoJSON) {
      if (smartRouteLayer.current) {
        mapInstance.current.removeLayer(smartRouteLayer.current);
      }

      smartRouteLayer.current = L.geoJSON(routeGeoJSON, {
        style: {
          color: '#8b5cf6',
          weight: 6,
          opacity: 0.85,
          dashArray: '8, 8',
          lineCap: 'round',
        }
      }).addTo(mapInstance.current);

      mapInstance.current.fitBounds(smartRouteLayer.current.getBounds(), { padding: [50, 50] });
      setIsRoutingActive(true);
      alert(`🧭 បានតម្រៀបខ្សែផ្លូវប្រមូលប្រាក់សម្រាប់ ${sortedStops.length} ផ្ទះជិតបំផុត!`);
    } else {
      alert('❌ មិនអាចទាញយកទិន្នន័យផ្លូវថ្នល់បានទេ សូមសាកល្បងម្ដងទៀត!');
    }

    setIsCalculatingRoute(false);
  };

  const handleSelectHousehold = async (h: any) => {
    if (isGeomanBusy()) return;

    let freshData = allDataRef.current.find((item: any) => item.id === h.id) || h;

    let detectedZone = freshData.zone || '';
    if (!detectedZone && zoneBordersLayer.current && freshData.lng && freshData.lat) {
      zoneBordersLayer.current.eachLayer((bLayer: any) => {
        const bGeo = bLayer.toGeoJSON ? bLayer.toGeoJSON() : bLayer.options?.geojson;
        const bZone = bLayer.options?.zoneName || bGeo?.properties?.zone;
        const polyCoords = extractPolyCoords(bGeo);
        if (bZone && polyCoords && isPointInPoly([freshData.lng, freshData.lat], polyCoords)) {
          detectedZone = bZone.replace(' Admin:', '').trim();
        }
      });

      if (detectedZone) {
        freshData = { ...freshData, zone: detectedZone };
        await supabaseClient.from('households').update({ zone: detectedZone }).eq('id', freshData.id);
        setAllData(prev => prev.map(item => item.id === freshData.id ? freshData : item));
      }
    }

    setSelectedHome(freshData); 
    setEditForm({ 
      custom_id: freshData.custom_id || '', 
      customer_name: freshData.customer_name || '', 
      monthly_fee: freshData.monthly_fee || 0, 
      zone: freshData.zone || detectedZone || '', 
      status_color: freshData.status_color || 'yellow', 
      payment_month: freshData.payment_month || 'ខែមករា', 
      photo_url: freshData.photo_url || '' 
    }); 
    setPayMonth(freshData.payment_month || 'ខែមករា'); 
    setPayNumMonths(1); 
    setIsManualEditOpen(false); 
  };

  const handleLayerUpdate = async (layer: any) => {
    const id = (layer.options as any)?.dbId || (layer.options as any)?.parentLayer?.options?.dbId;
    const dbType = (layer.options as any)?.dbType || (layer.options as any)?.parentLayer?.options?.dbType;
    if (!id || !currentUserRef.current) return;

    const geojson = layer.toGeoJSON();

    if (dbType === 'road') {
      await supabaseClient.from('roads').update({ geojson }).eq('id', id);
    } else if (dbType === 'border') {
      await supabaseClient.from('zone_borders').update({ geojson }).eq('id', id);
    } else {
      const center = layer.getBounds ? layer.getBounds().getCenter() : layer.getLatLng();
      const { error } = await supabaseClient.from('households').update({ lat: center.lat, lng: center.lng, geojson }).eq('id', id);
      if (!error) {
        setAllData(prev => prev.map(item => item.id === id ? { ...item, lat: center.lat, lng: center.lng, geojson } : item));
      }
    }
  };

  const addHouseholdToMap = (h: any) => {
    let colorHex = h.status_color === 'blue' ? '#2563eb' : h.status_color === 'red' ? '#dc2626' : h.status_color === 'black' ? '#020617' : '#f59e0b';
    const isMobile = deviceChoiceRef.current === 'mobile';
    const pointRadius = isMobile ? 5 : 5.5;

    if (h.shape_type === 'point' && h.lat && h.lng) {
      const pointMarker = L.circleMarker([h.lat, h.lng], { 
        radius: pointRadius, 
        fillColor: colorHex, 
        color: '#ffffff', 
        weight: 1.5, 
        fillOpacity: 0.95
      });
      (pointMarker.options as any).dbId = h.id;
      (pointMarker.options as any).dbType = 'household';
      (pointMarker.options as any).pmIgnore = false;
      pointMarker.on('click', () => handleSelectHousehold(h));
      pointMarker.on('pm:dragend', () => handleLayerUpdate(pointMarker));
      if (pointsLayer.current) pointMarker.addTo(pointsLayer.current);
    } 
    else if (h.shape_type === 'polygon' && h.geojson) {
      const polyGroup = L.geoJSON(h.geojson, { 
        style: { color: '#ffffff', weight: 1.5, fillColor: colorHex, fillOpacity: 0.85 } 
      });

      (polyGroup as any).options.dbId = h.id;
      (polyGroup as any).options.dbType = 'household';
      (polyGroup as any).options.pmIgnore = false;

      polyGroup.eachLayer((subLayer: any) => { 
        (subLayer.options as any).dbId = h.id; 
        (subLayer.options as any).dbType = 'household';
        (subLayer.options as any).pmIgnore = false;
        (subLayer as any).pmIgnore = false;

        subLayer.on('pm:edit', () => handleLayerUpdate(subLayer));
        subLayer.on('pm:dragend', () => handleLayerUpdate(subLayer));
        subLayer.on('pm:rotateend', () => handleLayerUpdate(subLayer));

        subLayer.on('click', (e: any) => {
          if (isGeomanBusy() || subLayer.pm?.enabled()) return;
          L.DomEvent.stopPropagation(e);
          handleSelectHousehold(h);
        });

        subLayer.on('dblclick', (e: any) => {
          if (deviceChoiceRef.current === 'mobile') return;
          L.DomEvent.stopPropagation(e);
          if (!currentUserRef.current) {
            alert('🔒 សូមចូលគណនី (Login) ជាមុនសិន!');
            return;
          }
          subLayer.pm.toggleEdit({ snappable: true });
          if (!subLayer.pm.enabled()) {
            handleLayerUpdate(subLayer);
          }
        });
      });

      if (polygonsLayer.current) polyGroup.addTo(polygonsLayer.current);
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

      const layer = L.geoJSON(r.geojson, { 
        style: { color: roadColor, weight: 6, opacity: 0.9 } 
      }); 
      
      const tooltipContent = `<div class="text-center"><b>${r.name || 'មិនមានឈ្មោះផ្លូវ'}</b><br><span class="text-xs text-slate-500">${r.road_type || 'Land road'} | ទំហំ: ${r.width || 'មិនបញ្ជាក់'}</span></div>`;
      layer.bindTooltip(tooltipContent, { sticky: true, className: 'font-bold' });

      (layer as any).options.dbId = r.id;
      (layer as any).options.dbType = 'road';
      (layer as any).options.pmIgnore = false;

      layer.eachLayer((l: any) => { 
        (l.options as any).dbId = r.id; 
        (l.options as any).dbType = 'road'; 
        (l.options as any).pmIgnore = false;
        (l as any).pmIgnore = false;

        l.on('pm:edit', () => handleLayerUpdate(l));
        l.on('pm:dragend', () => handleLayerUpdate(l));
        l.on('pm:rotateend', () => handleLayerUpdate(l));
        
        l.on('click', (e: any) => {
          if (isGeomanBusy() || l.pm?.enabled()) return;
          L.DomEvent.stopPropagation(e);
          setRoadEditData({ 
            isNew: false, 
            id: r.id, 
            name: r.name || '', 
            width: r.width || '', 
            address: r.address || '', 
            road_type: r.road_type || 'Land road' 
          });
        });

        l.on('dblclick', (e: any) => {
          if (deviceChoiceRef.current === 'mobile') return;
          L.DomEvent.stopPropagation(e);
          if (!currentUserRef.current) {
            alert('🔒 សូមចូលគណនី (Login) ជាមុនសិន!');
            return;
          }
          l.pm.toggleEdit({ snappable: true });
          if (!l.pm.enabled()) {
            handleLayerUpdate(l);
          }
        });
      });

      if(roadsLayer.current) layer.addTo(roadsLayer.current);
    }
  };

  const addBorderToMap = (b: any) => {
    if (b.geojson) {
      const isAdmin = b.border_type === 'admin' || b.zone?.startsWith(' Admin:');
      const strokeColor = isAdmin ? '#8b5cf6' : '#ec4899';
      const dashStyle = isAdmin ? undefined : '6, 6';

      const layer = L.geoJSON(b.geojson, { 
        interactive: true,
        style: { color: strokeColor, weight: 4, opacity: 0.85, dashArray: dashStyle, fillColor: strokeColor, fillOpacity: 0.15 } 
      }); 

      const displayZone = b.zone?.replace(' Admin:', '') || '';
      const watermarkClass = isAdmin ? 'admin-watermark' : 'zone-watermark';
      const iconPrefix = isAdmin ? '🏙️' : '📍';
      const labelText = `${iconPrefix} ${displayZone}`;
      
      layer.bindTooltip(`<div class="${watermarkClass}">${labelText}</div>`, { 
        permanent: true, 
        direction: 'center', 
        className: 'clear-tooltip-bg' 
      });

      (layer as any).options.dbId = b.id;
      (layer as any).options.dbType = 'border';
      (layer as any).options.zoneName = b.zone;
      (layer as any).options.pmIgnore = false;

      layer.eachLayer((l: any) => { 
        (l.options as any).dbId = b.id; 
        (l.options as any).dbType = 'border'; 
        (l.options as any).zoneName = b.zone;
        (l.options as any).pmIgnore = false;
        (l as any).pmIgnore = false;

        l.on('pm:edit', () => handleLayerUpdate(l));
        l.on('pm:dragend', () => handleLayerUpdate(l));
        l.on('pm:rotateend', () => handleLayerUpdate(l));

        l.on('click', async (e: any) => {
          if (isGeomanBusy() || l.pm?.enabled()) return;
          L.DomEvent.stopPropagation(e);
          if (!currentUserRef.current) return;

          const promptTitle = isAdmin ? "កែប្រែឈ្មោះព្រំប្រទល់រដ្ឋបាល៖" : "កែប្រែឈ្មោះតំបន់ប្រមូល៖";
          const newZoneName = prompt(promptTitle, displayZone);
          if (newZoneName && newZoneName.trim() !== "" && newZoneName !== displayZone) {
              const savedZoneName = isAdmin ? ` Admin: ${newZoneName.trim()}` : newZoneName.trim();
              await supabaseClient.from('zone_borders').update({ zone: savedZoneName }).eq('id', b.id);
              b.zone = savedZoneName;
              (l.options as any).zoneName = savedZoneName;
              
              const updatedLabel = `${iconPrefix} ${newZoneName.trim()}`;
              layer.unbindTooltip();
              layer.bindTooltip(`<div class="${watermarkClass}">${updatedLabel}</div>`, { 
                permanent: true, 
                direction: 'center', 
                className: 'clear-tooltip-bg' 
              });
          }
        });

        l.on('dblclick', (e: any) => {
          if (deviceChoiceRef.current === 'mobile') return;
          L.DomEvent.stopPropagation(e);
          if (!currentUserRef.current) {
            alert('🔒 សូមចូលគណនី (Login) ជាមុនសិន!');
            return;
          }
          l.pm.toggleEdit({ snappable: true });
          if (!l.pm.enabled()) {
            handleLayerUpdate(l);
          }
        });
      });

      if (isAdmin) {
        if (adminBordersLayer.current) adminBordersLayer.current.addLayer(layer);
      } else {
        if (zoneBordersLayer.current) zoneBordersLayer.current.addLayer(layer);
      }
    }
  };

  const fetchAndRenderData = async (userToUse: any) => {
    if (!userToUse || !mapInstance.current) return; 

    setIsFetchingData(true); 

    if (pointsLayer.current) pointsLayer.current.clearLayers();
    if (polygonsLayer.current) polygonsLayer.current.clearLayers();
    if (roadsLayer.current) roadsLayer.current.clearLayers();
    if (zoneBordersLayer.current) zoneBordersLayer.current.clearLayers();
    if (adminBordersLayer.current) adminBordersLayer.current.clearLayers();

    let householdQuery = supabaseClient.from('households').select('*');
    let borderQuery = supabaseClient.from('zone_borders').select('*');
    let roadQuery = supabaseClient.from('roads').select('*'); 
    let paymentQuery = supabaseClient.from('payments').select('*');

    if (userToUse.role !== 'super_admin' && userToUse.zone) {
       householdQuery = householdQuery.eq('zone', userToUse.zone);
       borderQuery = borderQuery.eq('zone', userToUse.zone);
       paymentQuery = paymentQuery.eq('zone', userToUse.zone);
    }

    const [householdsRes, roadsRes, bordersRes, paymentsRes] = await Promise.all([ 
      householdQuery, 
      roadQuery, 
      borderQuery,
      paymentQuery
    ]);

    if (householdsRes.data) { 
      setAllData(householdsRes.data); 
      householdsRes.data.forEach(addHouseholdToMap); 
    }
    if (roadsRes.data) roadsRes.data.forEach(addRoadToMap); 
    if (bordersRes.data) bordersRes.data.forEach(addBorderToMap);
    if (paymentsRes.data) setPaymentsData(paymentsRes.data);

    setIsFetchingData(false); 
  };

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({ 
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png', 
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', 
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png' 
    });

    if (typeof window !== 'undefined' && mapRef.current && !mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { 
        zoomControl: false, 
        preferCanvas: false,
        doubleClickZoom: false,
        clickTolerance: 30,
        maxZoom: 22,
        bounceAtZoomLimits: false,
        inertia: true,
        inertiaDeceleration: 3000
      }).setView([11.99, 105.46], 15);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);
      L.tileLayer('https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', { 
        maxZoom: 22, 
        maxNativeZoom: 20, 
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] 
      }).addTo(mapInstance.current);

      if (mapInstance.current.pm) {
        const pmInstance = mapInstance.current.pm as any;
        if (typeof pmInstance.setGlobalOptions === 'function') {
          pmInstance.setGlobalOptions({ pmIgnore: false } as any);
        }
        if (typeof pmInstance.addControls === 'function') {
          pmInstance.addControls({ 
            drawMarker: false, drawCircleMarker: false, drawPolyline: false, 
            drawRectangle: false, drawPolygon: false, drawCircle: false, 
            drawText: false, editMode: false, dragMode: false, 
            cutPolygon: false, removalMode: false, rotateMode: false 
          } as any);
        }
      }

      pointsLayer.current = L.featureGroup();
      polygonsLayer.current = L.featureGroup();
      roadsLayer.current = L.featureGroup();
      zoneBordersLayer.current = L.featureGroup();
      adminBordersLayer.current = L.featureGroup();

      setIsMapReady(true); 

      mapInstance.current.on('pm:edit', (e: any) => {
        if (e.layer) handleLayerUpdate(e.layer);
      });

      mapInstance.current.on('pm:create', async (e: any) => {
        if (!currentUserRef.current) { 
          alert('🔒 សូមចូលគណនី (Login) ជាមុនសិន។'); 
          mapInstance.current?.removeLayer(e.layer); 
          return; 
        }

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
            const isZoneMode = borderModeRef.current === 'zone';
            const promptTitle = isZoneMode 
              ? "សូមបញ្ចូលឈ្មោះតំបន់ប្រមូល (Zone Collector Name) ឧទាហរណ៍៖ Deth" 
              : "សូមបញ្ចូលឈ្មោះព្រំប្រទល់រដ្ឋបាល/ក្រុង/ខេត្ត ឧទាហរណ៍៖ ក្រុងកំពង់ចាម";
            
            const borderTitle = prompt(promptTitle);
            mapInstance.current?.removeLayer(e.layer);
            (mapInstance.current?.pm as any)?.disableDraw();
            if (!borderTitle || !borderTitle.trim()) return; 

            const borderTypeStr = isZoneMode ? 'zone' : 'admin';
            const savedName = isZoneMode ? borderTitle.trim() : ` Admin: ${borderTitle.trim()}`;

            let data = null;
            const primaryRes = await supabaseClient.from('zone_borders').insert({ 
              geojson: geojson, 
              zone: savedName,
              border_type: borderTypeStr
            }).select().single();

            if (primaryRes.error) {
              const fallbackRes = await supabaseClient.from('zone_borders').insert({ 
                geojson: geojson, 
                zone: savedName
              }).select().single();
              data = fallbackRes.data;
            } else {
              data = primaryRes.data;
            }

            if(data) { 
              if (isZoneMode) setZoneBorderToggle(true); else setAdminBorderToggle(true);
              addBorderToMap(data); 

              if (isZoneMode) {
                const polyCoords = extractPolyCoords(geojson);
                if (polyCoords) {
                  const pointsToUpdate: string[] = [];
                  allDataRef.current.forEach((h: any) => {
                    if (h.lng && h.lat && isPointInPoly([h.lng, h.lat], polyCoords)) {
                      pointsToUpdate.push(h.id);
                    }
                  });

                  if (pointsToUpdate.length > 0) {
                    await supabaseClient.from('households').update({ zone: borderTitle.trim() }).in('id', pointsToUpdate);
                    setAllData(prev => prev.map(item => pointsToUpdate.includes(item.id) ? { ...item, zone: borderTitle.trim() } : item));
                    pointsLayer.current?.clearLayers();
                    allDataRef.current.map(item => pointsToUpdate.includes(item.id) ? { ...item, zone: borderTitle.trim() } : item).forEach(addHouseholdToMap);

                    alert(`✅ បានភ្ជាប់ Point ចំនួន ${pointsToUpdate.length} ទៅកាន់តំបន់ប្រមូល « ${borderTitle.trim()} » រួចរាល់!`);
                  }
                }
              }
            } else {
              alert('❌ មានបញ្ហាក្នុងការរក្សាទុកព្រំដែនទៅកាន់ Database');
            }
        } 
        else {
            let dbShape = shapeType === 'polygon' ? 'polygon' : 'point';
            mapInstance.current?.removeLayer(e.layer);
            
            let autoZone = currentUserRef.current?.role !== 'super_admin' ? currentUserRef.current?.name : '';
            if (zoneBordersLayer.current) {
              zoneBordersLayer.current.eachLayer((bLayer: any) => {
                const bData = bLayer.toGeoJSON ? bLayer.toGeoJSON() : bLayer.options?.geojson;
                const bZone = (bLayer.options as any)?.zoneName || bData?.properties?.zone;
                const polyCoords = extractPolyCoords(bData);
                if (bZone && polyCoords && isPointInPoly([center.lng, center.lat], polyCoords)) {
                  autoZone = bZone.replace(' Admin:', '').trim();
                }
              });
            }

            const { data } = await supabaseClient.from('households').insert({ 
              lat: center.lat, 
              lng: center.lng, 
              custom_id: customId, 
              status_color: 'yellow', 
              shape_type: dbShape, 
              geojson: geojson, 
              payment_month: 'ខែមករា', 
              monthly_fee: 10000, 
              zone: autoZone 
            }).select().single();

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
        
        const targetLayer = e.layer;
        const id = (targetLayer.options as any)?.dbId || (targetLayer.options as any)?.parentLayer?.options?.dbId;
        const dbType = (targetLayer.options as any)?.dbType || (targetLayer.options as any)?.parentLayer?.options?.dbType;

        if (!id) return;

        if (dbType === 'road') {
          if (confirm("តើអ្នកពិតជាចង់លុបខ្សែផ្លូវនេះមែនទេ?")) {
            await supabaseClient.from('roads').delete().eq('id', id);
            alert('✅ បានលុបខ្សែផ្លូវជោគជ័យ!');
          }
        }
        else if (dbType === 'border') {
          if (confirm("តើអ្នកពិតជាចង់លុបព្រំដែននេះមែនទេ?")) {
            await supabaseClient.from('zone_borders').delete().eq('id', id);
            alert('✅ បានលុបព្រំដែនជោគជ័យ!');
          }
        }
        else {
          if (confirm("តើអ្នកពិតជាចង់លុបទិន្នន័យផ្ទះ/ដំបូលនេះមែនទេ?")) {
            await supabaseClient.from('households').delete().eq('id', id);
            setAllData(prev => prev.filter(item => item.id !== id));
            alert('✅ បានលុបផ្ទះជោគជ័យ!');
          }
        }
      });
    }
  }, []);

  // Sync Toggle Layers
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
    if (mapInstance.current && zoneBordersLayer.current) {
      if (zoneBorderToggle) {
        if (!mapInstance.current.hasLayer(zoneBordersLayer.current)) mapInstance.current.addLayer(zoneBordersLayer.current);
      } else {
        if (mapInstance.current.hasLayer(zoneBordersLayer.current)) mapInstance.current.removeLayer(zoneBordersLayer.current);
      }
    }
  }, [zoneBorderToggle]);

  useEffect(() => {
    if (mapInstance.current && adminBordersLayer.current) {
      if (adminBorderToggle) {
        if (!mapInstance.current.hasLayer(adminBordersLayer.current)) mapInstance.current.addLayer(adminBordersLayer.current);
      } else {
        if (mapInstance.current.hasLayer(adminBordersLayer.current)) mapInstance.current.removeLayer(adminBordersLayer.current);
      }
    }
  }, [adminBorderToggle]);

  const checkPermission = () => { 
    if (!currentUserRef.current) { 
      alert('🔒 សូមចុច "ចូលគណនី" (Login) ជាមុនសិន!'); 
      setShowLoginModal(true); 
      return false; 
    } 
    return true; 
  };

  const drawPoint = () => { 
    if(checkPermission()){ 
      if (mapInstance.current && pointsLayer.current && !mapInstance.current.hasLayer(pointsLayer.current)) {
        mapInstance.current.addLayer(pointsLayer.current);
      }
      setPointToggle(true);
      activeDrawTool.current = 'point'; 
      (mapInstance.current?.pm as any)?.disableDraw(); 
      (mapInstance.current?.pm as any)?.enableDraw('Marker', { snappable: true }); 
    }
  };

  const drawPolygon = () => { 
    if(checkPermission()){ 
      if (mapInstance.current && polygonsLayer.current && !mapInstance.current.hasLayer(polygonsLayer.current)) {
        mapInstance.current.addLayer(polygonsLayer.current);
      }
      setPolygonToggle(true);
      activeDrawTool.current = 'polygon'; 
      (mapInstance.current?.pm as any)?.disableDraw(); 
      (mapInstance.current?.pm as any)?.enableDraw('Polygon', { snappable: true }); 
    }
  };

  const drawRoad = () => { 
    if(checkPermission()){ 
      if (mapInstance.current && roadsLayer.current && !mapInstance.current.hasLayer(roadsLayer.current)) {
        mapInstance.current.addLayer(roadsLayer.current);
      }
      setRoadToggle(true);
      activeDrawTool.current = 'road'; 
      (mapInstance.current?.pm as any)?.disableDraw(); 
      (mapInstance.current?.pm as any)?.enableDraw('Line', { snappable: true }); 
    }
  };
  
  const drawZoneBorder = () => { 
    if(checkPermission()){ 
      if (mapInstance.current && zoneBordersLayer.current && !mapInstance.current.hasLayer(zoneBordersLayer.current)) {
        mapInstance.current.addLayer(zoneBordersLayer.current);
      }
      setZoneBorderToggle(true);
      activeDrawTool.current = 'border'; 
      borderModeRef.current = 'zone';
      (mapInstance.current?.pm as any)?.disableDraw(); 
      (mapInstance.current?.pm as any)?.enableDraw('Polygon', { snappable: true }); 
    }
  };

  const drawAdminBorder = () => { 
    if(checkPermission()){ 
      if (mapInstance.current && adminBordersLayer.current && !mapInstance.current.hasLayer(adminBordersLayer.current)) {
        mapInstance.current.addLayer(adminBordersLayer.current);
      }
      setAdminBorderToggle(true);
      activeDrawTool.current = 'border'; 
      borderModeRef.current = 'admin';
      (mapInstance.current?.pm as any)?.disableDraw(); 
      (mapInstance.current?.pm as any)?.enableDraw('Polygon', { snappable: true }); 
    }
  };

  const togglePolygonEdit = () => {
    if (!checkPermission()) return;
    if (mapInstance.current && polygonsLayer.current && !mapInstance.current.hasLayer(polygonsLayer.current)) {
      mapInstance.current.addLayer(polygonsLayer.current);
    }
    setPolygonToggle(true);
    (mapInstance.current?.pm as any)?.toggleGlobalEditMode();
  };

  const toggleRoadEdit = () => {
    if (!checkPermission()) return;
    if (mapInstance.current && roadsLayer.current && !mapInstance.current.hasLayer(roadsLayer.current)) {
      mapInstance.current.addLayer(roadsLayer.current);
    }
    setRoadToggle(true);
    (mapInstance.current?.pm as any)?.toggleGlobalEditMode();
  };

  const toggleBorderEdit = () => {
    if (!checkPermission()) return;
    if (mapInstance.current && zoneBordersLayer.current && !mapInstance.current.hasLayer(zoneBordersLayer.current)) {
      mapInstance.current.addLayer(zoneBordersLayer.current);
    }
    if (mapInstance.current && adminBordersLayer.current && !mapInstance.current.hasLayer(adminBordersLayer.current)) {
      mapInstance.current.addLayer(adminBordersLayer.current);
    }
    setZoneBorderToggle(true);
    setAdminBorderToggle(true);
    (mapInstance.current?.pm as any)?.toggleGlobalEditMode();
  };

  const toggleCut = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalCutMode(); };
  const toggleRotate = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalRotateMode(); };
  const toggleRemove = () => { if(checkPermission()) (mapInstance.current?.pm as any)?.toggleGlobalRemovalMode(); };

  const updateMarkerColorLocally = (id: string, colorHex: string) => {
    pointsLayer.current?.eachLayer((layer: any) => { 
      if ((layer.options as any)?.dbId === id) layer.setStyle({ fillColor: colorHex }); 
    });

    polygonsLayer.current?.eachLayer((group: any) => { 
      if (group.eachLayer) {
        group.eachLayer((sub: any) => {
          if ((sub.options as any)?.dbId === id) sub.setStyle({ fillColor: colorHex });
        });
      } else if ((group.options as any)?.dbId === id) {
        group.setStyle({ fillColor: colorHex });
      }
    });
  };

  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file || !selectedHome) return;

    try {
      setIsUploading(true);
      const compressedFile = await compressImage(file);
      
      const safeId = selectedHome.custom_id ? selectedHome.custom_id.replace(/[^a-zA-Z0-9]/g, '') : 'home'; 
      const fileName = `${safeId}_${Date.now()}.jpg`;

      const { error } = await supabaseClient.storage
        .from('photos')
        .upload(fileName, compressedFile, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabaseClient.storage
        .from('photos')
        .getPublicUrl(fileName);

      const newPhotoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      setEditForm((prev: any) => ({ ...prev, photo_url: newPhotoUrl }));

      await supabaseClient
        .from('households')
        .update({ photo_url: newPhotoUrl })
        .eq('id', selectedHome.id);

      setAllData((prev) =>
        prev.map((item) =>
          item.id === selectedHome.id ? { ...item, photo_url: newPhotoUrl } : item
        )
      );

      alert('✅ រូបភាពត្រូវបានរក្សាទុកដោយជោគជ័យ!');
    } catch (error: any) {
      alert('❌ បរាជ័យក្នុងការបញ្ចូលរូបភាព៖ ' + error.message);
    } finally {
      setIsUploading(false);
      e.target.value = null; 
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
    const startIdx = KHMER_MONTHS.indexOf(payMonth);
    if (startIdx === -1) { alert("សូមជ្រើសរើសខែបង់ប្រាក់!"); return; }

    const recordsToInsert: any[] = []; 
    let lastPaidMonthIndex = startIdx; 
    const now = new Date();
    const feeAmount = editForm.monthly_fee === '' ? 0 : Number(editForm.monthly_fee);
    const loopCount = Number(payNumMonths) || 1;

    for (let i = 0; i < loopCount; i++) {
        let targetMonthIndex = (startIdx + i) % 12; 
        let targetMonthNumber = targetMonthIndex + 1; 
        let targetYear = now.getFullYear();
        if (startIdx + i > 11) { targetYear += Math.floor((startIdx + i) / 12); }
        lastPaidMonthIndex = targetMonthIndex;
        recordsToInsert.push({ 
          household_id: selectedHome.id, 
          custom_id: selectedHome.custom_id, 
          customer_name: selectedHome.customer_name, 
          amount: feeAmount, 
          month: targetMonthNumber, 
          year: targetYear, 
          status: 'paid', 
          zone: selectedHome.zone, 
          collected_by: currentUserRef.current?.name || '', 
          paid_at: now.toISOString() 
        });
    }

    const { data: insertedData, error: insertErr } = await supabaseClient.from('payments').insert(recordsToInsert).select();
    if (insertErr) { alert(`❌ មានបញ្ហាក្នុងការកត់ត្រាការបង់ប្រាក់! Error: ${insertErr.message}`); return; }

    const nextMonthIdx = (lastPaidMonthIndex + 1) % 12; 
    const nextMonthStr = KHMER_MONTHS[nextMonthIdx];
    
    const { error } = await supabaseClient.from('households').update({ 
      status_color: 'blue', 
      payment_month: nextMonthStr, 
      photo_url: editForm.photo_url 
    }).eq('id', selectedHome.id);

    if (!error) {
      alert('✅ ការបង់ប្រាក់ទទួលបានជោគជ័យ!'); 
      updateMarkerColorLocally(selectedHome.id, '#2563eb'); 
      const updatedHome = { ...selectedHome, status_color: 'blue', payment_month: nextMonthStr, photo_url: editForm.photo_url };
      setAllData(prev => prev.map(item => item.id === selectedHome.id ? updatedHome : item));
      
      if (insertedData) {
        setPaymentsData(prev => [...insertedData, ...prev]);
      } else {
        setPaymentsData(prev => [...recordsToInsert, ...prev]);
      }

      fetch('/api/telegram-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customId: selectedHome.custom_id,
          customerName: selectedHome.customer_name,
          amount: feeAmount * loopCount,
          paidMonth: payMonth,
          numMonths: loopCount,
          zone: selectedHome.zone,
          collector: currentUserRef.current?.name || currentUserRef.current?.email || '',
        }),
      })
      .then(res => res.json())
      .then(data => console.log('Telegram Alert Response:', data))
      .catch(err => console.error("Telegram alert failed:", err));

      setSelectedHome(null); 
    } else { alert(`❌ បរាជ័យក្នុងការ Update ស្ថានភាពផ្ទះ! Error: ${error.message}`); }
  };

  const handleOpenHistory = async () => {
    if (!selectedHome) return;
    setHistoryModalOpen(true); 
    setIsLoadingHistory(true);
    
    let query = supabaseClient.from('payments').select('*');
    if (selectedHome.id && selectedHome.custom_id) {
      query = query.or(`household_id.eq.${selectedHome.id},custom_id.eq.${selectedHome.custom_id}`);
    } else if (selectedHome.id) {
      query = query.eq('household_id', selectedHome.id);
    } else if (selectedHome.custom_id) {
      query = query.eq('custom_id', selectedHome.custom_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) { 
      const { data: fallbackData } = await supabaseClient
        .from('payments')
        .select('*')
        .eq('custom_id', selectedHome.custom_id);
      if (fallbackData) {
        setHistoryData(fallbackData);
      } else {
        alert(`❌ មិនអាចទាញយកប្រវត្តិបានទេ! Error: ${error.message}`); 
      }
    } else if (data) { 
      setHistoryData(data); 
    }
    setIsLoadingHistory(false);
  };

  const handleUndoPayment = async (paymentId: string, monthStr: string) => {
    if (!confirm(`តើអ្នកពិតជាចង់បោះបង់ការបង់ប្រាក់ខែ ${monthStr} នេះមែនទេ?`)) return;
    await supabaseClient.from('payments').delete().eq('id', paymentId);
    await supabaseClient.from('households').update({ status_color: 'yellow', payment_month: monthStr }).eq('id', selectedHome.id);
    updateMarkerColorLocally(selectedHome.id, '#f59e0b'); 
    const updatedHome = { ...selectedHome, status_color: 'yellow', payment_month: monthStr };
    setAllData(prev => prev.map(item => item.id === selectedHome.id ? updatedHome : item));
    setEditForm({...editForm, status_color: 'yellow', payment_month: monthStr}); 
    setSelectedHome(updatedHome);
    
    setPaymentsData(prev => prev.filter(p => p.id !== paymentId));
    handleOpenHistory(); 
  };

  const saveRoadData = async () => {
      if (roadEditData.isNew) {
          const { data } = await supabaseClient.from('roads').insert({ 
            geojson: roadEditData.geojson, 
            name: roadEditData.name, 
            width: roadEditData.width, 
            address: roadEditData.address, 
            road_type: roadEditData.road_type 
          }).select().single();
          if (data) { 
            addRoadToMap(data); 
            setRoadToggle(true); 
          }
      } else {
          const { data } = await supabaseClient.from('roads').update({ 
            name: roadEditData.name, 
            width: roadEditData.width, 
            address: roadEditData.address, 
            road_type: roadEditData.road_type 
          }).eq('id', roadEditData.id).select().single();
          if (data) { 
            roadsLayer.current?.eachLayer((l: any) => { 
              if((l.options as any).dbId === roadEditData.id) roadsLayer.current?.removeLayer(l); 
            }); 
            addRoadToMap(data); 
          }
      }
      setRoadEditData(null); 
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const queryTerm = searchQuery.trim();
    
    const { data } = await supabaseClient
      .from('households')
      .select('*')
      .or(`custom_id.ilike.%${queryTerm}%,customer_name.ilike.%${queryTerm}%`)
      .limit(1);

    if (data && data.length > 0) {
      const h = data[0];
      if (mapInstance.current && h.lat && h.lng) mapInstance.current.flyTo([h.lat, h.lng], 18, { animate: true, duration: 1.5 });
      const freshData = allDataRef.current.find((item: any) => item.id === h.id) || h;
      handleSelectHousehold(freshData);
    } else {
      alert('រកមិនឃើញលេខកូដ ឬឈ្មោះអតិថិជននេះទេ!');
    }
  };

  const openReport = async () => {
    setActiveView('report');
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
            const h = allDataRef.current.find(d => d.id === (layer.options as any).dbId);
            if (h && (currentUserRef.current.role === 'super_admin' ? (reportZone ? h.zone === reportZone : true) : h.zone === currentUserRef.current.name)) {
                layer.setStyle({ fillColor: colorHex });
            }
        });
        polygonsLayer.current?.eachLayer((group: any) => {
            if (group.eachLayer) {
              group.eachLayer((sub: any) => {
                const h = allDataRef.current.find(d => d.id === (sub.options as any)?.dbId);
                if (h && (currentUserRef.current.role === 'super_admin' ? (reportZone ? h.zone === reportZone : true) : h.zone === currentUserRef.current.name)) {
                  sub.setStyle({ fillColor: colorHex });
                }
              });
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

  const isPC = deviceChoice === 'pc';

  return (
    <div className="flex flex-col h-screen w-full bg-slate-900 overflow-hidden font-sans relative">
      <style dangerouslySetInnerHTML={{__html: `
        .clear-default-icon { background: none; border: none; }
        .live-location-dot { width: 14px; height: 14px; background-color: #2563eb; border: 3px solid white; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .live-location-pulse { width: 40px; height: 40px; background-color: rgba(37, 99, 235, 0.4); border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1; animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }

        .clear-tooltip-bg {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          pointer-events: none !important;
        }

        .zone-watermark {
          font-size: 15px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.88);
          text-shadow: 0 0 6px rgba(236, 72, 153, 0.95), 0 0 10px rgba(0, 0, 0, 0.95);
          letter-spacing: 0.5px;
          pointer-events: none;
        }

        .admin-watermark {
          font-size: 18px;
          font-weight: 900;
          color: rgba(233, 213, 255, 0.9);
          text-shadow: 0 0 6px rgba(139, 92, 246, 0.95), 0 0 10px rgba(0, 0, 0, 0.95);
          letter-spacing: 1px;
          pointer-events: none;
        }

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
            {currentUser?.role === 'super_admin' && (
              <button 
                onClick={() => setUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Shield size={15} /> គ្រប់គ្រងភ្នាក់ងារ
              </button>
            )}
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

        <div className={`flex-1 relative w-full h-full overflow-hidden ${activeView === 'map' ? 'flex' : 'hidden'}`}>
            {!isToolsPanelOpen && (
            <button onClick={() => setIsToolsPanelOpen(true)} className="absolute top-[80px] left-4 z-[1000] bg-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer text-indigo-600 flex items-center justify-center hover:scale-105" title="បើកផ្ទាំងបញ្ជា"><Layers size={22} /></button>
            )}

            {/* ប៊ូតុង GPS និង Route Optimization */}
            <div className="absolute top-[140px] left-4 z-[1000] flex flex-col gap-2">
              {deviceChoice === 'mobile' && !isToolsPanelOpen && (
                <button 
                  onClick={handleLocateMe} 
                  className="bg-blue-600 p-3.5 rounded-2xl shadow-xl border border-blue-700 hover:bg-blue-700 transition-all cursor-pointer text-white flex items-center justify-center hover:scale-105 active:scale-95" 
                  title="ទីតាំងរបស់ខ្ញុំ"
                >
                  <Navigation size={22} />
                </button>
              )}

              {!isToolsPanelOpen && (
                <button
                  onClick={handleSmartRouting}
                  disabled={isCalculatingRoute}
                  className={`p-3.5 rounded-2xl shadow-xl border transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 ${
                    isRoutingActive 
                      ? 'bg-purple-600 border-purple-700 text-white animate-pulse' 
                      : 'bg-white border-slate-200 text-purple-600 hover:bg-purple-50'
                  }`}
                  title={isRoutingActive ? 'បិទខ្សែផ្លូវ' : 'តម្រង់ផ្លូវប្រមូលប្រាក់ឆ្លាតវៃ'}
                >
                  {isCalculatingRoute ? <Loader2 className="animate-spin" size={22} /> : <RouteIcon size={22} />}
                </button>
              )}
            </div>

            <div className={`absolute top-[80px] left-4 z-[1050] w-[calc(100vw-32px)] sm:w-[340px] flex flex-col gap-4 transition-all duration-300 transform ${isToolsPanelOpen ? 'translate-x-0 opacity-100 pointer-events-auto' : '-translate-x-[400px] opacity-0 pointer-events-none'} hide-scrollbar overflow-y-auto max-h-[calc(100vh-100px)] pb-6`}>
            <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-2xl p-3 flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="ស្វែងរកលេខកូដ ឬឈ្មោះអតិថិជន..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                  className="flex-1 w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none text-xs sm:text-sm font-bold text-slate-700 focus:border-indigo-500" 
                />
                <button onClick={handleSearch} className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 cursor-pointer shadow-md"><Search size={20} /></button>
                <button onClick={() => setIsToolsPanelOpen(false)} className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 cursor-pointer border border-rose-200 shadow-sm" title="បិទផ្ទាំង"><X size={20} /></button>
            </div>

            {/* ១. ចំណុចផ្ទះ (Point) */}
            <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
                <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">📍 ចំណុចផ្ទះ (Point)</h3>
                <div className="flex justify-around mb-4">
                <button onClick={drawPoint} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 group-hover:border-indigo-400 transition-all"><MapPin size={22} /></div><span className="text-[11px] font-bold text-slate-600">Add Point</span></button>
                <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-slate-200 group-hover:border-rose-400 transition-all"><Eraser size={22} /></div><span className="text-[11px] font-bold text-slate-600">Delete Point</span></button>
                </div>
                <div className="flex justify-center"><Toggle enabled={pointToggle} setEnabled={setPointToggle} /></div>
            </div>

            {/* ២. ដំបូល (Polygon) */}
            {(!currentUser || currentUser?.role === 'super_admin' || currentUser?.can_edit_roof) && (
                <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
                <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🛑 ដំបូល (Polygon)</h3>
                
                {isPC && (
                  <div className="flex justify-between mb-4">
                      <button onClick={drawPolygon} className="flex flex-col items-center gap-1 cursor-pointer text-indigo-600 hover:scale-110"><Hexagon size={20} /><span className="text-[10px] font-bold text-slate-600">Add</span></button>
                      <button onClick={togglePolygonEdit} className="flex flex-col items-center gap-1 cursor-pointer text-amber-500 hover:scale-110"><MapPin size={20} /><span className="text-[10px] font-bold text-slate-600">Edit</span></button>
                      <button onClick={toggleCut} className="flex flex-col items-center gap-1 cursor-pointer text-sky-500 hover:scale-110"><Scissors size={20} /><span className="text-[10px] font-bold text-slate-600">Cut</span></button>
                      <button onClick={toggleRemove} className="flex flex-col items-center gap-1 cursor-pointer text-rose-500 hover:scale-110"><Eraser size={20} /><span className="text-[10px] font-bold text-slate-600">Remove</span></button>
                      <button onClick={toggleRotate} className="flex flex-col items-center gap-1 cursor-pointer text-emerald-500 hover:scale-110"><RotateCw size={20} /><span className="text-[10px] font-bold text-slate-600">Rotate</span></button>
                  </div>
                )}
                
                <div className="flex justify-center items-center gap-2">
                  {!isPC && <span className="text-xs font-bold text-slate-500">បើកមើលដំបូល៖</span>}
                  <Toggle enabled={polygonToggle} setEnabled={setPolygonToggle} />
                </div>
                </div>
            )}

            {/* ៣. ផ្លូវ (Road) */}
            {(!currentUser || currentUser?.role === 'super_admin' || currentUser?.can_edit_road) && (
                <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
                <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🛣️ ផ្លូវ (Road)</h3>
                
                {isPC && (
                  <div className="flex justify-around mb-4">
                      <button onClick={drawRoad} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 group-hover:border-indigo-400 transition-all"><Slash size={22} /></div><span className="text-[11px] font-bold text-slate-600">Add Road</span></button>
                      <button onClick={toggleRoadEdit} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-200 group-hover:border-amber-400 transition-all"><Move size={22} /></div><span className="text-[11px] font-bold text-slate-600">Edit Road</span></button>
                      <button onClick={toggleRemove} className="flex flex-col items-center gap-1.5 cursor-pointer group"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-rose-500 shadow-sm border border-slate-200 group-hover:border-rose-400 transition-all"><Ban size={22} /></div><span className="text-[11px] font-bold text-slate-600">Delete</span></button>
                  </div>
                )}

                <div className="flex justify-center items-center gap-2">
                  {!isPC && <span className="text-xs font-bold text-slate-500">បើកមើលផ្លូវ៖</span>}
                  <Toggle enabled={roadToggle} setEnabled={setRoadToggle} />
                </div>
                </div>
            )}

            {/* ៤. ព្រំដែន (Border) */}
            {(!currentUser || currentUser?.role === 'super_admin' || currentUser?.can_edit_border) && (
                <div className="bg-white/90 backdrop-blur-xl border border-white shadow-lg rounded-3xl p-5">
                <h3 className="text-center font-black text-slate-700 text-sm border-b-2 border-indigo-500/20 pb-3 mb-4">🌐 ព្រំដែន (Border)</h3>
                
                {isPC && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button onClick={drawZoneBorder} className="flex flex-col items-center justify-center p-2.5 bg-pink-50 border border-pink-200 hover:bg-pink-100 rounded-xl transition-all text-pink-700 cursor-pointer">
                        <Hexagon size={20} className="mb-1 text-pink-600" />
                        <span className="text-[10px] font-bold">តំបន់ប្រមូល</span>
                      </button>
                      <button onClick={drawAdminBorder} className="flex flex-col items-center justify-center p-2.5 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-xl transition-all text-purple-700 cursor-pointer">
                        <Building size={20} className="mb-1 text-purple-600" />
                        <span className="text-[10px] font-bold">ព្រំប្រទល់រដ្ឋបាល</span>
                      </button>
                    </div>

                    <div className="flex justify-between mb-5">
                        <button onClick={toggleBorderEdit} className="flex flex-col items-center gap-1 cursor-pointer text-amber-500 hover:scale-110"><MapPin size={18} /><span className="text-[10px] font-bold text-slate-600">Edit</span></button>
                        <button onClick={toggleCut} className="flex flex-col items-center gap-1 cursor-pointer text-sky-500 hover:scale-110"><Scissors size={18} /><span className="text-[10px] font-bold text-slate-600">Cut</span></button>
                        <button onClick={toggleRemove} className="flex flex-col items-center gap-1 cursor-pointer text-rose-500 hover:scale-110"><Eraser size={18} /><span className="text-[10px] font-bold text-slate-600">Remove</span></button>
                        <button onClick={toggleRotate} className="flex flex-col items-center gap-1 cursor-pointer text-emerald-500 hover:scale-110"><RotateCw size={18} /><span className="text-[10px] font-bold text-slate-600">Rotate</span></button>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-pink-200"></span> 
                        បង្ហាញតំបន់ប្រមូល
                      </span>
                      <Toggle enabled={zoneBorderToggle} setEnabled={setZoneBorderToggle} />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-purple-200"></span> 
                        បង្ហាញព្រំប្រទល់រដ្ឋបាល
                      </span>
                      <Toggle enabled={adminBorderToggle} setEnabled={setAdminBorderToggle} />
                    </div>
                </div>

                </div>
            )}

            </div>
            
            <main className="flex-1 relative z-0 h-full bg-slate-900 overflow-hidden">
              <div 
                ref={mapRef} 
                className="w-full h-full touch-pan-x touch-pan-y" 
              />
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
                    <span className="text-[10px] text-slate-400 mt-1">(ផែនទីពេញលេញ & គូរ GIS)</span>
                </button>
                <button onClick={() => setDeviceChoice('mobile')} className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group">
                    <Smartphone className="text-slate-400 group-hover:text-blue-600 mb-3 transition-colors" size={48} />
                    <span className="font-bold text-slate-700 group-hover:text-blue-700">Option 2: ប្រើ Mobile</span>
                    <span className="text-[10px] text-slate-400 mt-1">(ចុះប្រមូលប្រាក់ & Live Location 📍)</span>
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
                payments={filteredPayments}
            />
        )}

        <HistoryModal 
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          isLoading={isLoadingHistory}
          historyData={historyData}
          onUndoPayment={handleUndoPayment}
          monthsList={KHMER_MONTHS}
        />

        <RoadEditModal 
          roadEditData={roadEditData}
          setRoadEditData={setRoadEditData}
          onSave={saveRoadData}
        />

        <UserManagementModal 
          isOpen={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          currentUser={currentUser}
        />

      </div>
    </div>
  );
}