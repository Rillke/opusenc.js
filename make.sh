#!/bin/sh
cd `dirname $0`
cd opus-tools
rm libogg.a
rm libopus.a
rm libFLAC-static.a
rm opusenc.so
cd ..

cd libogg
./autogen.sh
emconfigure ./configure
emmake make
# install
cp ./src/.libs/libogg.a ../opus-tools
cd ..

cd opus
./autogen.sh
emconfigure ./configure CFLAGS="-O3" --disable-extra-programs
emmake make
# install
cp ./.libs/libopus.a ../opus-tools
cd ..

cd flac
./autogen.sh
emconfigure ./configure
emmake make
# install
cp ./src/libFLAC/.libs/libFLAC-static.a ../opus-tools
cd ..

cd opus-tools
./autogen.sh
emconfigure ./configure
emmake make
# install

mv opusenc opusenc.so
em++ -O3 opusenc.so -o opusenc.html -s EXPORTED_FUNCTIONS="['_opus_decoder_create', '_opus_decode_float', '_opus_decoder_destroy', '_encode_buffer', '_main']" -s RESERVED_FUNCTION_POINTERS=1
