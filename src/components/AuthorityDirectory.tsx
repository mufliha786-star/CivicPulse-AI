import React, { useState } from 'react';
import { Authority } from '../types';
import { createAuthority } from '../services/api';
import { 
  Building2, 
  Plus, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  ExternalLink, 
  Download, 
  Upload, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

interface AuthorityDirectoryProps {
  authorities: Authority[];
  onRefresh: () => void;
}

export const AuthorityDirectory: React.FC<AuthorityDirectoryProps> = ({
  authorities,
  onRefresh
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState<Authority | null>(null);

  // New Authority Form
  const [name, setName] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [department, setDepartment] = useState('');
  const [departmentTa, setDepartmentTa] = useState('');
  const [level, setLevel] = useState<'municipal' | 'district' | 'state'>('municipal');
  const [categories, setCategories] = useState('roads_potholes, streetlights');
  const [city, setCity] = useState('Coimbatore');
  const [wards, setWards] = useState('Ward 12, Ward 13, Ward 35');
  const [officialName, setOfficialName] = useState('');
  const [designation, setDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'rest_api' | 'email_gateway' | 'webhook' | 'internal_dashboard'>('rest_api');
  const [endpoint, setEndpoint] = useState('');
  const [ackHours, setAckHours] = useState(24);
  const [resHours, setResHours] = useState(72);
  const [dataSource, setDataSource] = useState('Municipal E-Governance Directory 2026 (Sample Data)');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createAuthority({
        name,
        nameTa: nameTa || name,
        level,
        department,
        departmentTa: departmentTa || department,
        categories: categories.split(',').map((c) => c.trim()),
        jurisdiction: {
          state: 'Tamil Nadu',
          district: 'Coimbatore',
          city,
          wards: wards.split(',').map((w) => w.trim())
        },
        contact: {
          officialName,
          designation,
          email,
          phone,
          address: `${city} Municipal Office`
        },
        delivery: {
          method: deliveryMethod,
          endpoint,
          authType: 'bearer',
          isVerified: true,
          lastVerifiedDate: new Date().toISOString().split('T')[0]
        },
        sla: {
          acknowledgementHours: Number(ackHours),
          resolutionHours: Number(resHours)
        },
        isVerified: true,
        dataSource,
        isActive: true
      });
      setShowAddModal(false);
      onRefresh();
    } catch (e) {
      alert('Failed to add authority');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Authority ID',
      'Authority Name',
      'Level',
      'Department',
      'Responsibility Categories',
      'Jurisdiction City',
      'Delivery Method',
      'Delivery Endpoint',
      'Ack SLA (Hours)',
      'Resolution SLA (Hours)',
      'Is Verified',
      'Data Source'
    ];

    const rows = authorities.map((a) => [
      `"${a.id}"`,
      `"${a.name}"`,
      `"${a.level}"`,
      `"${a.department}"`,
      `"${a.categories.join(';')}"`,
      `"${a.jurisdiction.city}"`,
      `"${a.delivery.method}"`,
      `"${a.delivery.endpoint}"`,
      a.sla.acknowledgementHours,
      a.sla.resolutionHours,
      a.isVerified ? 'VERIFIED' : 'UNVERIFIED',
      `"${a.dataSource}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CivicPulse_Authorities_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>Civic Authority Directory & Routing Matrix</span>
          </h2>
          <p className="text-xs text-slate-700">
            Government departments, jurisdiction boundaries, delivery endpoints, and service-level agreements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Authority</span>
          </button>
        </div>
      </div>

      {/* Directory Disclaimer */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <span>
          Directory entries are tagged with their data source and verification status. Demonstration records are clearly marked. Live government delivery occurs only via authorized municipal gateways.
        </span>
      </div>

      {/* Authorities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {authorities.map((a) => (
          <div
            key={a.id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-slate-400 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  {a.level} Level
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Entity</span>
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  {a.name}
                </h3>
                <span className="text-[11px] text-slate-700 font-tamil block mt-0.5">
                  {a.nameTa}
                </span>
                <span className="text-xs font-semibold text-emerald-800 block mt-1">
                  {a.department}
                </span>
              </div>

              {/* Categories Managed */}
              <div className="flex flex-wrap gap-1 pt-1">
                {a.categories.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded capitalize"
                  >
                    {c.replace('_', ' ')}
                  </span>
                ))}
              </div>

              {/* Delivery Gateway Info */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-700">Delivery Channel:</span>
                  <span className="font-bold text-slate-900 uppercase text-[10px]">
                    {a.delivery.method.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 truncate font-mono">
                  Endpoint: {a.delivery.endpoint}
                </div>
              </div>

              {/* SLA Targets */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-700 text-[10px] block">Ack SLA</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {a.sla.acknowledgementHours} Hours
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="text-slate-700 text-[10px] block">Resolution SLA</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {a.sla.resolutionHours} Hours
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with Contact & Source */}
            <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{a.contact.email}</span>
              </div>
              <div className="text-[10px] text-slate-700 truncate">
                Source: {a.dataSource}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ADD AUTHORITY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                Add Verified Civic Authority Record
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Authority Name (English) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Coimbatore Traffic Infrastructure Division"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Authority Name (Tamil)
                  </label>
                  <input
                    type="text"
                    value={nameTa}
                    onChange={(e) => setNameTa(e.target.value)}
                    placeholder="எ.கா: போக்குவரத்து காவல்துறை"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-tamil"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Department Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Traffic Management"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Government Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="municipal">Municipal</option>
                    <option value="district">District</option>
                    <option value="state">State</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Responsibility Categories (comma-separated)
                </label>
                <input
                  type="text"
                  value={categories}
                  onChange={(e) => setCategories(e.target.value)}
                  placeholder="roads_potholes, streetlights, public_safety"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Delivery Mechanism
                  </label>
                  <select
                    value={deliveryMethod}
                    onChange={(e) => setDeliveryMethod(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  >
                    <option value="rest_api">REST API Endpoint</option>
                    <option value="email_gateway">Gov Email Gateway</option>
                    <option value="webhook">Signed Webhook</option>
                    <option value="internal_dashboard">Internal Dashboard Queue</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Destination Endpoint / URI
                  </label>
                  <input
                    type="text"
                    required
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://api.gateway.gov.in/tickets"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ack SLA (Hours)
                  </label>
                  <input
                    type="number"
                    value={ackHours}
                    onChange={(e) => setAckHours(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Resolution SLA (Hours)
                  </label>
                  <input
                    type="number"
                    value={resHours}
                    onChange={(e) => setResHours(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@tn.gov.in.demo"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Data Source
                  </label>
                  <input
                    type="text"
                    value={dataSource}
                    onChange={(e) => setDataSource(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Authority Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
