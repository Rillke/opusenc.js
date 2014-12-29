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

/*global self: false, Runtime: false, OpusEncoder: false, Module: false, FS: false, EmsArgs: false, console: false */
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

		log: function( args ) {
			global.postMessage( {
				reply: 'log',
				values: args
			} );
		},

		err: function( args ) {
			global.postMessage( {
				reply: 'err',
				values: args
			} );
		},

		encode: function( data ) {
			/*jshint forin:false */
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
				var filename, fileContent, b;

				if ( encoded === total && encoded === 100 && seconds === -1 ) {
					// Read output files
					for ( filename in data.outData ) {
						if ( !data.outData.hasOwnProperty( filename ) ) {
							return;
						}
						fileContent = FS.readFile( filename, {
							encoding: 'binary'
						} );
						b = new Blob(
							[fileContent],
							{type: data.outData[filename].MIME}
						);
						data.outData[filename].blob = b;
					}
					(data.done || OpusEncoder.done)( data.outData );
				} else {
					(data.progress || OpusEncoder.progress)(
						Array.prototype.slice.call( arguments )
					);
				}
			} );

			if (!global.console) global.console = {};
			console.log = function() {
				( data.log || OpusEncoder.log )(
					Array.prototype.slice.call( arguments )
				);
			};

			console.error = function() {
				( data.err || OpusEncoder.err )(
					Array.prototype.slice.call( arguments )
				);
			};

			var infoBuff = '',
				errBuff = '',
				lastInfoFlush = Date.now(),
				lastErrFlush = Date.now(),
				infoTimeout, errTimeout, flushInfo, flushErr;

			flushInfo = function() {
				clearTimeout( infoTimeout );
				lastInfoFlush = Date.now();
				console.log( infoBuff );
				infoBuff = '';
			};
			flushErr = function() {
				clearTimeout( errTimeout );
				lastErrFlush = Date.now();
				console.log( errBuff );
				errBuff = '';
			};
			Module.printErr = console.error;
			FS.init( global.prompt || function() {
				console.log( 'Input requested from within web worker. Returning empty string.' );
				return '';
			}, function( infoChar ) {
				infoBuff += String.fromCharCode( infoChar );
				clearTimeout( infoTimeout );
				infoTimeout = setTimeout( flushInfo, 5 );
				if ( lastInfoFlush + 700 < Date.now() ) {
					flushInfo();
				}
			}, function( errChar ) {
				errBuff += String.fromCharCode( errChar );
				clearTimeout( errTimeout );
				errTimeout = setTimeout( flushErr, 5 );
				if ( lastErrFlush + 700 < Date.now() ) {
					flushErr();
				}
			} );

			// Set module arguments (command line arguments)
			var args = data.args,
				argsCloned = args.slice( 0 );

			args.unshift( 'opusenc.js' );
			Module['arguments'] = argsCloned;

			// Create all neccessary files in MEMFS or whatever
			// the mounted file system is
			var filename;
			for ( filename in data.fileData ) {
				if ( !data.fileData.hasOwnProperty( filename ) ) {
					return;
				}
				var fileData = data.fileData[filename],
					stream = FS.open( filename, 'w+' );

				FS.write( stream, fileData, 0, fileData.length );
				FS.close( stream );
			}

			// Create output files
			for ( filename in data.outData ) {
				if ( !data.outData.hasOwnProperty( filename ) ) {
					return;
				}
				FS.close( FS.open( filename, 'w+' ) );
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