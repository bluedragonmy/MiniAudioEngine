#include "SamplerEngine.h"
#include <algorithm>

SamplerEngine::SamplerEngine(double sampleRate)
    : sampleRate(sampleRate)
{
}

void SamplerEngine::addPad(const std::string& name, DrumVoice voice)
{
    pads.emplace(name, voice);
}

DrumVoice& SamplerEngine::getPad(const std::string& name)
{
    return pads.at(name);
}

void SamplerEngine::scheduleNoteOn(double timeSec, const std::string& padName, double velocity)
{
    events.push_back({timeSec, padName, velocity, false});
}

void SamplerEngine::scheduleNoteOff(double timeSec, const std::string& padName)
{
    events.push_back({timeSec, padName, 0.0, true});
}

void SamplerEngine::setChokeGroup(const std::string& padName, const std::string& chokesPadName)
{
    chokeGroups[padName] = chokesPadName;
}

void SamplerEngine::triggerNoteOn(const std::string& padName, double velocity)
{
    if (pads.find(padName) != pads.end()) {
        pads.at(padName).noteOn(velocity);
        
        // Handle choke group
        if (chokeGroups.find(padName) != chokeGroups.end()) {
            std::string target = chokeGroups.at(padName);
            if (pads.find(target) != pads.end()) {
                pads.at(target).noteOff();
            }
        }
    }
}

void SamplerEngine::triggerNoteOff(const std::string& padName)
{
    if (pads.find(padName) != pads.end()) {
        pads.at(padName).noteOff();
    }
}

std::vector<double> SamplerEngine::renderMaster(double durationSec)
{
    int numSamples = static_cast<int>(durationSec * sampleRate);
    std::vector<double> outBuffer(numSamples * 2, 0.0); // Stereo interleaved

    // 每次算圖都從安靜開始，不帶著上一次的殘響
    for (auto& pair : pads) pair.second.reset();
    
    // Sort events by time
    std::sort(events.begin(), events.end());
    size_t eventIndex = 0;
    
    for (int i = 0; i < numSamples; ++i) {
        double currentTime = static_cast<double>(i) / sampleRate;
        
        // Process events that happen at this time
        while (eventIndex < events.size() && events[eventIndex].timeSec <= currentTime) {
            const auto& ev = events[eventIndex];
            if (ev.isNoteOff) {
                triggerNoteOff(ev.padName);
            } else {
                triggerNoteOn(ev.padName, ev.velocity);
            }
            eventIndex++;
        }
        
        double mixLeft = 0.0;
        double mixRight = 0.0;
        
        for (auto& pair : pads) {
            double l = 0.0, r = 0.0;
            pair.second.process(l, r);
            mixLeft += l;
            mixRight += r;
        }
        
        outBuffer[i * 2] = mixLeft;
        outBuffer[i * 2 + 1] = mixRight;
    }
    
    return outBuffer;
}

std::vector<double> SamplerEngine::renderStem(const std::string& padName, double durationSec)
{
    int numSamples = static_cast<int>(durationSec * sampleRate);
    std::vector<double> outBuffer(numSamples * 2, 0.0);
    
    // Reset all pads first（noteOff 只會進 release，殘響還在，所以用 reset）
    for (auto& pair : pads) pair.second.reset();
    
    std::sort(events.begin(), events.end());
    size_t eventIndex = 0;
    
    for (int i = 0; i < numSamples; ++i) {
        double currentTime = static_cast<double>(i) / sampleRate;
        
        while (eventIndex < events.size() && events[eventIndex].timeSec <= currentTime) {
            const auto& ev = events[eventIndex];
            // Only trigger events for THIS pad, or if another pad chokes this pad
            if (ev.padName == padName) {
                if (ev.isNoteOff) triggerNoteOff(ev.padName);
                else triggerNoteOn(ev.padName, ev.velocity);
            } else {
                // If another pad triggers and it chokes this pad
                if (!ev.isNoteOff && chokeGroups.find(ev.padName) != chokeGroups.end()) {
                    if (chokeGroups.at(ev.padName) == padName) {
                        triggerNoteOff(padName);
                    }
                }
            }
            eventIndex++;
        }
        
        double l = 0.0, r = 0.0;
        if (pads.find(padName) != pads.end()) {
            pads.at(padName).process(l, r);
        }
        
        outBuffer[i * 2] = l;
        outBuffer[i * 2 + 1] = r;
    }
    
    return outBuffer;
}
