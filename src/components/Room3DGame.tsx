/**
 * Room3DGame - Componente 3D estilo jogo (landscape 16:9)
 * Usando React Three Fiber (igual ao web!)
 */

import React, { useState, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Componente de objeto 3D interativo
function InteractiveObject({ object, position, scale, color, word, translation, onSelect, isSelected }: any) {
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(object || { word, translation });
  };

  return (
    <mesh
      position={position}
      scale={isSelected ? [scale[0] * 1.2, scale[1] * 1.2, scale[2] * 1.2] : scale}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color={isSelected ? '#FFD700' : hovered ? '#FFA500' : color}
        roughness={0.7}
        metalness={0.3}
        emissive={isSelected ? '#FFD700' : hovered ? '#FFA500' : color}
        emissiveIntensity={isSelected ? 0.3 : hovered ? 0.2 : 0}
      />

      {/* Indicador de seleção (sem sprite) */}
      {isSelected && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#FFD700" emissive="#FFD700" emissiveIntensity={1} />
        </mesh>
      )}
    </mesh>
  );
}

// Ambiente da sala
function RoomEnvironment({ theme = 'living-room' }: any) {
  const getRoomColor = (theme: string) => {
    const colors: Record<string, string> = {
      'living-room': '#F5F5DC',
      'bedroom': '#E6E6FA',
      'kitchen': '#FFF8DC',
      'school': '#F0F8FF',
      'park': '#F0FFF0',
    };
    return colors[theme] || '#F5F5DC';
  };

  return (
    <group>
      {/* Chão */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Parede de trás */}
      <mesh position={[0, 2, -5]} receiveShadow>
        <planeGeometry args={[20, 8]} />
        <meshStandardMaterial color={getRoomColor(theme)} roughness={0.9} />
      </mesh>

      {/* Parede esquerda */}
      <mesh position={[-10, 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color={getRoomColor(theme)} roughness={0.9} />
      </mesh>

      {/* Parede direita */}
      <mesh position={[10, 2, 0]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color={getRoomColor(theme)} roughness={0.9} />
      </mesh>

      {/* Teto */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 4.5, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.7} />
      </mesh>

      {/* Sombras de contato */}
      <ContactShadows
        position={[0, -0.49, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={4}
      />
    </group>
  );
}

// Loading spinner 3D
function LoadingSpinner() {
  return (
    <mesh rotation={[0, 0, 0]}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#4CAF50" emissive="#4CAF50" emissiveIntensity={0.5} />
    </mesh>
  );
}

// Componente principal
interface Room3DGameProps {
  objects: Array<{
    id: string;
    word: string;
    translation: string;
    position: [number, number, number];
    scale: [number, number, number];
    color: string;
  }>;
  onObjectClick: (object: any) => void;
  roomTheme?: string;
}

export default function Room3DGame({ objects, onObjectClick, roomTheme = 'living-room' }: Room3DGameProps) {
  const [selectedObject, setSelectedObject] = useState<any>(null);

  const handleObjectSelect = (object: any) => {
    console.log('[Room3DGame] Object selected:', object.word);
    setSelectedObject(object);
    onObjectClick(object);
  };

  return (
    <View style={styles.container}>
      {/* Canvas 3D - React Three Fiber */}
      <Canvas
        shadows
        camera={{ position: [0, 3, 8], fov: 60 }}
        style={styles.canvas}
      >
        {/* Câmera perspectiva */}
        <PerspectiveCamera makeDefault position={[0, 3, 8]} />

        {/* Luzes */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[0, 5, 0]} intensity={0.3} />

        {/* Iluminação ambiente (substitui Environment para evitar billboard.cjs.js) */}
        <hemisphereLight args={['#87CEEB', '#F5DEB3', 0.4]} />

        {/* Suspense para carregamento */}
        <Suspense fallback={<LoadingSpinner />}>
          {/* Ambiente da sala */}
          <RoomEnvironment theme={roomTheme} />

          {/* Objetos interativos */}
          {objects.map((obj) => (
            <InteractiveObject
              key={obj.id}
              object={obj}
              position={obj.position}
              scale={obj.scale}
              color={obj.color}
              word={obj.word}
              translation={obj.translation}
              onSelect={handleObjectSelect}
              isSelected={selectedObject?.word === obj.word}
            />
          ))}
        </Suspense>

        {/* Controles de órbita (toque para rotacionar) */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* HUD - Info do objeto selecionado */}
      {selectedObject && (
        <View style={styles.hudTop}>
          <Text style={styles.hudWord}>{selectedObject.word}</Text>
          <Text style={styles.hudTranslation}>{selectedObject.translation}</Text>
        </View>
      )}

      {/* HUD - Instruções */}
      <View style={styles.hudBottom}>
        <Text style={styles.instructions}>
          🎮 Arraste para rotacionar | Pinça para zoom | Toque nos objetos
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvas: {
    flex: 1,
  },
  hudTop: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  hudWord: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  hudTranslation: {
    fontSize: 20,
    color: '#FFF',
    textAlign: 'center',
    marginTop: 5,
  },
  hudBottom: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    padding: 10,
  },
  instructions: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
  },
});
