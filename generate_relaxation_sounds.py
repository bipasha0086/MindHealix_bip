#!/usr/bin/env python3
"""
Generate 9 relaxation sounds for the Relaxation Sound Player module
"""

import numpy as np
from scipy.io import wavfile
import os

# Create sounds directory if it doesn't exist
sounds_dir = 'frontend/public/sounds'
os.makedirs(sounds_dir, exist_ok=True)

# Audio parameters
sample_rate = 44100
duration = 15  # 15 seconds each

def generate_rain():
    """Generate realistic rain sound using noise patterns"""
    # White noise base
    rain = np.random.normal(0, 0.15, int(sample_rate * duration))
    
    # Add low-frequency rumble (thunder like)
    t = np.arange(len(rain)) / sample_rate
    rumble = 0.05 * np.sin(2 * np.pi * 40 * t)
    rain = rain + rumble
    
    # Add amplitude modulation (rain patterns)
    modulation = 0.5 + 0.4 * np.sin(2 * np.pi * 0.3 * t)
    rain = rain * modulation
    
    # Normalize
    rain = np.int16(rain / np.max(np.abs(rain)) * 32767 * 0.8)
    return rain

def generate_whitenoise():
    """Generate smooth white noise"""
    whitenoise = np.random.normal(0, 0.15, int(sample_rate * duration))
    # Add slight low-pass characteristic
    from scipy.signal import butter, filtfilt
    b, a = butter(4, 0.1)
    whitenoise = filtfilt(b, a, whitenoise)
    whitenoise = np.int16(whitenoise / np.max(np.abs(whitenoise)) * 32767 * 0.75)
    return whitenoise

def generate_piano():
    """Generate soft ambient piano pads"""
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    # Major chord progression (C major, F major, G major, C major)
    chords = [
        [262, 330, 392],      # C major (C, E, G)
        [349, 440, 523],      # F major (F, A, C)
        [392, 494, 587],      # G major (G, B, D)
        [262, 330, 392],      # C major
    ]
    
    piano = np.zeros_like(t)
    chord_duration = duration / len(chords)
    
    for i, chord in enumerate(chords):
        start = int(i * chord_duration * sample_rate)
        end = int((i + 1) * chord_duration * sample_rate)
        chord_t = t[start:end] - t[start]
        
        # Envelope: fade in and out
        envelope = np.exp(-2 * chord_t)
        
        # Add harmonics
        chord_signal = np.zeros(len(chord_t))
        for freq in chord:
            chord_signal += 0.1 * np.sin(2 * np.pi * freq * chord_t)
        
        piano[start:end] = chord_signal * envelope
    
    piano = np.int16(piano / np.max(np.abs(piano)) * 32767 * 0.6)
    return piano

def generate_ocean():
    """Generate ocean waves with rhythmic patterns"""
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    # Base ocean wave
    ocean = 0.15 * np.sin(2 * np.pi * 0.5 * t)  # Slow fundamental
    ocean += 0.1 * np.sin(2 * np.pi * 0.3 * t)  # Even slower
    
    # Add wave crashing (higher frequencies)
    ocean += 0.08 * np.sin(2 * np.pi * 2 * t)
    ocean += 0.06 * np.sin(2 * np.pi * 3 * t)
    
    # Add slight noise for texture
    noise = np.random.normal(0, 0.05, len(t))
    ocean = ocean + noise
    
    # Normalize
    ocean = np.int16(ocean / np.max(np.abs(ocean)) * 32767 * 0.85)
    return ocean

def generate_forest():
    """Generate forest ambience with bird chirps"""
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    # Wind/forest base (low freq noise)
    forest = np.random.normal(0, 0.1, len(t))
    
    # Add occasional bird chirps
    for chirp_start in [2, 5, 8, 11]:
        chirp_t = t - chirp_start
        chirp_mask = (chirp_t > 0) & (chirp_t < 0.8)
        
        # Bird chirp frequency sweep
        freq_sweep = 2000 + 1000 * np.sin(2 * np.pi * 2 * chirp_t[chirp_mask])
        chirp = 0.1 * np.sin(2 * np.pi * freq_sweep * chirp_t[chirp_mask])
        
        # Envelope
        envelope = np.sin(np.pi * (chirp_t[chirp_mask] / 0.8)) ** 0.5
        forest[chirp_mask] += chirp * envelope
    
    forest = np.int16(forest / np.max(np.abs(forest)) * 32767 * 0.8)
    return forest

