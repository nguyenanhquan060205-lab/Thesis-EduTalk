import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/prediction_model.dart';

class FirestoreService {
  final _db = FirebaseFirestore.instance;
  //Lâ toàn bộ lịch sử dự đoán của người dùng từ firebase
  Stream<List<PredictionModel>> getPredictionsForUser(String userId) {
    return _db
        .collection('predictions')
        .where('userId', isEqualTo: userId)
        .orderBy('timestamp', descending: true)
        .snapshots()
        .map(
          (snapshot) => snapshot.docs
              .map((doc) => PredictionModel.fromMap(doc.data(), doc.id))
              .toList(),
        );
  }
  //Xoá dữ liệu khi người dùng muốn xoá 1 dự đoán trong lịch sử

  Future<void> deletePrediction(String id) async {
    await _db.collection('predictions').doc(id).delete();
  }
}
