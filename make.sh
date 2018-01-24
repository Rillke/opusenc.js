#!/usr/bin/env bash

function read_link {
  ( cd $(dirname $1); echo $PWD/$(basename $1) )
}

PREV_DIR="$(pwd)"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd $DIR
export OGGDIR=$(read_link libogg)
export FLACDIR=$(read_link flac)
export OPUSDIR=$(read_link opus)
export OPUSTOOLSDIR=$(read_link opus-tools)

function make_ogg {
  cd $OGGDIR
  echo -----------------------------------
  echo Making libogg
  echo -----------------------------------
  ./autogen.sh
  emconfigure ./configure
  emmake make
}

function make_flac {
  cd $FLACDIR
  echo -----------------------------------
  echo Making flac
  echo -----------------------------------
  ./autogen.sh
  emconfigure ./configure --with-ogg="$OGGDIR" --disable-doxygen-docs --disable-xmms-plugin
  cd ../libogg
  ln -s src/.libs lib
  ln -s include/ogg ogg
  cd ../flac
  emmake make
}

function make_opus {
  cd $OPUSDIR
  echo -----------------------------------
  echo Making opus
  echo -----------------------------------
  ./autogen.sh
  emconfigure ./configure CFLAGS="-O3" --disable-extra-programs --disable-doc --disable-intrinsics --disable-rtcd
  emmake make
}

function make_opustools {
  cd $OPUSTOOLSDIR
  echo -----------------------------------
  echo Building Opus-tools
  echo -----------------------------------
  rm opusenc.so

  ./autogen.sh
  export OGG_CFLAGS="-I${OGGDIR}/ogg/"
  export OGG_LIBS="-L${OGGDIR}/lib/"
  export OPUS_CFLAGS="-I${OPUSDIR}/include/"
  export OPUS_LIBS="-L${OPUSDIR}/.libs/"
  export FLAC_CFLAGS="-I${FLACDIR}/include/FLAC/"
  export FLAC_LIBS="-I${FLACDIR}/src/libFLAC/.libs/"
  emconfigure ./configure
  ln -s "${OGGDIR}/include/ogg" ogg
  ln -s "${FLACDIR}/include/FLAC/" FLAC
  emmake make
}

function make_js {
  cd $OPUSTOOLSDIR
  cp opusenc opusenc.so
  echo -----------------------------------
  echo Building JavaScript
  echo -----------------------------------
  echo "WASM ..."
  # ALLOW_MEMORY_GROWTH=1 does not cause performance penalties
  # for WASM build and changing TOTAL_MEMORY at runtime is not
  # supported.
  em++ -O3 "${OGGDIR}/lib/libogg.so" "${FLACDIR}/src/libFLAC/.libs/libFLAC.so" "${OPUSDIR}/.libs/libopus.so" opusenc.so -o opusenc.html -s EXPORTED_FUNCTIONS="['_encode_buffer']" -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s RESERVED_FUNCTION_POINTERS=1
  cp -f opusenc.js ../worker/wasm/opusenc.js
  cp -f opusenc.wasm ../worker/wasm/opusenc.wasm.png

  echo "ASM.JS ..."
  em++ -O3 --memory-init-file 1 "${OGGDIR}/lib/libogg.so" "${FLACDIR}/src/libFLAC/.libs/libFLAC.so" "${OPUSDIR}/.libs/libopus.so" opusenc.so -o opusenc.html -s EXPORTED_FUNCTIONS="['_encode_buffer']" -s RESERVED_FUNCTION_POINTERS=1
  cp -f opusenc.js ../worker/asm/opusenc.js
  cp -f opusenc.html.mem ../worker/asm/opusenc.mem.png

  cd $DIR
  echo -----------------------------------
  echo Running Press Ctrl+C to abort
  echo -----------------------------------
  emrun iframe.html
}

make_ogg
make_flac
make_opus
make_opustools
make_js

cd $PREV_DIR

