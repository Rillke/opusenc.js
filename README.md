# opusenc.js [![Build Status](https://travis-ci.org/Rillke/opusenc.js.svg?branch=master)](https://travis-ci.org/Rillke/opusenc.js)

## JavaScript Opus (audio format) Encoder

[**Project Website**](https://blog.rillke.com/opusenc.js/) • [Minimal demo](https://rawgit.com/Rillke/opusenc.js/master/iframe.html)

Opusenc.js encodes whole files to ogg-opus; this is Opus encapsulated into an Ogg container. It is supposed to do the same as the opusenc tool from the [opus-tools](http://opus-codec.org/downloads/) collection and as such supports features like Vorbis comment, preserving some metadata, reading AIF, WAV, and FLAC (in its native container).

This version of opusenc.js was built with Emscripten 1.37.20; flac 1.3.2; libogg 1.3.3; opus v1.2.1; opus-tools v0.1.10

If the browser supports WebAssembly, that is used although it might be even slower and produce larger files compared to asm.js created files. The reason is currently investigated on; if you know, please enlight me.

## Building
If you just want to use opusenc.js, you don't have to build it. In this case, see [using](#using) instead.

### Prerequisites
- A recent linux build system
- Emscripten installed and activated

### Build script
```bash
git clone --recursive git://github.com/Rillke/opusenc.js.git opusenc.js
cd opusenc.js
./make.sh
```

## Using
A pre-compiled script together with some auxiliary scripts making use from JavaScript easier is in the `/worker` directory.
[iframe.html](iframe.html) is a minimal usage example. [Test it live](https://rawgit.com/Rillke/opusenc.js/master/iframe.html). It starts the encoding process posting `command: 'encode'` to the worker:
```JavaScript
var worker = new Worker( 'worker/EmsWorkerProxy.js' );
// Files to be read and posted back
// after encoding completed
var outData = {
	// File name
	'encoded.opus': {
		// MIME type
		'MIME': 'audio/ogg'
	}
};

worker.onmessage = function( e ) {
	// Handle incoming data
};

// Prepare files etc.

// Post all data and the encode command
// to the web worker
worker.postMessage( {
	command: 'encode',
	args: args,
	outData: outData,
	fileData: storedFiles
} );
```

- `command`: `'encode'|'prefetch'` DOMString that either starts encoding or prefetching the 850 KiB worker script. Posting a prefetch command in advance is optional, depends on the user experience you'd like to create and does not require further arguments. If the script is not prefetched, it will be downloaded when `'encode'` is invoked.
- `args`: Array holding the command line arguments (DOMString)
- `outData`: Object literal of information about the files that should be read out of the worker's file system after encoding completed
- `fileData`: Object literal of input file data mapping file names to `Uint8Array`s

A more extensive example is available on the [project's website](https://blog.rillke.com/opusenc.js/).

## Contributing
Submit patches to this GitHub repository or [file issues](https://github.com/Rillke/opusenc.js/issues).

## License
See [LICENSE.md](LICENSE.md)

## Open source Opus JS ports

| Implementation | Primary focus | Implementation details |
| -------------- |:-------------:| ----------------------:|
| [opusenc.js](https://github.com/Rillke/opusenc.js) | JS-Port of the opusenc command line tool (encoding from and to files); encoding larger but not huge chunks of audio to Ogg-Opus files, showcase/Opus evangelism | Written in JS; Emscripten hybrid WASM with asm.js fallback; building on Xiph.org's opusenc (which is part of opus tools) |
| [opus.js-sample](https://github.com/kazuki/opus.js-sample) | De-, encoder and resampler for raw Opus (without container) | Written in Typescript; Web-Worker; codec and resampler ported with Emscripten to asm.js; building on Xiph.org's reference implementation of opus en-/decoder |
| [opus-recorder](https://github.com/chris-rudmin/opus-recorder) | Recorder (audio source like microphone); Ogg-Opus de-and encoder and resampler | Custom Ogg implementation purely in JS; npm and bower packaging; building on Xiph.org's reference implementation of opus and speexdsp; new versions WASM-only; Old versions asm.js-only |
| [audiocogs/opus.js](https://github.com/audiocogs/opus.js) | Modular system decoding and playing Ogg-Opus as well as a lot of other audio formats (any if an appropriate plugin is available) | aurora.js (CoffeeScript) plugin; building on Xiph.org's reference implementation of opus; npm packaging; asm.js which is not labeled as such |
| [howler.js](https://github.com/goldfire/howler.js) | Audio playback shim with special effects (probably good for games) | Pure JavaScript; no Opus support compiled into; uses browser APIs for decoding and playback |
| [opus-stream.js](https://github.com/Rillke/opus-stream.js) | Opus streaming solution with de-/encoding and resampling support offering raw and packaged streaming with adjustable buffer sizes; server-side example component | Emscripten hybrid WASM with asm.js fallback, npm and bower packaging |

## Losless audio codec required?

Try [flac.js](https://github.com/Rillke/flac.js).
