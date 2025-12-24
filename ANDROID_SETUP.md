# Configuración Android

## Paso 1: Crear capacitor.config.json

Crear en la raíz del proyecto el archivo `capacitor.config.json`:

```json
{
  "appId": "es.movilive.hablacondios2",
  "appName": "Habla con Dios",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

## Paso 2: Configurar AndroidManifest.xml

Después de ejecutar `npx cap add android`, editar el archivo:
`android/app/src/main/AndroidManifest.xml`

Reemplazar TODO el contenido por:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="com.android.vending.BILLING" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>
</manifest>
```

## Pasos completos:

1. Crear `capacitor.config.json` en la raíz del proyecto (ver Paso 1)
2. Ejecutar: `npm run build`
3. Ejecutar: `npx cap add android`
4. Abrir `android/app/src/main/AndroidManifest.xml`
5. Reemplazar el contenido completo con el XML de arriba (ver Paso 2)
6. Abrir el proyecto en Android Studio
7. Recompilar: `Build > Rebuild Project`
8. Desinstalar la app antigua del dispositivo (importante)
9. Instalar la nueva versión desde Android Studio

## Permisos incluidos:

- `INTERNET` - Conexión de red
- `RECORD_AUDIO` - Grabación de audio/micrófono
- `MODIFY_AUDIO_SETTINGS` - Configuración de audio
- `BILLING` - Compras in-app con Google Play
