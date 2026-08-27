import 'package:cloud_firestore/cloud_firestore.dart';

class PredictionModel {
  final String id;
  final String predictedMajor;
  final double totalScore;
  final dynamic createdAt;
  final List<dynamic> recommendations;
  final Map<String, dynamic> rawData;

  PredictionModel({
    required this.id,
    required this.predictedMajor,
    required this.totalScore,
    required this.createdAt,
    required this.recommendations,
    required this.rawData,
  });

  factory PredictionModel.fromMap(Map<String, dynamic> map, String id) {
    return PredictionModel(
      id: id,
      predictedMajor: map['predicted_major'] ?? '',
      totalScore: (map['total_score'] as num?)?.toDouble() ?? 0.0,
      createdAt: map['created_at'],
      recommendations: map['recommendations'] ?? [],
      rawData: map,
    );
  }

  Map<String, dynamic> data() => rawData;
  Map<String, dynamic> toDisplayMap() => rawData;
}
