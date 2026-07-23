import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import '../models/user_model.dart';

ValueNotifier<int> freeUsageCount = ValueNotifier<int>(3);

// Quản lý thông tin User toàn cục để đồng bộ UI Premium
ValueNotifier<UserModel?> currentUserNotifier = ValueNotifier<UserModel?>(null);
