import 'package:flutter/material.dart';

class MenuDrawer extends StatelessWidget {
  const MenuDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          Container(
            height: 180,
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xff1e3a8a), Color(0xff312e81)],
              ),
            ),

            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(radius: 30, child: Icon(Icons.person)),

                SizedBox(height: 10),

                Text(
                  "User",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                Text("Thành viên D30", style: TextStyle(color: Colors.white70)),
              ],
            ),
          ),

          ListTile(
            leading: const Icon(Icons.bar_chart),
            title: const Text("Dữ liệu & báo cáo"),
            onTap: () {},
          ),

          ListTile(
            leading: const Icon(Icons.info),
            title: const Text("Về chúng tôi"),
          ),

          ListTile(
            leading: const Icon(Icons.phone),
            title: const Text("Liên hệ"),
          ),

          const Spacer(),

          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text("Đăng xuất", style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
