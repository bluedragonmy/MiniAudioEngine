#pragma once

#include "Oscillator.h"
#include "ADSR.h"
#include <vector>

class DrumVoice
{
public:
    enum class Mode {
        Synth,
        Sampler
    };

    DrumVoice(double sampleRate);
    
    // Core parameters
    void setMode(Mode newMode);
    void setSample(const std::vector<double>& sampleData, double originalSampleRate);
    void setSynthFrequency(double freq);
    
    // Mix parameters
    void setVolume(double db);
    void setPan(double panValue); // -1.0 to 1.0
    void setPitch(double semitones);
    
    // ADSR parameters
    void setEnvelope(double attack, double decay, double sustain, double release);
    
    // Playback control
    void noteOn(double velocity = 1.0);
    void noteOff();
    bool isActive() const;
    
    // Process next sample (Stereo output)
    void process(double& outLeft, double& outRight);

private:
    Mode mode;
    double sampleRate;
    
    // Synth
    Oscillator osc;
    
    // Sampler
    std::vector<double> sampleBuffer;
    double sampleOriginalRate;
    double samplePosition;
    
    // Envelopes & Mix
    ADSR envelope;
    double volumeLinear;
    double panLeft;
    double panRight;
    double pitchRatio;
    
    double currentVelocity;
};
