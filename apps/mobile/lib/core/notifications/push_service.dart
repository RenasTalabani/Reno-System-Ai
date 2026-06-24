import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Push notification foundation.
/// Wire up Firebase Messaging (FCM) or OneSignal here when credentials are available.
/// This layer handles local notifications and provides the interface for remote push.
class PushService {
  static final _plugin = FlutterLocalNotificationsPlugin();

  static Future<void> init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(android: androidSettings, iOS: iosSettings);

    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // Request permissions on Android 13+
    await _plugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  static void _onNotificationTap(NotificationResponse response) {
    // TODO: Parse payload and navigate to relevant screen
  }

  static Future<void> showLocal({
    required String title,
    required String body,
    String? payload,
    int id = 0,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'reno_default',
      'Reno Notifications',
      channelDescription: 'General Reno System notifications',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _plugin.show(id, title, body, details, payload: payload);
  }

  static Future<void> showTicketAlert(String ticketNumber, String message) async {
    await showLocal(
      id: 1001,
      title: 'Ticket $ticketNumber',
      body: message,
      payload: 'ticket:$ticketNumber',
    );
  }

  static Future<void> showMessageAlert(String channelName, String senderName) async {
    await showLocal(
      id: 1002,
      title: '#$channelName',
      body: '$senderName sent a message',
      payload: 'channel:$channelName',
    );
  }

  static Future<void> showMeetingAlert(String meetingTitle, int minutesBefore) async {
    await showLocal(
      id: 1003,
      title: 'Meeting starting soon',
      body: '$meetingTitle starts in $minutesBefore minutes',
      payload: 'meeting',
    );
  }

  // FCM token registration — wire up when google-services.json is added
  static Future<String?> getFcmToken() async {
    // TODO: return FirebaseMessaging.instance.getToken();
    return null;
  }
}
