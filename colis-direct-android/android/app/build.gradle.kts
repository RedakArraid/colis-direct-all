import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

// Load local signing / dev API override (not committed to git)
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) load(f.inputStream())
}

/** Échappe une URL pour buildConfigField(String, …). */
fun String.escapeForBuildConfigField(): String =
    replace("\\", "\\\\").replace("\"", "\\\"")

// Flavor dev → staging par défaut (comptes E2E, même BDD que colis-direct/.env.e2e).
// Surcharge : dev.api.base.url dans android/local.properties (ex. backend local émulateur).
val devApiBaseUrl: String = localProps.getProperty("dev.api.base.url")
    ?.trim()
    ?.let { if (it.endsWith("/")) it else "$it/" }
    ?: "https://staging-api.colisdirect.com/api/"

android {
    namespace = "ci.colisdirect.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "ci.colisdirect.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // Build flavors: dev / staging / prod
    flavorDimensions += "env"
    productFlavors {
        create("dev") {
            dimension = "env"
            applicationIdSuffix = ".dev"
            versionNameSuffix = "-dev"
            buildConfigField("String", "API_BASE_URL", "\"${devApiBaseUrl.escapeForBuildConfigField()}\"")
            buildConfigField("String", "ENV", "\"dev\"")
            resValue("string", "app_name", "ColisDirect DEV")
        }
        create("staging") {
            dimension = "env"
            applicationIdSuffix = ".staging"
            versionNameSuffix = "-staging"
            buildConfigField("String", "API_BASE_URL", "\"https://staging-api.colisdirect.com/api/\"")
            buildConfigField("String", "ENV", "\"staging\"")
            resValue("string", "app_name", "ColisDirect STAGING")
        }
        create("prod") {
            dimension = "env"
            buildConfigField("String", "API_BASE_URL", "\"https://api.colisdirect.com/api/\"")
            buildConfigField("String", "ENV", "\"prod\"")
            resValue("string", "app_name", "ColisDirect")
        }
    }

    signingConfigs {
        create("release") {
            storeFile = localProps.getProperty("storeFile")?.let { file(it) }
            storePassword = localProps.getProperty("storePassword")
            keyAlias = localProps.getProperty("keyAlias")
            keyPassword = localProps.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
        debug {
            isMinifyEnabled = false
            isDebuggable = true
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.splash)
    implementation(libs.androidx.browser)
    implementation(libs.osmdroid)

    // Compose BOM
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    implementation(libs.compose.runtime)
    implementation(libs.compose.animation)
    debugImplementation(libs.compose.ui.tooling)
    debugImplementation(libs.compose.ui.test.manifest)

    // Lifecycle + ViewModel
    implementation(libs.lifecycle.viewmodel)
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Navigation
    implementation(libs.navigation.compose)

    // Hilt DI
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    // Network
    implementation(libs.retrofit)
    implementation(libs.retrofit.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)

    // Security
    implementation(libs.security.crypto)

    // CameraX
    implementation(libs.camerax.core)
    implementation(libs.camerax.camera2)
    implementation(libs.camerax.lifecycle)
    implementation(libs.camerax.view)

    // ML Kit Barcode Scanning
    implementation(libs.mlkit.barcode)

    // Coil
    implementation(libs.coil.compose)

    // Coroutines
    implementation(libs.coroutines.android)

    // Tests
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.espresso)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.test)
}
