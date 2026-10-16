/**
 * Node side helpers for the browser tests: creating test signals as WAV
 * and AIFF files and validating Ogg Opus files.
 */
'use strict';

/**
 * Creates interleaved 16 bit samples of one sine tone per channel.
 *
 * @param {Object} o
 * @param {number} o.rate Sample rate
 * @param {number[]} o.freqs Frequency of each channel; defines the channel count
 * @param {number} o.seconds Duration
 * @param {number} [o.amplitude] Peak amplitude (0..1)
 * @return {Int16Array}
 */
function sineSamples( { rate, freqs, seconds, amplitude = 0.3 } ) {
	const frames = Math.round( rate * seconds ),
		channels = freqs.length,
		samples = new Int16Array( frames * channels );

	for ( let i = 0; i < frames; i++ ) {
		for ( let c = 0; c < channels; c++ ) {
			samples[ i * channels + c ] = Math.round(
				32767 * amplitude * Math.sin( 2 * Math.PI * freqs[ c ] * i / rate )
			);
		}
	}
	return samples;
}

function makeWav( o ) {
	const samples = sineSamples( o ),
		channels = o.freqs.length,
		dataBytes = samples.length * 2,
		buf = Buffer.alloc( 44 + dataBytes );

	buf.write( 'RIFF', 0, 'ascii' );
	buf.writeUInt32LE( 36 + dataBytes, 4 );
	buf.write( 'WAVE', 8, 'ascii' );
	buf.write( 'fmt ', 12, 'ascii' );
	buf.writeUInt32LE( 16, 16 );
	buf.writeUInt16LE( 1, 20 );
	buf.writeUInt16LE( channels, 22 );
	buf.writeUInt32LE( o.rate, 24 );
	buf.writeUInt32LE( o.rate * channels * 2, 28 );
	buf.writeUInt16LE( channels * 2, 32 );
	buf.writeUInt16LE( 16, 34 );
	buf.write( 'data', 36, 'ascii' );
	buf.writeUInt32LE( dataBytes, 40 );
	for ( let i = 0; i < samples.length; i++ ) {
		buf.writeInt16LE( samples[ i ], 44 + i * 2 );
	}
	return buf;
}

/**
 * @param {number} value Positive integer
 * @return {Buffer} 80 bit IEEE 754 extended precision big endian number
 */
function extended80( value ) {
	const buf = Buffer.alloc( 10 );
	let exponent = Math.floor( Math.log2( value ) ),
		mantissa = BigInt( Math.round( value * Math.pow( 2, 63 - exponent ) ) );

	buf.writeUInt16BE( 16383 + exponent, 0 );
	buf.writeBigUInt64BE( mantissa, 2 );
	return buf;
}

function makeAiff( o ) {
	const samples = sineSamples( o ),
		channels = o.freqs.length,
		frames = samples.length / channels,
		dataBytes = samples.length * 2,
		buf = Buffer.alloc( 54 + dataBytes );

	buf.write( 'FORM', 0, 'ascii' );
	buf.writeUInt32BE( 46 + dataBytes, 4 );
	buf.write( 'AIFF', 8, 'ascii' );
	buf.write( 'COMM', 12, 'ascii' );
	buf.writeUInt32BE( 18, 16 );
	buf.writeUInt16BE( channels, 20 );
	buf.writeUInt32BE( frames, 22 );
	buf.writeUInt16BE( 16, 26 );
	extended80( o.rate ).copy( buf, 28 );
	buf.write( 'SSND', 38, 'ascii' );
	buf.writeUInt32BE( 8 + dataBytes, 42 );
	buf.writeUInt32BE( 0, 46 );
	buf.writeUInt32BE( 0, 50 );
	for ( let i = 0; i < samples.length; i++ ) {
		buf.writeInt16BE( samples[ i ], 54 + i * 2 );
	}
	return buf;
}

const CRC_TABLE = ( () => {
	const table = new Uint32Array( 256 );
	for ( let i = 0; i < 256; i++ ) {
		let r = i << 24;
		for ( let j = 0; j < 8; j++ ) {
			r = r & 0x80000000 ? ( r << 1 ) ^ 0x04c11db7 : r << 1;
		}
		table[ i ] = r >>> 0;
	}
	return table;
} )();

function oggCrc( buf ) {
	let crc = 0;
	for ( let i = 0; i < buf.length; i++ ) {
		crc = ( ( crc << 8 ) ^ CRC_TABLE[ ( ( crc >>> 24 ) ^ buf[ i ] ) & 0xff ] ) >>> 0;
	}
	return crc;
}

