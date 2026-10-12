#include "Biquad.h"

#include <cmath>

const double PI = 3.14159265358979323846;

Biquad::Biquad(double sampleRate)
    : sampleRate(sampleRate),
      b0(1.0), b1(0.0), b2(0.0), a1(0.0), a2(0.0),
      x1(0.0), x2(0.0), y1(0.0), y2(0.0)
{
}

void Biquad::set(Type type, double freq, double q, double gainDb)
{
    double w0 = 2.0 * PI * freq / sampleRate;
    double cw = std::cos(w0);
    double sw = std::sin(w0);
    double alpha = sw / (2.0 * q);
    double A = std::pow(10.0, gainDb / 40.0);

    double nb0 = 1, nb1 = 0, nb2 = 0, na0 = 1, na1 = 0, na2 = 0;

    switch (type) {
        case Type::LowPass:
            nb0 = (1 - cw) / 2;  nb1 = 1 - cw;    nb2 = (1 - cw) / 2;
            na0 = 1 + alpha;     na1 = -2 * cw;   na2 = 1 - alpha;
            break;
        case Type::HighPass:
            nb0 = (1 + cw) / 2;  nb1 = -(1 + cw); nb2 = (1 + cw) / 2;
            na0 = 1 + alpha;     na1 = -2 * cw;   na2 = 1 - alpha;
            break;
        case Type::Peaking:
            nb0 = 1 + alpha * A; nb1 = -2 * cw;   nb2 = 1 - alpha * A;
            na0 = 1 + alpha / A; na1 = -2 * cw;   na2 = 1 - alpha / A;
            break;
        case Type::LowShelf: {
            double s = 2 * std::sqrt(A) * alpha;
            nb0 = A * ((A + 1) - (A - 1) * cw + s);
            nb1 = 2 * A * ((A - 1) - (A + 1) * cw);
            nb2 = A * ((A + 1) - (A - 1) * cw - s);
            na0 = (A + 1) + (A - 1) * cw + s;
            na1 = -2 * ((A - 1) + (A + 1) * cw);
            na2 = (A + 1) + (A - 1) * cw - s;
            break;
        }
        case Type::HighShelf: {
            double s = 2 * std::sqrt(A) * alpha;
            nb0 = A * ((A + 1) + (A - 1) * cw + s);
            nb1 = -2 * A * ((A - 1) + (A + 1) * cw);
            nb2 = A * ((A + 1) + (A - 1) * cw - s);
            na0 = (A + 1) - (A - 1) * cw + s;
            na1 = 2 * ((A - 1) - (A + 1) * cw);
            na2 = (A + 1) - (A - 1) * cw - s;
            break;
        }
    }

    setCoefficients(nb0 / na0, nb1 / na0, nb2 / na0, na1 / na0, na2 / na0);
}

void Biquad::setCoefficients(double nb0, double nb1, double nb2, double na1, double na2)
{
    b0 = nb0; b1 = nb1; b2 = nb2; a1 = na1; a2 = na2;
}

double Biquad::process(double x)
{
    double y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
    return y;
}

void Biquad::reset()
{
    x1 = x2 = y1 = y2 = 0.0;
}

double Biquad::magnitudeAt(double freq) const
{
    // |H(e^jw)| = |b0 + b1 e^-jw + b2 e^-2jw| / |1 + a1 e^-jw + a2 e^-2jw|
    double w = 2.0 * PI * freq / sampleRate;
    double c1 = std::cos(w), s1 = std::sin(w);
    double c2 = std::cos(2 * w), s2 = std::sin(2 * w);
    double nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2);
    double dr = 1 + a1 * c1 + a2 * c2,  di = -(a1 * s1 + a2 * s2);
    return std::sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
}
