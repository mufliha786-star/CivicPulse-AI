import {
  Complaint,
  Authority,
  DeliveryAttempt,
  DashboardStats,
  AIAnalysisResult,
  ComplaintCategory,
  PriorityLevel,
  ComplaintStatus
} from '../types';

export const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; geminiEnabled: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchAuthorities(): Promise<Authority[]> {
  const res = await fetch(`${API_BASE}/authorities`);
  return res.json();
}

export async function createAuthority(auth: Partial<Authority>): Promise<Authority> {
  const res = await fetch(`${API_BASE}/authorities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(auth),
  });
  return res.json();
}

export async function fetchComplaints(params?: {
  category?: string;
  priority?: string;
  status?: string;
  search?: string;
  authorityId?: string;
}): Promise<Complaint[]> {
  const url = new URL(`${window.location.origin}${API_BASE}/complaints`);
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        url.searchParams.append(key, val);
      }
    });
  }
  const res = await fetch(url.toString());
  return res.json();
}

export async function fetchComplaintById(id: string): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}`);
  if (!res.ok) throw new Error('Complaint not found');
  return res.json();
}

export async function analyzeComplaintWithAI(data: {
  title: string;
  description: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  userCategory?: string;
  preferredLanguage?: 'en' | 'ta';
}): Promise<AIAnalysisResult> {
  const res = await fetch(`${API_BASE}/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function translateText(
  text: string,
  targetLang: 'en' | 'ta'
): Promise<string> {
  const res = await fetch(`${API_BASE}/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLang }),
  });
  const data = await res.json();
  return data.translatedText || text;
}

export async function createComplaint(payload: {
  title: string;
  titleTa?: string;
  description: string;
  descriptionTa?: string;
  category: string;
  language?: 'en' | 'ta';
  location: {
    address: string;
    landmark?: string;
    city: string;
    district: string;
    state: string;
    ward?: string;
    latitude: number;
    longitude: number;
  };
  attachments?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    filename: string;
  }[];
  citizen?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
}): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit complaint');
  }
  return res.json();
}

export async function routeComplaint(
  id: string,
  authorityId: string,
  reason: string,
  actorName = 'Admin Operator'
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorityId, reason, actorName }),
  });
  return res.json();
}

export async function retryDelivery(id: string): Promise<{ complaint: Complaint; attempt: DeliveryAttempt }> {
  const res = await fetch(`${API_BASE}/complaints/${id}/deliver`, {
    method: 'POST',
  });
  return res.json();
}

export async function acknowledgeComplaint(
  id: string,
  payload: {
    officerName: string;
    officialRef?: string;
    notes?: string;
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function escalateComplaint(
  id: string,
  payload: {
    reason: string;
    targetAuthorityId?: string;
    escalatedBy?: 'automatic_sla_worker' | 'manual_operator';
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function resolveComplaint(
  id: string,
  payload: {
    officerName: string;
    description: string;
    evidencePhotos?: string[];
    officialNotes?: string;
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function verifyResolution(
  id: string,
  payload: {
    isSatisfied: boolean;
    feedback?: string;
    disputeReason?: string;
  }
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchDeliveryAttempts(complaintId?: string): Promise<DeliveryAttempt[]> {
  const url = complaintId
    ? `${API_BASE}/delivery-attempts?complaintId=${encodeURIComponent(complaintId)}`
    : `${API_BASE}/delivery-attempts`;
  const res = await fetch(url);
  return res.json();
}

export async function triggerDeadlineWorker(): Promise<{
  checkedComplaints: number;
  escalatedCount: number;
  markedOverdueCount: number;
}> {
  const res = await fetch(`${API_BASE}/workers/check-deadlines`, {
    method: 'POST',
  });
  return res.json();
}
