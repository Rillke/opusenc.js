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

/*global self: false, Runtime: false, OpusEncoder: false, Module: false, FS: false, EmsArgs: false */
/*jslint vars: false,  white: false */
/*jshint onevar: false, white: false, laxbreak: true, worker: true */
( function( global ) {
	'use strict';

	/**
	 * Manages encoding and progress notifications
	 *  @class OpusEncoder
	 *  @singleton
	 */
	global.OpusEncoder = {
		done: function( args ) {
			global.postMessage( {
				reply: 'done',
				values: args
			} );
		},

		progress: function( args ) {
			global.postMessage( {
				reply: 'progress',
				values: args
			} );
		},

		encode: function( data ) {
			var outFileName;

			data.importRoot = data.importRoot || '';
			// Is the main library code loaded?
			if ( !global.Module || !global.EmsArgs || !global.Runtime ) {
				importScripts(
					data.importRoot + 'EmsArgs.js',
					data.importRoot + 'opusenc.js'
				);
			}

			// Get a pointer for the callback function
			var fPointer = Runtime.addFunction( function( encoded, total, seconds ) {
				var fileContent, b;

				if ( encoded === total && encoded === 100 && seconds === -1 ) {
					fileContent = FS.readFile( outFileName, {
						encoding: 'binary'
					} );
					b = new Blob(
						[fileContent],
						{type: 'audio/ogg'}
					);
					(data.done || OpusEncoder.done)( [ b ] );
				} else {
					(data.progress || OpusEncoder.progress)(
						Array.prototype.slice.call( arguments )
					);
				}
			} );

			// Set module arguments (command line arguments)
			var args = data.args;
			Module['arguments'] = args;

			// Create all neccessary files in MEMFS or whatever
			// the mounted file system is
			// Parse arguments for finding out file names
			var filesCreated = 0;
			var arg, skipNext;
			for (var i = 0, l = args.length; i < l; ++i) {
				arg = args[i].replace( /^\s+|\s+$/g, '' );
				if ( arg.length && arg.indexOf( '-' ) === 0 ) {
					skipNext = true;
				} else if ( arg.length ) {
					if ( !skipNext ) {
						// Assume file name
						if ( 1 === filesCreated ) {
							// Input file
							// Create file and copy content to destination
							var stream = FS.open( arg, 'w+' );
							FS.write( stream, data.input, 0, data.input.length );
							FS.close( stream );
						} else if ( 2 === filesCreated ) {
							// Output file
							// Just create an empty file
							outFileName = arg;
							FS.close( FS.open( arg, 'w+' ) );
						}
						++filesCreated;
					}
					skipNext = false;
				}
			}

			// Prepare C function to be called
			var encode_buffer = Module.cwrap( 'encode_buffer', 'number', ['number', 'number', 'number'] );

			// Copy command line args to Emscripten Heap and get a pointer to them
			EmsArgs.cArgsPointer( args, function( pointerHeap ) {
				encode_buffer( args.length, pointerHeap.byteOffset, fPointer );
			} );
		}
	};

}( self ) );
