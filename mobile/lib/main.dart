import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'screens/complaint_submission_screen.dart';
import 'screens/tracking_screen.dart';

void main() {
  runApp(const CivicPulseApp());
}

class CivicPulseApp extends StatefulWidget {
  const CivicPulseApp({super.key});

  @override
  State<CivicPulseApp> createState() => _CivicPulseAppState();
}

class _CivicPulseAppState extends State<CivicPulseApp> {
  Locale _locale = const Locale('ta', 'IN');

  void setLocale(Locale value) {
    setState(() {
      _locale = value;
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CivicPulse AI',
      debugShowCheckedModeBanner: false,
      locale: _locale,
      supportedLocales: const [
        Locale('en', 'US'),
        Locale('ta', 'IN'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF059669),
          brightness: Brightness.light,
        ),
      ),
      home: MainNavigation(onLocaleChange: setLocale, currentLocale: _locale),
    );
  }
}

class MainNavigation extends StatefulWidget {
  final Function(Locale) onLocaleChange;
  final Locale currentLocale;

  const MainNavigation({
    super.key,
    required this.onLocaleChange,
    required this.currentLocale,
  });

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    ComplaintSubmissionScreen(),
    ComplaintTrackingScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isTamil = widget.currentLocale.languageCode == 'ta';

    return Scaffold(
      appBar: AppBar(
        title: Text(isTamil ? 'சிவிக்பல்ஸ் AI' : 'CivicPulse AI'),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.language, size: 18),
            label: Text(isTamil ? 'English' : 'தமிழ்'),
            onPressed: () {
              widget.onLocaleChange(
                isTamil ? const Locale('en', 'US') : const Locale('ta', 'IN'),
              );
            },
          ),
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.add_circle_outline),
            selectedIcon: const Icon(Icons.add_circle),
            label: isTamil ? 'புதிய புகார்' : 'Report',
          ),
          NavigationDestination(
            icon: const Icon(Icons.timeline_outlined),
            selectedIcon: const Icon(Icons.timeline),
            label: isTamil ? 'கண்காணிப்பு' : 'Track',
          ),
        ],
      ),
    );
  }
}
