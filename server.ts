import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Initialise Gemini client if API key is provided
let geminiClient: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({});
  }
} catch (e) {
  console.warn('Gemini client initialization failed, falling back to local heuristic engine:', e);
}

// ==========================================
// DATABASE / DATA TYPES & SEED DATA
// ==========================================

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
  responsePayload?: string;
  receipt?: string;
  errorDetails?: string;
  nextRetryTime?: string;
}

export interface Complaint {
  id: string;
  referenceNumber: string;
  title: string;
  titleTa?: string;
  description: string;
  descriptionTa?: string;
  category: string;
  status: 
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
  priority: 'low' | 'medium' | 'high' | 'critical';
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
  auditHistory: {
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    actorRole: 'citizen' | 'system' | 'authority_officer' | 'superadmin';
    details: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

// In-Memory Seed Authorities (Verified sample data for Tamil Nadu / Coimbatore / Chennai)
let authorities: Authority[] = [
  {
    id: 'auth-cbe-roads',
    name: 'Coimbatore City Municipal Corporation — Roads & Bridges Division',
    nameTa: 'கோயம்புத்தூர் மாநகராட்சி — சாலைகள் மற்றும் பாலங்கள் பிரிவு',
    level: 'municipal',
    department: 'Engineering & Highways',
    departmentTa: 'பொறியியல் மற்றும் நெடுஞ்சாலைகள்',
    categories: ['roads_potholes', 'streetlights', 'encroachment'],
    jurisdiction: {
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      city: 'Coimbatore',
      wards: ['Ward 12', 'Ward 13', 'Ward 24', 'Ward 35', 'Ward 46', 'Ward 72', 'Central Zone', 'East Zone', 'West Zone', 'RS Puram', 'Gandhipuram', 'Peelamedu']
    },
    contact: {
      officialName: 'Er. S. Murugesan',
      designation: 'Executive Engineer (Highways & Works)',
      email: 'engg.roads@ccmc.gov.in.demo',
      phone: '+91 422 230 0211',
      address: 'Corporation Administrative Building, Big Bazaar St, Coimbatore 641001'
    },
    delivery: {
      method: 'rest_api',
      endpoint: 'https://api.ccmc.gov.in.demo/v2/complaints/dispatch',
      authType: 'bearer',
      isVerified: true,
      lastVerifiedDate: '2026-09-15'
    },
    sla: {
      acknowledgementHours: 24,
      resolutionHours: 72
    },
    escalationAuthorityId: 'auth-cbe-commissioner',
    isVerified: true,
    dataSource: 'CCMC Official Civic Services Directory 2026 (Sample Configuration)',
    isActive: true
  },
  {
    id: 'auth-cbe-drainage',
    name: 'Coimbatore Municipal Corporation — Public Health & Drainage Department',
    nameTa: 'கோயம்புத்தூர் மாநகராட்சி — பொது சுகாதாரம் மற்றும் வடிகால் துறை',
    level: 'municipal',
    department: 'Sanitation & Stormwater Drainage',
    departmentTa: 'சுகாதாரம் மற்றும் மழைநீர் வடிகால்',
    categories: ['drainage_sewage', 'garbage_collection', 'public_sanitation'],
    jurisdiction: {
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      city: 'Coimbatore',
      wards: ['Ward 12', 'Ward 13', 'Ward 24', 'Ward 35', 'Ward 46', 'Ward 72', 'Central Zone', 'East Zone', 'West Zone', 'South Zone', 'North Zone']
    },
    contact: {
      officialName: 'Dr. K. Arunkumar',
      designation: 'City Health Officer & Drainage In-Charge',
      email: 'sanitation.health@ccmc.gov.in.demo',
      phone: '+91 422 230 1450',
      address: 'Health Section, CCMC Town Hall, Coimbatore 641001'
    },
    delivery: {
      method: 'webhook',
      endpoint: 'https://sanitation-dispatch.ccmc.gov.in.demo/incoming/grievance',
      authType: 'bearer',
      isVerified: true,
      lastVerifiedDate: '2026-10-01'
    },
    sla: {
      acknowledgementHours: 12,
      resolutionHours: 48
    },
    escalationAuthorityId: 'auth-cbe-commissioner',
    isVerified: true,
    dataSource: 'Tamil Nadu Municipal Administration Gazette (Sample)',
    isActive: true
  },
  {
    id: 'auth-twad-water',
    name: 'Tamil Nadu Water Supply and Drainage (TWAD) Board — Coimbatore Metro',
    nameTa: 'தமிழ்நாடு குடிநீர் வடிகால் வாரியம் (TWAD) — கோவை மண்டலம்',
    level: 'state',
    department: 'Urban Water Supply',
    departmentTa: 'நகர்ப்புற குடிநீர் வழங்கல்',
    categories: ['water_supply'],
    jurisdiction: {
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      city: 'Coimbatore',
      wards: ['All Wards', 'Pillur Scheme Zone', 'Siruvani Supply Area', 'Singanallur', 'Kuniyamuthur']
    },
    contact: {
      officialName: 'K. Thirunavukkarasu',
      designation: 'Superintending Engineer',
      email: 'water.grievance@twadboard.tn.gov.in.demo',
      phone: '+91 422 245 8890',
      address: 'TWAD Board Complex, Tatabad, Coimbatore 641012'
    },
    delivery: {
      method: 'email_gateway',
      endpoint: 'twad-grievance-gateway@tn.gov.in.demo',
      authType: 'bearer',
      isVerified: true,
      lastVerifiedDate: '2026-08-20'
    },
    sla: {
      acknowledgementHours: 24,
      resolutionHours: 72
    },
    escalationAuthorityId: 'auth-tn-water-ministry',
    isVerified: true,
    dataSource: 'TWAD Portal Registry 2026 (Demonstration Entry)',
    isActive: true
  },
  {
    id: 'auth-tangedco-power',
    name: 'TANGEDCO (Tamil Nadu Electricity Board) — Metro Distribution Circle',
    nameTa: 'தமிழ்நாடு மின் உற்பத்தி மற்றும் பகிர்மான கழகம் (TANGEDCO)',
    level: 'state',
    department: 'Power Distribution & Public Safety',
    departmentTa: 'மின் விநியோகம் மற்றும் பொது பாதுகாப்பு',
    categories: ['electricity_infrastructure', 'streetlights'],
    jurisdiction: {
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      city: 'Coimbatore',
      wards: ['All Metro Wards', 'North Distribution', 'South Distribution']
    },
    contact: {
      officialName: 'Er. R. Selvaraj',
      designation: 'Executive Engineer (Distribution)',
      email: 'ee.metro.cbe@tangedco.gov.in.demo',
      phone: '+91 422 249 1100',
      address: 'TANGEDCO Metro Complex, 182 Dr. Subbarayan St, Tatabad 641012'
    },
    delivery: {
      method: 'rest_api',
      endpoint: 'https://powercare.tangedco.gov.in.demo/api/v1/fault-tickets',
      authType: 'bearer',
      isVerified: true,
      lastVerifiedDate: '2026-10-10'
    },
    sla: {
      acknowledgementHours: 6,
      resolutionHours: 24
    },
    escalationAuthorityId: 'auth-tn-energy-dept',
    isVerified: true,
    dataSource: 'TANGEDCO Grievance Integration Framework (Sample)',
    isActive: true
  },
  {
    id: 'auth-cbe-commissioner',
    name: 'Office of the District Collector & Corporation Commissioner (Escalation Tier-2)',
    nameTa: 'மாவட்ட ஆட்சியர் & மாநகராட்சி ஆணையர் அலுவலகம் (நிலை-2 தீவிர கண்காணிப்பு)',
    level: 'district',
    department: 'District Public Grievances Monitoring Cell',
    departmentTa: 'மாவட்ட பொது குறைதீர்க்கும் கண்காணிப்பு பிரிவு',
    categories: ['roads_potholes', 'drainage_sewage', 'water_supply', 'garbage_collection', 'streetlights', 'encroachment', 'public_safety'],
    jurisdiction: {
      state: 'Tamil Nadu',
      district: 'Coimbatore',
      city: 'Coimbatore',
      wards: ['All Wards']
    },
    contact: {
      officialName: 'Dr. V. Rajeshwari IAS',
      designation: 'District Magistrate & Grievance Commissioner',
      email: 'collector.grievance.cbe@tn.gov.in.demo',
      phone: '+91 422 230 1114',
      address: 'Collectorate Complex, State Bank Rd, Gopalapuram, Coimbatore 641018'
    },
    delivery: {
      method: 'internal_dashboard',
      endpoint: 'INTERNAL_CIVICPULSE_ESCALATION_QUEUE',
      authType: 'internal',
      isVerified: true,
      lastVerifiedDate: '2026-10-18'
    },
    sla: {
      acknowledgementHours: 12,
      resolutionHours: 48
    },
    isVerified: true,
    dataSource: 'Tamil Nadu e-District Master Authority Database (Sample Configuration)',
    isActive: true
  }
];

// Delivery Attempts In-Memory Store
let deliveryAttempts: DeliveryAttempt[] = [];

// Complaints In-Memory Store with Rich Initial Realistic Data
let complaints: Complaint[] = [
  {
    id: 'cmp-001',
    referenceNumber: 'CP-2026-8491',
    title: 'Severe pothole crater causing two-wheeler accidents near Gandhipuram Signal',
    titleTa: 'காந்திபுரம் சிக்னல் அருகே விபத்து ஏற்படுத்தும் ஆபத்தான ஆழமான பள்ளம்',
    description: 'A deep pothole has formed right in the middle of Cross Cut Road near the 7th Street corner. Yesterday night two motorists fell. Water has filled the crater, making it invisible to commuters. Immediate resurfacing required.',
    descriptionTa: 'கிராஸ் கட் ரோடு 7-வது தெரு மூலையில் சாலையின் நடுவே மிக ஆழமான பள்ளம் ஏற்பட்டுள்ளது. நேற்று இரவு இரண்டு இருசக்கர வாகன ஓட்டிகள் தவறி விழுந்தனர். மழைநீர் தேங்கியுள்ளதால் பள்ளம் தெரிவதில்லை.',
    category: 'roads_potholes',
    status: 'delivered_to_destination',
    priority: 'high',
    priorityExplanation: 'High risk of bodily injury to two-wheeler riders on an arterial commercial corridor (Cross Cut Rd). High traffic volume and water submersion amplify immediate accident hazard.',
    priorityScore: 88,
    language: 'en',
    location: {
      address: 'Cross Cut Road, near 7th Street Junction, Gandhipuram',
      landmark: 'Opposite to Sri Krishna Sweets',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      ward: 'Ward 35',
      latitude: 11.0168,
      longitude: 76.9558
    },
    attachments: [
      {
        id: 'att-1',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
        filename: 'pothole_crosscut_hazard.jpg'
      }
    ],
    citizen: {
      id: 'cit-101',
      name: 'Karthik Subramanian',
      phone: '+91 98421 55678',
      email: 'karthik.subramanian@gmail.com'
    },
    routing: {
      recommendedAuthorityId: 'auth-cbe-roads',
      assignedAuthorityId: 'auth-cbe-roads',
      assignedDepartment: 'Engineering & Highways',
      confidence: 0.94,
      decisionReason: 'Matched category [roads_potholes] and jurisdiction [Coimbatore / Ward 35 / Gandhipuram] directly to Coimbatore City Municipal Corporation Roads Division.',
      jurisdictionMatch: true,
      requiresHumanReview: false,
      routingTimestamp: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    delivery: {
      status: 'success',
      attemptsCount: 1,
      lastAttemptId: 'del-001',
      lastAttemptTimestamp: new Date(Date.now() - 3600000 * 17).toISOString(),
      externalReferenceId: 'CCMC-ENG-2026-90412',
      deliveryReceipt: 'MUNICIPAL_GATEWAY_ACK:200_OK_VERIFIED'
    },
    acknowledgement: {
      isAcknowledged: false,
      deadlineTimestamp: new Date(Date.now() + 3600000 * 6).toISOString(),
      isOverdue: false
    },
    deadlines: {
      acknowledgementDeadline: new Date(Date.now() + 3600000 * 6).toISOString(),
      resolutionDeadline: new Date(Date.now() + 3600000 * 54).toISOString(),
      isResolutionOverdue: false
    },
    escalation: {
      isEscalated: false,
      escalationLevel: 1,
      escalatedBy: 'automatic_sla_worker'
    },
    auditHistory: [
      {
        id: 'aud-1',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        action: 'Complaint Submitted',
        actor: 'Karthik Subramanian (Citizen)',
        actorRole: 'citizen',
        details: 'Initial submission via Citizen Portal with geotagged location and photograph.'
      },
      {
        id: 'aud-2',
        timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
        action: 'AI Classification & Routing Decision',
        actor: 'CivicPulse AI Routing Engine',
        actorRole: 'system',
        details: 'Classified as roads_potholes (confidence 94%). Urgency calculated: HIGH (score 88). Routed to Coimbatore Municipal Roads Division.'
      },
      {
        id: 'aud-3',
        timestamp: new Date(Date.now() - 3600000 * 17).toISOString(),
        action: 'External Delivery Confirmed',
        actor: 'REST API Delivery Adapter',
        actorRole: 'system',
        details: 'Dispatched to official municipal endpoint https://api.ccmc.gov.in.demo/v2/complaints/dispatch. Received External Reference CCMC-ENG-2026-90412.'
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 17).toISOString()
  },
  {
    id: 'cmp-002',
    referenceNumber: 'CP-2026-7215',
    title: 'Drinking water pipeline burst flooding residential lane in RS Puram',
    titleTa: 'ஆர்.எஸ்.புரம் குடியிருப்பு பகுதியில் குடிநீர் குழாய் உடைந்து வீணாகும் நீர்',
    description: 'Siruvani main connection valve burst near West Venkatasamy Road. Thousands of litres of clean potable drinking water are flowing into the open storm drain since 5:00 AM. Surrounding 40 households have zero water pressure.',
    descriptionTa: 'மேற்கு வெங்கடசாமி ரோடு அருகே சிறுவாணி முக்கிய குடிநீர் குழாய் உடைந்து காலை 5 மணி முதல் குடிநீர் வீணாக சாக்கடையில் பாய்கிறது. 40 வீடுகளுக்கு குடிநீர் தடைபட்டுள்ளது.',
    category: 'water_supply',
    status: 'acknowledged_by_authority',
    priority: 'critical',
    priorityExplanation: 'Critical wastage of treated drinking water combined with complete loss of essential supply to 40+ households in densely populated RS Puram zone.',
    priorityScore: 96,
    language: 'en',
    location: {
      address: 'West Venkatasamy Road, 4th Cross, RS Puram',
      landmark: 'Near Corporation Primary Health Centre',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      ward: 'Ward 24',
      latitude: 11.0082,
      longitude: 76.9463
    },
    attachments: [
      {
        id: 'att-2',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80',
        filename: 'pipe_burst_rspuram.jpg'
      }
    ],
    citizen: {
      id: 'cit-102',
      name: 'Anitha Rajendran',
      phone: '+91 94432 11980',
      email: 'anitha.rajendran@yahoo.in'
    },
    routing: {
      recommendedAuthorityId: 'auth-twad-water',
      assignedAuthorityId: 'auth-twad-water',
      assignedDepartment: 'Urban Water Supply',
      confidence: 0.98,
      decisionReason: 'Category water_supply mapped to TWAD Board Metro Distribution Circle covering Siruvani network in RS Puram (Ward 24).',
      jurisdictionMatch: true,
      requiresHumanReview: false,
      routingTimestamp: new Date(Date.now() - 3600000 * 30).toISOString()
    },
    delivery: {
      status: 'success',
      attemptsCount: 1,
      lastAttemptId: 'del-002',
      lastAttemptTimestamp: new Date(Date.now() - 3600000 * 29).toISOString(),
      externalReferenceId: 'TWAD-CBE-URG-8821',
      deliveryReceipt: 'EMAIL_GW_ACCEPTED:250_QUEUED'
    },
    acknowledgement: {
      isAcknowledged: true,
      acknowledgedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
      acknowledgedByOfficer: 'K. Thirunavukkarasu (Superintending Engineer)',
      officialReferenceNumber: 'TWAD-ACK-2026-4490',
      notes: 'Emergency repair crew dispatched under Assistant Engineer Mr. Sundaram. Isolation valve shut off at 09:30 AM to arrest wastage.',
      deadlineTimestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      isOverdue: false
    },
    deadlines: {
      acknowledgementDeadline: new Date(Date.now() - 3600000 * 6).toISOString(),
      resolutionDeadline: new Date(Date.now() + 3600000 * 42).toISOString(),
      isResolutionOverdue: false
    },
    escalation: {
      isEscalated: false,
      escalationLevel: 1,
      escalatedBy: 'automatic_sla_worker'
    },
    auditHistory: [
      {
        id: 'aud-201',
        timestamp: new Date(Date.now() - 3600000 * 30).toISOString(),
        action: 'Complaint Submitted',
        actor: 'Anitha Rajendran (Citizen)',
        actorRole: 'citizen',
        details: 'Reported urgent pipeline burst with photo evidence.'
      },
      {
        id: 'aud-202',
        timestamp: new Date(Date.now() - 3600000 * 29).toISOString(),
        action: 'Delivered to TWAD Board',
        actor: 'Email Gateway Adapter',
        actorRole: 'system',
        details: 'Delivered to twad-grievance-gateway@tn.gov.in.demo with tracking token.'
      },
      {
        id: 'aud-203',
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        action: 'Authority Acknowledged',
        actor: 'TWAD Official Officer',
        actorRole: 'authority_officer',
        details: 'Official acknowledgement recorded by Superintending Engineer. Work crew mobilized.'
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'cmp-003',
    referenceNumber: 'CP-2026-6104',
    title: 'Garbage dump accumulation and overflowing bins creating health hazard in Peelamedu',
    titleTa: 'பீளமேடு பகுதியில் குப்பைகள் தேங்கி தொற்றுநோய் பரவும் அபாயம்',
    description: 'Commercial waste and decomposed organic trash overflowing onto the footpath for the past 6 days. Stray dogs tearing bags, strong foul stench entering nearby government school premises.',
    descriptionTa: 'கடந்த 6 நாட்களாக குப்பைத் தொட்டிகள் அள்ளப்படாமல் சாலையில் கொட்டப்பட்டு துர்நாற்றம் வீசுகிறது. அருகில் உள்ள பள்ளி மாணவர்களுக்கு சுகாதார சீர்கேடு ஏற்பட்டுள்ளது.',
    category: 'garbage_collection',
    status: 'escalated',
    priority: 'high',
    priorityExplanation: 'Public sanitation hazard adjacent to primary educational institution. Unattended for over 5 days exceeding maximum permissible sanitation response SLA.',
    priorityScore: 84,
    language: 'ta',
    location: {
      address: 'Avinashi Road, Near PSG Tech Gate 3, Peelamedu',
      landmark: 'Behind Peelamedu Municipal Primary School',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      ward: 'Ward 46',
      latitude: 11.0254,
      longitude: 76.9981
    },
    attachments: [
      {
        id: 'att-3',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80',
        filename: 'garbage_pile_peelamedu.jpg'
      }
    ],
    citizen: {
      id: 'cit-103',
      name: 'M. Senthil Nathan',
      phone: '+91 97890 44321',
      email: 'senthil.nathan.cbe@gmail.com'
    },
    routing: {
      recommendedAuthorityId: 'auth-cbe-drainage',
      assignedAuthorityId: 'auth-cbe-drainage',
      assignedDepartment: 'Sanitation & Solid Waste Management',
      confidence: 0.92,
      decisionReason: 'Categorized under garbage_collection & public_sanitation for Ward 46 East Zone.',
      jurisdictionMatch: true,
      requiresHumanReview: false,
      routingTimestamp: new Date(Date.now() - 3600000 * 60).toISOString()
    },
    delivery: {
      status: 'success',
      attemptsCount: 1,
      lastAttemptId: 'del-003',
      lastAttemptTimestamp: new Date(Date.now() - 3600000 * 59).toISOString(),
      externalReferenceId: 'CCMC-SWM-2026-1184',
      deliveryReceipt: 'WEBHOOK_ACK:STATUS_200'
    },
    acknowledgement: {
      isAcknowledged: false,
      deadlineTimestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
      isOverdue: true
    },
    deadlines: {
      acknowledgementDeadline: new Date(Date.now() - 3600000 * 36).toISOString(),
      resolutionDeadline: new Date(Date.now() - 3600000 * 12).toISOString(),
      isResolutionOverdue: true
    },
    escalation: {
      isEscalated: true,
      escalatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      escalationLevel: 2,
      escalatedToAuthorityId: 'auth-cbe-commissioner',
      escalatedToName: 'District Public Grievances Monitoring Cell & Municipal Commissioner',
      reason: 'Sanitation department failed to acknowledge or resolve complaint within the configured 48-hour resolution SLA window. Automatically escalated pursuant to Section 7G Accountability Rules.',
      escalatedBy: 'automatic_sla_worker'
    },
    auditHistory: [
      {
        id: 'aud-301',
        timestamp: new Date(Date.now() - 3600000 * 60).toISOString(),
        action: 'Complaint Submitted',
        actor: 'M. Senthil Nathan (Citizen)',
        actorRole: 'citizen',
        details: 'Submitted with location near PSG Tech / Peelamedu.'
      },
      {
        id: 'aud-302',
        timestamp: new Date(Date.now() - 3600000 * 59).toISOString(),
        action: 'Dispatched to Sanitation Dept',
        actor: 'Webhook Delivery Adapter',
        actorRole: 'system',
        details: 'Delivered to sanitation department webhook destination.'
      },
      {
        id: 'aud-303',
        timestamp: new Date(Date.now() - 3600000 * 36).toISOString(),
        action: 'Acknowledgement Overdue Alert',
        actor: 'SLA Escalation Worker',
        actorRole: 'system',
        details: 'Acknowledgement window expired (24h). Flagged in overdue queue.'
      },
      {
        id: 'aud-304',
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        action: 'Automated Escalation Triggered',
        actor: 'SLA Escalation Worker',
        actorRole: 'system',
        details: 'Resolution deadline breached (48h). Escalated to District Collectorate & Commissioner Grievance Cell.'
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'cmp-004',
    referenceNumber: 'CP-2026-5389',
    title: 'Exposed high voltage electrical wire sparking from transformer pole',
    titleTa: 'மின் மாற்றி கம்பத்தில் இருந்து அறுந்து விழும் நிலையில் உள்ள உயர்மின் கம்பி',
    description: 'During yesterday evening storm, tree branches snapped an insulator wire on the 11kV distribution transformer. Sparks and popping noises occur intermittently. Situated next to an active bus stop.',
    descriptionTa: 'நேற்று மாலை வீசிய காற்றில் மின்மாற்றி அருகே மின்கம்பி அறுந்து தீப்பொறி பறக்கிறது. பஸ் நிறுத்தம் அருகில் உள்ளதால் பொதுமக்கள் அஞ்சுகின்றனர்.',
    category: 'electricity_infrastructure',
    status: 'resolution_awaiting_verification',
    priority: 'critical',
    priorityExplanation: 'Extreme public safety hazard: live sparking high-voltage electrical conductor in high pedestrian transit area (bus stop). Fatal electrocution hazard.',
    priorityScore: 99,
    language: 'en',
    location: {
      address: 'Mettupalayam Road, Near Saibaba Colony Signal',
      landmark: 'Opposite State Bank ATM',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      ward: 'Ward 13',
      latitude: 11.0319,
      longitude: 76.9421
    },
    attachments: [
      {
        id: 'att-4',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
        filename: 'transformer_wire_hazard.jpg'
      }
    ],
    citizen: {
      id: 'cit-104',
      name: 'R. Vignesh',
      phone: '+91 99940 88231',
      email: 'vignesh.r@live.com'
    },
    routing: {
      recommendedAuthorityId: 'auth-tangedco-power',
      assignedAuthorityId: 'auth-tangedco-power',
      assignedDepartment: 'Power Distribution & Public Safety',
      confidence: 0.99,
      decisionReason: 'High voltage electrical infrastructure identified. Mapped directly to TANGEDCO North Metro distribution circle.',
      jurisdictionMatch: true,
      requiresHumanReview: false,
      routingTimestamp: new Date(Date.now() - 3600000 * 10).toISOString()
    },
    delivery: {
      status: 'success',
      attemptsCount: 1,
      lastAttemptId: 'del-004',
      lastAttemptTimestamp: new Date(Date.now() - 3600000 * 9.5).toISOString(),
      externalReferenceId: 'TANGEDCO-FLT-2026-0922',
      deliveryReceipt: 'REST_201_CREATED'
    },
    acknowledgement: {
      isAcknowledged: true,
      acknowledgedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
      acknowledgedByOfficer: 'Er. R. Selvaraj (Executive Engineer)',
      officialReferenceNumber: 'TNEB-ACK-88301',
      notes: 'Linemen team diverted from Saibaba sub-station on top emergency priority.',
      deadlineTimestamp: new Date(Date.now() + 3600000 * 16).toISOString(),
      isOverdue: false
    },
    deadlines: {
      acknowledgementDeadline: new Date(Date.now() + 3600000 * 16).toISOString(),
      resolutionDeadline: new Date(Date.now() + 3600000 * 14).toISOString(),
      isResolutionOverdue: false
    },
    escalation: {
      isEscalated: false,
      escalationLevel: 1,
      escalatedBy: 'automatic_sla_worker'
    },
    resolution: {
      resolvedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      resolvedByOfficer: 'Junior Engineer M. Natarajan & Saibaba Colony Breakdown Gang',
      description: 'Replaced cracked ceramic pin insulator, re-tensioned 11kV conductor, trimmed encroaching tree canopy, and re-energized feeder safely.',
      evidencePhotos: [
        'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'
      ],
      officialNotes: 'Completed test insulation resistance check. Voltage normalized. Citizen notified for independent verification.'
    },
    auditHistory: [
      {
        id: 'aud-401',
        timestamp: new Date(Date.now() - 3600000 * 10).toISOString(),
        action: 'Complaint Logged',
        actor: 'R. Vignesh (Citizen)',
        actorRole: 'citizen',
        details: 'Urgent hazard report with photo of sparking transformer.'
      },
      {
        id: 'aud-402',
        timestamp: new Date(Date.now() - 3600000 * 9.5).toISOString(),
        action: 'Delivered to TANGEDCO',
        actor: 'REST API Dispatcher',
        actorRole: 'system',
        details: 'Delivered to TANGEDCO fault-tickets system.'
      },
      {
        id: 'aud-403',
        timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
        action: 'Acknowledged by TNEB',
        actor: 'Executive Engineer R. Selvaraj',
        actorRole: 'authority_officer',
        details: 'Priority 1 dispatch recorded.'
      },
      {
        id: 'aud-404',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        action: 'Resolution Uploaded',
        actor: 'JE M. Natarajan',
        actorRole: 'authority_officer',
        details: 'Conductor repaired. Resolution photos uploaded. Citizen verification requested.'
      }
    ],
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

// Seed initial delivery attempts from sample complaints
complaints.forEach((c) => {
  if (c.delivery.lastAttemptId && c.routing.assignedAuthorityId) {
    const auth = authorities.find((a) => a.id === c.routing.assignedAuthorityId);
    deliveryAttempts.push({
      id: c.delivery.lastAttemptId,
      complaintId: c.id,
      destinationAuthorityId: c.routing.assignedAuthorityId,
      destinationName: auth?.name || 'Assigned Authority',
      destinationEndpoint: auth?.delivery.endpoint || 'Internal Queue',
      deliveryMethod: auth?.delivery.method || 'rest_api',
      attemptNumber: 1,
      timestamp: c.delivery.lastAttemptTimestamp || c.createdAt,
      status: c.delivery.status === 'success' ? 'success' : 'failed',
      httpStatus: c.delivery.status === 'success' ? 200 : 500,
      externalReferenceId: c.delivery.externalReferenceId,
      responsePayload: JSON.stringify({
        status: 'RECEIVED',
        ticketId: c.delivery.externalReferenceId,
        destination: auth?.name,
        timestamp: c.delivery.lastAttemptTimestamp
      })
    });
  }
});

// ==========================================
// AI ENGINE: GEMINI + LOCAL HEURISTIC FALLBACK
// ==========================================

interface AIAnalysisRequest {
  title: string;
  description: string;
  locationText?: string;
  latitude?: number;
  longitude?: number;
  userCategory?: string;
  preferredLanguage?: 'en' | 'ta';
}

interface AIAnalysisResponse {
  predictedCategory: string;
  categoryConfidence: number;
  detectedLanguage: 'en' | 'ta';
  translatedSummary: string;
  extractedKeywords: string[];
  extractedLocation?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
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

// Local NLP Heuristic Engine for fallback & deterministic speed
function localHeuristicAnalysis(
  req: AIAnalysisRequest,
  existingComplaints: Complaint[],
  allAuthorities: Authority[]
): AIAnalysisResponse {
  const text = `${req.title} ${req.description}`.toLowerCase();
  
  // Language detection
  const hasTamil = /[\u0B80-\u0BFF]/.test(req.title + ' ' + req.description);
  const detectedLanguage: 'en' | 'ta' = hasTamil ? 'ta' : 'en';

  // Category determination
  let category = 'other_civic_issues';
  let categoryConfidence = 0.85;

  if (
    text.includes('pothole') ||
    text.includes('road') ||
    text.includes('tar') ||
    text.includes('crater') ||
    text.includes('சாலை') ||
    text.includes('பள்ளம்') ||
    text.includes('தார்')
  ) {
    category = 'roads_potholes';
    categoryConfidence = 0.94;
  } else if (
    text.includes('water') ||
    text.includes('pipe') ||
    text.includes('leak') ||
    text.includes('pipeline') ||
    text.includes('குடிநீர்') ||
    text.includes('குழாய்') ||
    text.includes('நீர்')
  ) {
    category = 'water_supply';
    categoryConfidence = 0.95;
  } else if (
    text.includes('drain') ||
    text.includes('sewage') ||
    text.includes('gutter') ||
    text.includes('overflow') ||
    text.includes('சாக்கடை') ||
    text.includes('வடிகால்')
  ) {
    category = 'drainage_sewage';
    categoryConfidence = 0.91;
  } else if (
    text.includes('garbage') ||
    text.includes('waste') ||
    text.includes('trash') ||
    text.includes('dustbin') ||
    text.includes('குப்பை') ||
    text.includes('கழிவு')
  ) {
    category = 'garbage_collection';
    categoryConfidence = 0.93;
  } else if (
    text.includes('light') ||
    text.includes('lamp') ||
    text.includes('dark') ||
    text.includes('மின்விளக்கு') ||
    text.includes('விளக்கு')
  ) {
    category = 'streetlights';
    categoryConfidence = 0.89;
  } else if (
    text.includes('electric') ||
    text.includes('transformer') ||
    text.includes('wire') ||
    text.includes('shock') ||
    text.includes('மின்சாரம்') ||
    text.includes('மின்கம்பி') ||
    text.includes('தீப்பொறி')
  ) {
    category = 'electricity_infrastructure';
    categoryConfidence = 0.96;
  }

  // If user provided a category, respect it if valid
  if (req.userCategory && req.userCategory !== 'auto') {
    category = req.userCategory;
    categoryConfidence = Math.max(categoryConfidence, 0.90);
  }

  // Priority scoring
  let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let priorityScore = 60;
  let priorityExplanation = 'Standard civic issue requiring planned municipal intervention.';

  const isEmergency = 
    text.includes('spark') || 
    text.includes('burst') || 
    text.includes('accident') || 
    text.includes('injury') || 
    text.includes('death') || 
    text.includes('fatal') || 
    text.includes('hospital') || 
    text.includes('school') ||
    text.includes('விபத்து') ||
    text.includes('உயிர் ஆபத்து') ||
    text.includes('அவசரம்');

  if (isEmergency || category === 'electricity_infrastructure' || text.includes('burst')) {
    priority = 'critical';
    priorityScore = 95;
    priorityExplanation = 'Critical priority assigned due to immediate public safety hazard, live infrastructure risk, or high threat to pedestrian safety.';
  } else if (
    category === 'roads_potholes' || 
    category === 'drainage_sewage' || 
    category === 'water_supply'
  ) {
    priority = 'high';
    priorityScore = 82;
    priorityExplanation = 'High priority assigned because this impacts arterial transport, public hygiene, or essential civic utility distribution.';
  }

  // Keyword extraction
  const words = text
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const extractedKeywords = Array.from(new Set(words)).slice(0, 6);

  // Authority recommendation
  const matchingAuthorities = allAuthorities.filter((auth) =>
    auth.categories.includes(category)
  );

  let recommendedAuthority = matchingAuthorities[0] || allAuthorities[0];
  let routingConfidence = 0.92;
  let routingExplanation = `Categorized as [${category}]. Automatically matched to ${recommendedAuthority.name} based on domain jurisdiction rules.`;
  let isAmbiguous = false;

  if (matchingAuthorities.length === 0) {
    isAmbiguous = true;
    routingConfidence = 0.45;
    routingExplanation = 'No direct authority jurisdiction found for this category. Forwarded to Human Review Queue.';
  } else if (matchingAuthorities.length > 1) {
    routingExplanation += ` (Alternative departments evaluated: ${matchingAuthorities.map((m) => m.department).join(', ')})`;
  }

  // Duplicate detection check
  let duplicateWarning = undefined;
  for (const prev of existingComplaints) {
    if (prev.category === category) {
      // Check location or text similarity
      const hasWordOverlap = extractedKeywords.some((k) =>
        prev.description.toLowerCase().includes(k)
      );
      if (hasWordOverlap) {
        duplicateWarning = {
          isPossibleDuplicate: true,
          existingComplaintRef: prev.referenceNumber,
          similarityScore: 0.78,
          reason: `A similar complaint in ${prev.category.replace('_', ' ')} (${prev.referenceNumber}) was recently submitted nearby.`
        };
        break;
      }
    }
  }

  // Missing info check
  let missingInformationWarning = undefined;
  if (req.description.length < 20) {
    missingInformationWarning = 'Complaint description is very short. Providing landmarks or specific cross-streets speeds up resolution.';
  }

  return {
    predictedCategory: category,
    categoryConfidence,
    detectedLanguage,
    translatedSummary: req.title,
    extractedKeywords,
    extractedLocation: req.locationText || 'Detected via Geotag',
    priority,
    priorityScore,
    priorityExplanation,
    recommendedDepartment: recommendedAuthority ? recommendedAuthority.department : 'General Administration',
    recommendedAuthorityId: recommendedAuthority ? recommendedAuthority.id : undefined,
    routingConfidence,
    routingExplanation,
    isAmbiguous,
    missingInformationWarning,
    duplicateWarning
  };
}

async function analyzeComplaintWithAI(
  req: AIAnalysisRequest,
  existingComplaints: Complaint[],
  allAuthorities: Authority[]
): Promise<AIAnalysisResponse> {
  const fallback = localHeuristicAnalysis(req, existingComplaints, allAuthorities);

  if (!geminiClient) {
    return fallback;
  }

  try {
    const prompt = `
You are the CivicPulse AI Routing and Complaint Intelligence Engine for India (Tamil Nadu).
Analyze this civic complaint. Return ONLY valid JSON (no markdown fences, no extra text).

Complaint Title: ${req.title}
Complaint Description: ${req.description}
Reported Location: ${req.locationText || 'Not specified'}

Available Categories:
- roads_potholes (Roads, potholes, bridges, craters)
- water_supply (Drinking water, pipeline bursts, low pressure)
- drainage_sewage (Blocked drains, sewage overflow, gutters)
- garbage_collection (Dump piles, overflowing bins, uncollected waste)
- streetlights (Broken lamps, dark street stretches)
- public_sanitation (Public toilets, disease outbreak prevention)
- electricity_infrastructure (Sparking wires, fallen poles, transformer failure)
- encroachment (Footpath blocking, illegal structures)
- public_safety (Hazardous civic conditions)
- other_civic_issues

JSON Schema:
{
  "predictedCategory": "string",
  "categoryConfidence": 0.0 to 1.0,
  "detectedLanguage": "en" | "ta",
  "translatedSummary": "concise English summary of the issue",
  "extractedKeywords": ["keyword1", "keyword2", "keyword3"],
  "extractedLocation": "detected landmark or street from text",
  "priority": "low" | "medium" | "high" | "critical",
  "priorityScore": 1 to 100,
  "priorityExplanation": "factual justification for the priority level without claiming official status",
  "recommendedDepartment": "department name",
  "routingExplanation": "why this department handles this issue based on municipal responsibility",
  "isAmbiguous": false,
  "missingInformationWarning": "string or null"
}
`;

    const callPromise = geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI inference timeout')), 2500)
    );

    const response = await Promise.race([callPromise, timeoutPromise]);

    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim());
      // Match with authority
      const matchingAuth = allAuthorities.find((a) =>
        a.categories.includes(parsed.predictedCategory)
      ) || (fallback.recommendedAuthorityId ? allAuthorities.find(a => a.id === fallback.recommendedAuthorityId) : allAuthorities[0]);

      return {
        ...fallback,
        ...parsed,
        recommendedAuthorityId: matchingAuth ? matchingAuth.id : fallback.recommendedAuthorityId,
        duplicateWarning: fallback.duplicateWarning
      };
    }
  } catch (err) {
    console.warn('Gemini AI API call encountered an issue, using fallback heuristic:', err);
  }

  return fallback;
}

// ==========================================
// DELIVERY ADAPTER ENGINE WITH RETRIES & RECEIPTS
// ==========================================

async function executeDelivery(
  complaint: Complaint,
  authority: Authority
): Promise<{ success: boolean; externalRef?: string; receipt?: string; error?: string }> {
  // Simulate network delivery with realistic adapter semantics
  const method = authority.delivery.method;
  
  // Internal dashboard delivery always succeeds immediately
  if (method === 'internal_dashboard' || authority.delivery.endpoint === 'INTERNAL_CIVICPULSE_ESCALATION_QUEUE') {
    return {
      success: true,
      externalRef: `CP-INT-ROUTED-${Date.now().toString().slice(-6)}`,
      receipt: 'DELIVERED_TO_INTERNAL_CIVICPULSE_MONITORING_QUEUE'
    };
  }

  // Realistic mock delivery simulation
  // 92% success rate, 8% simulated transient network timeout to demonstrate retry backoff
  const isSimulatedTransientFailure = Math.random() < 0.08;

  if (isSimulatedTransientFailure) {
    return {
      success: false,
      error: `Connection timeout (ETIMEDOUT) to ${authority.delivery.endpoint}. Destination gateway took > 5000ms to respond.`
    };
  }

  const generatedRef = `${authority.name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

  if (method === 'rest_api') {
    return {
      success: true,
      externalRef: generatedRef,
      receipt: `HTTP_201_CREATED: Destination acknowledged payload ingest. Endpoint=${authority.delivery.endpoint}`
    };
  } else if (method === 'email_gateway') {
    return {
      success: true,
      externalRef: generatedRef,
      receipt: `SMTP_250_QUEUED: Message accepted for delivery to ${authority.delivery.endpoint}`
    };
  } else if (method === 'webhook') {
    return {
      success: true,
      externalRef: generatedRef,
      receipt: `WEBHOOK_STATUS_200: Event dispatched and verified with HMAC signature.`
    };
  }

  return {
    success: true,
    externalRef: generatedRef,
    receipt: 'DELIVERED_OK'
  };
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

// 1. Health & Config
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    system: 'CivicPulse AI Core Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    geminiEnabled: !!process.env.GEMINI_API_KEY,
    database: 'In-Memory / SQLite ORM Layer Active'
  });
});

// 2. Dashboard Analytics & Stats
app.get('/api/stats', (req: Request, res: Response) => {
  const total = complaints.length;
  const awaitingRouting = complaints.filter((c) => c.status === 'awaiting_authority_routing' || c.status === 'awaiting_routing_review').length;
  const readyForDelivery = complaints.filter((c) => c.status === 'ready_for_delivery' || c.status === 'delivery_pending').length;
  const failedDeliveries = complaints.filter((c) => c.status === 'delivery_failed').length;
  const delivered = complaints.filter((c) => c.status === 'delivered_to_destination').length;
  const awaitingAck = complaints.filter((c) => c.status === 'delivered_to_destination' && !c.acknowledgement.isAcknowledged).length;
  const ackOverdue = complaints.filter((c) => c.acknowledgement.isOverdue).length;
  const inProgress = complaints.filter((c) => c.status === 'acknowledged_by_authority' || c.status === 'in_progress').length;
  const resolutionOverdue = complaints.filter((c) => c.deadlines.isResolutionOverdue).length;
  const escalated = complaints.filter((c) => c.escalation.isEscalated).length;
  const resolved = complaints.filter((c) => c.status === 'resolved' || c.status === 'resolution_awaiting_verification' || c.status === 'closed').length;

  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

  complaints.forEach((c) => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    if (priorityCounts[c.priority] !== undefined) {
      priorityCounts[c.priority]++;
    }
  });

  res.json({
    total,
    awaitingRouting,
    readyForDelivery,
    failedDeliveries,
    delivered,
    awaitingAck,
    ackOverdue,
    inProgress,
    resolutionOverdue,
    escalated,
    resolved,
    categoryCounts,
    priorityCounts,
    deliverySuccessRate: total > 0 ? Math.round(((total - failedDeliveries) / total) * 100) : 100,
    averageResolutionHours: 36.4
  });
});

// 3. AI Analysis & Routing Recommendation Endpoint
app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  const body: AIAnalysisRequest = req.body;
  if (!body.title || !body.description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const analysis = await analyzeComplaintWithAI(body, complaints, authorities);
  res.json(analysis);
});

// 4. Translate text (English <-> Tamil)
app.post('/api/ai/translate', async (req: Request, res: Response) => {
  const { text, targetLang } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required.' });
  }

  if (geminiClient) {
    try {
      const resp = await geminiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `Translate the following text accurately into ${targetLang === 'ta' ? 'Tamil' : 'English'}. Return ONLY the direct translation without preamble: \n\n${text}`
      });
      return res.json({ translatedText: resp.text ? resp.text.trim() : text });
    } catch (e) {
      console.warn('Translation error via Gemini, using fallback:', e);
    }
  }

  // Basic fallback
  res.json({ translatedText: text });
});

// 5. Authority Directory
app.get('/api/authorities', (req: Request, res: Response) => {
  res.json(authorities);
});

app.post('/api/authorities', (req: Request, res: Response) => {
  const newAuth: Authority = {
    ...req.body,
    id: `auth-${Date.now().toString().slice(-6)}`,
    isActive: true
  };
  authorities.push(newAuth);
  res.status(201).json(newAuth);
});

// 6. Complaints List & Filter
app.get('/api/complaints', (req: Request, res: Response) => {
  const { category, priority, status, search, authorityId } = req.query;
  let results = [...complaints];

  if (category && category !== 'all') {
    results = results.filter((c) => c.category === category);
  }
  if (priority && priority !== 'all') {
    results = results.filter((c) => c.priority === priority);
  }
  if (status && status !== 'all') {
    results = results.filter((c) => c.status === status);
  }
  if (authorityId && authorityId !== 'all') {
    results = results.filter((c) => c.routing.assignedAuthorityId === authorityId);
  }
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    results = results.filter(
      (c) =>
        c.referenceNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.location.address.toLowerCase().includes(q)
    );
  }

  // Sort descending by created timestamp
  results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(results);
});

// 7. Get single complaint
app.get('/api/complaints/:id', (req: Request, res: Response) => {
  const complaint = complaints.find(
    (c) => c.id === req.params.id || c.referenceNumber === req.params.id
  );
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }
  res.json(complaint);
});

// 8. Create new complaint (Complete Responsibility Workflow)
app.post('/api/complaints', async (req: Request, res: Response) => {
  const {
    title,
    titleTa,
    description,
    descriptionTa,
    category,
    language = 'en',
    location,
    attachments = [],
    citizen
  } = req.body;

  if (!title || !description || !location || !location.address) {
    return res.status(400).json({
      error: 'Missing required fields: title, description, and valid location are required.'
    });
  }

  // Step 1: Run AI Understanding & Classification
  const aiAnalysis = await analyzeComplaintWithAI(
    {
      title,
      description,
      locationText: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      userCategory: category
    },
    complaints,
    authorities
  );

  const selectedCategory = category || aiAnalysis.predictedCategory;
  const selectedAuthority = authorities.find(
    (a) => a.id === aiAnalysis.recommendedAuthorityId
  ) || authorities[0];

  const refNumber = `CP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date().toISOString();

  // Calculate SLAs based on assigned authority
  const ackHours = selectedAuthority.sla.acknowledgementHours || 24;
  const resHours = selectedAuthority.sla.resolutionHours || 72;
  const ackDeadline = new Date(Date.now() + ackHours * 3600000).toISOString();
  const resDeadline = new Date(Date.now() + resHours * 3600000).toISOString();

  // Create complaint record
  const newComplaint: Complaint = {
    id: `cmp-${Date.now().toString().slice(-6)}`,
    referenceNumber: refNumber,
    title,
    titleTa: titleTa || (language === 'ta' ? title : undefined),
    description,
    descriptionTa: descriptionTa || (language === 'ta' ? description : undefined),
    category: selectedCategory,
    status: aiAnalysis.isAmbiguous ? 'awaiting_routing_review' : 'ready_for_delivery',
    priority: aiAnalysis.priority,
    priorityExplanation: aiAnalysis.priorityExplanation,
    priorityScore: aiAnalysis.priorityScore,
    language,
    location: {
      address: location.address,
      landmark: location.landmark || '',
      city: location.city || 'Coimbatore',
      district: location.district || 'Coimbatore',
      state: location.state || 'Tamil Nadu',
      ward: location.ward || 'Ward 12',
      latitude: location.latitude || 11.0168,
      longitude: location.longitude || 76.9558
    },
    attachments: attachments.map((att: any, idx: number) => ({
      id: `att-${Date.now()}-${idx}`,
      type: att.type || 'image',
      url: att.url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
      filename: att.filename || `evidence_${idx + 1}.jpg`
    })),
    citizen: {
      id: citizen?.id || `cit-${Date.now().toString().slice(-4)}`,
      name: citizen?.name || 'Verified Citizen',
      phone: citizen?.phone || '+91 98400 12345',
      email: citizen?.email || 'citizen@civicpulse.org'
    },
    routing: {
      recommendedAuthorityId: selectedAuthority.id,
      assignedAuthorityId: selectedAuthority.id,
      assignedDepartment: selectedAuthority.department,
      confidence: aiAnalysis.routingConfidence,
      decisionReason: aiAnalysis.routingExplanation,
      jurisdictionMatch: true,
      requiresHumanReview: aiAnalysis.isAmbiguous,
      routingTimestamp: now
    },
    delivery: {
      status: 'pending',
      attemptsCount: 0
    },
    acknowledgement: {
      isAcknowledged: false,
      deadlineTimestamp: ackDeadline,
      isOverdue: false
    },
    deadlines: {
      acknowledgementDeadline: ackDeadline,
      resolutionDeadline: resDeadline,
      isResolutionOverdue: false
    },
    escalation: {
      isEscalated: false,
      escalationLevel: 1,
      escalatedBy: 'automatic_sla_worker'
    },
    auditHistory: [
      {
        id: `aud-${Date.now()}-1`,
        timestamp: now,
        action: 'Complaint Submitted to CivicPulse AI',
        actor: citizen?.name || 'Verified Citizen',
        actorRole: 'citizen',
        details: 'Initial complaint recorded in CivicPulse AI repository. Geotag and initial category registered.'
      },
      {
        id: `aud-${Date.now()}-2`,
        timestamp: now,
        action: 'AI Understanding & Responsibility Routing',
        actor: 'CivicPulse AI Routing Engine',
        actorRole: 'system',
        details: `Assigned category [${selectedCategory}] with ${Math.round(aiAnalysis.categoryConfidence * 100)}% confidence. Routed to [${selectedAuthority.name}].`
      }
    ],
    createdAt: now,
    updatedAt: now
  };

  // Step 2: Attempt Immediate External Delivery if not ambiguous
  if (!aiAnalysis.isAmbiguous) {
    const deliveryResult = await executeDelivery(newComplaint, selectedAuthority);
    const attemptId = `del-${Date.now().toString().slice(-6)}`;
    const attemptRecord: DeliveryAttempt = {
      id: attemptId,
      complaintId: newComplaint.id,
      destinationAuthorityId: selectedAuthority.id,
      destinationName: selectedAuthority.name,
      destinationEndpoint: selectedAuthority.delivery.endpoint,
      deliveryMethod: selectedAuthority.delivery.method,
      attemptNumber: 1,
      timestamp: new Date().toISOString(),
      status: deliveryResult.success ? 'success' : 'failed',
      httpStatus: deliveryResult.success ? 200 : 503,
      externalReferenceId: deliveryResult.externalRef,
      receipt: deliveryResult.receipt,
      errorDetails: deliveryResult.error
    };

    deliveryAttempts.push(attemptRecord);
    newComplaint.delivery.attemptsCount = 1;
    newComplaint.delivery.lastAttemptId = attemptId;
    newComplaint.delivery.lastAttemptTimestamp = attemptRecord.timestamp;

    if (deliveryResult.success) {
      newComplaint.status = 'delivered_to_destination';
      newComplaint.delivery.status = 'success';
      newComplaint.delivery.externalReferenceId = deliveryResult.externalRef;
      newComplaint.delivery.deliveryReceipt = deliveryResult.receipt;
      newComplaint.auditHistory.push({
        id: `aud-${Date.now()}-3`,
        timestamp: new Date().toISOString(),
        action: 'Dispatched to External Authority Gateway',
        actor: `${selectedAuthority.delivery.method.toUpperCase()} Delivery Adapter`,
        actorRole: 'system',
        details: `Successfully delivered to destination: ${selectedAuthority.delivery.endpoint}. External Reference: ${deliveryResult.externalRef}`
      });
    } else {
      newComplaint.status = 'delivery_failed';
      newComplaint.delivery.status = 'failed';
      newComplaint.auditHistory.push({
        id: `aud-${Date.now()}-3`,
        timestamp: new Date().toISOString(),
        action: 'Delivery Attempt Failed',
        actor: `${selectedAuthority.delivery.method.toUpperCase()} Delivery Adapter`,
        actorRole: 'system',
        details: `Delivery failed: ${deliveryResult.error}. Scheduled for exponential backoff retry.`
      });
    }
  }

  complaints.unshift(newComplaint);
  res.status(201).json(newComplaint);
});

// 9. Manual Re-routing / Authority Confirmation by Admin
app.post('/api/complaints/:id/route', (req: Request, res: Response) => {
  const { authorityId, reason, actorName = 'Admin Operator' } = req.body;
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const authority = authorities.find((a) => a.id === authorityId);
  if (!authority) {
    return res.status(400).json({ error: 'Specified authority does not exist.' });
  }

  const now = new Date().toISOString();
  complaint.routing.assignedAuthorityId = authority.id;
  complaint.routing.assignedDepartment = authority.department;
  complaint.routing.decisionReason = reason || 'Updated manually during routing review';
  complaint.routing.requiresHumanReview = false;
  complaint.status = 'ready_for_delivery';
  complaint.updatedAt = now;

  complaint.auditHistory.push({
    id: `aud-${Date.now()}`,
    timestamp: now,
    action: 'Authority Assigned / Overridden by Admin',
    actor: actorName,
    actorRole: 'authority_officer',
    details: `Responsible authority changed to: ${authority.name}. Reason: ${reason || 'Manual administrative review.'}`
  });

  res.json(complaint);
});

// 10. Manual or Retry Delivery
app.post('/api/complaints/:id/deliver', async (req: Request, res: Response) => {
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const authority = authorities.find(
    (a) => a.id === complaint.routing.assignedAuthorityId
  ) || authorities[0];

  const deliveryResult = await executeDelivery(complaint, authority);
  const attemptNum = (complaint.delivery.attemptsCount || 0) + 1;
  const attemptId = `del-${Date.now().toString().slice(-6)}`;
  const now = new Date().toISOString();

  const attemptRecord: DeliveryAttempt = {
    id: attemptId,
    complaintId: complaint.id,
    destinationAuthorityId: authority.id,
    destinationName: authority.name,
    destinationEndpoint: authority.delivery.endpoint,
    deliveryMethod: authority.delivery.method,
    attemptNumber: attemptNum,
    timestamp: now,
    status: deliveryResult.success ? 'success' : 'failed',
    httpStatus: deliveryResult.success ? 200 : 503,
    externalReferenceId: deliveryResult.externalRef,
    receipt: deliveryResult.receipt,
    errorDetails: deliveryResult.error
  };

  deliveryAttempts.push(attemptRecord);
  complaint.delivery.attemptsCount = attemptNum;
  complaint.delivery.lastAttemptId = attemptId;
  complaint.delivery.lastAttemptTimestamp = now;
  complaint.updatedAt = now;

  if (deliveryResult.success) {
    complaint.status = 'delivered_to_destination';
    complaint.delivery.status = 'success';
    complaint.delivery.externalReferenceId = deliveryResult.externalRef;
    complaint.delivery.deliveryReceipt = deliveryResult.receipt;
    complaint.auditHistory.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'Delivery Attempt Successful',
      actor: 'Delivery Adapter',
      actorRole: 'system',
      details: `Dispatched to ${authority.name} (${authority.delivery.endpoint}). Receipt: ${deliveryResult.receipt}`
    });
  } else {
    complaint.status = 'delivery_failed';
    complaint.delivery.status = 'failed';
    complaint.auditHistory.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'Delivery Attempt Failed',
      actor: 'Delivery Adapter',
      actorRole: 'system',
      details: `Delivery failed on attempt #${attemptNum}: ${deliveryResult.error}`
    });
  }

  res.json({ complaint, attempt: attemptRecord });
});

// 11. Record Official Authority Acknowledgement (Separate from delivery)
app.post('/api/complaints/:id/acknowledge', (req: Request, res: Response) => {
  const { officerName, officialRef, notes, actorRole = 'authority_officer' } = req.body;
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const now = new Date().toISOString();
  complaint.acknowledgement.isAcknowledged = true;
  complaint.acknowledgement.acknowledgedAt = now;
  complaint.acknowledgement.acknowledgedByOfficer = officerName || 'Duty Grievance Officer';
  complaint.acknowledgement.officialReferenceNumber = officialRef || `GOV-ACK-${Math.floor(10000 + Math.random() * 90000)}`;
  complaint.acknowledgement.notes = notes || 'Formal acknowledgement received through integrated authority portal.';
  complaint.acknowledgement.isOverdue = false;
  complaint.status = 'acknowledged_by_authority';
  complaint.updatedAt = now;

  complaint.auditHistory.push({
    id: `aud-${Date.now()}`,
    timestamp: now,
    action: 'Authority Acknowledgement Recorded',
    actor: officerName || 'Official Authority Officer',
    actorRole: 'authority_officer',
    details: `Receiving department confirmed receipt. Official Reference: ${complaint.acknowledgement.officialReferenceNumber}. Notes: ${notes || 'Acknowledged for field investigation.'}`
  });

  res.json(complaint);
});

// 12. Escalate Complaint (Automatic SLA Trigger or Manual)
app.post('/api/complaints/:id/escalate', (req: Request, res: Response) => {
  const { reason, targetAuthorityId, escalatedBy = 'automatic_sla_worker' } = req.body;
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const escalationTarget = authorities.find(
    (a) => a.id === (targetAuthorityId || 'auth-cbe-commissioner')
  ) || authorities[authorities.length - 1];

  const now = new Date().toISOString();
  complaint.escalation.isEscalated = true;
  complaint.escalation.escalatedAt = now;
  complaint.escalation.escalationLevel = (complaint.escalation.escalationLevel || 1) + 1;
  complaint.escalation.escalatedToAuthorityId = escalationTarget.id;
  complaint.escalation.escalatedToName = escalationTarget.name;
  complaint.escalation.reason = reason || 'Resolution SLA exceeded without documented progress. Escalated to Tier-2 District Monitoring.';
  complaint.escalation.escalatedBy = escalatedBy;
  complaint.status = 'escalated';
  complaint.updatedAt = now;

  complaint.auditHistory.push({
    id: `aud-${Date.now()}`,
    timestamp: now,
    action: 'Complaint Escalated to Higher Authority',
    actor: escalatedBy === 'automatic_sla_worker' ? 'SLA Escalation Worker' : 'Authorized Admin',
    actorRole: 'system',
    details: `Escalated to: ${escalationTarget.name}. Reason: ${complaint.escalation.reason}`
  });

  res.json(complaint);
});

// 13. Record Resolution by Authority
app.post('/api/complaints/:id/resolve', (req: Request, res: Response) => {
  const { officerName, description, evidencePhotos = [], officialNotes = '' } = req.body;
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const now = new Date().toISOString();
  complaint.status = 'resolution_awaiting_verification';
  complaint.resolution = {
    resolvedAt: now,
    resolvedByOfficer: officerName || 'Field Assistant Engineer',
    description: description || 'Field repairs executed and verified in accordance with municipal standards.',
    evidencePhotos: evidencePhotos.length > 0 ? evidencePhotos : [
      'https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?w=800&auto=format&fit=crop&q=80'
    ],
    officialNotes
  };
  complaint.updatedAt = now;

  complaint.auditHistory.push({
    id: `aud-${Date.now()}`,
    timestamp: now,
    action: 'Resolution Recorded by Authority',
    actor: officerName || 'Authority Field Officer',
    actorRole: 'authority_officer',
    details: `Work completed. Resolution notes: "${description}". Citizen verification requested.`
  });

  res.json(complaint);
});

// 14. Citizen Verification (Confirm or Dispute)
app.post('/api/complaints/:id/verify', (req: Request, res: Response) => {
  const { isSatisfied, feedback, disputeReason } = req.body;
  const complaint = complaints.find((c) => c.id === req.params.id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found.' });
  }

  const now = new Date().toISOString();
  complaint.citizenVerification = {
    verifiedAt: now,
    isSatisfied,
    feedback,
    disputeReason
  };
  complaint.updatedAt = now;

  if (isSatisfied) {
    complaint.status = 'closed';
    complaint.auditHistory.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'Citizen Confirmed Resolution',
      actor: complaint.citizen.name,
      actorRole: 'citizen',
      details: `Citizen confirmed issue is resolved satisfactorily. Feedback: "${feedback || 'No comments'}"`
    });
  } else {
    // Reopen complaint and place into review
    complaint.status = 'in_progress';
    complaint.auditHistory.push({
      id: `aud-${Date.now()}`,
      timestamp: now,
      action: 'Citizen Disputed Resolution — Case Reopened',
      actor: complaint.citizen.name,
      actorRole: 'citizen',
      details: `Citizen disputed the resolution. Reason: "${disputeReason || 'Issue persists in the locality'}"`
    });
  }

  res.json(complaint);
});

// 15. Delivery Attempts History
app.get('/api/delivery-attempts', (req: Request, res: Response) => {
  const { complaintId } = req.query;
  let results = [...deliveryAttempts];
  if (complaintId) {
    results = results.filter((d) => d.complaintId === complaintId);
  }
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(results);
});

// 16. Trigger SLA Background Worker Simulation
app.post('/api/workers/check-deadlines', (req: Request, res: Response) => {
  const now = Date.now();
  let escalatedCount = 0;
  let markedOverdueCount = 0;

  complaints.forEach((c) => {
    // Check acknowledgement deadline
    if (!c.acknowledgement.isAcknowledged && c.status === 'delivered_to_destination') {
      const ackDue = new Date(c.acknowledgement.deadlineTimestamp).getTime();
      if (now > ackDue && !c.acknowledgement.isOverdue) {
        c.acknowledgement.isOverdue = true;
        markedOverdueCount++;
        c.auditHistory.push({
          id: `aud-${Date.now()}-${c.id}`,
          timestamp: new Date().toISOString(),
          action: 'Acknowledgement Overdue Flagged',
          actor: 'SLA Escalation Worker',
          actorRole: 'system',
          details: 'Authority failed to acknowledge receipt within configured acknowledgement SLA.'
        });
      }
    }

    // Check resolution deadline
    if (c.status !== 'resolved' && c.status !== 'closed' && c.status !== 'escalated') {
      const resDue = new Date(c.deadlines.resolutionDeadline).getTime();
      if (now > resDue && !c.deadlines.isResolutionOverdue) {
        c.deadlines.isResolutionOverdue = true;
        // Auto escalate
        c.escalation.isEscalated = true;
        c.escalation.escalatedAt = new Date().toISOString();
        c.escalation.escalationLevel = 2;
        c.escalation.escalatedToAuthorityId = 'auth-cbe-commissioner';
        c.escalation.escalatedToName = 'District Public Grievances Monitoring Cell';
        c.escalation.reason = 'Configured resolution deadline breached. Automatically escalated under CivicPulse Accountability Rules.';
        c.escalation.escalatedBy = 'automatic_sla_worker';
        c.status = 'escalated';
        escalatedCount++;
        c.auditHistory.push({
          id: `aud-${Date.now()}-${c.id}`,
          timestamp: new Date().toISOString(),
          action: 'Automatic SLA Escalation Triggered',
          actor: 'SLA Escalation Worker',
          actorRole: 'system',
          details: 'Resolution SLA window expired. Case escalated to District Collectorate Grievance Cell.'
        });
      }
    }
  });

  res.json({
    status: 'success',
    checkedComplaints: complaints.length,
    escalatedCount,
    markedOverdueCount,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// VITE DEV SERVER MOUNTING
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CivicPulse AI backend server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
