# DayFlow - PWA & Push Notifications Guide

## 🎯 Overview
DayFlow is now a full-featured Progressive Web App (PWA) with push notification support!

## ✨ New Features

### 1. **Progressive Web App (PWA)**
- ✅ **Installable**: Add DayFlow to your home screen on mobile and desktop
- ✅ **Offline Support**: Access your activities even without internet
- ✅ **App-like Experience**: Runs in standalone mode without browser UI
- ✅ **Custom Icons**: Beautiful gradient icons with lightning bolt branding
- ✅ **Fast Loading**: Cached assets for instant loading

### 2. **Push Notifications**
- ✅ **Daily Reminders**: Get notifications at:
  - 12:00 PM - Lunchtime check-in
  - 6:00 PM - Evening reminder
  - 9:00 PM - End of day reminder
- ✅ **Welcome Notification**: Confirmation when notifications are enabled
- ✅ **Install Notification**: Thank you message when app is installed
- ✅ **Custom Actions**: "Log Now" and "Dismiss" buttons on notifications

### 3. **Enhanced Service Worker**
- ✅ **Smart Caching**: Cache-first strategy for assets
- ✅ **Automatic Updates**: Checks for new versions every 30 minutes
- ✅ **Background Sync**: Syncs activities when back online (extensible)
- ✅ **Periodic Sync**: Daily reminders via background sync

## 🚀 How to Use

### Installing the PWA

#### On Desktop (Chrome/Edge):
1. Open DayFlow in your browser
2. Look for the install icon (⊕) in the address bar
3. Click "Install" to add to your desktop
4. Or open browser menu → "Install DayFlow"

#### On Mobile (Android):
1. Open DayFlow in Chrome
2. Tap the menu (⋮) → "Add to Home Screen"
3. Confirm installation
4. App will appear on your home screen

#### On Mobile (iOS):
1. Open DayFlow in Safari
2. Tap the Share button (⬆)
3. Select "Add to Home Screen"
4. Confirm and add

### Enabling Notifications

1. Click the bell icon (🔔) in the header
2. Allow notifications when prompted by your browser
3. You'll receive a welcome notification
4. Daily reminders will be automatically scheduled

### Notification Schedule

**Daily reminders are sent at:**
- **12:00 PM** - "Lunchtime check-in! 🍽️ Log your morning activities."
- **6:00 PM** - "Evening reminder! 🌅 How was your day?"
- **9:00 PM** - "End of day! 🌙 Don't forget to log your achievements."

## 🔧 Technical Details

### Files Updated

1. **manifest.json**
   - Added real app icons (192x192 and 512x512)
   - Configured standalone display mode
   - Added app shortcuts
   - Set theme colors and orientation

2. **sw.js** (Service Worker)
   - Version 2 with enhanced caching
   - Push notification handlers
   - Notification click handlers
   - Background and periodic sync support
   - Offline fallback

3. **main.js**
   - PWA install prompt handling
   - Push notification subscription
   - Daily reminder scheduling
   - Improved notification permissions

4. **Icons**
   - `icon-192.png` - Small icon (192x192)
   - `icon-512.png` - Large icon (512x512)
   - Purple gradient with lightning bolt design

### Browser Support

**Full PWA Support:**
- Chrome/Edge 67+ (Desktop & Mobile)
- Safari 11.1+ (iOS & macOS)
- Firefox 79+ (Android)

**Notifications Support:**
- Chrome/Edge (Desktop & Android)
- Firefox (Desktop & Android)
- Safari 16+ (macOS)
- Note: iOS Safari has limited notification support

### Push Notification Setup

The app includes a placeholder VAPID key for push notifications. For production use:

1. **Generate VAPID Keys:**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Update the public key** in `main.js` (line ~410):
   ```javascript
   applicationServerKey: urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY')
   ```

3. **Set up a backend server** to send push notifications using the private key

### Customizing Notification Times

Edit the `reminderTimes` array in `main.js` (around line 455):

```javascript
const reminderTimes = [
    { hour: 12, minute: 0, message: 'Your custom message' },
    { hour: 18, minute: 0, message: 'Another reminder' },
    // Add more times as needed
];
```

## 🐛 Troubleshooting

### Notifications Not Working?
1. Check browser notification permissions in settings
2. Ensure notifications are enabled for the app
3. Try re-enabling notifications by clicking the bell icon
4. Check browser console for errors (F12)

### PWA Not Installing?
1. Ensure you're using HTTPS (or localhost for testing)
2. Check that manifest.json is loading correctly
3. Verify service worker is registered (check DevTools → Application)
4. Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Service Worker Not Updating?
1. Close all tabs with the app open
2. Open DevTools → Application → Service Workers
3. Click "Unregister" and refresh the page
4. Or use "Update on reload" during development

## 📱 Testing

### Test Notifications:
1. Enable notifications via the bell icon
2. Open browser console (F12)
3. Run: `showDailyReminder('Test message')`
4. You should see a notification immediately

### Test PWA Install:
1. Open DevTools → Application → Manifest
2. Check if manifest loads correctly
3. Look for install prompts in the browser

### Check Service Worker:
1. Open DevTools → Application → Service Workers
2. Verify status is "activated and running"
3. Check cache storage for cached assets

## 🔐 Privacy & Data

- All data stored locally in browser (localStorage)
- No data sent to external servers
- Notifications are local (not server-sent)
- Activities remain on your device

## 🎨 Customization

### Change App Colors:
Edit `manifest.json`:
```json
{
  "background_color": "#0f0c29",
  "theme_color": "#7b2cbf"
}
```

### Change App Icons:
Replace `icon-192.png` and `icon-512.png` with your own icons (must be square)

### Modify Cache Strategy:
Edit `sw.js` to change how assets are cached and served

## 📝 Future Enhancements

Potential features to add:
- Server-side push notifications
- Cloud sync for activities
- Analytics and insights
- Export/import activities
- Recurring reminder patterns
- Notification customization UI
- Offline activity queue

## 🤝 Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are present
3. Test in different browsers
4. Clear cache and reinstall

---

**Version**: 2.0  
**Last Updated**: November 2025  
**PWA Ready**: ✅  
**Notification Support**: ✅  
**Offline Support**: ✅
