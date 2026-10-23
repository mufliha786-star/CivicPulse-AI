import React, { useState } from 'react';
import { 
  Complaint, 
  Authority, 
  DeliveryAttempt, 
  DashboardStats,
  ComplaintStatus,
  PriorityLevel
} from '../types';
import { 
  retryDelivery, 
  acknowledgeComplaint, 
  escalateComplaint, 
  resolveComplaint, 
  routeComplaint,
  fetchDeliveryAttempts
} from '../services/api';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  UserCheck, 
  TrendingUp, 
  Send, 
  Building2, 
  MapPin, 
  ShieldAlert, 
  FileCheck, 
  ChevronRight,
  Eye,
  Check,
  X
} from 'lucide-react';

interface AuthorityDashboardProps {
  complaints: Complaint[];
  authorities: Authority[];
  stats: DashboardStats | null;
  onRefreshComplaints: () => void;
  onSelectComplaintForCitizenView: (complaintId: string) => void;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({
  complaints,
  authorities,
  stats,
  onRefreshComplaints,
  onSelectComplaintForCitizenView
}) => {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [authorityFilter, setAuthorityFilter] = useState('all');

  // Detail Modal / Drawer
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'delivery' | 'actions' | 'audit'>('overview');
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryAttempt[]>([]);
  const [loadingDeliveryHistory, setLoadingDeliveryHistory] = useState(false);

  // Action Form States
  const [ackOfficerName, setAckOfficerName] = useState('Er. S. Murugesan (Exec Engineer)');
  const [ackOfficialRef, setAckOfficialRef] = useState('');
  const [ackNotes, setAckNotes] = useState('Acknowledged by municipal engineering section. Inspection team assigned.');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  const [resolveOfficer, setResolveOfficer] = useState('Junior Engineer M. Natarajan');
  const [resolveDesc, setResolveDesc] = useState('Bitumen patching completed. Surface rolled and restored to grade.');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const [escalateReason, setEscalateReason] = useState('Overdue response window exceeded. Escalating to District Collectorate.');
  const [isSubmittingEscalate, setIsSubmittingEscalate] = useState(false);

  const [reRouteAuthId, setReRouteAuthId] = useState('');
  const [reRouteReason, setReRouteReason] = useState('Jurisdiction re-assigned based on field review.');
  const [isSubmittingReRoute, setIsSubmittingReRoute] = useState(false);

  const [isRetryingDelivery, setIsRetryingDelivery] = useState(false);

  // Load delivery history when complaint selected
  const handleSelectComplaint = async (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setReRouteAuthId(complaint.routing.assignedAuthorityId || authorities[0].id);
    setActiveTab('overview');
    setLoadingDeliveryHistory(true);
    try {
      const attempts = await fetchDeliveryAttempts(complaint.id);
      setDeliveryHistory(attempts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDeliveryHistory(false);
    }
  };

  const handleRetryDelivery = async () => {
    if (!selectedComplaint) return;
    setIsRetryingDelivery(true);
    try {
      const res = await retryDelivery(selectedComplaint.id);
      setSelectedComplaint(res.complaint);
      onRefreshComplaints();
      const updatedAttempts = await fetchDeliveryAttempts(selectedComplaint.id);
      setDeliveryHistory(updatedAttempts);
    } catch (e) {
      alert('Delivery retry failed');
    } finally {
      setIsRetryingDelivery(false);
    }
  };

  const handleAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsSubmittingAck(true);
    try {
      const updated = await acknowledgeComplaint(selectedComplaint.id, {
        officerName: ackOfficerName,
        officialRef: ackOfficialRef || `GOV-ACK-${Date.now().toString().slice(-5)}`,
        notes: ackNotes
      });
      setSelectedComplaint(updated);
      onRefreshComplaints();
    } catch (e) {
      alert('Failed to record acknowledgement');
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsSubmittingResolve(true);
    try {
      const updated = await resolveComplaint(selectedComplaint.id, {
        officerName: resolveOfficer,
        description: resolveDesc,
        evidencePhotos: [
          'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=800&auto=format&fit=crop&q=80'
        ],
        officialNotes: 'Completed on-site civil verification.'
      });
      setSelectedComplaint(updated);
      onRefreshComplaints();
    } catch (e) {
      alert('Failed to record resolution');
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setIsSubmittingEscalate(true);
    try {
      const updated = await escalateComplaint(selectedComplaint.id, {
        reason: escalateReason,
        escalatedBy: 'manual_operator'
      });
      setSelectedComplaint(updated);
      onRefreshComplaints();
    } catch (e) {
      alert('Failed to escalate complaint');
    } finally {
      setIsSubmittingEscalate(false);
    }
  };

  const handleReRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !reRouteAuthId) return;
    setIsSubmittingReRoute(true);
    try {
      const updated = await routeComplaint(
        selectedComplaint.id,
        reRouteAuthId,
        reRouteReason,
        'Senior Municipal Superintendent'
      );
      setSelectedComplaint(updated);
      onRefreshComplaints();
    } catch (e) {
      alert('Failed to re-route');
    } finally {
      setIsSubmittingReRoute(false);
    }
  };

  // Filter complaints
  const filtered = complaints.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (authorityFilter !== 'all' && c.routing.assignedAuthorityId !== authorityFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        c.referenceNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.location.address.toLowerCase().includes(q) ||
        c.citizen.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner Notice: Clarification on Real External vs Internal Systems */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-bold">Transparent Accountability Guardrail: </span>
          <span>
            Complaints are delivered via configured adapters (Municipal API, Email Gateway, or Internal CivicPulse Queue). External delivery and authority acknowledgement are tracked as strictly separate states. Sample data is explicitly identified.
          </span>
        </div>
      </div>

      {/* KPI METRIC CARDS (Section 11) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-700 text-xs font-semibold block">Total Ingested</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {stats?.total ?? complaints.length}
          </span>
          <span className="text-[10px] text-slate-600 mt-1 block font-mono">100% Audited</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-700 text-xs font-semibold block">Awaiting Routing</span>
          <span className="text-2xl font-bold text-blue-600 mt-1 block">
            {stats?.awaitingRouting ?? 0}
          </span>
          <span className="text-[10px] text-blue-700 mt-1 block">Needs Operator Review</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-700 text-xs font-semibold block">Delivery Failed</span>
          <span className={`text-2xl font-bold mt-1 block ${
            (stats?.failedDeliveries ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'
          }`}>
            {stats?.failedDeliveries ?? 0}
          </span>
          <span className="text-[10px] text-rose-700 mt-1 block">Retry Backoff Active</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-700 text-xs font-semibold block">Awaiting Ack</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">
            {stats?.awaitingAck ?? 0}
          </span>
          <span className="text-[10px] text-amber-700 mt-1 block">Overdue SLA: {stats?.ackOverdue ?? 0}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-700 text-xs font-semibold block">Escalated (Tier-2)</span>
          <span className="text-2xl font-bold text-purple-600 mt-1 block">
            {stats?.escalated ?? 0}
          </span>
          <span className="text-[10px] text-purple-700 mt-1 block">Collectorate Monitor</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-700 text-xs font-semibold block">Resolved & Verified</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {stats?.resolved ?? 0}
          </span>
          <span className="text-[10px] text-emerald-700 mt-1 block">Avg SLA: {stats?.averageResolutionHours ?? 36}h</span>
        </div>
      </div>

      {/* FILTER BAR & SEARCH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reference, title, ward, citizen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
            >
              <option value="all">All Statuses ({complaints.length})</option>
              <option value="delivered_to_destination">Delivered to Destination</option>
              <option value="acknowledged_by_authority">Acknowledged by Authority</option>
              <option value="awaiting_routing_review">Awaiting Routing Review</option>
              <option value="delivery_failed">Delivery Failed</option>
              <option value="escalated">Escalated</option>
              <option value="resolution_awaiting_verification">Awaiting Citizen Verification</option>
              <option value="closed">Closed / Verified</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Authority Filter */}
            <select
              value={authorityFilter}
              onChange={(e) => setAuthorityFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden max-w-[200px] truncate"
            >
              <option value="all">All Authorities</option>
              {authorities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.department}
                </option>
              ))}
            </select>

            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || authorityFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setAuthorityFilter('all');
                }}
                className="text-xs text-rose-600 hover:underline px-2 py-1 font-semibold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* COMPLAINTS MANAGEMENT TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Ref & Date</th>
                <th className="py-3 px-4">Title & Problem</th>
                <th className="py-3 px-4">Category & Priority</th>
                <th className="py-3 px-4">Assigned Department</th>
                <th className="py-3 px-4">External Delivery</th>
                <th className="py-3 px-4">Official Ack</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No complaints matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr 
                    key={c.id} 
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => handleSelectComplaint(c)}
                  >
                    {/* Ref & Date */}
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 block">{c.referenceNumber}</span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3 px-4 max-w-xs">
                      <span className="font-bold text-slate-900 line-clamp-1">{c.title}</span>
                      <span className="text-slate-600 text-[11px] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{c.location.address}</span>
                      </span>
                    </td>

                    {/* Category & Priority */}
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 capitalize block">
                        {c.category.replace('_', ' ')}
                      </span>
                      <span className={`inline-block text-[10px] font-bold uppercase mt-1 px-1.5 py-0.2 rounded ${
                        c.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                        c.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {c.priority} ({c.priorityScore})
                      </span>
                    </td>

                    {/* Assigned Authority */}
                    <td className="py-3 px-4 max-w-[180px]">
                      <span className="font-semibold text-slate-900 block truncate">
                        {c.routing.assignedDepartment}
                      </span>
                      <span className="text-[10px] text-slate-600 block">
                        Confidence: {Math.round(c.routing.confidence * 100)}%
                      </span>
                    </td>

                    {/* External Delivery State */}
                    <td className="py-3 px-4">
                      {c.delivery.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Delivered</span>
                        </span>
                      ) : c.delivery.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Failed (Retrying)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Queued</span>
                        </span>
                      )}
                    </td>

                    {/* Official Ack */}
                    <td className="py-3 px-4">
                      {c.acknowledgement.isAcknowledged ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Acknowledged</span>
                        </span>
                      ) : c.acknowledgement.isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800">
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>SLA Overdue</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Pending Ack</span>
                        </span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        c.status === 'closed' ? 'bg-slate-200 text-slate-800' :
                        c.status === 'escalated' ? 'bg-purple-100 text-purple-800' :
                        c.status === 'resolution_awaiting_verification' ? 'bg-blue-100 text-blue-800' :
                        c.status === 'acknowledged_by_authority' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectComplaint(c);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium cursor-pointer"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL / DRAWER (Section 11) */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {selectedComplaint.referenceNumber}
                  </span>
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 capitalize">
                    {selectedComplaint.category.replace('_', ' ')}
                  </span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                    selectedComplaint.priority === 'critical' ? 'bg-rose-900 text-rose-200' :
                    selectedComplaint.priority === 'high' ? 'bg-amber-900 text-amber-200' :
                    'bg-emerald-900 text-emerald-200'
                  }`}>
                    {selectedComplaint.priority} Priority
                  </span>
                </div>
                <h3 className="font-bold text-base mt-1 line-clamp-1">
                  {selectedComplaint.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onSelectComplaintForCitizenView(selectedComplaint.id);
                  }}
                  title="View this complaint in Citizen App simulator"
                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded font-medium flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Citizen View</span>
                </button>
                <button
                  onClick={() => setSelectedComplaint(null)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 px-5 text-xs font-semibold bg-slate-50">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Overview & Evidence
              </button>
              <button
                onClick={() => setActiveTab('delivery')}
                className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'delivery'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Delivery Gateway & Attempts ({selectedComplaint.delivery.attemptsCount})
              </button>
              <button
                onClick={() => setActiveTab('actions')}
                className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'actions'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Administrative Actions (Ack / Resolve / Escalate)
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-3 px-4 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'audit'
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Full Audit Trail ({selectedComplaint.auditHistory.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  
                  {/* Problem Description */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                      Citizen Description:
                    </span>
                    <p className="text-slate-800 text-xs mt-1 leading-relaxed">
                      {selectedComplaint.description}
                    </p>
                    {selectedComplaint.descriptionTa && (
                      <p className="text-slate-700 text-xs mt-2 border-t border-slate-200 pt-2 font-tamil">
                        {selectedComplaint.descriptionTa}
                      </p>
                    )}
                  </div>

                  {/* AI Reasoning & Routing Card */}
                  <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wider">
                        AI Reasoning & Routing Engine Assessment
                      </span>
                      <span className="text-blue-800 font-mono font-semibold">
                        Confidence: {Math.round(selectedComplaint.routing.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-blue-800 leading-relaxed">
                      {selectedComplaint.routing.decisionReason}
                    </p>
                    <div className="text-[11px] text-blue-900 font-medium bg-blue-100/60 p-2 rounded">
                      <span className="font-bold">Priority Assessment Rationale: </span>
                      <span>{selectedComplaint.priorityExplanation}</span>
                    </div>
                  </div>

                  {/* Location & Citizen Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Geographic Jurisdiction
                      </span>
                      <div className="text-slate-800 font-medium">
                        {selectedComplaint.location.address}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Coordinates: {selectedComplaint.location.latitude}°N, {selectedComplaint.location.longitude}°E
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Ward: {selectedComplaint.location.ward || 'Coimbatore Metro'} | District: {selectedComplaint.location.district}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Complainant Information
                      </span>
                      <div className="text-slate-800 font-medium">
                        {selectedComplaint.citizen.name}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Phone: {selectedComplaint.citizen.phone}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Email: {selectedComplaint.citizen.email}
                      </div>
                    </div>
                  </div>

                  {/* Evidence Photos */}
                  {selectedComplaint.attachments.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block mb-2">
                        Attached Photographic Evidence
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selectedComplaint.attachments.map((att) => (
                          <div key={att.id} className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                            <img src={att.url} alt="Evidence" className="w-full h-32 object-cover" />
                            <div className="p-2 bg-slate-50 text-[10px] text-slate-600 truncate">
                              {att.filename}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Proof (if resolved) */}
                  {selectedComplaint.resolution && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                      <span className="font-bold text-emerald-950 uppercase tracking-wider text-[11px] block">
                        Official Resolution Record
                      </span>
                      <p className="text-emerald-900 leading-relaxed">
                        {selectedComplaint.resolution.description}
                      </p>
                      <div className="text-[11px] text-emerald-800">
                        Resolved By: {selectedComplaint.resolution.resolvedByOfficer} at{' '}
                        {new Date(selectedComplaint.resolution.resolvedAt).toLocaleString()}
                      </div>
                      {selectedComplaint.resolution.evidencePhotos[0] && (
                        <img
                          src={selectedComplaint.resolution.evidencePhotos[0]}
                          alt="Resolution Proof"
                          className="w-48 h-28 object-cover rounded-lg border border-emerald-300"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: DELIVERY ATTEMPTS & RETRIES (Section 7D) */}
              {activeTab === 'delivery' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-900 block">
                        Configured Delivery Destination
                      </span>
                      <span className="text-slate-700 block mt-0.5">
                        Target: {selectedComplaint.routing.assignedDepartment}
                      </span>
                      <span className="text-slate-600 font-mono text-[11px] block mt-0.5">
                        Receipt: {selectedComplaint.delivery.deliveryReceipt || 'Pending Gateway Dispatch'}
                      </span>
                    </div>

                    <button
                      onClick={handleRetryDelivery}
                      disabled={isRetryingDelivery}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetryingDelivery ? 'animate-spin' : ''}`} />
                      <span>{isRetryingDelivery ? 'Retrying...' : 'Dispatch / Retry Delivery'}</span>
                    </button>
                  </div>

                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                    Delivery Attempt Ledger (With HTTP Code & Receipts)
                  </span>

                  {loadingDeliveryHistory ? (
                    <div className="py-6 text-center text-slate-500">Loading delivery logs...</div>
                  ) : deliveryHistory.length === 0 ? (
                    <div className="py-6 text-center text-slate-500">No delivery attempts recorded yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {deliveryHistory.map((att) => (
                        <div key={att.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              Attempt #{att.attemptNumber} — {att.deliveryMethod.toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                              att.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              HTTP {att.httpStatus || 200} ({att.status.toUpperCase()})
                            </span>
                          </div>
                          <div className="text-slate-700">
                            Endpoint: <span className="font-mono text-slate-900">{att.destinationEndpoint}</span>
                          </div>
                          {att.externalReferenceId && (
                            <div className="text-slate-700">
                              External Reference: <span className="font-mono text-slate-900 font-bold">{att.externalReferenceId}</span>
                            </div>
                          )}
                          {att.receipt && (
                            <div className="bg-white p-2 rounded border border-slate-200 font-mono text-[10px] text-slate-700">
                              {att.receipt}
                            </div>
                          )}
                          {att.errorDetails && (
                            <div className="bg-rose-50 p-2 rounded border border-rose-200 text-rose-800 text-[11px]">
                              Error: {att.errorDetails}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-600">
                            Timestamp: {new Date(att.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ADMINISTRATIVE ACTIONS */}
              {activeTab === 'actions' && (
                <div className="space-y-5">
                  
                  {/* Action 1: Record Authority Acknowledgement (Section 7E) */}
                  <form onSubmit={handleAcknowledge} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                        1. Record Official Authority Acknowledgement
                      </span>
                      {selectedComplaint.acknowledgement.isAcknowledged && (
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Already Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Records official receipt by the designated department officer. Separate from external delivery.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Officer Name & Title
                        </label>
                        <input
                          type="text"
                          value={ackOfficerName}
                          onChange={(e) => setAckOfficerName(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Official Reference / Ticket #
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. CCMC-ACK-2026-9921"
                          value={ackOfficialRef}
                          onChange={(e) => setAckOfficialRef(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Acknowledgement Notes
                      </label>
                      <input
                        type="text"
                        value={ackNotes}
                        onChange={(e) => setAckNotes(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingAck}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded font-semibold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAck ? 'Saving...' : 'Record Formal Acknowledgement'}
                    </button>
                  </form>

                  {/* Action 2: Record Resolution (Section 13) */}
                  <form onSubmit={handleResolve} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                      2. Record Field Work Completion & Resolution
                    </span>
                    <p className="text-slate-600 text-[11px]">
                      Records engineering repair details and moves complaint to "Awaiting Citizen Verification".
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Resolving Officer Name
                        </label>
                        <input
                          type="text"
                          value={resolveOfficer}
                          onChange={(e) => setResolveOfficer(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Work Description
                        </label>
                        <input
                          type="text"
                          value={resolveDesc}
                          onChange={(e) => setResolveDesc(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingResolve}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-semibold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingResolve ? 'Recording...' : 'Submit Resolution Proof'}
                    </button>
                  </form>

                  {/* Action 3: Re-Route to Different Authority */}
                  <form onSubmit={handleReRoute} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                      3. Override or Re-Assign Responsible Authority
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Select New Authority
                        </label>
                        <select
                          value={reRouteAuthId}
                          onChange={(e) => setReRouteAuthId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          {authorities.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.department} ({a.level})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Reason for Re-Routing
                        </label>
                        <input
                          type="text"
                          value={reRouteReason}
                          onChange={(e) => setReRouteReason(e.target.value)}
                          required
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingReRoute}
                      className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-semibold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReRoute ? 'Updating...' : 'Confirm Re-Routing'}
                    </button>
                  </form>

                  {/* Action 4: Escalate to Higher Authority (Section 7G) */}
                  <form onSubmit={handleEscalate} className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 space-y-3">
                    <span className="font-bold text-rose-900 text-xs uppercase tracking-wider block">
                      4. Escalate Complaint to Tier-2 Collectorate Cell
                    </span>
                    <p className="text-rose-800 text-[11px]">
                      Transfers oversight to the District Magistrate & Corporation Commissioner. Records escalation reason.
                    </p>
                    <input
                      type="text"
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded text-xs"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingEscalate}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded font-semibold text-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingEscalate ? 'Escalating...' : 'Trigger Immediate Escalation'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: AUDIT HISTORY */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                    Immutable Audit Trail
                  </span>
                  <div className="space-y-2">
                    {selectedComplaint.auditHistory.map((item) => (
                      <div key={item.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{item.action}</span>
                          <span className="text-[10px] text-slate-600 font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-700 text-[11px]">
                          Actor: <span className="font-semibold">{item.actor}</span> ({item.actorRole})
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {item.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
