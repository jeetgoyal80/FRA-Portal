import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polygon,
} from "react-leaflet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Layers,
  Search,
  Info,
  Eye,
  EyeOff,
  MapPin,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ✅ Fix for Leaflet icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// FRA Claim type
interface Claim {
  id: number;
  patta_holder_name: string;
  father_or_husband_name: string;
  village_name: string;
  district: string;
  state: string;
  total_area_claimed: string;
  coordinates: string;
  claim_id: string;
  status: string;
  land_use: string;
  cultivation: string;
  phone: string;
}
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

// 🔹 Utility: Create a square polygon around coordinates based on area
const areaToSquareBounds = (lat: number, lng: number, areaStr: string) => {
  try {
    let area = parseFloat(areaStr);
    if (isNaN(area)) return [];

    // Convert to m²
    if (areaStr.toLowerCase().includes("hectare")) {
      area = area * 10000; // 1 ha = 10,000 m²
    } else if (areaStr.toLowerCase().includes("acre")) {
      area = area * 4046.86; // 1 acre = 4046.86 m²
    } else {
      return [];
    }

    const side = Math.sqrt(area); // meters
    const offsetLat = (side / 111320) / 2; // 1° lat ~ 111,320 m
    const offsetLng =
      (side / (40075000 * Math.cos((lat * Math.PI) / 180) / 360)) / 2;

    return [
      [lat - offsetLat, lng - offsetLng],
      [lat - offsetLat, lng + offsetLng],
      [lat + offsetLat, lng + offsetLng],
      [lat + offsetLat, lng - offsetLng],
    ];
  } catch {
    return [];
  }
};

const Atlas = () => {
  // Layer visibility
  const [layers, setLayers] = useState({
    ifr: true,
    cfr: true,
    cr: false,
    villages: true,
    landuse: false,
    waterBodies: true,
  });

  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  // Fetch data from API
  useEffect(() => {
    fetch(`${BACKEND_URL}/upload/all`)
      .then((res) => res.json())
      .then((data) => {
        setClaims(data.results || []);
      })
      .catch((err) => console.error("Error fetching FRA data:", err));
  }, []);

  const toggleLayer = (layerId: string) => {
    setLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  // Custom marker icons
  const createCustomIcon = (status: string) => {
    let color = "#6b7280"; // default gray
    if (status.toLowerCase() === "verified") color = "#16a34a"; // green
    else if (status.toLowerCase() === "pending") color = "#eab308"; // yellow
    else if (status.toLowerCase() === "approved") color = "#2563eb"; // blue
    else if (status.toLowerCase() === "rejected") color = "#dc2626"; // red

    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [18, 18],
      className: "custom-marker",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
        return <Badge className="bg-green-600 text-white">Verified</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-600 text-white">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 bg-background border-r overflow-y-auto">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-2">FRA Atlas</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Interactive WebGIS for Forest Rights Act
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search villages, claims..." className="pl-9" />
          </div>

          {/* Layers Control */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" /> Map Layers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.keys(layers).map((layerId) => (
                <div
                  key={layerId}
                  className="flex items-center justify-between"
                >
                  <button
                    onClick={() => toggleLayer(layerId)}
                    className="flex items-center gap-2 text-left"
                  >
                    {layers[layerId as keyof typeof layers] ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    )}
                    <MapPin className="h-3 w-3" />
                    <span className="text-sm">{layerId}</span>
                  </button>
                  <Badge variant="secondary" className="text-xs">
                    {
                      claims.filter((c) =>
                        c.status.toLowerCase().includes(layerId)
                      ).length
                    }
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Feature Info in Sidebar */}
          {selectedFeature && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" /> Feature Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <h4 className="font-medium text-lg">
                  {selectedFeature.patta_holder_name}
                </h4>
                <p className="text-sm text-muted-foreground font-mono">
                  {selectedFeature.claim_id}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Village:</span>
                  <span>{selectedFeature.village_name}</span>
                  <span className="text-muted-foreground">District:</span>
                  <span>{selectedFeature.district}</span>
                  <span className="text-muted-foreground">State:</span>
                  <span>{selectedFeature.state}</span>
                  <span className="text-muted-foreground">Area:</span>
                  <span>{selectedFeature.total_area_claimed}</span>
                  <span className="text-muted-foreground">Land Use:</span>
                  <span>{selectedFeature.land_use}</span>
                  <span className="text-muted-foreground">Cultivation:</span>
                  <span>{selectedFeature.cultivation}</span>
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{selectedFeature.phone}</span>
                </div>
                <div className="pt-2 border-t">
                  Status: {getStatusBadge(selectedFeature.status)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[22.9734, 78.6569]} // Center on Madhya Pradesh
          zoom={6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {claims.map((claim) => {
            if (!claim.coordinates) return null;
            const [lat, lng] = claim.coordinates.split(",").map(Number);
            if (isNaN(lat) || isNaN(lng)) return null;

            const polygon = areaToSquareBounds(lat, lng, claim.total_area_claimed);

            return (
              <React.Fragment key={claim.id}>
                {/* Marker */}
                <Marker
                  position={[lat, lng]}
                  icon={createCustomIcon(claim.status)}
                  eventHandlers={{
                    click: () => setSelectedFeature(claim),
                  }}
                >
                  <Popup>
                    <div className="text-sm space-y-1">
                      <h4 className="font-bold text-base">
                        {claim.patta_holder_name}
                      </h4>
                      <p className="font-mono text-xs">{claim.claim_id}</p>
                      <p>
                        <strong>Village:</strong> {claim.village_name},{" "}
                        {claim.district}
                      </p>
                      <p>
                        <strong>State:</strong> {claim.state}
                      </p>
                      <p>
                        <strong>Area:</strong> {claim.total_area_claimed}
                      </p>
                      <p>
                        <strong>Land Use:</strong> {claim.land_use}
                      </p>
                      <p>
                        <strong>Cultivation:</strong> {claim.cultivation}
                      </p>
                      <p>
                        <strong>Phone:</strong> {claim.phone}
                      </p>
                      <p>
                        <strong>Status:</strong> {getStatusBadge(claim.status)}
                      </p>
                    </div>
                  </Popup>
                </Marker>

                {/* Polygon */}
                {polygon.length > 0 && (
                  <Polygon
                    positions={polygon}
                    pathOptions={{
                      color:
                        claim.status.toLowerCase() === "verified"
                          ? "green"
                          : "blue",
                      weight: 2,
                      fillOpacity: 0.2,
                    }}
                    eventHandlers={{
                      click: () => setSelectedFeature(claim),
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default Atlas;
