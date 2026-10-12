#pragma once

#include "DrumVoice.h"
#include <map>
#include <string>
#include <vector>

struct NoteEvent {
    double timeSec;
    std::string padName;
    double velocity;
    bool isNoteOff;
    
    // Sort events by time
    bool operator<(const NoteEvent& other) const {
        return timeSec < other.timeSec;
    }
};

class SamplerEngine
{
public:
    SamplerEngine(double sampleRate);
    
    void addPad(const std::string& name, DrumVoice voice);
    DrumVoice& getPad(const std::string& name);
    
    void scheduleNoteOn(double timeSec, const std::string& padName, double velocity = 1.0);
    void scheduleNoteOff(double timeSec, const std::string& padName);
    
    // Set up choke groups (e.g. "ClosedHH" chokes "OpenHH")
    void setChokeGroup(const std::string& padName, const std::string& chokesPadName);
    
    // Render the master mix to stereo buffer (Interleaved [L,R,L,R...])
    std::vector<double> renderMaster(double durationSec);
    
    // Render only a specific pad (for Stems export)
    std::vector<double> renderStem(const std::string& padName, double durationSec);

private:
    double sampleRate;
    std::map<std::string, DrumVoice> pads;
    std::vector<NoteEvent> events;
    std::map<std::string, std::string> chokeGroups; // pad -> chokesPad
    
    // Internal process function for a specific time range
    void processEvents(double currentTime, double nextTime);
    void triggerNoteOn(const std::string& padName, double velocity);
    void triggerNoteOff(const std::string& padName);
};
