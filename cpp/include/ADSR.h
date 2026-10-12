#pragma once

class ADSR
{
public:
    enum class State {
        Idle,
        Attack,
        Decay,
        Sustain,
        Release
    };

    ADSR();

    void setSampleRate(double rate);
    void setParameters(double attackTime, double decayTime, double sustainLevel, double releaseTime);
    
    void noteOn();
    void noteOff();
    
    // 取得下一個 Sample 的 envelope 值 (0.0 ~ 1.0)
    double process();
    
    bool isActive() const;

private:
    State currentState;
    double sampleRate;
    double attackRate;
    double decayRate;
    double releaseRate;
    
    double attackTime;
    double decayTime;
    double sustainLevel;
    double releaseTime;
    
    double currentLevel;
    
    void calculateRates();
};
