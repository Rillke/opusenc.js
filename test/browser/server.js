/**
 * Minimal static file server for the browser tests.
 *
 * Serves the repository root. Additionally serves a worker entry point at
 * /worker/__nowasm.js that hides WebAssembly from the worker so the
 * JavaScript (wasm2js) fallback build gets tested. It has to live in the
 * worker/ directory because the worker resolves its scripts relative to
 * its own location.
 *
 * Usage: node test/browser/server.js [port]
 */
'use strict';

const http = require( 'http' );
const fs = require( 'fs' );
const path = require( 'path' );

const ROOT = path.resolve( __dirname, '..', '..' );
const PORT = Number( process.argv[ 2 ] || process.env.PORT || 8099 );

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.png': 'image/png',
	'.wasm': 'application/wasm',
	'.flac': 'audio/flac',
	'.json': 'application/json'
};

const VIRTUAL = {
	'/worker/__nowasm.js': 'self.WebAssembly = undefined;\nimportScripts( \'EmsWorkerProxy.js\' );\n'
};

const server = http.createServer( ( req, res ) => {
	const urlPath = decodeURIComponent( new URL( req.url, 'http://localhost' ).pathname );

	if ( Object.prototype.hasOwnProperty.call( VIRTUAL, urlPath ) ) {
		res.writeHead( 200, { 'Content-Type': TYPES[ '.js' ], 'Cache-Control': 'no-store' } );
		res.end( VIRTUAL[ urlPath ] );
		return;
	}

	const file = path.join( ROOT, urlPath === '/' ? '/iframe.html' : urlPath );
	if ( file !== ROOT && !file.startsWith( ROOT + path.sep ) ) {
		res.writeHead( 403 );
		res.end( 'Forbidden' );
		return;
	}

	fs.readFile( file, ( err, data ) => {
		if ( err ) {
			res.writeHead( 404 );
			res.end( 'Not found' );
			return;
		}
		res.writeHead( 200, {
			'Content-Type': TYPES[ path.extname( file ) ] || 'application/octet-stream',
			'Cache-Control': 'no-store'
		} );
		res.end( data );
	} );
} );

server.listen( PORT, '127.0.0.1', () => {
	console.log( `Serving ${ ROOT } at http://127.0.0.1:${ PORT }/` );
} );
