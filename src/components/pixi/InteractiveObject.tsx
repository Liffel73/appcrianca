import React, { useRef, useEffect } from 'react';
import { Container, Sprite, Text } from '@pixi/react';
import { FederatedPointerEvent, Graphics } from 'pixi.js';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

interface InteractiveObjectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  texture: string;
  word: string;
  translation: string;
  onTouch?: (word: string) => void;
  scale?: number;
}

export const InteractiveObject: React.FC<InteractiveObjectProps> = ({
  x,
  y,
  width,
  height,
  texture,
  word,
  translation,
  onTouch,
  scale = 1,
}) => {
  const containerRef = useRef<any>(null);
  const [sound, setSound] = React.useState<Audio.Sound | null>(null);
  const [isPressed, setIsPressed] = React.useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const handlePointerDown = async (event: FederatedPointerEvent) => {
    event.stopPropagation();
    setIsPressed(true);

    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Call parent handler
    if (onTouch) {
      onTouch(word);
    }

    // Play audio if available
    await playWordAudio();
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const playWordAudio = async () => {
    try {
      // First try to get audio from our Python service
      const audioUrl = await fetchWordAudio(word);

      if (audioUrl) {
        const { sound: newSound } = await Audio.Sound.createAsync({ uri: audioUrl });
        setSound(newSound);
        await newSound.playAsync();
      } else {
        // Fallback to expo-speech
        const { Speech } = require('expo-speech');
        Speech.speak(word, { language: 'en' });
      }
    } catch (error) {
      console.warn('Audio playback failed:', error);
      // Final fallback to expo-speech
      const { Speech } = require('expo-speech');
      Speech.speak(word, { language: 'en' });
    }
  };

  const fetchWordAudio = async (word: string): Promise<string | null> => {
    try {
      const response = await fetch('http://localhost:8000/speak-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          voice: 'en-US-AvaNeural' // Child-friendly voice
        })
      });

      const data = await response.json();
      return data.audio_url;
    } catch (error) {
      console.warn('Failed to fetch audio from Python service:', error);
      return null;
    }
  };

  // 2.5D effect with shadow and depth
  const shadowOffset = 4;
  const pressedScale = isPressed ? 0.95 : 1;
  const pressedOffset = isPressed ? 2 : 0;

  return (
    <Container
      ref={containerRef}
      x={x + pressedOffset}
      y={y + pressedOffset}
      scale={scale * pressedScale}
      interactive={true}
      pointerdown={handlePointerDown}
      pointerup={handlePointerUp}
      pointerupoutside={handlePointerUp}
    >
      {/* Shadow for 2.5D depth effect */}
      <Graphics
        draw={(g) => {
          g.clear();
          g.beginFill(0x000000, 0.2);
          g.drawRoundedRect(
            shadowOffset,
            shadowOffset,
            width,
            height,
            8
          );
          g.endFill();
        }}
      />

      {/* Main object sprite */}
      <Sprite
        image={texture}
        width={width}
        height={height}
        anchor={{ x: 0, y: 0 }}
        tint={isPressed ? 0xCCCCCC : 0xFFFFFF}
      />

      {/* Word label */}
      <Text
        text={word}
        anchor={{ x: 0.5, y: 0 }}
        x={width / 2}
        y={height + 10}
        style={{
          fontFamily: 'Comic Sans MS',
          fontSize: 18,
          fontWeight: 'bold',
          fill: '#2E7D32',
          stroke: '#FFFFFF',
          strokeThickness: 2,
        }}
      />

      {/* Translation label (smaller, below) */}
      <Text
        text={translation}
        anchor={{ x: 0.5, y: 0 }}
        x={width / 2}
        y={height + 35}
        style={{
          fontFamily: 'Arial',
          fontSize: 14,
          fill: '#666666',
          stroke: '#FFFFFF',
          strokeThickness: 1,
        }}
      />
    </Container>
  );
};