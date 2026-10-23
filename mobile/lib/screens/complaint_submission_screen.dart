import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../services/civic_api_service.dart';

class ComplaintSubmissionScreen extends StatefulWidget {
  const ComplaintSubmissionScreen({super.key});

  @override
  State<ComplaintSubmissionScreen> createState() => _ComplaintSubmissionScreenState();
}

class _ComplaintSubmissionScreenState extends State<ComplaintSubmissionScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _locationController = TextEditingController(text: 'Gandhipuram Ward 35, Coimbatore');
  
  String _selectedCategory = 'roads_potholes';
  Position? _currentPosition;
  XFile? _capturedImage;
  bool _isSubmitting = false;

  final CivicApiService _api = CivicApiService();

  Future<void> _fetchGPS() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    try {
      final pos = await Geolocator.getCurrentPosition();
      setState(() {
        _currentPosition = pos;
        _locationController.text = "GPS: \${pos.latitude.toStringAsFixed(4)}, \${pos.longitude.toStringAsFixed(4)} (Coimbatore)";
      });
    } catch (e) {
      // Fallback
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.camera);
    if (img != null) {
      setState(() => _capturedImage = img);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    try {
      final ref = await _api.submitComplaint(
        title: _titleController.text,
        description: _descController.text,
        category: _selectedCategory,
        address: _locationController.text,
        lat: _currentPosition?.latitude ?? 11.0168,
        lng: _currentPosition?.longitude ?? 76.9558,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: const Color(0xFF059669),
            content: Text('Complaint Logged: \$ref. Routed to Department.'),
          ),
        );
        _titleController.clear();
        _descController.clear();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(backgroundColor: Colors.red, content: Text('Error: \$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextFormField(
            controller: _titleController,
            decoration: const InputDecoration(
              labelText: 'புகார் தலைப்பு (Complaint Title)',
              border: OutlineInputBorder(),
            ),
            validator: (v) => v!.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _descController,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'விவரம் (Description)',
              border: OutlineInputBorder(),
            ),
            validator: (v) => v!.isEmpty ? 'Required' : null,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _selectedCategory,
            items: const [
              DropdownMenuItem(value: 'roads_potholes', child: Text('சாலை & பள்ளம் (Roads & Potholes)')),
              DropdownMenuItem(value: 'water_supply', child: Text('குடிநீர் (Water Supply)')),
              DropdownMenuItem(value: 'drainage_sewage', child: Text('சாக்கடை (Drainage & Sewage)')),
              DropdownMenuItem(value: 'garbage_collection', child: Text('குப்பை (Garbage Collection)')),
              DropdownMenuItem(value: 'streetlights', child: Text('தெருவிளக்கு (Streetlights)')),
              DropdownMenuItem(value: 'electricity_infrastructure', child: Text('மின்சாரம் (Electricity)')),
            ],
            onChanged: (val) {
              if (val != null) setState(() => _selectedCategory = val);
            },
            decoration: const InputDecoration(
              labelText: 'வகை (Category)',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  controller: _locationController,
                  decoration: const InputDecoration(
                    labelText: 'இடம் (Location & Ward)',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.my_location, color: Color(0xFF059669)),
                onPressed: _fetchGPS,
              ),
            ],
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            icon: const Icon(Icons.camera_alt),
            label: Text(_capturedImage == null ? 'புகைப்படம் எடுக்க (Capture Photo)' : 'புகைப்படம் இணைக்கப்பட்டது (Photo Added)'),
            onPressed: _pickImage,
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _isSubmitting ? null : _submit,
            child: _isSubmitting 
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('சமர்ப்பிக்க (Submit Complaint)'),
          ),
        ],
      ),
    );
  }
}
