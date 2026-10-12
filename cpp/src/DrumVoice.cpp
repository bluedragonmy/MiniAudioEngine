#include "DrumVoice.h"
#include <cmath>
#include <algorithm>

DrumVoice::DrumVoice(double sampleRate)
    : mode(Mode::Synth), sampleRate(sampleRate),
      osc(440.0, sampleRate), synthBaseFreq(440.0),
      sampleOriginalRate(sampleRate), samplePosition(0.0),
      volumeLinear(1.0), panLeft(0.707), panRight(0.707), pitchRatio(1.0),
      currentVelocity(1.0)
{
    envelope.setSampleRate(sampleRate);
}

void DrumVoice::setMode(Mode newMode)
{
    mode = newMode;
}

void DrumVoice::setSample(const std::vector<double>& sampleData, double originalRate)
{
    sampleBuffer = sampleData;
    sampleOriginalRate = originalRate;
}

void DrumVoice::setSynthFrequency(double freq)
{
    synthBaseFreq = freq;
    osc.setFrequency(synthBaseFreq * pitchRatio);
}

void DrumVoice::setVolume(double db)
{
    volumeLinear = std::pow(10.0, db / 20.0);
}

void DrumVoice::setPan(double panValue)
{
    // Constant power panning
    double p = (std::max(-1.0, std::min(panValue, 1.0)) + 1.0) / 2.0; // 0.0 to 1.0
    panLeft = std::cos(p * 1.57079632679); // PI/2
    panRight = std::sin(p * 1.57079632679);
}

void DrumVoice::setPitch(double semitones)
{
    pitchRatio = std::pow(2.0, semitones / 12.0);
    // Synth 模式也要跟著變調（原本只有 Sampler 模式有作用）
    osc.setFrequency(synthBaseFreq * pitchRatio);
}

void DrumVoice::setEnvelope(double attack, double decay, double sustain, double release)
{
    envelope.setParameters(attack, decay, sustain, release);
}

void DrumVoice::noteOn(double velocity)
{
    currentVelocity = std::max(0.0, std::min(velocity, 1.0));
    samplePosition = 0.0;
    envelope.noteOn();
}

void DrumVoice::noteOff()
{
    envelope.noteOff();
}

void DrumVoice::reset()
{
    envelope.reset();
    samplePosition = 0.0;
}

bool DrumVoice::isActive() const
{
    return envelope.isActive();
}

void DrumVoice::process(double& outLeft, double& outRight)
{
    if (!isActive()) {
        outLeft = 0.0;
        outRight = 0.0;
        return;
    }

    double rawSample = 0.0;

    if (mode == Mode::Synth) {
        // osc 的頻率已經是 synthBaseFreq * pitchRatio（見 setPitch）
        rawSample = osc.process();
    } else {
        // Sampler mode with linear interpolation
        if (sampleBuffer.empty() || samplePosition >= sampleBuffer.size() - 1) {
            // End of sample reached, force release if not already
            envelope.noteOff();
            rawSample = 0.0;
        } else {
            int index1 = static_cast<int>(samplePosition);
            int index2 = std::min(index1 + 1, static_cast<int>(sampleBuffer.size() - 1));
            double frac = samplePosition - index1;
            
            rawSample = sampleBuffer[index1] * (1.0 - frac) + sampleBuffer[index2] * frac;
            
            // Advance position based on pitch ratio and sample rate difference
            double rateRatio = sampleOriginalRate / sampleRate;
            samplePosition += rateRatio * pitchRatio;
        }
    }

    double envValue = envelope.process();
    double finalSample = rawSample * envValue * volumeLinear * currentVelocity;

    outLeft = finalSample * panLeft;
    outRight = finalSample * panRight;
}
