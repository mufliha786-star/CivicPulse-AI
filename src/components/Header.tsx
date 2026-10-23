import React from 'react';
import { 
  Building2, 
  Smartphone, 
  LayoutDashboard, 
  MapPin, 
  FolderKanban, 
  FileSpreadsheet, 
  Code2, 
  RefreshCw
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'citizen' | 'dashboard' | 'map' | 'directory' | 'reports';
  onSelectTab: (tab: 'citizen' | 'dashboard' | 'map' | 'directory' | 'reports') => void;
  onTriggerSLAWorker: () => void;
  isTriggeringSLA: boolean;
  onOpenCodeModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onTriggerSLAWorker,
  isTriggeringSLA,
  onOpenCodeModal
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-40 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">CivicPulse AI</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Live System Active
                </span>
              </div>
              <p className="text-xs text-slate-700 hidden sm:block">
                Multilingual AI Complaint Routing, Verified Gateway Delivery & Escalation
              </p>
            </div>
          </div>

          {/* Right Status & Background Worker Controls */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Run SLA Worker Button */}
            <button
              onClick={onTriggerSLAWorker}
              disabled={isTriggeringSLA}
              title="Runs background job: detects overdue acknowledgements and escalates breached SLAs to Tier-2 District Commissioner"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isTriggeringSLA ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Trigger SLA Worker</span>
            </button>

            {/* View Architecture & Code Modal Trigger */}
            <button
              onClick={onOpenCodeModal}
              title="Inspect system architecture, FastAPI backend files, and Flutter codebase"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
            >
              <Code2 className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline">Code & Specs</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs - Focused Exclusively on the Working Applications */}
        <div className="flex items-center space-x-1 overflow-x-auto border-t border-slate-100 py-1 no-scrollbar text-sm">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            <span>Authority Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('citizen')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'citizen'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Citizen App (Tamil & English)</span>
          </button>

          <button
            onClick={() => onSelectTab('map')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'map'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Civic Hotspots</span>
          </button>

          <button
            onClick={() => onSelectTab('directory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'directory'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Authority Directory & Routing</span>
          </button>

          <button
            onClick={() => onSelectTab('reports')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition-colors whitespace-nowrap cursor-pointer ${
              currentTab === 'reports'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reports & Exports</span>
          </button>
        </div>
      </div>
    </header>
  );
};
