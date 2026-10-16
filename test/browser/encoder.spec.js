// @ts-check
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { test, expect } = require( '@playwright/test' );
const { makeWav, makeAiff, parseOggOpus } = require( './audio' );

const FLAC_FIXTURE = path.join( __dirname, '..', 'fixtures', 'tone-440-880.flac' );
const OUT = { 'out.opus': { MIME: 'audio/ogg' } };

/**
 * Encodes files in the browser using the worker and returns the result.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} opts See runWorker() in harness.js; files are Buffers here
 */
async function encode( page, opts ) {
	const files = {};
	for ( const [ name, data ] of Object.entries( opts.files || {} ) ) {
		files[ name ] = data.toString( 'base64' );
	}
	const result = await page.evaluate( ( o ) => self.runWorker( o ), { outData: OUT, ...opts, files } );
	result.output = result.outputs && result.outputs[ 'out.opus' ] ?
		Buffer.from( result.outputs[ 'out.opus' ].data, 'base64' ) :
		null;
	return result;
}

function expectSuccess( result ) {
	expect( result.error, `log:\n${ result.log.join( '\n' ) }\nerr:\n${ result.err.join( '\n' ) }` ).toBeNull();
	expect( result.output ).not.toBeNull();
	return parseOggOpus( result.output );
}

/**
 * Decodes the file with the browser's own Opus decoder (where available)
 * and checks duration, level and frequency of each channel.
 */
async function expectDecodesTo( page, browserName, buf, { seconds, freqs } ) {
	const supported = await page.evaluate( () => self.canDecodeOpus() );
	if ( !supported ) {
		// Chromium and Firefox decode Opus; the Linux WebKit build may not
		expect( browserName ).toBe( 'webkit' );
		test.info().annotations.push( { type: 'note', description: 'Decoding skipped: no Opus decoder in this browser' } );
		return;
	}
	const decoded = await page.evaluate( ( b64 ) => self.decodeAndAnalyse( b64 ), buf.toString( 'base64' ) );

	expect( decoded.length / decoded.sampleRate ).toBeCloseTo( seconds, 1 );
	expect( decoded.channels ).toHaveLength( freqs.length );
	decoded.channels.forEach( ( ch, i ) => {
		expect( ch.rms, `RMS of channel ${ i }` ).toBeGreaterThan( 0.1 );
		expect( Math.abs( ch.frequency - freqs[ i ] ) / freqs[ i ], `frequency of channel ${ i }` ).toBeLessThan( 0.02 );
	} );
}

test.beforeEach( async ( { page } ) => {
	await page.goto( '/test/browser/harness.html' );
} );

test( 'worker answers ping', async ( { page } ) => {
	expect( await page.evaluate( () => self.pingWorker() ) ).toEqual( { reply: 'pong' } );
} );

test( 'encodes stereo 44.1 kHz WAV', async ( { page, browserName } ) => {
	const freqs = [ 440, 1000 ];
	const result = await encode( page, {
		args: [ 'in.wav', 'out.opus' ],
		files: { 'in.wav': makeWav( { rate: 44100, freqs, seconds: 3 } ) }
	} );
	const info = expectSuccess( result );

	expect( info.channels ).toBe( 2 );
	expect( info.inputRate ).toBe( 44100 );
	expect( info.mappingFamily ).toBe( 0 );
	expect( info.preSkip ).toBeGreaterThan( 0 );
	expect( info.samples ).toBe( 3 * 48000 );
	expect( info.audioPackets ).toBeGreaterThanOrEqual( 150 );
	expect( info.vendor ).toMatch( /^libopus 1\.6\.1, libopusenc 0\.3$/ );
	expect( info.tags.ENCODER[ 0 ] ).toMatch( /^opus-tools\/opusenc https:\/\/blog\.rillke\.com\/opusenc\.js\/ from opus-tools / );
	expect( result.outputs[ 'out.opus' ].type ).toBe( 'audio/ogg' );

	// Progress: starts with (0, 0, 0), ends with (100, 100, seconds)
	expect( result.progress[ 0 ] ).toEqual( [ 0, 0, 0 ] );
	const last = result.progress[ result.progress.length - 1 ];
	expect( last.slice( 0, 2 ) ).toEqual( [ 100, 100 ] );
	expect( last[ 2 ] ).toBeCloseTo( 3, 1 );
	expect( result.log.join( '\n' ) ).toContain( 'Encoding complete' );

	await expectDecodesTo( page, browserName, result.output, { seconds: 3, freqs } );
} );

test( 'encodes FLAC and keeps its tags', async ( { page, browserName } ) => {
	const result = await encode( page, {
		args: [ 'in.flac', 'out.opus' ],
		files: { 'in.flac': fs.readFileSync( FLAC_FIXTURE ) }
	} );
	const info = expectSuccess( result );

	expect( info.channels ).toBe( 2 );
	expect( info.inputRate ).toBe( 44100 );
	expect( info.samples ).toBe( 48000 );
	expect( info.tags.TITLE ).toEqual( [ 'Test Tone' ] );
	expect( info.tags.ARTIST ).toEqual( [ 'opusenc.js tests' ] );

	await expectDecodesTo( page, browserName, result.output, { seconds: 1, freqs: [ 440, 880 ] } );
} );

