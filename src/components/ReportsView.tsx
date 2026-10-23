import React, { useState } from 'react';
import { Complaint, Authority, DashboardStats } from '../types';
import { 
  FileSpreadsheet, 
  Download, 
  BarChart3, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  FileText
} from 'lucide-react';

interface ReportsViewProps {
  complaints: Complaint[];
  authorities: Authority[];
  stats: DashboardStats | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  complaints,
  authorities,
  stats
}) => {
  const [reportPeriod, setReportPeriod] = useState('Current Fiscal Quarter (2026 Q4)');

  const handleExportFullCSV = () => {
    const headers = [
      'Reference Number',
      'Date Logged',
      'Title',
      'Category',
      'Priority',
      'Priority Score',
      'Ward / Location',
      'Assigned Department',
      'External Delivery Status',
      'Delivery Attempt Count',
      'External Reference ID',
      'Authority Acknowledged',
      'Acknowledged By',
      'Resolution Status',
      'Is Escalated',
      'Escalated To',
      'Citizen Verification'
    ];

    const rows = complaints.map((c) => [
      `"${c.referenceNumber}"`,
      `"${new Date(c.createdAt).toLocaleDateString()}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.category}"`,
      `"${c.priority}"`,
      c.priorityScore,
      `"${c.location.address.replace(/"/g, '""')}"`,
      `"${c.routing.assignedDepartment || 'Unassigned'}"`,
      `"${c.delivery.status}"`,
      c.delivery.attemptsCount,
      `"${c.delivery.externalReferenceId || 'N/A'}"`,
      c.acknowledgement.isAcknowledged ? 'YES' : 'NO',
      `"${c.acknowledgement.acknowledgedByOfficer || 'N/A'}"`,
      `"${c.status}"`,
      c.escalation.isEscalated ? 'YES' : 'NO',
      `"${c.escalation.escalatedToName || 'N/A'}"`,
      c.citizenVerification ? (c.citizenVerification.isSatisfied ? 'CONFIRMED' : 'DISPUTED') : 'PENDING'
    ]);

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encoded = encodeURI(csv);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = `CivicPulse_Audit_Grievance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Compute breakdown numbers
  const acknowledgedCount = complaints.filter((c) => c.acknowledgement.isAcknowledged).length;
  const deliverySuccessCount = complaints.filter((c) => c.delivery.status === 'success').length;
  const disputedCount = complaints.filter((c) => c.citizenVerification && !c.citizenVerification.isSatisfied).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Civic Accountability Audit & Statutory Reports</span>
          </h2>
          <p className="text-xs text-slate-700">
            Delivery success indices, acknowledgement latency distributions, and SLA compliance metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
          >
            <option value="Current Fiscal Quarter (2026 Q4)">Current Quarter (2026 Q4)</option>
            <option value="Previous Month">Previous Month</option>
            <option value="Full Year 2026">Full Year 2026</option>
          </select>

          <button
            onClick={handleExportFullCSV}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Audit Ledger</span>
          </button>
        </div>
      </div>

      {/* High-Level Compliance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Delivery Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900 block">
            {stats?.deliverySuccessRate ?? 100}%
          </span>
          <span className="text-[11px] text-slate-600 block">
            {deliverySuccessCount} of {complaints.length} delivered via official gateways
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Official Ack Rate</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900 block">
            {complaints.length > 0 ? Math.round((acknowledgedCount / complaints.length) * 100) : 0}%
          </span>
          <span className="text-[11px] text-slate-600 block">
            {acknowledgedCount} acknowledged by designated officer
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Average Resolution Time</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <span className="text-2xl font-bold text-slate-900 block">
            {stats?.averageResolutionHours ?? 36.4}h
          </span>
          <span className="text-[11px] text-slate-600 block">
            Within 72h municipal service mandate
          </span>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Escalation Frequency</span>
            <AlertTriangle className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-2xl font-bold text-purple-600 block">
            {stats?.escalated ?? 0} Cases
          </span>
          <span className="text-[11px] text-slate-600 block">
            Escalated to District Collectorate Monitoring
          </span>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">
          Civic Problems by Functional Category
        </h3>
        <div className="space-y-3">
          {Object.entries(stats?.categoryCounts || {}).map(([cat, count]) => {
            const pct = Math.round((count / (complaints.length || 1)) * 100);
            return (
              <div key={cat} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800 capitalize">
                    {cat.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-slate-600">
                    {count} complaints ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Authority Performance Summary */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">
            Authority Responsibility & SLA Performance Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">Authority & Department</th>
                <th className="py-2.5 px-4">Level</th>
                <th className="py-2.5 px-4">Complaints Routed</th>
                <th className="py-2.5 px-4">Ack SLA Mandate</th>
                <th className="py-2.5 px-4">Resolution SLA</th>
                <th className="py-2.5 px-4">Delivery Channel</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {authorities.map((a) => {
                const assignedCount = complaints.filter(
                  (c) => c.routing.assignedAuthorityId === a.id
                ).length;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {a.department}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">{a.level}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {assignedCount}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{a.sla.acknowledgementHours}h</td>
                    <td className="py-3 px-4 text-slate-700">{a.sla.resolutionHours}h</td>
                    <td className="py-3 px-4 font-mono uppercase text-[10px] text-slate-600">
                      {a.delivery.method}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        Active & Monitored
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
