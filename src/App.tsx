import React, { useState, useEffect } from 'react';
import { 
  fetchHealth, 
  fetchStats, 
  fetchComplaints, 
  fetchAuthorities, 
  triggerDeadlineWorker 
} from './services/api';
import { Complaint, Authority, DashboardStats } from './types';
import { Header } from './components/Header';
import { CitizenApp } from './components/CitizenApp';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { CivicHotspotMap } from './components/CivicHotspotMap';
import { AuthorityDirectory } from './components/AuthorityDirectory';
import { ReportsView } from './components/ReportsView';
import { CodeExportView } from './components/CodeExportView';
import { X, Code2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'citizen' | 'dashboard' | 'map' | 'directory' | 'reports'>('dashboard');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [isTriggeringSLA, setIsTriggeringSLA] = useState<boolean>(false);
  const [workerNotification, setWorkerNotification] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [healthData, statsData, complaintsData, authoritiesData] = await Promise.all([
        fetchHealth().catch(() => ({ status: 'ok', geminiEnabled: true })),
        fetchStats().catch(() => null),
        fetchComplaints().catch(() => []),
        fetchAuthorities().catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setComplaints(complaintsData);
      setAuthorities(authoritiesData);
    } catch (e) {
      console.error('Failed to load application data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh stats every 15 seconds
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleTriggerSLAWorker = async () => {
    setIsTriggeringSLA(true);
    try {
      const res = await triggerDeadlineWorker();
      setWorkerNotification(
        `SLA Background Worker: Evaluated ${res.checkedComplaints} grievances. Flagged ${res.markedOverdueCount} as acknowledgement-overdue; escalated ${res.escalatedCount} breached cases to Tier-2 District Collectorate.`
      );
      await loadData();
      setTimeout(() => setWorkerNotification(null), 8000);
    } catch (e) {
      alert('Failed to trigger SLA worker');
    } finally {
      setIsTriggeringSLA(false);
    }
  };

  const handleSelectComplaintForCitizenView = (complaintId: string) => {
    setSelectedComplaintId(complaintId);
    setCurrentTab('citizen');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased">
      {/* Header Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onTriggerSLAWorker={handleTriggerSLAWorker}
        isTriggeringSLA={isTriggeringSLA}
        onOpenCodeModal={() => setShowCodeModal(true)}
      />

      {/* SLA Worker Toast Notification */}
      {workerNotification && (
        <div className="bg-purple-900 text-white text-xs px-4 py-2.5 flex items-center justify-between border-b border-purple-800 animate-fadeIn">
          <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
            <span className="font-medium">{workerNotification}</span>
            <button
              onClick={() => setWorkerNotification(null)}
              className="ml-4 text-purple-300 hover:text-white font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 pb-12">
        {loading ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">
              Connecting to CivicPulse AI Engine & Authority Directory...
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <AuthorityDashboard
                complaints={complaints}
                authorities={authorities}
                stats={stats}
                onRefreshComplaints={loadData}
                onSelectComplaintForCitizenView={handleSelectComplaintForCitizenView}
              />
            )}

            {currentTab === 'citizen' && (
              <CitizenApp
                complaints={complaints}
                onRefreshComplaints={loadData}
                selectedComplaintId={selectedComplaintId}
              />
            )}

            {currentTab === 'map' && (
              <CivicHotspotMap
                complaints={complaints}
                onSelectComplaint={handleSelectComplaintForCitizenView}
              />
            )}

            {currentTab === 'directory' && (
              <AuthorityDirectory
                authorities={authorities}
                onRefresh={loadData}
              />
            )}

            {currentTab === 'reports' && (
              <ReportsView
                complaints={complaints}
                authorities={authorities}
                stats={stats}
              />
            )}
          </>
        )}
      </main>

      {/* Code Repository & Architecture Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">System Source Code Repository & Architecture</h3>
              </div>
              <button
                onClick={() => setShowCodeModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
              <CodeExportView />
            </div>
            <div className="bg-slate-100 px-5 py-2.5 border-t border-slate-200 text-right">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close & Return to Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            CivicPulse AI — Multilingual Civic Grievance Routing & Statutory Accountability System
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCodeModal(true)}
              className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
            >
              View Backend & Flutter Source Files
            </button>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-[11px] text-slate-400">
              Coimbatore Corporation • TWAD Board • TANGEDCO • District Collectorate
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
