import type { GeoPosition, ParkPoint, SpatialFeatureCollection } from "@/components/SpatialMap";

type ParkSource = {
  id: string;
  name: string;
  district: string;
  industry: string;
  enterprises: number;
  lng: number;
  lat: number;
};

export function toParkFeatureCollection(parks: ParkSource[]): SpatialFeatureCollection {
  return {
    type: "FeatureCollection",
    features: parks.map((park) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [park.lng, park.lat],
      },
      properties: {
        id: park.id,
        name: park.name,
        district: park.district,
        industry: park.industry,
        enterprises: park.enterprises,
      },
    })),
  };
}

export function parkPointsFromGeoJson(collection: SpatialFeatureCollection): ParkPoint[] {
  return collection.features.flatMap((feature) => {
    if (feature.geometry.type !== "Point") return [];
    const coordinates = feature.geometry.coordinates as GeoPosition;
    const { id, name, district, industry, enterprises } = feature.properties;
    if (typeof name !== "string" || typeof district !== "string" || typeof industry !== "string") return [];
    return [{
      id,
      name,
      district,
      industry,
      enterprises: Number(enterprises) || 0,
      position: coordinates,
    }];
  });
}
