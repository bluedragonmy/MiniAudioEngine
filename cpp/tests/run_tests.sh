#!/bin/sh
# Build and run all C++ tests. Run from the repo root: sh cpp/tests/run_tests.sh
set -e
mkdir -p build
CXX="g++ -std=c++17 -Wall -Icpp/include"
$CXX cpp/tests/test_aliasing.cpp cpp/src/SampleRateReducer.cpp -o build/test_aliasing
$CXX cpp/tests/test_dsp.cpp cpp/src/LowPassFilter.cpp cpp/src/AdditiveOscillator.cpp \
     cpp/src/Biquad.cpp cpp/src/Noise.cpp cpp/src/DrumSynth.cpp cpp/src/LoudnessMeter.cpp \
     cpp/src/ADSR.cpp -o build/test_dsp
./build/test_aliasing
./build/test_dsp
$CXX cpp/tests/test_engine.cpp cpp/src/WavWriter.cpp cpp/src/WavReader.cpp cpp/src/DrumVoice.cpp \
     cpp/src/SamplerEngine.cpp cpp/src/Oscillator.cpp cpp/src/ADSR.cpp -o build/test_engine
./build/test_engine
