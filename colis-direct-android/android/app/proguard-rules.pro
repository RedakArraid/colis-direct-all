# ProGuard rules for ColisDirect

# ======================== GENERIC ========================
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ======================== KOTLIN ========================
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings { <fields>; }

# ======================== HILT ========================
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keepclassmembers class * {
    @javax.inject.Inject <init>(...);
    @javax.inject.Inject <fields>;
}

# ======================== RETROFIT / OKHTTP ========================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions
-dontwarn retrofit2.Platform$Java8

# ======================== GSON / API MODELS ========================
# Keep all API models for Gson serialization
-keep class ci.colisdirect.app.data.api.model.** { *; }
-keepclassmembers class ci.colisdirect.app.data.api.model.** {
    <fields>;
    <init>();
}
-dontnote sun.misc.Unsafe

# ======================== ML KIT ========================
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
-keep class com.google.android.gms.** { *; }

# ======================== CAMERAX ========================
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ======================== SECURITY CRYPTO ========================
-keep class androidx.security.crypto.** { *; }

# ======================== COMPOSE ========================
-keep class androidx.compose.** { *; }

# ======================== APP CLASSES ========================
-keep class ci.colisdirect.app.** { *; }
