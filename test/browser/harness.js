/* Browser side of the opusenc.js tests; loaded by harness.html. */
( function ( global ) {
	'use strict';

	function fromBase64( s ) {
		var bin = atob( s ),
			u8 = new Uint8Array( bin.length ),
			i;

		for ( i = 0; i < bin.length; i++ ) {
			u8[ i ] = bin.charCodeAt( i );
		}
		return u8;
	}

	function toBase64( u8 ) {
		var s = '',
			chunk = 0x8000,
			i;

		for ( i = 0; i < u8.length; i += chunk ) {
			s += String.fromCharCode.apply( null, u8.subarray( i, i + chunk ) );
		}
		return btoa( s );
	}

	/**
	 * Runs opusenc.js in a web worker, the way a website would.
	 *
	 * @param {Object} opts
	 * @param {string} [opts.workerUrl] Worker entry point
	 * @param {boolean} [opts.prefetch] Post a prefetch command first
	 * @param {string[]} opts.args Command line arguments
	 * @param {Object} opts.files Input file names mapped to base64 data
	 * @param {Object} opts.outData Output file names mapped to { MIME: ... }
	 * @param {string} [opts.stopOnErr] Finish as soon as an error message
	 *  matching this regular expression arrives
	 * @param {number} [opts.timeout] Milliseconds before giving up
	 * @return {Promise<Object>} progress, log, err, outputs (base64), error
	 */
	global.runWorker = function ( opts ) {
		return new Promise( function ( resolve ) {
			var worker = new Worker( opts.workerUrl || '../../worker/EmsWorkerProxy.js' ),
				stopOnErr = opts.stopOnErr ? new RegExp( opts.stopOnErr ) : null,
				result = { progress: [], log: [], err: [], outputs: null, error: null },
				fileData = {},
				timer, name;

			function finish() {
				clearTimeout( timer );
				worker.terminate();
				resolve( result );
			}

			timer = setTimeout( function () {
				result.error = 'Timeout';
				finish();
			}, opts.timeout || 90000 );

			worker.onerror = function ( e ) {
				result.error = 'Uncaught error in worker: ' + e.message;
				finish();
			};

			worker.onmessage = function ( e ) {
				var d = e.data,
					names, pending;

				switch ( d.reply ) {
					case 'progress':
						result.progress.push( d.values );
						break;
					case 'log':
						result.log.push( d.values.join( ' ' ) );
						break;
					case 'err':
						result.err.push( d.values.join( ' ' ) );
						if ( stopOnErr && stopOnErr.test( d.values.join( ' ' ) ) ) {
							finish();
						}
						break;
					case 'done':
						result.outputs = {};
						names = Object.keys( d.values );
						pending = names.length;
						names.forEach( function ( n ) {
							d.values[ n ].blob.arrayBuffer().then( function ( buf ) {
								result.outputs[ n ] = {
									type: d.values[ n ].blob.type,
									data: toBase64( new Uint8Array( buf ) )
								};
								if ( --pending === 0 ) {
									finish();
								}
							} );
						} );
						break;
					case 'pong':
						break;
				}
			};

			for ( name in opts.files ) {
				fileData[ name ] = fromBase64( opts.files[ name ] );
			}

			if ( opts.prefetch ) {
				worker.postMessage( { command: 'prefetch' } );
			}
			worker.postMessage( {
				command: 'encode',
				args: opts.args,
				outData: opts.outData,
				fileData: fileData
			} );
		} );
	};

	/**
	 * Sends a ping to the worker and resolves with its reply.
	 */
	global.pingWorker = function () {
		return new Promise( function ( resolve, reject ) {
			var worker = new Worker( '../../worker/EmsWorkerProxy.js' );

			worker.onmessage = function ( e ) {
				worker.terminate();
				resolve( e.data );
			};
			worker.onerror = function ( e ) {
				reject( new Error( e.message ) );
			};
			worker.postMessage( { command: 'ping' } );
		} );
	};

	/**
	 * @return {boolean} Whether the browser claims to decode Ogg Opus
	 */
	global.canDecodeOpus = function () {
		return new Audio().canPlayType( 'audio/ogg; codecs=opus' ) !== '';
	};

	/**
	 * Decodes audio with the browser's own decoder and analyses it.
	 *
	 * @param {string} b64 Encoded file
	 * @return {Promise<Object>} sampleRate, length, channels with the RMS and
	 *  estimated frequency (from zero crossings) of each channel
	 */
	global.decodeAndAnalyse = function ( b64 ) {
		var ctx = new OfflineAudioContext( 1, 1, 48000 ),
			bytes = fromBase64( b64 );

		return ctx.decodeAudioData( bytes.buffer ).then( function ( audio ) {
			var channels = [],
				c, data, start, end, i, sum, crossings;

			for ( c = 0; c < audio.numberOfChannels; c++ ) {
				data = audio.getChannelData( c );
				// Skip the edges (fade in/out by the codec)
				start = Math.floor( data.length * 0.1 );
				end = Math.floor( data.length * 0.9 );
				sum = 0;
				crossings = 0;
				for ( i = start; i < end; i++ ) {
					sum += data[ i ] * data[ i ];
					if ( i > start && ( data[ i - 1 ] < 0 ) !== ( data[ i ] < 0 ) ) {
						crossings++;
					}
				}
				channels.push( {
					rms: Math.sqrt( sum / ( end - start ) ),
					frequency: crossings / 2 / ( ( end - start ) / audio.sampleRate )
				} );
			}
			return {
				sampleRate: audio.sampleRate,
				length: audio.length,
				channels: channels
			};
		} );
	};
}( self ) );
