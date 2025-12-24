# Información sobre Device ID en iOS

## Cómo funciona el Device ID

### iOS (iPhone/iPad)
En iOS, utilizamos el **identifierForVendor** proporcionado por Apple a través del plugin `@capacitor/device`.

#### Características del identifierForVendor:
- ✅ **Único**: Es único para la combinación de desarrollador + dispositivo físico
- ✅ **Persistente**: Se mantiene entre actualizaciones de la app
- ✅ **Persistente entre reinstalaciones**: Si el usuario tiene al menos una app del mismo desarrollador instalada
- ⚠️ **Se resetea**: Solo si el usuario desinstala TODAS las apps del mismo desarrollador

#### Formato:
```
ios-[UUID]
```

Ejemplo: `ios-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`

### Android
En Android, utilizamos el **Android ID** que es único por dispositivo y perfil de usuario.

#### Formato:
```
android-[ID]
```

### Web (Navegador)
Para web, generamos un ID único aleatorio y lo guardamos en localStorage.

#### Formato:
```
web-[random-id][timestamp]
```

## Implementación actual

El deviceId se obtiene mediante:

1. **DeviceService** (`src/services/DeviceService.ts`)
   - Utiliza `@capacitor/device` para obtener el identifier nativo
   - Cachea el resultado para evitar llamadas repetidas
   - Valida que el identifier sea válido antes de usarlo

2. **usePersistedUser hook** (`src/hooks/usePersistedUser.ts`)
   - Inicializa el deviceId al cargar la app
   - Proporciona el deviceId a todos los componentes que lo necesiten

## Logs de diagnóstico

Se han agregado logs detallados para diagnosticar problemas:

### En DeviceService:
- Detección de plataforma
- Obtención del identifier
- Validación del formato
- Información sobre el tipo de ID según la plataforma

### En usePersistedUser:
- Estado de carga del deviceId
- Validación de que no esté vacío
- Información sobre la estructura del ID

### En Chat.tsx (al enviar audio):
- Validación de que deviceId esté disponible antes de enviar
- Información sobre sessionId y deviceId

## Privacidad y Apple Guidelines

Apple NO permite acceder al UUID físico del dispositivo por razones de privacidad. El `identifierForVendor` es la forma recomendada y aprobada por Apple para identificar dispositivos en apps.

## Notas importantes

1. El deviceId es CRÍTICO para la funcionalidad de la app ya que:
   - Identifica al usuario de forma única
   - Se usa para autenticación con el backend
   - Se usa para gestionar suscripciones y créditos

2. Si el deviceId cambia (por reinstalación completa), el usuario perderá acceso a su cuenta previa

3. Para casos de producción avanzados, se podría implementar:
   - Persistencia en Keychain de iOS (sobrevive a desinstalaciones)
   - Sistema de login con email/contraseña
   - Sistema de backup/restauración de cuenta
