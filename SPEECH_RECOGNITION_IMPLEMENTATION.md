# Native Speech Recognition Implementation

## Overview
Implemented native speech recognition for mobile apps (Android/iOS) using `@capacitor-community/speech-recognition` plugin v7.0.1.

## Problem Solved
- Web Speech API doesn't work on mobile browsers
- Users were getting "no se pudo transcribir audio" error on mobile web
- Need native speech recognition for better performance and reliability on mobile

## Solution Architecture

### 1. SpeechRecognitionService (`src/services/SpeechRecognitionService.ts`)
A unified service that handles both web and native platforms:

**Features:**
- Platform detection (web vs android/ios)
- Automatic permission handling
- Web Speech API for web platform
- Capacitor plugin for android/ios platforms
- Support for 6 languages: Spanish, English, Portuguese, Italian, German, French
- Real-time transcription with partial and final results
- Error handling and callbacks

**Key Methods:**
- `isAvailable()` - Check if speech recognition is available
- `hasPermission()` - Check current permission status
- `requestPermission()` - Request microphone permissions
- `startListening(language, onResult, onError)` - Start recognition
- `stopListening()` - Stop recognition and cleanup

### 2. Updated useVoiceRecorder Hook
Modified to use the new `SpeechRecognitionService`:

**Changes:**
- Replaced Web Speech API direct calls with service calls
- Added platform-agnostic recognition handling
- Maintained backward compatibility with existing UI
- Proper cleanup on unmount

### 3. Package Dependencies
Added to `package.json`:
```json
"@capacitor-community/speech-recognition": "^7.0.1"
```

Compatible with existing Capacitor 7 dependencies:
- `@capacitor/device@^7.0.2`
- `@revenuecat/purchases-capacitor@^11.2.14`

## How It Works

### Web Platform
1. Detects browser environment using `Device.getInfo()`
2. Uses Web Speech API (SpeechRecognition/webkitSpeechRecognition)
3. Falls back gracefully if not supported

### Native Platform (Android/iOS)
1. Requests microphone permissions via Capacitor plugin
2. Uses native speech recognition APIs:
   - Android: Android Speech Recognition API
   - iOS: Apple Speech Framework
3. Provides real-time transcription with minimal latency

### Language Support
**IMPORTANT:** The Capacitor Speech Recognition plugin requires BCP-47 language codes (e.g., `es-ES`, `en-US`).

Maps application language codes to BCP-47 format:
- `es` → `es-ES` (Spanish - Spain)
- `en` → `en-US` (English - United States)
- `pt` → `pt-PT` (Portuguese - Portugal)
- `it` → `it-IT` (Italian - Italy)
- `de` → `de-DE` (German - Germany)
- `fr` → `fr-FR` (French - France)
- `ca` → `es-ES` (Catalan uses Spanish recognition)

The conversion is handled automatically in `useVoiceRecorder` hook via the `LANG_TO_BCP47` mapping.

## Testing Recommendations

### Web Testing
1. Test on Chrome/Edge (full support)
2. Test on Safari (webkit support)
3. Verify fallback on unsupported browsers

### Mobile Testing
1. **Android**: Test on Android 5.0+ devices
2. **iOS**: Test on iOS 12+ devices
3. Verify permission flows
4. Test different languages
5. Verify error handling when offline

### Integration Testing
1. Record audio in each language
2. Verify transcription accuracy
3. Test permission denial scenarios
4. Test rapid start/stop cycles
5. Verify cleanup on component unmount

## Files Modified/Created

### Created:
- `src/services/SpeechRecognitionService.ts` - Platform-agnostic speech recognition service

### Modified:
- `src/hooks/useVoiceRecorder.ts` - Updated to use new service
- `package.json` - Added speech recognition dependency

## Usage Example

```typescript
import { SpeechRecognitionService } from './services/SpeechRecognitionService';

// Check availability
const isAvailable = await SpeechRecognitionService.isAvailable();

// Request permissions
const hasPermission = await SpeechRecognitionService.requestPermission();

// Start listening
await SpeechRecognitionService.startListening(
  'es',
  (transcript, isFinal) => {
    console.log('Transcript:', transcript);
    if (isFinal) {
      console.log('Final result:', transcript);
    }
  },
  (error) => {
    console.error('Error:', error);
  }
);

// Stop listening
await SpeechRecognitionService.stopListening();
```

## Benefits

1. **Native Performance**: Uses device's built-in speech recognition on mobile
2. **Better Accuracy**: Native APIs typically have better language models
3. **Offline Support**: Some devices support offline recognition
4. **Lower Latency**: Direct access to native APIs reduces processing time
5. **Unified API**: Single interface for web and mobile platforms
6. **Proper Permissions**: Handles native permission requests correctly

## Next Steps

After deployment:
1. Monitor transcription accuracy metrics
2. Collect user feedback on recognition quality
3. Add support for additional languages if needed
4. Consider implementing offline mode indicators
5. Add analytics for permission denial rates
