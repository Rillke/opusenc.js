/*!
 * Copyright © 2014 Rainer Rillke <lastname>@wikipedia.de
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

/*global */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true, worker: true */

( function( global ) {
	'use strict';

	global.audiosamples = {
		'Christoph_Nolte_-_Follow_me_up_to_Carlow.flac': {
			title: '"Follow me up to Carlow"',
			source: 'https://www.jamendo.com/de/track/453145/follow-me-up-to-carlow',
			copyright: 'Copyright 2009 Christoph Nolte, <a href="//creativecommons.org/licenses/by-sa/3.0">cc-by-sa 3.0</a>',
			info: 'Song, 16 bit 44.100 kHz, FLAC in its native container',
			size: 15.0,
			supported: true
		},
		'Christoph_Nolte_-_Follow_me_up_to_Carlow.ogg': {
			title: '"Follow me up to Carlow"',
			source: 'https://www.jamendo.com/de/track/453145/follow-me-up-to-carlow',
			copyright: 'Copyright 2009 Christoph Nolte, <a href="//creativecommons.org/licenses/by-sa/3.0">cc-by-sa 3.0</a>',
			info: 'Song, 16 bit 44.100 kHz, FLAC in an Ogg container',
			size: 15.1,
			supported: true
		},
		'snowflake_-_Like_Music_-_Renaissance_piano.flac': {
			title: '"Like Music (Renaissance)"',
			source: 'http://ccmixter.org/files/snowflake/31354',
			copyright: 'Copyright 2011 by snowflake - Licensed under <a href="//creativecommons.org/licenses/by-sa/3.0">Creative Commons Attribution Share-Alike (3.0)</a>',
			info: 'Piano, 24 bit 44.100 kHz, FLAC in its native container',
			size: 14.7,
			supported: true
		},
		'snowflake_-_Like_Music_-_Renaissance_voice.flac': {
			title: '"Like Music (Renaissance)"',
			source: 'http://ccmixter.org/files/snowflake/31354',
			copyright: 'Copyright 2011 by snowflake - Licensed under <a href="//creativecommons.org/licenses/by-sa/3.0">Creative Commons Attribution Share-Alike (3.0)</a>',
			info: 'Voice, 24 bit 44.100 kHz, FLAC in its native container',
			size: 15.2,
			supported: true
		},
		'snowflake_-_Still_Still_Still.opus': {
			title: '"Still Still Still"',
			source: 'http://ccmixter.org/files/snowflake/48448',
			copyright: 'Copyright 2014 by snowflake - Licensed under <a href="//creativecommons.org/licenses/by/3.0">Creative Commons Attribution (3.0)</a>',
			info: 'Song, 48.000 kHz, Ogg-Opus',
			size: 2.7,
			supported: false
		},
		'speech_16bit_pcm_44100hz.wav': {
			copyright: 'Copyright 2015 by Rillke - Licensed under <a href="//creativecommons.org/licenses/by/3.0">Creative Commons Attribution (3.0)</a>',
			info: 'Speech, 16 bit 44.100 kHz, PCM, WAVE',
			size: 0.7,
			supported: true
		}
	};
	$( global ).triggerHandler( 'loaded.audiosamples', global.audiosamples );
}( window ) );