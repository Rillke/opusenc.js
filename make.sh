#!/usr/bin/env bash
#
# Builds opusenc.js with Emscripten.
#
# Usage: ./make.sh [--no-run]
#   --no-run  Do not start emrun after building (e.g. on CI)
#
# All libraries are built out-of-tree in ./build and installed as static
# libraries into ./build/prefix so the submodules' working trees stay clean.

set -e

RUN_EMRUN=1
if [ "$1" = "--no-run" ]; then
  RUN_EMRUN=0
fi

PREV_DIR="$(pwd)"
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export OGGDIR="$DIR/libogg"
export FLACDIR="$DIR/flac"
export OPUSDIR="$DIR/opus"
export OPUSENCDIR="$DIR/libopusenc"
export OPUSTOOLSDIR="$DIR/opus-tools"

BUILDDIR="$DIR/build"
PREFIX="$BUILDDIR/prefix"
JOBS="$(nproc 2>/dev/null || echo 2)"

# emconfigure points pkg-config to Emscripten's sysroot; also let it find
# the libraries built here, and nothing from the host system.
export EM_PKG_CONFIG_PATH="$PREFIX/lib/pkgconfig"

CONFIGURE_FLAGS=(
  --host=wasm32-unknown-emscripten
  --prefix="$PREFIX"
  --disable-shared
  --enable-static
)

function enter_build_dir {
  rm -rf "$BUILDDIR/$1"
  mkdir -p "$BUILDDIR/$1"
  cd "$BUILDDIR/$1"
}

function make_ogg {
  echo -----------------------------------
  echo Making libogg
  echo -----------------------------------
  "$OGGDIR/autogen.sh"
  enter_build_dir libogg
  emconfigure "$OGGDIR/configure" "${CONFIGURE_FLAGS[@]}"
  emmake make -j"$JOBS"
  emmake make install
}

function make_flac {
  echo -----------------------------------
  echo Making flac
  echo -----------------------------------
  "$FLACDIR/autogen.sh"
  enter_build_dir flac
  emconfigure "$FLACDIR/configure" "${CONFIGURE_FLAGS[@]}" \
    --with-ogg="$PREFIX" \
    --disable-programs \
    --disable-examples \
    --disable-cpplibs \
    --disable-doxygen-docs \
    --disable-asm-optimizations \
    --disable-multithreading \
    --disable-stack-smash-protection \
    --disable-version-from-git
  # Only build and install the headers and libFLAC (skips e.g. man pages)
  emmake make -j"$JOBS" -C src/libFLAC
  emmake make -C include install
  emmake make -C src/libFLAC install
}

function make_opus {
  echo -----------------------------------
  echo Making opus
  echo -----------------------------------
  # opus' autogen.sh additionally downloads the neural network models
  # which are only needed for DRED, deep PLC and OSCE (all disabled).
  ( cd "$OPUSDIR" && autoreconf -isf )
  enter_build_dir opus
  emconfigure "$OPUSDIR/configure" "${CONFIGURE_FLAGS[@]}" CFLAGS="-O3" \
    --disable-extra-programs \
    --disable-doc \
    --disable-intrinsics \
    --disable-rtcd \
    --disable-stack-protector
  emmake make -j"$JOBS"
  emmake make install
}

function make_opusenc {
  echo -----------------------------------
  echo Making libopusenc
  echo -----------------------------------
  "$OPUSENCDIR/autogen.sh"
  enter_build_dir libopusenc
  emconfigure "$OPUSENCDIR/configure" "${CONFIGURE_FLAGS[@]}" CFLAGS="-O3" \
    --disable-examples \
    --disable-doc
  emmake make -j"$JOBS"
  emmake make install
}

function make_opustools {
  echo -----------------------------------
  echo Building Opus-tools
  echo -----------------------------------
  "$OPUSTOOLSDIR/autogen.sh"
  enter_build_dir opus-tools
  # Only opusenc is built; opusfile (required for opusdec) is not needed.
  emconfigure "$OPUSTOOLSDIR/configure" "${CONFIGURE_FLAGS[@]}" CFLAGS="-O3" \
    --disable-stack-protector \
    OPUSFILE_CFLAGS=" " OPUSFILE_LIBS=" " \
    OPUSURL_CFLAGS=" " OPUSURL_LIBS=" "
}

function make_js {
  cd "$BUILDDIR/opus-tools"
  echo -----------------------------------
  echo Building JavaScript
  echo -----------------------------------
  # ALLOW_MEMORY_GROWTH=1 does not cause performance penalties
  # for WASM build and changing INITIAL_MEMORY at runtime is not
  # supported.
  # libopus and opusenc need much more stack than the 64 KiB Emscripten
  # reserves by default nowadays; use the former default of 5 MiB.
  local LINK_FLAGS="-O3 \
    -sSTACK_SIZE=5MB \
    -sEXPORTED_FUNCTIONS=_encode_buffer,_malloc,_free \
    -sEXPORTED_RUNTIME_METHODS=FS,cwrap,addFunction,HEAPU8 \
    -sFORCE_FILESYSTEM=1 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sALLOW_TABLE_GROWTH=1 \
    -sENVIRONMENT=worker \
    -sEXECUTABLE=0"

  echo "WASM ..."
  rm -f opusenc opusenc.wasm
  emmake make -j"$JOBS" opusenc LDFLAGS="$LINK_FLAGS -sWASM=1"
  cp -f opusenc "$DIR/worker/wasm/opusenc.js"
  cp -f opusenc.wasm "$DIR/worker/wasm/opusenc.wasm.png"

  # Fallback for browsers without WebAssembly support (wasm2js)
  echo "JavaScript (no WASM) ..."
  rm -f opusenc opusenc.wasm
  emmake make -j"$JOBS" opusenc LDFLAGS="$LINK_FLAGS -sWASM=0"
  cp -f opusenc "$DIR/worker/asm/opusenc.js"
}

make_ogg
make_flac
make_opus
make_opusenc
make_opustools
make_js

cd "$DIR"
if [ "$RUN_EMRUN" = "1" ]; then
  echo -----------------------------------
  echo Running Press Ctrl+C to abort
  echo -----------------------------------
  emrun iframe.html
fi

cd "$PREV_DIR"
