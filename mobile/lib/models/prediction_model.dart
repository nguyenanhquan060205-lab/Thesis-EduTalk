import 'package:cloud_firestore/cloud_firestore.dart';

class RecommendatedUniversity {
  final String tenTruong;
  final String tenNganh;
  final double diemChuan2024;
  final String website;

  RecommendatedUniversity({
    required this.tenTruong,
    required this.tenNganh,
    required this.diemChuan2024,
    required this.website,
  });

  factory RecommendatedUniversity.fromMap(Map<String, dynamic> map) {
    return RecommendatedUniversity(
      tenTruong: map['tenTruong'] ?? '',
      tenNganh: map['tenNganh'] ?? '',
      diemChuan2024: (map['diemChuan2024'] as num?)?.toDouble() ?? 0.0,
      website: map['website'] ?? '',
    );
  }
}

class PredictionModel {
  final String id;
  final String userId;
  final List<double> scores;
  final String predictMajor;
  final List<RecommendatedUniversity> recommendations;
  final DateTime? timestamp;

  PredictionModel({
    required this.id,
    required this.userId,
    required this.scores,
    required this.predictMajor,
    required this.recommendations,
    this.timestamp,
  });
  factory PredictionModel.fromMap(Map<String, dynamic> map, String id) {
    return PredictionModel(
      id: id,
      userId: map['userId'] ?? '',

      scores:
          (map['scores'] as List<dynamic>?)
              ?.map((e) => (e as num).toDouble())
              .toList() ??
          [],
      predictMajor: map['predictMajor'] ?? '',
      recommendations:
          (map['recommendations'] as List<dynamic>?)
              ?.map(
                (e) =>
                    RecommendatedUniversity.fromMap(e as Map<String, dynamic>),
              )
              .toList() ??
          [],
      timestamp: (map['timestamp'] as Timestamp?)?.toDate(),
    );
  }
}
