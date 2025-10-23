import React from 'react';
import { Stage, Container, Sprite } from '@pixi/react';
import { InteractiveObject } from './InteractiveObject';
import { useEnvironmentStore } from '../../stores/environmentStore';

interface Environment2DProps {
  width: number;
  height: number;
  environmentId: string;
  roomId: string;
}

export const Environment2D: React.FC<Environment2DProps> = ({
  width,
  height,
  environmentId,
  roomId,
}) => {
  const { environments, addWordProgress } = useEnvironmentStore();

  const environment = environments.find(env => env.id === environmentId);
  const room = environment?.rooms.find(r => r.id === roomId);

  if (!room) {
    return (
      <Stage width={width} height={height}>
        <Container>
          <Sprite
            image="https://via.placeholder.com/800x600/87CEEB/000000?text=Room+Not+Found"
            width={width}
            height={height}
          />
        </Container>
      </Stage>
    );
  }

  const handleObjectTouch = (word: string) => {
    console.log(`Touched object: ${word}`);

    // Add to progress
    addWordProgress(word, environmentId, roomId);

    // Trigger particle effect or animation here
    // TODO: Implement particle system
  };

  return (
    <Stage
      width={width}
      height={height}
      options={{
        backgroundColor: 0x87CEEB, // Sky blue background
        antialias: true,
      }}
    >
      {/* Background */}
      <Container>
        <Sprite
          image={room.backgroundImage || 'https://via.placeholder.com/800x600/87CEEB/000000?text=Room+Background'}
          width={width}
          height={height}
        />
      </Container>

      {/* Interactive Objects */}
      <Container>
        {room.objects.map((obj, index) => (
          <InteractiveObject
            key={`${obj.id}-${index}`}
            x={obj.x || (index % 3) * 200 + 100}
            y={obj.y || Math.floor(index / 3) * 150 + 100}
            width={obj.width || 120}
            height={obj.height || 120}
            texture={obj.image || `https://via.placeholder.com/120x120/4CAF50/FFFFFF?text=${obj.word}`}
            word={obj.word}
            translation={obj.translation}
            onTouch={handleObjectTouch}
            scale={1}
          />
        ))}
      </Container>

      {/* UI Elements */}
      <Container>
        {/* Progress bar could go here */}
      </Container>
    </Stage>
  );
};