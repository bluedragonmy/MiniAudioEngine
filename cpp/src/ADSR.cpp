#include "ADSR.h"

ADSR::ADSR()
    : currentState(State::Idle), sampleRate(44100.0),
      attackTime(0.01), decayTime(0.1), sustainLevel(1.0), releaseTime(0.1),
      currentLevel(0.0)
{
    calculateRates();
}

void ADSR::setSampleRate(double rate)
{
    sampleRate = rate;
    calculateRates();
}

void ADSR::setParameters(double attack, double decay, double sustain, double release)
{
    attackTime = attack;
    decayTime = decay;
    sustainLevel = sustain;
    releaseTime = release;
    calculateRates();
}

void ADSR::calculateRates()
{
    attackRate = (attackTime > 0.0) ? (1.0 / (attackTime * sampleRate)) : 1.0;
    // decay = 0 要立刻跳到 sustain（原本是 0.0，會永遠卡在最大音量）
    decayRate = (decayTime > 0.0) ? ((1.0 - sustainLevel) / (decayTime * sampleRate)) : 1.0;
    releaseRate = (releaseTime > 0.0) ? (sustainLevel / (releaseTime * sampleRate)) : 1.0;
}

void ADSR::noteOn()
{
    currentState = State::Attack;
    // Don't reset currentLevel to 0, start from where it is (prevents clicking if re-triggered)
}

void ADSR::noteOff()
{
    if (currentState != State::Idle) {
        currentState = State::Release;
        // Recalculate release rate based on current level to ensure smooth release
        releaseRate = (releaseTime > 0.0) ? (currentLevel / (releaseTime * sampleRate)) : 1.0;
    }
}

double ADSR::process()
{
    switch (currentState) {
        case State::Idle:
            currentLevel = 0.0;
            break;
            
        case State::Attack:
            currentLevel += attackRate;
            if (currentLevel >= 1.0) {
                currentLevel = 1.0;
                currentState = State::Decay;
            }
            break;
            
        case State::Decay:
            currentLevel -= decayRate;
            if (currentLevel <= sustainLevel) {
                currentLevel = sustainLevel;
                currentState = State::Sustain;
            }
            break;
            
        case State::Sustain:
            // Just hold currentLevel
            break;
            
        case State::Release:
            currentLevel -= releaseRate;
            if (currentLevel <= 0.0) {
                currentLevel = 0.0;
                currentState = State::Idle;
            }
            break;
    }
    return currentLevel;
}

bool ADSR::isActive() const
{
    return currentState != State::Idle;
}