/**
 * Parses an Ogg file and verifies the page structure and checksums.
 *
 * @param {Buffer} buf
 * @return {Object} pages and packets
 */
function parseOgg( buf ) {
	const pages = [],
		packets = [];
	let offset = 0,
		partial = [];

	while ( offset < buf.length ) {
		if ( buf.toString( 'ascii', offset, offset + 4 ) !== 'OggS' ) {
			throw new Error( `Missing Ogg capture pattern at offset ${ offset }` );
		}
		const segments = buf[ offset + 26 ],
			lacing = buf.subarray( offset + 27, offset + 27 + segments ),
			headerSize = 27 + segments,
			bodySize = lacing.reduce( ( a, b ) => a + b, 0 ),
			page = Buffer.from( buf.subarray( offset, offset + headerSize + bodySize ) ),
			crc = page.readUInt32LE( 22 );

		page.writeUInt32LE( 0, 22 );
		if ( oggCrc( page ) !== crc ) {
			throw new Error( `CRC mismatch on page ${ pages.length }` );
		}
		pages.push( {
			version: buf[ offset + 4 ],
			flags: buf[ offset + 5 ],
			granule: buf.readBigInt64LE( offset + 6 ),
			serial: buf.readUInt32LE( offset + 14 ),
			sequence: buf.readUInt32LE( offset + 18 )
		} );

		let pos = offset + headerSize;
		for ( const len of lacing ) {
			partial.push( buf.subarray( pos, pos + len ) );
			pos += len;
			if ( len < 255 ) {
				packets.push( Buffer.concat( partial ) );
				partial = [];
			}
		}
		offset += headerSize + bodySize;
	}
	return { pages, packets };
}

/**
 * Validates an Ogg Opus file (RFC 7845) and returns its properties.
 *
 * @param {Buffer} buf
 * @return {Object} channels, preSkip, inputRate, vendor, tags, samples (at
 *  48 kHz, without pre-skip), audioPackets, bytes
 */
function parseOggOpus( buf ) {
	const { pages, packets } = parseOgg( buf );

	if ( !pages.length ) {
		throw new Error( 'No Ogg pages' );
	}
	pages.forEach( ( p, i ) => {
		if ( p.version !== 0 ) {
			throw new Error( `Unexpected page version ${ p.version }` );
		}
		if ( p.serial !== pages[ 0 ].serial ) {
			throw new Error( 'More than one logical stream' );
		}
		if ( p.sequence !== i ) {
			throw new Error( `Page sequence gap at page ${ i }` );
		}
	} );
	if ( !( pages[ 0 ].flags & 0x02 ) ) {
		throw new Error( 'First page lacks the beginning of stream flag' );
	}
	if ( !( pages[ pages.length - 1 ].flags & 0x04 ) ) {
		throw new Error( 'Last page lacks the end of stream flag' );
	}

	const head = packets[ 0 ];
	if ( head.toString( 'ascii', 0, 8 ) !== 'OpusHead' ) {
		throw new Error( 'First packet is not OpusHead' );
	}
	if ( head[ 8 ] !== 1 ) {
		throw new Error( `Unexpected OpusHead version ${ head[ 8 ] }` );
	}

	const tags = packets[ 1 ];
	if ( tags.toString( 'ascii', 0, 8 ) !== 'OpusTags' ) {
		throw new Error( 'Second packet is not OpusTags' );
	}
	let pos = 8;
	const vendorLength = tags.readUInt32LE( pos ),
		vendor = tags.toString( 'utf8', pos + 4, pos + 4 + vendorLength );
	pos += 4 + vendorLength;
	const count = tags.readUInt32LE( pos ),
		comments = {};
	pos += 4;
	for ( let i = 0; i < count; i++ ) {
		const len = tags.readUInt32LE( pos ),
			comment = tags.toString( 'utf8', pos + 4, pos + 4 + len ),
			eq = comment.indexOf( '=' ),
			key = comment.slice( 0, eq ).toUpperCase();

		( comments[ key ] = comments[ key ] || [] ).push( comment.slice( eq + 1 ) );
		pos += 4 + len;
	}

	const preSkip = head.readUInt16LE( 10 );
	return {
		serial: pages[ 0 ].serial,
		channels: head[ 9 ],
		preSkip,
		inputRate: head.readUInt32LE( 12 ),
		mappingFamily: head[ 18 ],
		vendor,
		tags: comments,
		samples: Number( pages[ pages.length - 1 ].granule ) - preSkip,
		audioPackets: packets.length - 2,
		bytes: buf.length
	};
}

module.exports = { makeWav, makeAiff, parseOggOpus };
