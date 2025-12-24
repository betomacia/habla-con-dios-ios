# Mobile Build Instructions

## Prerequisites

Before building for mobile, you need:

1. **Node.js and npm** (already installed)
2. **Capacitor CLI**: `npm install -g @capacitor/cli`
3. **Platform-specific tools**:
   - **For Android**: Android Studio, Java JDK 17+
   - **For iOS**: Xcode 14+ (macOS only), CocoaPods

## Initial Capacitor Setup

If Capacitor is not yet initialized in your project:

```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init

# Add platforms
npx cap add android
npx cap add ios
```

## Building the App

### 1. Build the Web App

```bash
npm run build
```

This creates the production build in `dist/` directory.

### 2. Sync with Capacitor

After every web build, sync with native platforms:

```bash
npx cap sync
```

This command:
- Copies web assets to native projects
- Updates native dependencies
- Installs Capacitor plugins

### 3. Build for Android

```bash
# Open Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to complete
2. Build → Generate Signed Bundle/APK
3. Follow the wizard to create release APK

**Or via command line:**
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

### 4. Build for iOS

```bash
# Open Xcode
npx cap open ios
```

In Xcode:
1. Select your device or simulator
2. Product → Archive
3. Follow the wizard to export IPA

## Plugin Configuration

The speech recognition plugin requires permissions:

### Android Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS Permissions

Edit `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app needs access to your microphone for voice input</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>This app needs speech recognition to convert your voice to text</string>
```

## Testing on Devices

### Android Testing

**USB Debugging:**
```bash
# Enable USB debugging on device
# Connect via USB
npx cap run android
```

**Wireless Testing:**
```bash
# Pair device via ADB
adb pair <device-ip>:port
adb connect <device-ip>:5555
npx cap run android
```

### iOS Testing

**Physical Device:**
1. Connect iPhone/iPad via USB
2. In Xcode, select your device
3. Click Run (⌘R)

**Simulator:**
```bash
npx cap run ios
```

Note: Speech recognition may not work in simulator, test on real device.

## Development Workflow

### Live Reload (Development)

```bash
# Start web dev server
npm run dev

# In another terminal, sync and run
npx cap sync
npx cap run android --livereload
# or
npx cap run ios --livereload
```

This enables hot reload - changes in your web code will reflect immediately in the app.

### Production Build Checklist

- [ ] Update version in `package.json`
- [ ] Run `npm run build`
- [ ] Run `npx cap sync`
- [ ] Test on physical devices (both Android and iOS)
- [ ] Verify speech recognition permissions work
- [ ] Test all 6 supported languages
- [ ] Check offline behavior
- [ ] Build signed release versions

## Troubleshooting

### Speech Recognition Not Working

1. **Check Permissions:**
   ```bash
   # Android
   adb shell pm list permissions -d -g | grep RECORD_AUDIO

   # iOS
   # Settings → Privacy → Microphone → Your App
   ```

2. **Verify Plugin Installation:**
   ```bash
   npx cap sync
   npm list @capacitor-community/speech-recognition
   ```

3. **Check Logs:**
   ```bash
   # Android
   adb logcat | grep SpeechRecognition

   # iOS
   # In Xcode: View → Debug Area → Activate Console
   ```

### Build Errors

**Android Gradle Issues:**
```bash
cd android
./gradlew clean
./gradlew build --refresh-dependencies
```

**iOS Pod Issues:**
```bash
cd ios/App
pod deintegrate
pod install
```

### Plugin Not Found

If you get "plugin not found" errors:

```bash
npm install @capacitor-community/speech-recognition@^7.0.1
npx cap sync
```

## Capacitor Configuration

Create/edit `capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourcompany.yourapp',
  appName: 'Your App Name',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SpeechRecognition: {
      // Plugin config if needed
    }
  }
};

export default config;
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Speech Recognition Plugin](https://github.com/capacitor-community/speech-recognition)
- [Android Studio Download](https://developer.android.com/studio)
- [Xcode Download](https://developer.apple.com/xcode/)
