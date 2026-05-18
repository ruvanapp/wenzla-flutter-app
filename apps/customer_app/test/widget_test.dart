import 'package:flutter_test/flutter_test.dart';

import 'package:wenzla_customer_app/main.dart';

void main() {
  testWidgets('renders customer app', (tester) async {
    await tester.pumpWidget(const SouqAlAsalApp());
    expect(find.byType(SouqAlAsalApp), findsOneWidget);
  });
}