def generate_windchimes():
    """Generate gentle wind chime sounds"""
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    windchimes = np.zeros_like(t)
    
    # Chime frequencies (tuned)
    chimes = [800, 1200, 1600, 2000]
    
    # Create multiple random chimes
    np.random.seed(42)
    for _ in range(15):
        chime_start = np.random.uniform(0, duration - 1)
        chime_freq = np.random.choice(chimes)
        chime_len = np.random.uniform(0.8, 1.5)
        
        chime_t = t - chime_start
        chime_mask = (chime_t > 0) & (chime_t < chime_len)
        
        # Decaying sine wave
        envelope = np.exp(-3 * chime_t[chime_mask])
        windchimes[chime_mask] += 0.15 * np.sin(2 * np.pi * chime_freq * chime_t[chime_mask]) * envelope
    
    windchimes = np.int16(windchimes / np.max(np.abs(windchimes)) * 32767 * 0.9)
    return windchimes

def generate_fireplace():
    """Generate crackling fireplace ambience"""
    # Base ambience (low rumble)
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    # Brown noise (fireplace like)
    fireplace = np.random.normal(0, 0.2, len(t))
    
    # Add crackling (random clicks)
    np.random.seed(42)
    for _ in range(50):
        click_pos = np.random.randint(0, len(t))
        click_len = np.random.randint(100, 500)
        click_freq = np.random.uniform(200, 800)
        
        if click_pos + click_len < len(t):
            click_t = np.arange(click_len) / sample_rate
            click_signal = 0.3 * np.sin(2 * np.pi * click_freq * click_t)
            envelope = np.exp(-5 * click_t)
            fireplace[click_pos:click_pos + click_len] += click_signal * envelope
    
    fireplace = np.int16(fireplace / np.max(np.abs(fireplace)) * 32767 * 0.7)
    return fireplace

def generate_crickets():
    """Generate night cricket chirping"""
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    crickets = np.zeros_like(t)
    
    # Cricket chirps at different times
    cricket_freqs = [3000, 3500, 4000]
    np.random.seed(42)
    
    for chirp_idx in range(20):
        chirp_start = np.random.uniform(0, duration - 1)
        chirp_freq = np.random.choice(cricket_freqs)
        chirp_duration = np.random.uniform(0.3, 0.8)
        
        chirp_t = t - chirp_start
        chirp_mask = (chirp_t > 0) & (chirp_t < chirp_duration)
        
        # Amplitude modulation (tremolo effect)
        tremolo = 0.5 + 0.4 * np.sin(2 * np.pi * 15 * chirp_t[chirp_mask])
        envelope = np.sin(np.pi * (chirp_t[chirp_mask] / chirp_duration)) ** 0.5
        
        crickets[chirp_mask] += 0.1 * np.sin(2 * np.pi * chirp_freq * chirp_t[chirp_mask]) * tremolo * envelope
    
    crickets = np.int16(crickets / np.max(np.abs(crickets)) * 32767 * 0.85)
    return crickets

def generate_meditation_bowl():
    """Generate singing bowl meditation sound"""
    t = np.arange(int(sample_rate * duration)) / sample_rate
    
    # Fundamental frequency around 200 Hz
    bowl = 0.2 * np.sin(2 * np.pi * 200 * t)
    
    # Add harmonics
    bowl += 0.1 * np.sin(2 * np.pi * 300 * t)
    bowl += 0.08 * np.sin(2 * np.pi * 500 * t)
    bowl += 0.05 * np.sin(2 * np.pi * 800 * t)
    
    # Slow decay envelope
    decay = np.exp(-0.5 * t)
    bowl = bowl * decay
    
    # Slight vibrato/wobble
    vibrato = 1 + 0.02 * np.sin(2 * np.pi * 2 * t)
    bowl = bowl * vibrato
    
    bowl = np.int16(bowl / np.max(np.abs(bowl)) * 32767 * 0.8)
    return bowl

# Generate all sounds
print("Generating relaxation sounds...")

sounds = {
    'rain.wav': generate_rain,
    'whitenoise.wav': generate_whitenoise,
    'piano.wav': generate_piano,
    'ocean.wav': generate_ocean,
    'forest.wav': generate_forest,
    'windchimes.wav': generate_windchimes,
    'fireplace.wav': generate_fireplace,
    'crickets.wav': generate_crickets,
    'bowl.wav': generate_meditation_bowl,
}

for filename, generator in sounds.items():
    print(f"  Generating {filename}...", end=" ")
    audio_data = generator()
    filepath = os.path.join(sounds_dir, filename)
    wavfile.write(filepath, sample_rate, audio_data)
    print(f"✓ ({len(audio_data) / sample_rate:.1f}s)")

print(f"\n✅ All 9 sounds generated successfully in {sounds_dir}/")
