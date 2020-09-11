#!/usr/bin/env bash

set -euo pipefail

if ! command -v osacompile >/dev/null || ! command -v defaults >/dev/null || ! command -v plutil >/dev/null; then
  echo "Could not find osacompile, defaults and/or plutil commands!"
  echo "This script will only work on macOS hosts."
  exit 1
fi

TARGET="Switch Capture Tagger.app"
SOURCE="Switch Capture Tagger.js"

# We need to resolve the current directory as an absolute path for later use
SCRIPTDIR="$(cd "$(dirname "$0")" >/dev/null 2>&1; pwd -P)"

if [[ -d "$SCRIPTDIR/$TARGET" ]]; then
  echo "Removing existing build..."
  rm -rf "${SCRIPTDIR:?}/$TARGET"
fi

echo "Compiling script to app..."

osacompile -l JavaScript \
  -o "$SCRIPTDIR/$TARGET" \
  "$SCRIPTDIR/$SOURCE"

echo "Writing app metadata..."

PLIST="$SCRIPTDIR/$TARGET/Contents/Info.plist"

function deleteInfo {
  defaults delete "$PLIST" "$1"
}

function writeInfo {
  defaults write "$PLIST" "$1" "$2"
}

# We *don't* use Apple Music, Calendars, Camera, Contacts, HomeKit,
# Microphone, Photo Library API, Reminders, Siri or Administrator access
deleteInfo NSAppleMusicUsageDescription
deleteInfo NSCalendarsUsageDescription
deleteInfo NSCameraUsageDescription
deleteInfo NSContactsUsageDescription
deleteInfo NSHomeKitUsageDescription
deleteInfo NSMicrophoneUsageDescription
deleteInfo NSPhotoLibraryUsageDescription
deleteInfo NSRemindersUsageDescription
deleteInfo NSSiriUsageDescription
deleteInfo NSSystemAdministrationUsageDescription

# Update relevant metadata
writeInfo  NSAppleEventsUsageDescription  "Access to control Photos is necessary so Switch Capture Tagger can find Switch captures, read their names, and update their date, time and keywords"
writeInfo  CFBundleIdentifier             "net.jessicastokes.switch-capture-tagger"
writeInfo  CFBundleShortVersionString     "0.1.0"
writeInfo  NSHumanReadableCopyright       "Copyright © 2020 Jessica Stokes"

# For whatever reason, defaults really likes to convert to binary form,
# for readability we convert back to xml format like most other apps use
plutil -convert xml1 "$PLIST"

# TODO: Icon?

echo "Done! The app can be found at $SCRIPTDIR/$TARGET"
