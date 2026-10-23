class ComplaintModel {
  final String id;
  final String referenceNumber;
  final String title;
  final String? titleTa;
  final String description;
  final String? descriptionTa;
  final String category;
  final String status;
  final String priority;
  final int priorityScore;
  final String address;
  final double latitude;
  final double longitude;
  final String? assignedDepartment;
  final bool isDelivered;
  final bool isAcknowledged;
  final String? acknowledgedBy;
  final String createdAt;

  ComplaintModel({
    required this.id,
    required this.referenceNumber,
    required this.title,
    this.titleTa,
    required this.description,
    this.descriptionTa,
    required this.category,
    required this.status,
    required this.priority,
    required this.priorityScore,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.assignedDepartment,
    required this.isDelivered,
    required this.isAcknowledged,
    this.acknowledgedBy,
    required this.createdAt,
  });

  factory ComplaintModel.fromJson(Map<String, dynamic> json) {
    return ComplaintModel(
      id: json['id'] ?? '',
      referenceNumber: json['referenceNumber'] ?? json['reference_number'] ?? '',
      title: json['title'] ?? '',
      titleTa: json['titleTa'] ?? json['title_ta'],
      description: json['description'] ?? '',
      descriptionTa: json['descriptionTa'] ?? json['description_ta'],
      category: json['category'] ?? 'other_civic_issues',
      status: json['status'] ?? 'submitted_internal',
      priority: json['priority'] ?? 'medium',
      priorityScore: json['priorityScore'] ?? json['priority_score'] ?? 50,
      address: json['location'] != null ? json['location']['address'] : (json['address'] ?? ''),
      latitude: json['location'] != null ? (json['location']['latitude'] ?? 0.0) : (json['latitude'] ?? 0.0),
      longitude: json['location'] != null ? (json['location']['longitude'] ?? 0.0) : (json['longitude'] ?? 0.0),
      assignedDepartment: json['routing'] != null ? json['routing']['assignedDepartment'] : json['assigned_department'],
      isDelivered: json['delivery'] != null ? (json['delivery']['status'] == 'success') : (json['is_delivered'] ?? false),
      isAcknowledged: json['acknowledgement'] != null ? json['acknowledgement']['isAcknowledged'] : (json['is_acknowledged'] ?? false),
      acknowledgedBy: json['acknowledgement'] != null ? json['acknowledgement']['acknowledgedByOfficer'] : json['acknowledged_by'],
      createdAt: json['createdAt'] ?? json['created_at'] ?? '',
    );
  }
}
