import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/complaint.dart';

class CivicApiService {
  static const String baseUrl = 'http://10.0.2.2:8000/api'; // Android emulator localhost

  Future<String> submitComplaint({
    required String title,
    String? titleTa,
    required String description,
    String? descriptionTa,
    required String category,
    required String address,
    required double lat,
    required double lng,
    String language = 'en',
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/complaints'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'title': title,
        'title_ta': titleTa,
        'description': description,
        'description_ta': descriptionTa,
        'category': category,
        'language': language,
        'location': {
          'address': address,
          'latitude': lat,
          'longitude': lng,
          'city': 'Coimbatore',
          'district': 'Coimbatore',
          'state': 'Tamil Nadu',
        },
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return data['reference_number'] ?? data['referenceNumber'] ?? 'CP-NEW';
    } else {
      throw Exception('Failed to submit complaint: \${response.body}');
    }
  }

  Future<List<ComplaintModel>> fetchComplaints() async {
    final response = await http.get(Uri.parse('$baseUrl/complaints'));
    if (response.statusCode == 200) {
      final List<dynamic> list = jsonDecode(response.body);
      return list.map((item) => ComplaintModel.fromJson(item)).toList();
    } else {
      throw Exception('Failed to load complaints');
    }
  }
}
