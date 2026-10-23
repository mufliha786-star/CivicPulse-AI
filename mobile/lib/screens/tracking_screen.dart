import 'package:flutter/material.dart';
import '../models/complaint.dart';
import '../services/civic_api_service.dart';

class ComplaintTrackingScreen extends StatefulWidget {
  const ComplaintTrackingScreen({super.key});

  @override
  State<ComplaintTrackingScreen> createState() => _ComplaintTrackingScreenState();
}

class _ComplaintTrackingScreenState extends State<ComplaintTrackingScreen> {
  final CivicApiService _api = CivicApiService();
  late Future<List<ComplaintModel>> _complaintsFuture;

  @override
  void initState() {
    super.initState();
    _complaintsFuture = _api.fetchComplaints();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ComplaintModel>>(
      future: _complaintsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) {
          return Center(child: Text('Error: \${snapshot.error}'));
        }

        final complaints = snapshot.data ?? [];
        if (complaints.isEmpty) {
          return const Center(child: Text('No complaints logged yet.'));
        }

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: complaints.length,
          itemBuilder: (context, i) {
            final c = complaints[i];
            return Card(
              elevation: 2,
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        Text(
                          c.referenceNumber,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                        ),
                        Chip(
                          label: Text(c.priority.toUpperCase(), style: const TextStyle(fontSize: 10)),
                          backgroundColor: c.priority == 'critical' ? Colors.red.shade100 : Colors.amber.shade100,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(c.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(c.address, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Gateway Delivery', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            Text(c.isDelivered ? '✓ Delivered' : 'Pending', style: TextStyle(fontWeight: FontWeight.bold, color: c.isDelivered ? Colors.green : Colors.amber)),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Official Ack', style: TextStyle(fontSize: 10, color: Colors.grey)),
                            Text(c.isAcknowledged ? '✓ Acknowledged' : 'Awaiting', style: TextStyle(fontWeight: FontWeight.bold, color: c.isAcknowledged ? Colors.green : Colors.grey)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
