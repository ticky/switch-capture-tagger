/* global Application, Progress */
(() => {
	// Because filtering the entire Photos library is very slow,
	// we need to use a Smart Album to speed things up.
	//
	// You'll need to create a Smart Album with this exact name:
	const SMART_ALBUM_NAME = 'Switch Capture Tagger Scratch';
	// and to make sure that it has these filter settings:
	//
	//   Match [all ] of the following conditions:
	//
	//    [Camera Model ] [is empty         ]
	//    [Lens         ] [is empty         ]
	//    [Filename     ] [includes         ] [-]
	//    [Filename     ] [does not include ] [ ]
	//    [Filename     ] [does not include ] [n]
	//    [Filename     ] [does not include ] [o]
	//
	// This filter is not perfect; some non-Switch items will
	// likely show up in it. Unfortunately we can't do all the
	// filtering we need with a Smart Album, or this would be
	// more direct. Fundamentally, though, this finds items with
	// no camera information (i.e. you didn't shoot this on your
	// iPhone or any modern digital camera), excludes PNGs & MOVs,
	// and trims out a few other things.
	// The real business end of the filtering is done with the
	// regular expression here:
	const NAME_REGEX = /^(?<year>[0-9]{4})(?<month>[0-9]{2})(?<day>[0-9]{2})(?<hour>[0-9]{2})(?<minute>[0-9]{2})(?<second>[0-9]{2})[0-9]{2}-(?<titleId>[0-9A-F]{32}).(?<extension>mp4|jpg)$/;
	// Once you've run this script, it's easy to find Switch media
	// either by filtering on the "Nintendo Switch" keyword, or
	// with the keywords which include the game name.

	const ScriptRunner = Application.currentApplication();
	ScriptRunner.includeStandardAdditions = true;
	
	Progress.completedUnitCount = 0;
	Progress.description = 'Preparing';
	Progress.additionalDescription = 'Looking for source album';

	const Photos = Application('Photos');
	
	// Grab the album we're after, and check we got one and only one
	const albums = Photos.albums.whose({ name: SMART_ALBUM_NAME });
	if (albums.length !== 1) {
		ScriptRunner.displayAlert(
			'Error finding Album',
			{
				as: 'critical',
				message: `${albums.length > 1 ? 'Too many matching albums were' : 'No matching album was'} found.\n\nPlease make sure there is a “${SMART_ALBUM_NAME}” Smart Album which filters for items with empty Camera Model and Lens, and file names including “-” and not including “n”, “o” or “ ”.\n\nFor more information please see the script.`
			}
		);
		
		return 2;
	}

	Progress.additionalDescription = 'Downloading list of Nintendo Switch title IDs';

	// We pinch a mapping of title IDs to game names from the Switch-Screenshots project
	const GAME_IDS = ((url) => JSON.parse(ScriptRunner.doShellScript(`curl -sL "${url}"`)))('https://github.com/RenanGreca/Switch-Screenshots/raw/master/game_ids.json');
	
	// Keep track of how many items were Switch items, and how many needed updates
	let matchedItems = 0;
	let updatedItems = 0;

	Progress.description = 'Processing Nintendo Switch captures';
	Progress.additionalDescription = 'Getting a list of captures';

	// Here we whittle down the items further, because
	// the Smart Album can't filter on dimensions or handle
	// the _or clause we do here.
	Array.prototype.forEach.call(
		albums.first.mediaItems
			.whose({
				width: 1280,
				height: 720,
				filename: {
					_contains: '-'
				},
				_or: [
					{ filename: { _endsWith: '.mp4' } },
					{ filename: { _endsWith: '.jpg' } }
				]
			})
			.id(),
		(id, index, array) => {
			if (index === 0) {
				Progress.totalUnitCount = array.length;
			}

			Progress.additionalDescription = `Analysing capture ${index + 1} of ${array.length}`;

			// We cannot rely on the index-based collection normally returned
			// by filtering on mediaItems, as we manipulate properties which
			// may affect the ordering. Instead, we grab the IDs and always
			// look up the media item using them first.
			const mediaItem = Photos.mediaItems.byId(id);

			// We use a regular expression to check for sure if the file is a
			// Switch screenshot or video, and to pull the information out of it.
			const match = NAME_REGEX.exec(mediaItem.filename());

			// If this is null, the file isn't a Nintendo Switch one after all; skip it!
			if (!match) {
				return;
			}

			matchedItems++;
			let updated = false;

			// Grab the information out of the filename.
			const { year, month, day, hour, minute, second, titleId } = match.groups;

			// The Switch was released to the public in 2017, and until
			// system update 10.0.0 on April 16th, 2020 it emitted broken
			// date information (~Jan 1st 1970) in videos.
			//
			// If an item's date is before 2017, we'll let the date in
			// the file name take precedence for our purposes.
			if (mediaItem.date().getFullYear() < 2017) {
				// Construct a date out of the information in the filename
				//
				// Note that the filename's date is in local time, so this
				// may be inaccurate if you've been in multiple time zones
				// with your Switch.
				//
				// Manually correcting the time zone if you know you've
				// travelled is what I'd recommend!
				mediaItem.date = new Date(year, month - 1, day, hour, minute, second);
				updated = true;
			}
			
			// Additionally, we will add some Switch-related keywords.
			const keywords = mediaItem.keywords() || [];
			const originalKeywords = Array.from(keywords);
			
			// If the game title isn't known to us, we'll add something based on the ID instead
			const missingTitleString = `Nintendo Switch: Unknown title ID ${titleId}`;
			
			// Grab the game title from our list
			const gameTitle = GAME_IDS[titleId];
			if (gameTitle) {
				// Add the game title to the keywords
				const gameTitleString = `Nintendo Switch: ${gameTitle}`;
				if (keywords.indexOf(gameTitleString) === -1) {
					keywords.push(gameTitleString);
				}

				// Remove the missing title keyword if it's there
				const missingTitleIndex = keywords.indexOf(missingTitleString);
				if (missingTitleIndex !== -1) {
					keywords.splice(missingTitleIndex, 1);
				}
			} else {
				// Add the missing title string
				if (keywords.indexOf(missingTitleString) === -1) {
					keywords.push(missingTitleString);
				}
			}

			// Always add the "Nintendo Switch" keyword for Switch items
			if (keywords.indexOf('Nintendo Switch') == -1) {
				keywords.push('Nintendo Switch');
			}
			
			// Only publish keyword updates if we're changing things around
			if (keywords.length !== originalKeywords.length || !keywords.every((item, index) => item === originalKeywords[index])) {
				mediaItem.keywords = keywords;
				updated = true;
			}
			
			if (updated) {
				updatedItems++;
			}

			Progress.completedUnitCount = index + 1;
		}
	);

	Progress.description = 'Finished processing Nintendo Switch captures';
	Progress.additionalDescription = 'Reporting the results to you!';

	if (matchedItems == 0) {
		ScriptRunner.displayAlert(
			'Switch Capture Tagger',
			{
				as: 'critical',
				message: `No Switch captures were found in the “${SMART_ALBUM_NAME}” Smart Album.\n\nIf you expected some, double check they weren't renamed before importing.`
			}
		);
		
		return 1;
	} else {
		ScriptRunner.displayAlert(
			'Switch Capture Tagger',
			{
				as: 'informational',
				message: `Of the ${matchedItems.toLocaleString()} Switch capture${matchedItems.toLocaleString === 1 ? '' : 's'} in “${SMART_ALBUM_NAME}”, ${updatedItems.toLocaleString()} needed metadata updates.`
			}
		);
	}
})();