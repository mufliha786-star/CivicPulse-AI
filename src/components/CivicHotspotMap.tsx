import React, { useState } from 'react';
import { Complaint, PriorityLevel } from '../types';
import { MapPin, AlertTriangle, Layers, Info, ExternalLink } from 'lucide-react';

interface CivicHotspotMapProps {
  complaints: Complaint[];
  onSelectComplaint: (complaintId: string) => void;
}

export const CivicHotspotMap: React.FC<CivicHotspotMapProps> = ({
  complaints,
  onSelectComplaint
}) => {
  const [selectedPin, setSelectedPin] = useState<Complaint | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const filtered = complaints.filter(
    (c) => filterPriority === 'all' || c.priority === filterPriority
  );

  // Group by ward for hotspot statistics
  const wardHotspots: Record<string, { count: number; critical: number; categories: string[] }> = {};
  complaints.forEach((c) => {
    const wardName = c.location.ward || 'Central Zone';
    if (!wardHotspots[wardName]) {
      wardHotspots[wardName] = { count: 0, critical: 0, categories: [] };
    }
    wardHotspots[wardName].count++;
    if (c.priority === 'critical') wardHotspots[wardName].critical++;
    if (!wardHotspots[wardName].categories.includes(c.category)) {
      wardHotspots[wardName].categories.push(c.category);
    }
  });

  // Calculate relative SVG coordinates for Coimbatore map (approx lat 11.00 to 11.04, lng 76.94 to 77.01)
  const minLat = 11.0000;
  const maxLat = 11.0400;
  const minLng = 76.9350;
  const maxLng = 77.0100;

  const getSvgCoordinates = (lat: number, lng: number) => {
    // Map lng to X (0 to 800), lat to Y (inverted: higher lat is further north/up)
    const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
    const clampedLng = Math.max(minLng, Math.min(maxLng, lng));
    const x = ((clampedLng - minLng) / (maxLng - minLng)) * 700 + 50;
    const y = 450 - ((clampedLat - minLat) / (maxLat - minLat)) * 380 - 30;
    return { x, y };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Civic Hotspots & Geospatial Jurisdiction Map</span>
          </h2>
          <p className="text-xs text-slate-700">
            Privacy-conscious municipal coordinate mapping. Clustered by ward, zone, and verified urgency.
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-700">Filter Urgency:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
          >
            <option value="all">All Priorities ({complaints.length})</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
          </select>
        </div>
      </div>

      {/* Main Map + Hotspots Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Interactive Geospatial Canvas (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-md border border-slate-800 text-white flex flex-col justify-between relative overflow-hidden min-h-[460px]">
          
          {/* Map Title & Legend */}
          <div className="flex items-center justify-between z-10 mb-2">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 block">
                METRO JURISDICTION: COIMBATORE CORPORATION
              </span>
              <span className="text-[11px] text-slate-400">
                Grid: 11.00°N - 11.04°N, 76.94°E - 77.01°E
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Medium/Low</span>
              </div>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative w-full h-[360px] bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <svg viewBox="0 0 800 450" className="w-full h-full">
              {/* Background Road Grid Lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="800" height="450" fill="url(#grid)" />

              {/* Major Roads Lines Representation (Avinashi Rd, Mettupalayam Rd, Cross Cut) */}
              <path d="M 50 250 L 750 180" stroke="#334155" strokeWidth="3" strokeDasharray="6,4" />
              <path d="M 400 40 L 350 420" stroke="#334155" strokeWidth="3" strokeDasharray="6,4" />
              <path d="M 200 320 L 650 100" stroke="#334155" strokeWidth="2" />

              {/* Road labels */}
              <text x="620" y="170" fill="#64748b" fontSize="10" fontFamily="sans-serif">Avinashi Road</text>
              <text x="360" y="60" fill="#64748b" fontSize="10" fontFamily="sans-serif">Mettupalayam Road</text>
              <text x="210" y="340" fill="#64748b" fontSize="10" fontFamily="sans-serif">Cross Cut Commercial</text>

              {/* Ward Boundaries (Polygons) */}
              <polygon points="100,120 320,100 300,280 120,290" fill="#0f172a" stroke="#1e293b" strokeWidth="1" opacity="0.6" />
              <text x="180" y="200" fill="#475569" fontSize="11" fontWeight="bold">WARD 35 (Gandhipuram)</text>

              <polygon points="340,90 550,70 540,240 330,260" fill="#0f172a" stroke="#1e293b" strokeWidth="1" opacity="0.6" />
              <text x="400" y="160" fill="#475569" fontSize="11" fontWeight="bold">WARD 46 (Peelamedu)</text>

              <polygon points="120,300 300,290 280,430 110,420" fill="#0f172a" stroke="#1e293b" strokeWidth="1" opacity="0.6" />
              <text x="160" y="370" fill="#475569" fontSize="11" fontWeight="bold">WARD 24 (RS Puram)</text>

              {/* Complaint Markers */}
              {filtered.map((c) => {
                const { x, y } = getSvgCoordinates(c.location.latitude, c.location.longitude);
                const isSelected = selectedPin?.id === c.id;
                const color = c.priority === 'critical' ? '#f43f5e' : c.priority === 'high' ? '#f59e0b' : '#10b981';

                return (
                  <g 
                    key={c.id} 
                    transform={`translate(${x}, ${y})`}
                    onClick={() => setSelectedPin(c)}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    {/* Pulsing ring for critical */}
                    {c.priority === 'critical' && (
                      <circle r="18" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.6">
                        <animate attributeName="r" values="8;22;8" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Pin body */}
                    <circle 
                      r={isSelected ? 10 : 7} 
                      fill={color} 
                      stroke="#ffffff" 
                      strokeWidth={isSelected ? "2.5" : "1.5"} 
                    />

                    {/* Ref text above pin */}
                    <text 
                      x="0" 
                      y="-12" 
                      fill="#ffffff" 
                      fontSize="9" 
                      textAnchor="middle" 
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {c.referenceNumber}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Map Footer Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
            <span>Click any marker to inspect complaint details & dispatch state.</span>
            <span className="font-mono">{filtered.length} Locations Tagged</span>
          </div>
        </div>

        {/* Selected Complaint Detail / Ward Hotspot Summary (1 col) */}
        <div className="space-y-4">
          
          {/* Selected Pin Card */}
          {selectedPin ? (
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedPin.referenceNumber}
                </span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                  selectedPin.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                  selectedPin.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedPin.priority} Urgency
                </span>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm line-clamp-2">
                  {selectedPin.title}
                </h4>
                <p className="text-slate-600 text-xs mt-1">
                  {selectedPin.location.address}
                </p>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-900 truncate">
                    {selectedPin.routing.assignedDepartment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery Status:</span>
                  <span className="font-semibold text-emerald-800 capitalize">
                    {selectedPin.delivery.status}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onSelectComplaint(selectedPin.id)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Track & Manage Complaint</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center text-slate-500 text-xs shadow-xs">
              <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No Pin Selected</p>
              <p className="mt-1">Click any circle on the geospatial map to view details.</p>
            </div>
          )}

          {/* Ward Density Hotspots List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>Ward Grievance Concentration</span>
            </h4>

            <div className="space-y-2 text-xs">
              {Object.entries(wardHotspots).map(([wardName, data]) => (
                <div key={wardName} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 block">{wardName}</span>
                    <span className="text-[10px] text-slate-500">
                      Primary issues: {data.categories.map((c) => c.replace('_', ' ')).slice(0, 2).join(', ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 text-sm block">{data.count}</span>
                    {data.critical > 0 && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                        {data.critical} Critical
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
