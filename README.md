# opusenc.js [![Build Status](https://travis-ci.org/Rillke/opusenc.js.svg?branch=master)](https://travis-ci.org/Rillke/opusenc.js)

## JavaScript Opus (audio format) Encoder

[**Project Website**](https://blog.rillke.com/opusenc.js/) • [Minimal demo](https://rawgit.com/Rillke/opusenc.js/master/iframe.html)

Opusenc.js encodes whole files to ogg-opus; this is Opus encapsulated into an Ogg container. It is supposed to do the same as the opusenc tools from the opus-tools collection and as such supports features like Vorbis comment, preserving some metadata, reading AIF, WAV, and FLAC (in its native container).

opusenc.js was built with Emscripten.

## Prerequisites
- A recent linux build system
- Emscripten 1.25.0 installed and activated

## Building
```bash
git clone git://github.com/Rillke/opusenc.js.git opusenc.js
git submodule update --init
cd opusenc.js
./make.sh
```

## Contributing
Submit patches to this GitHub repository or [file issues](https://github.com/Rillke/opusenc.js/issues).

## License
See [LICENSE.md](LICENSE.md)
