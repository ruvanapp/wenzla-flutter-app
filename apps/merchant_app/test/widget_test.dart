import 'package:flutter_test/flutter_test.dart';

import 'package:wenzla_merchant_app/main.dart';

void main() {
  testWidgets('renders merchant app', (tester) async {
    await tester.pumpWidget(const MerchantApp());
    expect(find.text('Merchant Studio'), findsOneWidget);
  });
}