test( 'encodes mono 48 kHz AIFF', async ( { page, browserName } ) => {
	const result = await encode( page, {
		args: [ 'in.aiff', 'out.opus' ],
		files: { 'in.aiff': makeAiff( { rate: 48000, freqs: [ 660 ], seconds: 2 } ) }
	} );
	const info = expectSuccess( result );

	expect( info.channels ).toBe( 1 );
	expect( info.inputRate ).toBe( 48000 );
	expect( info.samples ).toBe( 2 * 48000 );

	await expectDecodesTo( page, browserName, result.output, { seconds: 2, freqs: [ 660 ] } );
} );

test( 'applies command line options', async ( { page } ) => {
	const result = await encode( page, {
		args: [
			'--bitrate', '24', '--hard-cbr', '--downmix-mono', '--serial', '12345',
			'--title', 'Ünïcödé title', '--artist', 'Somebody', '--comment', 'FOO=bar',
			'in.wav', 'out.opus'
		],
		files: { 'in.wav': makeWav( { rate: 44100, freqs: [ 440, 1000 ], seconds: 4 } ) }
	} );
	const info = expectSuccess( result );

	expect( info.channels ).toBe( 1 );
	expect( info.serial ).toBe( 12345 );
	expect( info.tags.TITLE ).toEqual( [ 'Ünïcödé title' ] );
	expect( info.tags.ARTIST ).toEqual( [ 'Somebody' ] );
	expect( info.tags.FOO ).toEqual( [ 'bar' ] );
	// 24 kbit/s CBR for 4 seconds: 12000 bytes plus container overhead
	expect( info.bytes ).toBeGreaterThan( 12000 );
	expect( info.bytes ).toBeLessThan( 13500 );
} );

test( 'works after prefetching', async ( { page } ) => {
	const info = expectSuccess( await encode( page, {
		prefetch: true,
		args: [ 'in.wav', 'out.opus' ],
		files: { 'in.wav': makeWav( { rate: 16000, freqs: [ 300 ], seconds: 1 } ) }
	} ) );

	expect( info.inputRate ).toBe( 16000 );
	expect( info.samples ).toBe( 48000 );
} );

test( 'JavaScript fallback without WebAssembly matches the WebAssembly build', async ( { page } ) => {
	const opts = {
		args: [ '--serial', '42', 'in.wav', 'out.opus' ],
		files: { 'in.wav': makeWav( { rate: 44100, freqs: [ 440, 1000 ], seconds: 2 } ) }
	};
	const wasm = await encode( page, opts );
	const js = await encode( page, { ...opts, workerUrl: '../../worker/__nowasm.js' } );

	expectSuccess( wasm );
	expect( expectSuccess( js ).samples ).toBe( 2 * 48000 );
	// Ensure the fallback was really used
	expect( js.err.join( '\n' ) ).not.toContain( 'wasm' );
	expect( js.output.equals( wasm.output ) ).toBe( true );
} );

test( 'reports an error for unsupported input', async ( { page } ) => {
	const result = await encode( page, {
		args: [ 'in.wav', 'out.opus' ],
		files: { 'in.wav': Buffer.from( 'This is not an audio file. '.repeat( 100 ) ) },
		stopOnErr: 'exit\\(1\\)',
		timeout: 30000
	} );

	expect( result.error ).toBeNull();
	expect( result.outputs ).toBeNull();
	expect( result.err.join( '\n' ) + result.log.join( '\n' ) ).toMatch( /Error: unsupported input file: in\.wav/ );
} );

test( 'demo page encodes a file chosen by the user', async ( { page, browserName } ) => {
	await page.goto( '/iframe.html' );
	await page.setInputFiles( 'input[type=file]', {
		name: 'tone.wav',
		mimeType: 'audio/wav',
		buffer: makeWav( { rate: 44100, freqs: [ 440, 880 ], seconds: 2 } )
	} );

	const link = page.locator( 'a', { hasText: 'encoded.opus' } );
	await expect( link ).toBeVisible( { timeout: 90000 } );
	await expect( page.locator( 'progress' ) ).toHaveJSProperty( 'value', 100 );
	await expect( page.locator( 'input[type=file]' ) ).toBeDisabled();

	const b64 = await link.evaluate( async ( a ) => {
		const buf = new Uint8Array( await ( await fetch( a.href ) ).arrayBuffer() );
		let s = '';
		for ( let i = 0; i < buf.length; i++ ) {
			s += String.fromCharCode( buf[ i ] );
		}
		return btoa( s );
	} );
	const output = Buffer.from( b64, 'base64' );
	const info = parseOggOpus( output );

	await page.goto( '/test/browser/harness.html' );
	expect( info.channels ).toBe( 2 );
	expect( info.samples ).toBe( 2 * 48000 );
	await expectDecodesTo( page, browserName, output, { seconds: 2, freqs: [ 440, 880 ] } );
} );
