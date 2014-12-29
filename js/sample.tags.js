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

/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true, worker: true */

( function( global ) {
	'use strict';

	global.tags = {
		'quiet': {},
		'bitrate': {
			'fmt': 'n.nnn',
			'desc': 'Target bitrate in kbit/sec (6-256/channel)',
			'constraint': '6-256/channel',
			'regexp': /^\d+(?:\.\d*)?$/
		},
		'hard-cbr': {},
		'vbr': {},
		'cvbr': {},
		'comp': {
			'fmt': 'n',
			'desc': 'Encoding complexity (0-10, default: 10 (slowest))',
			'constraint': '0-10',
			'regexp': /^(?:\d|10)$/
		},
		'complexity': {
			'fmt': 'n',
			'desc': 'Encoding complexity (0-10, default: 10 (slowest))',
			'constraint': '0-10',
			'regexp': /^(?:\d|10)$/
		},
		'framesize': {
			'fmt': 'n',
			'desc': 'Maximum frame size in milliseconds (2.5, 5, 10, 20, 40, 60, default: 20)',
			'constraint': '2.5, 5, 10, 20, 40, 60',
			'regexp': /^(?:2\.5|5|10|20|40|60)$/
		},
		'expect-loss': {
			'fmt': 'n',
			'desc': 'Percentage packet loss to expect (default: 0)',
			'constraint': '0-100',
			'regexp': /^(?:\d{1,2}|100)$/
		},
		'downmix-mono': {},
		'downmix-stereo': {},
		'no-downmix': {},
		'max-delay': {
			'fmt': 'n',
			'desc': 'Maximum container delay in milliseconds (0-1000, default: 1000)',
			'constraint': '0-1000',
			'regexp': /^(?:[0-9]{1,3}|1000)$/
		},
		'serial': {
			'fmt': 'n',
			'desc': 'Forces a specific stream serial number',
			'regexp': /^\d*$/
		},
		'save-range': {
			'fmt': 'file.checkvalues.txt',
			'desc': 'Saves check values for every frame to a file',
			'regexp': /.*/,
			'outfile': {
				'MIME': 'text/plain'
			}
		},
		'set-ctl-int': {
			'fmt': 'x=y',
			'desc': 'Pass the encoder control x with value y (advanced)\n' +
				'Preface with s: to direct the ctl to multistream s\n' +
				'This may be used multiple times',
			'regexp': /.*/
		},
		'help': {
			'short': 'h'
		},
		'raw': {},
		'raw-bits': {
			'fmt': 'n',
			'desc': 'Set bits/sample for raw input (8, 16 or 24; default: 16)',
			'constraint': '8, 16 or 24',
			'regexp': /^(?:8|16|24)$/
		},
		'raw-rate': {
			'fmt': 'n',
			'desc': 'Set sampling rate for raw input (8000, 12000, 16000, 24000, 48000; default: 48000)',
			'constraint': '8000, 12000, 16000, 24000, 48000',
			'regexp': /^(?:8|12|16|24|48)000$/
		},
		'raw-chan': {
			'fmt': 'n',
			'desc': 'Set number of channels for raw input (default: 2)',
			'regexp': /^\d+$/
		},
		'raw-endianness': {
			'fmt': 'n',
			'desc': '1 for bigendian, 0 for little (defaults to 0)',
			'constraint': '0 or 1',
			'regexp': /^(?:1|0)$/
		},
		'ignorelength': {},
		'version': {
			'short': 'V'
		},
		'version-short': {},
		'comment': {
			'fmt': 'string',
			'desc': 'Add the given string as an extra comment\n' +
				'This may be used multiple times',
			'regexp': /.*/
		},
		'artist': {
			'fmt': 'string',
			'desc': 'Author of this track',
			'regexp': /.*/
		},
		'title': {
			'fmt': 'string',
			'desc': 'Title for this track',
			'regexp': /.*/
		},
		'album': {
			'fmt': 'string',
			'desc': 'Album or collection this track belongs to',
			'regexp': /.*/
		},
		'date': {
			'fmt': 'string',
			'desc': 'Date for this track',
			'regexp': /.*/
		},
		'genre': {
			'fmt': 'string',
			'desc': 'Genre for this track',
			'regexp': /.*/
		},
		'picture': {
			'desc': 'Album art for this track\n' +
				'More than one --picture option can be specified.\n' +
				'Either a FILENAME for the picture file or a more\n' +
				'complete SPECIFICATION form can be used. The\n' +
				'SPECIFICATION is a string whose parts are\n' +
				'separated by | (pipe) characters. Some parts may\n' +
				'be left empty to invoke default values. A\n' +
				'FILENAME is just shorthand for \"||||FILENAME\".\n' +
				'The format of SPECIFICATION is\n' +
				'\n' +
				'[TYPE]|[MIME-TYPE]|[DESCRIPTION]|[WIDTHxHEIGHT\n' +
				'xDEPTH[/COLORS]]|FILENAME\n' +
				'\n' +
				'TYPE is an optional number from one of:\n' +
				'0: Other\n' +
				'...',
			'fmt': 'file',
			'infile': {
				'accept': 'image/*,.png,.jpg'
			},
			'regexp': /.*/
		},
		'padding': {
			'fmt': 'n',
			'desc': 'Extra bytes to reserve for metadata (default: 512)',
			'regexp': /^\d+$/
		},
		'discard-comments': {},
		'discard-pictures': {}
	};
}( window ) );
