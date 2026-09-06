export type ShapeType = 'point' | 'polygon';

export type StatusColor = 'yellow' | 'blue' | 'red' | 'black';

export type RoadType = 
  | 'Land road' 
  | 'Concrete road' 
  | 'Hight Ways road' 
  | 'Asphalt road' 
  | 'Nation road';

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  zone: string;
  role: UserRole;
  can_edit_roof: boolean;
  can_edit_road: boolean;
  can_edit_border: boolean;
}

export interface Household {
  id: string;
  lat: number | null;
  lng: number | null;
  custom_id: string;
  customer_name: string;
  monthly_fee: number;
  zone: string;
  status_color: StatusColor;
  payment_month: string;
  shape_type: ShapeType;
  geojson?: any;
  photo_url?: string;
  created_at?: string;
}

export interface PaymentRecord {
  id: string;
  household_id?: string;
  custom_id: string;
  customer_name: string;
  amount: number;
  month: number;
  year: number;
  status: 'paid' | 'unpaid';
  zone: string;
  collected_by: string;
  paid_at: string;
  created_at?: string;
}

export interface RoadRecord {
  id: string;
  name: string;
  width: string;
  address: string;
  road_type: RoadType;
  geojson: any;
  created_at?: string;
}

export interface ZoneBorderRecord {
  id: string;
  zone: string;
  border_type?: 'zone' | 'admin';
  geojson: any;
  created_at?: string;
}