# Switch Capture Tagger

[![AppleScript](https://github.com/ticky/switch-capture-tagger/workflows/AppleScript/badge.svg)](https://github.com/ticky/switch-capture-tagger/actions?query=workflow%3AAppleScript)

Automatically correct and update metadata in Nintendo Switch captures imported to Apple Photos

## Features

- Identifies and corrects the incorrect date and time metadata produced by Switch system software versions prior to 10.0.0
- Adds Keywords for both Nintendo Switch and individual games to each capture
- Grabs individual game names from <https://github.com/RenanGreca/Switch-Screenshots>

## Usage

You will need to set up an Album in Photos for Switch Capture Tagger to work from due to the slow nature of querying the Photos database.

The album needs to be called "Switch Capture Tagger Scratch". A Smart Album with these parameters can help to target likely Switch captures:

    Match [all ] of the following conditions:
     [Camera Model ] [is empty         ]
     [Lens         ] [is empty         ]
     [Filename     ] [includes         ] [-]
     [Filename     ] [does not include ] [ ]
     [Filename     ] [does not include ] [n]
     [Filename     ] [does not include ] [o]

Note that this works well with target albums of around 300 files on my machine. Larger albums tend to time out when querying and I have yet to find a workaround. If your Smart Album returns a very large number of items, you may need to rename it and use a manually-managed album where you drag around 150-300 items and run Switch Capture Tagger over each group. Suggestions for how to better handle this performance problem are very welcome!

## Download

You can [download the latest version from GitHub here](https://github.com/ticky/switch-capture-tagger/releases/latest).

## Building

The script is in `Switch Capture Tagger.js`, and can be opened in Script Editor and run from there (you'll need to select JavaScript where it very likely says AppleScript under the toolbar; Script Editor doesn't have a plain-text extension which indicates JavaScript).

An easier option is to run the build script, `build.sh`, which will produce a `Switch Capture Tagger` Application.

This application can be run from anywhere, and will request access to control Photos before proceeding.
