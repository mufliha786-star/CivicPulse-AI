export type ComplaintCategory =
  | 'roads_potholes'
  | 'water_supply'
  | 'drainage_sewage'
  | 'garbage_collection'
  | 'streetlights'
  | 'public_sanitation'
  | 'electricity_infrastructure'
  | 'encroachment'
  | 'public_safety'
  | 'other_civic_issues';

export type ComplaintStatus =
  | 'draft'
  | 'submitted_internal'
  | 'awaiting_authority_routing'
  | 'awaiting_routing_review'
  | 'ready_for_delivery'
  | 'delivery_pending'
  | 'delivery_failed'
  | 'delivered_to_destination'
  | 'awaiting_authority_acknowledgement'
  | 'acknowledged_by_authority'
  | 'in_progress'
  | 'resolved'
  | 'resolution_awaiting_verification'
  | 'closed'
  | 'escalated';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Authority {
  id: string;
  name: string;
  nameTa: string;
  level: 'municipal' | 'district' | 'state' | 'central';
  department: string;
  departmentTa: string;
  categories: string[];
  jurisdiction: {
    state: string;
    district: string;
    city: string;
    wards: string[];
  };
  contact: {
    officialName: string;
    designation: string;
    email: string;
    phone: string;
    address: string;
  };
  delivery: {
    method: 'rest_api' | 'email_gateway' | 'webhook' | 'internal_dashboard';
    endpoint: string;
    authType: 'bearer' | 'basic' | 'internal';
    isVerified: boolean;
    lastVerifiedDate: string;
  };
  sla: {
    acknowledgementHours: number;
    resolutionHours: number;
  };
  escalationAuthorityId?: string;
  isVerified: boolean;
  dataSource: string;
  isActive: boolean;
}

export interface DeliveryAttempt {
  id: string;
  complaintId: string;
  destinationAuthorityId: string;
  destinationName: string;
  destinationEndpoint: string;
  deliveryMethod: string;
  attemptNumber: number;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  httpStatus?: number;
  externalReferenceId?: string;
  receipt?: string;
  errorDetails?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: 'citizen' | 'system' | 'authority_officer' | 'superadmin';
  details: string;
}

export interface Complaint {
  id: string;
  referenceNumber: string;
  title: string;
  titleTa?: string;
  description: string;
  descriptionTa?: string;
  category: string;
  status: ComplaintStatus;
  priority: PriorityLevel;
  priorityExplanation: string;
  priorityScore: number;
  language: 'en' | 'ta';
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
  attachments: {
    id: string;
    type: 'image' | 'video' | 'audio';
    url: string;
    filename: string;
  }[];
  citizen: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  routing: {
    recommendedAuthorityId?: string;
    assignedAuthorityId?: string;
    assignedDepartment?: string;
    confidence: number;
    decisionReason: string;
    jurisdictionMatch: boolean;
    requiresHumanReview: boolean;
    routingTimestamp: string;
  };
  delivery: {
    status: 'not_dispatched' | 'pending' | 'success' | 'failed';
    attemptsCount: number;
    lastAttemptId?: string;
    lastAttemptTimestamp?: string;
    externalReferenceId?: string;
    deliveryReceipt?: string;
  };
  acknowledgement: {
    isAcknowledged: boolean;
    acknowledgedAt?: string;
    acknowledgedByOfficer?: string;
    officialReferenceNumber?: string;
    notes?: string;
    deadlineTimestamp: string;
    isOverdue: boolean;
  };
  deadlines: {
    acknowledgementDeadline: string;
    resolutionDeadline: string;
    isResolutionOverdue: boolean;
  };
  escalation: {
    isEscalated: boolean;
    escalatedAt?: string;
    escalationLevel: number;
    escalatedToAuthorityId?: string;
    escalatedToName?: string;
    reason?: string;
    escalatedBy: 'automatic_sla_worker' | 'manual_operator';
  };
  resolution?: {
    resolvedAt: string;
    resolvedByOfficer: string;
    description: string;
    evidencePhotos: string[];
    officialNotes: string;
  };
  citizenVerification?: {
    verifiedAt?: string;
    isSatisfied: boolean;
    feedback?: string;
    disputeReason?: string;
  };
  auditHistory: AuditLogItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysisResult {
  predictedCategory: string;
  categoryConfidence: number;
  detectedLanguage: 'en' | 'ta';
  translatedSummary: string;
  extractedKeywords: string[];
  extractedLocation?: string;
  priority: PriorityLevel;
  priorityScore: number;
  priorityExplanation: string;
  recommendedDepartment: string;
  recommendedAuthorityId?: string;
  routingConfidence: number;
  routingExplanation: string;
  isAmbiguous: boolean;
  missingInformationWarning?: string;
  duplicateWarning?: {
    isPossibleDuplicate: boolean;
    existingComplaintRef?: string;
    similarityScore: number;
    reason: string;
  };
}

export interface DashboardStats {
  total: number;
  awaitingRouting: number;
  readyForDelivery: number;
  failedDeliveries: number;
  delivered: number;
  awaitingAck: number;
  ackOverdue: number;
  inProgress: number;
  resolutionOverdue: number;
  escalated: number;
  resolved: number;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<PriorityLevel, number>;
  deliverySuccessRate: number;
  averageResolutionHours: number;
}
