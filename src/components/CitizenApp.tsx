import React, { useState, useEffect } from 'react';
import { 
  Complaint, 
  ComplaintCategory, 
  AIAnalysisResult 
} from '../types';
import { 
  analyzeComplaintWithAI, 
  createComplaint, 
  verifyResolution,
  translateText
} from '../services/api';
import { 
  Smartphone, 
  Camera, 
  Mic, 
  MicOff, 
  MapPin, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Globe, 
  Layers, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronRight, 
  Search,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';

interface CitizenAppProps {
  complaints: Complaint[];
  onRefreshComplaints: () => void;
  selectedComplaintId?: string | null;
}

const CATEGORIES: { id: ComplaintCategory; en: string; ta: string }[] = [
  { id: 'roads_potholes', en: 'Roads & Potholes', ta: 'சாலைகள் & பள்ளங்கள்' },
  { id: 'water_supply', en: 'Water Supply', ta: 'குடிநீர் வழங்கல்' },
  { id: 'drainage_sewage', en: 'Drainage & Sewage', ta: 'சாக்கடை & கழிவுநீர் வடிகால்' },
  { id: 'garbage_collection', en: 'Garbage Collection', ta: 'குப்பை மேலாண்மை' },
  { id: 'streetlights', en: 'Streetlights', ta: 'தெருவிளக்குகள்' },
  { id: 'electricity_infrastructure', en: 'Electricity & Poles', ta: 'மின்சாரம் & மின்மாற்றி' },
  { id: 'public_sanitation', en: 'Public Sanitation', ta: 'பொது சுகாதாரம்' },
  { id: 'encroachment', en: 'Encroachment', ta: 'ஆக்கிரமிப்பு' },
  { id: 'public_safety', en: 'Public Safety Hazard', ta: 'பொது பாதுகாப்பு அபாயம்' },
  { id: 'other_civic_issues', en: 'Other Civic Issues', ta: 'பிற பிரச்சினைகள்' },
];

export const CitizenApp: React.FC<CitizenAppProps> = ({
  complaints,
  onRefreshComplaints,
  selectedComplaintId
}) => {
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [activeScreen, setActiveScreen] = useState<'new' | 'track' | 'notifications'>('new');
  const [trackingSearch, setTrackingSearch] = useState('');
  const [activeTrackingComplaint, setActiveTrackingComplaint] = useState<Complaint | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('auto');
  const [locationAddress, setLocationAddress] = useState('Cross Cut Road, Gandhipuram, Coimbatore 641012');
  const [landmark, setLandmark] = useState('Near 7th Street Junction');
  const [ward, setWard] = useState('Ward 35');
  const [lat, setLat] = useState(11.0168);
  const [lng, setLng] = useState(76.9558);
  const [attachedPhotos, setAttachedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80'
  ]);
  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);

  const loadPreset = (preset: 'pothole' | 'water' | 'power' | 'drainage') => {
    if (preset === 'pothole') {
      setTitle(lang === 'ta' ? 'கிராஸ் கட் ரோட்டில் விபத்து ஏற்படுத்தும் ஆழமான குழி' : 'Deep crater and asphalt erosion on Cross Cut Road');
      setDescription(lang === 'ta' ? 'சிக்னல் அருகே ஒன்றரை அடி ஆழமுள்ள பள்ளத்தால் இருசக்கர வாகனங்கள் விபத்துக்குள்ளாகின்றன. உடனடியாக சீரமைக்க வேண்டும்.' : 'Vehicles swerving to avoid 1.5-foot deep pothole near signal. Two scooters skidded last night. Immediate tar patch needed.');
      setSelectedCategory('roads_potholes');
      setLocationAddress('Cross Cut Road, Near 7th Street Junction, Gandhipuram');
      setWard('Ward 35');
      setLat(11.0168);
      setLng(76.9558);
      setAttachedPhotos(['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80']);
    } else if (preset === 'water') {
      setTitle(lang === 'ta' ? 'சிறுவாணி குடிநீர் குழாய் உடைந்து வீணாகிறது' : 'Siruvani main drinking water pipe cracked and flooding street');
      setDescription(lang === 'ta' ? 'காலை 6 மணி முதல் சுத்தமான குடிநீர் வீணாக சாக்கடையில் பாய்கிறது. 35 வீடுகளில் குடிநீர் அழுத்தம் இல்லை.' : 'Clean treated potable water gushing onto the road since 6:00 AM. Surrounding 35 households have completely lost water supply.');
      setSelectedCategory('water_supply');
      setLocationAddress('West Venkatasamy Road, RS Puram, Coimbatore');
      setWard('Ward 24');
      setLat(11.0082);
      setLng(76.9463);
      setAttachedPhotos(['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80']);
    } else if (preset === 'power') {
      setTitle(lang === 'ta' ? 'மின்மாற்றி கம்பத்தில் தீப்பொறி பறக்கும் உயர்மின்கம்பி' : 'Sparking 11kV conductor snapped from transformer post');
      setDescription(lang === 'ta' ? 'பள்ளி பேருந்து நிறுத்தம் அருகே மின்கம்பி அறுந்து ஆபத்தான முறையில் தீப்பொறி பறக்கிறது. பொதுமக்கள் அஞ்சுகின்றனர்.' : 'Live high-voltage 11kV conductor dangling and intermittently sparking next to primary school bus stop. Extreme electrocution risk.');
      setSelectedCategory('electricity_infrastructure');
      setLocationAddress('Mettupalayam Road, Near Saibaba Colony Signal');
      setWard('Ward 13');
      setLat(11.0319);
      setLng(76.9421);
      setAttachedPhotos(['https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80']);
    } else {
      setTitle(lang === 'ta' ? 'சாக்கடை அடைப்பு ஏற்பட்டு கழிவுநீர் சாலையில் பாய்கிறது' : 'Open drain blocked and toxic sewage overflowing footpath');
      setDescription(lang === 'ta' ? 'பிளாஸ்டிக் கழிவுகளால் சாக்கடை அடைபட்டு துர்நாற்றத்துடன் சாலையில் கழிவுநீர் ஓடுகிறது. கொசுக்கள் பெருகி சுகாதார சீர்கேடு.' : 'Plastic waste and silt blocking municipal storm drain. Raw black sewage spilling across pedestrian path. Severe dengue hazard.');
      setSelectedCategory('drainage_sewage');
      setLocationAddress('Avinashi Road, Near PSG Tech Gate 3, Peelamedu');
      setWard('Ward 46');
      setLat(11.0254);
      setLng(76.9981);
      setAttachedPhotos(['https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80']);
    }
  };

  // Citizen Profile
  const [citizenName, setCitizenName] = useState('Karthik Subramanian');
  const [citizenPhone, setCitizenPhone] = useState('+91 98421 55678');
  const [citizenEmail, setCitizenEmail] = useState('karthik.subramanian@gmail.com');

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<Complaint | null>(null);

  // Voice recording simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Verification state
  const [verificationFeedback, setVerificationFeedback] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);

  // Set initial selected complaint if provided
  useEffect(() => {
    if (selectedComplaintId) {
      const match = complaints.find(c => c.id === selectedComplaintId);
      if (match) {
        setActiveTrackingComplaint(match);
        setActiveScreen('track');
      }
    } else if (complaints.length > 0 && !activeTrackingComplaint) {
      setActiveTrackingComplaint(complaints[0]);
    }
  }, [selectedComplaintId, complaints]);

  // Auto-analyze title & description when user stops typing
  useEffect(() => {
    if (title.length > 5 || description.length > 15) {
      const timer = setTimeout(async () => {
        setIsAnalyzing(true);
        try {
          const res = await analyzeComplaintWithAI({
            title,
            description,
            locationText: locationAddress,
            latitude: lat,
            longitude: lng,
            userCategory: selectedCategory === 'auto' ? undefined : selectedCategory,
            preferredLanguage: lang
          });
          setAiAnalysis(res);
        } catch (e) {
          console.error(e);
        } finally {
          setIsAnalyzing(false);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [title, description, selectedCategory, locationAddress, lat, lng, lang]);

  // Voice recording simulation effect
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const toggleVoiceRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      // Simulate live speech recognition after 3.5 seconds
      setTimeout(() => {
        setIsRecording(false);
        if (lang === 'ta') {
          setTitle('குடிநீர் குழாய் உடைந்து வீணாகிறது');
          setDescription('எங்கள் பகுதியில் முக்கிய குடிநீர் விநியோக குழாய் உடைந்து சாலை முழுவதும் தண்ணீர் வீணாக பாய்கிறது. கடந்த 2 மணி நேரமாக அழுத்தம் இல்லாமல் தண்ணீர் வராமல் உள்ளது.');
        } else {
          setTitle('Severe water pipeline burst and street flooding');
          setDescription('The main municipal drinking water supply line has cracked near the main cross junction. Water is gushing onto the tarmac and 30 houses have lost water pressure.');
        }
      }, 3500);
    } else {
      setIsRecording(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setLocationAddress(`GPS Geotag: ${pos.coords.latitude.toFixed(4)}°N, ${pos.coords.longitude.toFixed(4)}°E (Gandhipuram Ward 35)`);
        },
        () => {
          setLocationAddress('Gandhipuram Cross Cut Road, Ward 35, Coimbatore 641012');
        }
      );
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setIsSubmitting(true);
    try {
      const created = await createComplaint({
        title,
        titleTa: lang === 'ta' ? title : undefined,
        description,
        descriptionTa: lang === 'ta' ? description : undefined,
        category: selectedCategory === 'auto' ? (aiAnalysis?.predictedCategory || 'roads_potholes') : selectedCategory,
        language: lang,
        location: {
          address: locationAddress,
          landmark,
          city: 'Coimbatore',
          district: 'Coimbatore',
          state: 'Tamil Nadu',
          ward,
          latitude: lat,
          longitude: lng
        },
        attachments: attachedPhotos.map((url, i) => ({
          type: 'image',
          url,
          filename: `citizen_evidence_${i + 1}.jpg`
        })),
        citizen: {
          id: 'cit-current-user',
          name: citizenName,
          phone: citizenPhone,
          email: citizenEmail
        }
      });

      setSubmitSuccess(created);
      setActiveTrackingComplaint(created);
      onRefreshComplaints();
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedCategory('auto');
      setAiAnalysis(null);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCitizenVerification = async (isSatisfied: boolean) => {
    if (!activeTrackingComplaint) return;
    setIsSubmittingVerification(true);
    try {
      const updated = await verifyResolution(activeTrackingComplaint.id, {
        isSatisfied,
        feedback: isSatisfied ? (verificationFeedback || 'Verified resolved by citizen.') : undefined,
        disputeReason: !isSatisfied ? (verificationFeedback || 'Issue still persists on site.') : undefined
      });
      setActiveTrackingComplaint(updated);
      setVerificationFeedback('');
      onRefreshComplaints();
    } catch (err: any) {
      alert(`Verification failed: ${err.message}`);
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const t = {
    appTitle: lang === 'ta' ? 'சிவிக்பல்ஸ் AI குடிமக்கள் தளம்' : 'CivicPulse AI Citizen App',
    subtitle: lang === 'ta' ? 'அதிகாரப்பூர்வ குறைதீர்க்கும் வழித்தடம்' : 'Smart Civic Accountability & Authority Routing',
    newReportTab: lang === 'ta' ? 'புதிய புகார்' : 'New Report',
    trackTab: lang === 'ta' ? 'புகார் கண்காணிப்பு' : 'Track Grievance',
    notificationsTab: lang === 'ta' ? 'அறிவிப்புகள்' : 'Notifications',
    titleLabel: lang === 'ta' ? 'புகார் தலைப்பு' : 'Complaint Title',
    titlePlaceholder: lang === 'ta' ? 'எ.கா: காந்திபுரம் சாலையில் ஆபத்தான பள்ளம்' : 'e.g., Deep pothole causing accidents near bus stop',
    descLabel: lang === 'ta' ? 'விரிவான விவரம்' : 'Detailed Description',
    descPlaceholder: lang === 'ta' ? 'பிரச்சினையின் விவரம் மற்றும் அதனால் ஏற்படும் பாதிப்புகள்...' : 'Describe what happened, exact location details, and how long it has been unresolved...',
    voiceBtn: lang === 'ta' ? 'குரல் மூலம் பேசு' : 'Speak / Voice Input',
    recordingActive: lang === 'ta' ? 'பேசுங்கள்... கேட்கிறது' : 'Listening... Speak in Tamil or English',
    categoryLabel: lang === 'ta' ? 'புகார் வகை' : 'Category',
    autoCategory: lang === 'ta' ? '🤖 தானியங்கி AI வகைப்படுத்தல்' : '🤖 AI Auto-Detect Category',
    locationLabel: lang === 'ta' ? 'சம்பவ இடம் (GPS / முகவரி)' : 'Incident Location (GPS / Landmark)',
    fetchLocation: lang === 'ta' ? 'தற்போதைய GPS இடம்' : 'Use Current GPS',
    attachPhoto: lang === 'ta' ? 'புகைப்படம் இணைக்க' : 'Attach Hazard Photo',
    submitBtn: lang === 'ta' ? 'புகாரை அதிகாரப்பூர்வமாக பதிவு செய்க' : 'Submit Complaint to CivicPulse',
    aiConfidence: lang === 'ta' ? 'AI கணிப்பு நம்பிக்கை' : 'AI Routing Confidence',
    priorityText: lang === 'ta' ? 'மதிப்பிடப்பட்ட அவசரம்' : 'Assessed Urgency',
    duplicateFound: lang === 'ta' ? 'ஒத்த புகார் கண்டறியப்பட்டது!' : 'Similar Complaint Detected Nearby',
    refNo: lang === 'ta' ? 'குறிப்பு எண்' : 'Reference Number',
    status: lang === 'ta' ? 'தற்போதைய நிலை' : 'Current Status',
    timeline: lang === 'ta' ? 'அதிகாரப்பூர்வ பொறுப்பு காலவரிசை' : 'Accountability & Delivery Timeline'
  };

  // Filter complaints for tracking search
  const filteredComplaints = complaints.filter(c => 
    c.referenceNumber.toLowerCase().includes(trackingSearch.toLowerCase()) ||
    c.title.toLowerCase().includes(trackingSearch.toLowerCase()) ||
    c.location.address.toLowerCase().includes(trackingSearch.toLowerCase())
  );

  return (
    <div className={`mx-auto py-6 px-3 sm:px-6 transition-all ${isExpandedView ? 'max-w-6xl' : 'max-w-4xl'}`}>
      
      {/* 1-Click Interactive Test Scenarios & Frame Switcher */}
      <div className="mb-4 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>1-Click Test Scenarios:</span>
          </span>
          <button
            type="button"
            onClick={() => loadPreset('pothole')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300"
          >
            🚧 Road Pothole (CCMC)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('water')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300"
          >
            💧 Pipe Burst (TWAD)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('power')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300"
          >
            ⚡ Sparking 11kV (TANGEDCO)
          </button>
          <button
            type="button"
            onClick={() => loadPreset('drainage')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer border border-slate-300"
          >
            🚯 Blocked Drain (Sanitation)
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpandedView(!isExpandedView)}
            className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {isExpandedView ? '📱 Smartphone Frame' : '💻 Expanded Portal View'}
          </button>
        </div>
      </div>

      {/* Phone Shell / Device Frame Container */}
      <div className={`bg-slate-900 shadow-2xl transition-all ${
        isExpandedView ? 'rounded-2xl p-2 sm:p-4 border-2 border-slate-800' : 'rounded-3xl p-3 sm:p-5 border-4 border-slate-800'
      }`}>
        
        {/* Device Header Bar */}
        <div className="bg-slate-900 text-slate-300 px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800 rounded-t-2xl">
          <div className="flex items-center gap-1.5 font-mono">
            <span>CivicPulse Mobile v2.6</span>
            <span className="text-emerald-400">● Live Backend API Connected</span>
          </div>
          {/* Tamil / English Switcher */}
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                lang === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLang('ta')}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                lang === 'ta' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              தமிழ்
            </button>
          </div>
        </div>

        {/* Screen Area (White background Material 3 styled) */}
        <div className="bg-slate-50 min-h-[640px] rounded-2xl overflow-hidden flex flex-col">
          
          {/* Mobile App Navigation Top Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-600" />
                <span>{t.appTitle}</span>
              </h2>
              <p className="text-xs text-slate-700">{t.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              <span>{citizenName.split(' ')[0]}</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-2 bg-white border-b border-slate-200 text-xs font-semibold">
            <button
              onClick={() => { setActiveScreen('new'); setSubmitSuccess(null); }}
              className={`py-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeScreen === 'new'
                  ? 'border-b-2 border-emerald-600 text-emerald-800 bg-emerald-50/50'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{t.newReportTab}</span>
            </button>
            <button
              onClick={() => setActiveScreen('track')}
              className={`py-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeScreen === 'track'
                  ? 'border-b-2 border-emerald-600 text-emerald-800 bg-emerald-50/50'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{t.trackTab} ({complaints.length})</span>
            </button>
          </div>

          {/* SCREEN CONTENT */}
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto">

            {/* SCREEN 1: NEW COMPLAINT FORM */}
            {activeScreen === 'new' && !submitSuccess && (
              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                
                {/* Voice Input Action Bar */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={toggleVoiceRecording}
                      className={`p-2.5 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                        isRecording 
                          ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                      title={t.voiceBtn}
                    >
                      {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        {isRecording ? `${t.recordingActive} (${recordingSeconds}s)` : t.voiceBtn}
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        {lang === 'ta' ? 'குரல் மூலம் தமிழில் புகாரை பதிவு செய்ய தட்டவும்' : 'Tap mic to dictate in Tamil or English'}
                      </span>
                    </div>
                  </div>
                  {isRecording && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
                      REC
                    </span>
                  )}
                </div>

                {/* Complaint Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {t.titleLabel} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.titlePlaceholder}
                    required
                    className="w-full text-sm px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {t.descLabel} *
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.descPlaceholder}
                    required
                    className="w-full text-sm px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* AI REAL-TIME INTELLIGENCE PREVIEW (Section 6) */}
                {isAnalyzing && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>AI Engine analyzing civic problem, severity & jurisdiction...</span>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        <span>AI Responsibility & Urgency Assessment</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                        {Math.round(aiAnalysis.categoryConfidence * 100)}% Confidence
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-600 block">Predicted Category:</span>
                        <span className="font-bold text-slate-900 capitalize">
                          {aiAnalysis.predictedCategory.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 block">Assessed Priority:</span>
                        <span className={`font-bold uppercase ${
                          aiAnalysis.priority === 'critical' ? 'text-rose-600' :
                          aiAnalysis.priority === 'high' ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          {aiAnalysis.priority} ({aiAnalysis.priorityScore}/100)
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider">
                        Why this urgency was assigned:
                      </span>
                      <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                        {aiAnalysis.priorityExplanation}
                      </p>
                    </div>

                    <div className="bg-emerald-50/80 p-2 rounded border border-emerald-200">
                      <span className="font-semibold text-emerald-950 block text-[10px] uppercase tracking-wider">
                        Target Department Recommended:
                      </span>
                      <p className="text-emerald-900 font-medium text-[11px]">
                        {aiAnalysis.recommendedDepartment}
                      </p>
                    </div>

                    {/* Duplicate Warning Check (Section 9) */}
                    {aiAnalysis.duplicateWarning?.isPossibleDuplicate && (
                      <div className="bg-amber-50 border border-amber-300 rounded p-2 text-amber-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px]">
                            {t.duplicateFound}
                          </span>
                          <span className="text-[11px] text-amber-800">
                            {aiAnalysis.duplicateWarning.reason} You can still submit this distinct report.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Category Selection (Manual override supported) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {t.categoryLabel}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="auto">{t.autoCategory}</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ta' ? `${c.ta} (${c.en})` : `${c.en} (${c.ta})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location & GPS */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      {t.locationLabel} *
                    </label>
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{t.fetchLocation}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    required
                    className="w-full text-xs sm:text-sm px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Landmark (e.g. Near 7th Street corner)"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Ward / Zone (e.g. Ward 35)"
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Photo Evidence */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {t.attachPhoto}
                  </label>
                  <div className="flex items-center gap-3">
                    {attachedPhotos.map((photo, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-emerald-500 shadow-xs">
                        <img src={photo} alt="Hazard Evidence" className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-[9px] text-white text-center py-0.5">
                          Evidence
                        </span>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const samples = [
                          'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80',
                          'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80',
                          'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop&q=80'
                        ];
                        const next = samples[(attachedPhotos.length) % samples.length];
                        setAttachedPhotos([...attachedPhotos, next]);
                      }}
                      className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-600 hover:border-emerald-500 hover:text-emerald-700 cursor-pointer text-[10px] transition-colors"
                    >
                      <Camera className="w-5 h-5 mb-0.5" />
                      <span>+ Add</span>
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Dispatching through CivicPulse AI Engine...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{t.submitBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* SCREEN 1B: SUBMIT SUCCESS DIALOG */}
            {submitSuccess && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {submitSuccess.referenceNumber}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-2">
                    {lang === 'ta' ? 'புகார் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!' : 'Complaint Logged & Dispatched!'}
                  </h3>
                  <p className="text-xs text-slate-700 mt-1">
                    {lang === 'ta'
                      ? 'உங்கள் புகார் அதிகாரப்பூர்வ பொறுப்பு வழித்தடத்திற்கு அனுப்பப்பட்டுள்ளது. கீழே நேரடி நிலையைக் கண்காணிக்கலாம்.'
                      : 'Your complaint has entered the official accountability workflow. Intelligent routing and delivery details are recorded below.'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Assigned Authority:</span>
                    <span className="font-semibold text-slate-900 text-right">
                      {submitSuccess.routing.assignedDepartment}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Delivery Status:</span>
                    <span className={`font-semibold ${
                      submitSuccess.delivery.status === 'success' ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {submitSuccess.delivery.status === 'success' ? 'Delivered to Destination' : 'Queued for Delivery'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Acknowledgement SLA:</span>
                    <span className="font-semibold text-slate-900">
                      Within 24 Hours
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveScreen('track');
                    setActiveTrackingComplaint(submitSuccess);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer"
                >
                  {t.trackTab} Now →
                </button>
              </div>
            )}

            {/* SCREEN 2: TRACKING & RESPONSIBILITY TIMELINE (Section 8) */}
            {activeScreen === 'track' && (
              <div className="space-y-4">
                
                {/* Search / Select Complaint */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by Reference Number (e.g. CP-2026-8491) or title..."
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                {/* Complaint Selection Pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {filteredComplaints.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveTrackingComplaint(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono shrink-0 transition-colors cursor-pointer border ${
                        activeTrackingComplaint?.id === c.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c.referenceNumber}
                    </button>
                  ))}
                </div>

                {/* Detailed Active Complaint Card */}
                {activeTrackingComplaint && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
                    
                    {/* Header with Reference & Priority */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {activeTrackingComplaint.referenceNumber}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            activeTrackingComplaint.priority === 'critical' ? 'bg-rose-100 text-rose-800' :
                            activeTrackingComplaint.priority === 'high' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {activeTrackingComplaint.priority} Priority
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-1">
                          {lang === 'ta' && activeTrackingComplaint.titleTa ? activeTrackingComplaint.titleTa : activeTrackingComplaint.title}
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0">
                        {new Date(activeTrackingComplaint.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Location & Authority Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-600 block text-[10px] uppercase font-semibold">Location:</span>
                        <span className="font-medium text-slate-900 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{activeTrackingComplaint.location.address}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600 block text-[10px] uppercase font-semibold">Responsible Department:</span>
                        <span className="font-medium text-slate-900 block mt-0.5">
                          {activeTrackingComplaint.routing.assignedDepartment || 'Pending Assignment'}
                        </span>
                      </div>
                    </div>

                    {/* SEPARATION OF DELIVERY vs ACKNOWLEDGEMENT STATUS (Section 7E) */}
                    <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Accountability Status Verification</span>
                        <span className="text-[10px] font-mono text-slate-700">ISO 18091 Compliant</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Delivery Status Box */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-600 block font-semibold">
                            1. External Delivery State:
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {activeTrackingComplaint.delivery.status === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="font-bold text-xs text-slate-900 capitalize">
                              {activeTrackingComplaint.delivery.status === 'success' ? 'Delivered to Destination' : 'Delivery Queued'}
                            </span>
                          </div>
                          {activeTrackingComplaint.delivery.externalReferenceId && (
                            <span className="text-[10px] font-mono text-slate-700 block mt-1 truncate">
                              Ref: {activeTrackingComplaint.delivery.externalReferenceId}
                            </span>
                          )}
                        </div>

                        {/* Acknowledgement Status Box */}
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-600 block font-semibold">
                            2. Authority Acknowledgement:
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {activeTrackingComplaint.acknowledgement.isAcknowledged ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="font-bold text-xs text-slate-900">
                              {activeTrackingComplaint.acknowledgement.isAcknowledged
                                ? 'Acknowledged by Official'
                                : 'Awaiting Official Ack'}
                            </span>
                          </div>
                          {activeTrackingComplaint.acknowledgement.acknowledgedByOfficer && (
                            <span className="text-[10px] text-slate-700 block mt-1 truncate">
                              Officer: {activeTrackingComplaint.acknowledgement.acknowledgedByOfficer.split('(')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* STEP-BY-STEP PROGRESS TIMELINE (Section 8) */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                        {t.timeline}
                      </h4>
                      <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                        
                        {/* Event 1: Internal Submission */}
                        <div className="relative flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 z-10">
                            1
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex-1 text-xs">
                            <span className="font-bold text-slate-900 block">
                              Complaint Logged in CivicPulse AI
                            </span>
                            <span className="text-slate-600 text-[11px] block">
                              Recorded by citizen with geotagged coordinates.
                            </span>
                          </div>
                        </div>

                        {/* Event 2: Routing Decision */}
                        <div className="relative flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 z-10">
                            2
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex-1 text-xs">
                            <span className="font-bold text-slate-900 block">
                              AI Responsibility Identification
                            </span>
                            <span className="text-slate-600 text-[11px] block">
                              {activeTrackingComplaint.routing.decisionReason}
                            </span>
                          </div>
                        </div>

                        {/* Event 3: External Delivery */}
                        <div className="relative flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs shrink-0 z-10 ${
                            activeTrackingComplaint.delivery.status === 'success' ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}>
                            3
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex-1 text-xs">
                            <span className="font-bold text-slate-900 block">
                              Delivery to Configured Authority Channel
                            </span>
                            <span className="text-slate-600 text-[11px] block">
                              {activeTrackingComplaint.delivery.status === 'success'
                                ? `Delivered via official adapter. External ID: ${activeTrackingComplaint.delivery.externalReferenceId || 'CCMC-GATEWAY'}`
                                : 'Pending delivery dispatch to department endpoint.'}
                            </span>
                          </div>
                        </div>

                        {/* Event 4: Acknowledgement */}
                        <div className="relative flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center text-xs shrink-0 z-10 ${
                            activeTrackingComplaint.acknowledgement.isAcknowledged ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}>
                            4
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex-1 text-xs">
                            <span className="font-bold text-slate-900 block">
                              Official Authority Acknowledgement
                            </span>
                            <span className="text-slate-600 text-[11px] block">
                              {activeTrackingComplaint.acknowledgement.isAcknowledged
                                ? `Officially confirmed by: ${activeTrackingComplaint.acknowledgement.acknowledgedByOfficer}`
                                : 'Awaiting formal receipt by duty officer.'}
                            </span>
                          </div>
                        </div>

                        {/* Event 5: Escalation (if triggered) */}
                        {activeTrackingComplaint.escalation.isEscalated && (
                          <div className="relative flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shrink-0 z-10">
                              !
                            </div>
                            <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex-1 text-xs">
                              <span className="font-bold text-rose-900 block">
                                Escalated to Tier-2 Higher Authority
                              </span>
                              <span className="text-rose-800 text-[11px] block">
                                {activeTrackingComplaint.escalation.reason}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Event 6: Resolution Verification by Citizen (Section 13) */}
                        {activeTrackingComplaint.status === 'resolution_awaiting_verification' && (
                          <div className="relative flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shrink-0 z-10">
                              ✓
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 flex-1 text-xs space-y-2">
                              <span className="font-bold text-blue-900 block">
                                Department Reported Resolution — Citizen Verification Required
                              </span>
                              <p className="text-blue-800 text-[11px]">
                                {activeTrackingComplaint.resolution?.description}
                              </p>
                              {activeTrackingComplaint.resolution?.evidencePhotos?.[0] && (
                                <img
                                  src={activeTrackingComplaint.resolution.evidencePhotos[0]}
                                  alt="Resolution Proof"
                                  className="w-full h-32 object-cover rounded-lg border border-blue-200"
                                />
                              )}

                              {/* Confirm or Dispute Actions */}
                              <div className="space-y-2 pt-2 border-t border-blue-200">
                                <textarea
                                  rows={2}
                                  placeholder="Citizen feedback or dispute reason..."
                                  value={verificationFeedback}
                                  onChange={(e) => setVerificationFeedback(e.target.value)}
                                  className="w-full text-xs p-2 bg-white border border-blue-200 rounded focus:outline-hidden"
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleCitizenVerification(true)}
                                    disabled={isSubmittingVerification}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <ThumbsUp className="w-3.5 h-3.5" />
                                    <span>Confirm Resolved</span>
                                  </button>
                                  <button
                                    onClick={() => handleCitizenVerification(false)}
                                    disabled={isSubmittingVerification}
                                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-3 rounded text-xs flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <ThumbsDown className="w-3.5 h-3.5" />
                                    <span>Dispute & Reopen</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
