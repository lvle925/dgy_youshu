import { companies, mapMarkers } from '../data/mock.js';

const POTENTIAL_ATTRACTION_INDEXES = new Set([2, 7, 13, 19, 24]);
const POTENTIAL_LOSS_INDEXES = new Set([4, 10, 16, 22, 28]);

const externalSites = [
  {
    lng: 120.7107,
    lat: 31.3176,
    city: '苏州市',
    district: '苏州工业园区',
    address: '江苏省苏州市工业园区星湖街328号（演示地址）',
  },
  {
    lng: 120.0241,
    lat: 30.2791,
    city: '杭州市',
    district: '余杭区',
    address: '浙江省杭州市余杭区文一西路969号（演示地址）',
  },
  {
    lng: 118.7421,
    lat: 32.1612,
    city: '南京市',
    district: '江北新区',
    address: '江苏省南京市江北新区研创园团结路99号（演示地址）',
  },
  {
    lng: 120.7573,
    lat: 30.7461,
    city: '嘉兴市',
    district: '南湖区',
    address: '浙江省嘉兴市南湖区科技城亚太路705号（演示地址）',
  },
];

function findAnchor(company, index) {
  return mapMarkers.find((marker) => company.park.includes(marker.name))
    || mapMarkers[index % mapMarkers.length];
}

function createLocalLocation(company, marker, index, address) {
  const ring = Math.floor(index / mapMarkers.length);
  const angle = (index % mapMarkers.length) * (Math.PI / 4) + ring * 0.35;
  const radius = 0.006 + ring * 0.002;
  return {
    lng: Number((marker.lng + Math.cos(angle) * radius).toFixed(6)),
    lat: Number((marker.lat + Math.sin(angle) * radius * 0.8).toFixed(6)),
    city: '上海市',
    district: marker.district,
    address,
  };
}

export const businessMapEnterprises = companies.map((company, index) => {
  const marker = findAnchor(company, index);
  const externalSite = externalSites[index % externalSites.length];
  const isPotentialAttraction = POTENTIAL_ATTRACTION_INDEXES.has(index);
  const isPotentialLoss = POTENTIAL_LOSS_INDEXES.has(index);
  const registrationAddress = isPotentialAttraction ? externalSite.address : company.address;
  const officeAddress = isPotentialLoss
    ? externalSite.address
    : isPotentialAttraction
      ? `上海市${marker.district}${marker.name}周边办公楼宇（演示地址）`
      : company.address;
  const localRegistration = createLocalLocation(company, marker, index, registrationAddress);
  const localOffice = createLocalLocation(company, marker, index, officeAddress);
  const registrationLocation = isPotentialAttraction ? { ...externalSite } : localRegistration;
  const officeLocation = isPotentialLoss ? { ...externalSite } : localOffice;

  return {
    ...company,
    anchorParkId: marker.id,
    anchorParkName: marker.name,
    registrationLocation,
    officeLocation,
    potentialAttraction: registrationLocation.city !== '上海市' && officeLocation.city === '上海市',
    potentialLoss: registrationLocation.city === '上海市' && officeLocation.city !== '上海市',
  };
});

function readCoordinate(point, key) {
  if (!point) return Number.NaN;
  const getter = key === 'lng' ? 'getLng' : 'getLat';
  const value = point[key] ?? (typeof point[getter] === 'function' ? point[getter]() : undefined);
  return Number(value);
}

export function normalizeBounds(bounds) {
  if (!bounds) return null;
  const southWest = bounds.southWest
    || (typeof bounds.getSouthWest === 'function' ? bounds.getSouthWest() : null)
    || { lng: bounds.minLng, lat: bounds.minLat };
  const northEast = bounds.northEast
    || (typeof bounds.getNorthEast === 'function' ? bounds.getNorthEast() : null)
    || { lng: bounds.maxLng, lat: bounds.maxLat };
  const west = readCoordinate(southWest, 'lng');
  const south = readCoordinate(southWest, 'lat');
  const east = readCoordinate(northEast, 'lng');
  const north = readCoordinate(northEast, 'lat');
  if (![west, south, east, north].every(Number.isFinite)) return null;
  return {
    minLng: Math.min(west, east),
    minLat: Math.min(south, north),
    maxLng: Math.max(west, east),
    maxLat: Math.max(south, north),
  };
}

export function isInsideBounds(location, bounds) {
  const area = normalizeBounds(bounds);
  if (!area || !location) return false;
  const lng = Number(location.lng);
  const lat = Number(location.lat);
  return Number.isFinite(lng)
    && Number.isFinite(lat)
    && lng >= area.minLng
    && lng <= area.maxLng
    && lat >= area.minLat
    && lat <= area.maxLat;
}

export function emptyEnterpriseAnalysis() {
  return {
    registered: [],
    offices: [],
    potentialLoss: [],
    potentialAttraction: [],
  };
}

export function filterEnterprisesByBounds(bounds, enterprises = businessMapEnterprises) {
  const area = normalizeBounds(bounds);
  if (!area) return emptyEnterpriseAnalysis();
  const registered = enterprises.filter((company) => isInsideBounds(company.registrationLocation, area));
  const offices = enterprises.filter((company) => isInsideBounds(company.officeLocation, area));
  return {
    registered,
    offices,
    potentialLoss: registered.filter((company) => company.potentialLoss),
    potentialAttraction: offices.filter((company) => company.potentialAttraction),
  };
}
