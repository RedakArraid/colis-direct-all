# shellcheck shell=bash
# À sourcer : exporte JAVA_HOME, ANDROID_HOME et PATH (adb, emulator).
if [ -z "${JAVA_HOME:-}" ]; then
  if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  elif [ -d "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
  elif [ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]; then
    export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
  fi
fi
if [ -n "${JAVA_HOME:-}" ]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [ -d "${ANDROID_HOME:-}" ]; then
  :
elif [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
if [ -n "${ANDROID_HOME:-}" ]; then
  export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
fi
