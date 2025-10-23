/**
 * GLTFLoader Helper para Expo/React Native
 * Alternativas para carregar modelos 3D
 * 
 * Como expo-three tem limitações com GLTF,
 * este helper oferece alternativas:
 * 1. Usar primitivos estilizados
 * 2. Converter GLTF para OBJ (suportado)
 * 3. Usar sprites 2.5D isométricos
 */

import * as THREE from 'three';
import { loadObjAsync } from 'expo-three';
import { Asset } from 'expo-asset';

interface ModelConfig {
  type: 'gltf' | 'obj' | 'primitive' | 'sprite';
  path?: string;
  fallbackPrimitive?: string;
  color?: string;
  texture?: string;
}

/**
 * Mapa de objetos para primitivos estilizados
 * Usado quando modelos 3D não estão disponíveis
 */
const OBJECT_PRIMITIVES: { [key: string]: any } = {
  sofa: {
    type: 'compound',
    parts: [
      { type: 'box', size: [3, 0.5, 1.5], position: [0, 0, 0], color: '#8B4513' }, // Base
      { type: 'box', size: [3, 1, 0.3], position: [0, 0.75, -0.6], color: '#A0522D' }, // Encosto
      { type: 'box', size: [0.3, 0.5, 1.5], position: [-1.35, 0.25, 0], color: '#8B4513' }, // Braço esquerdo
      { type: 'box', size: [0.3, 0.5, 1.5], position: [1.35, 0.25, 0], color: '#8B4513' }, // Braço direito
    ],
  },
  table: {
    type: 'compound',
    parts: [
      { type: 'box', size: [2, 0.1, 1], position: [0, 0.5, 0], color: '#654321' }, // Tampo
      { type: 'cylinder', size: [0.05, 0.5], position: [-0.8, 0, -0.3], color: '#4A4A4A' }, // Perna 1
      { type: 'cylinder', size: [0.05, 0.5], position: [0.8, 0, -0.3], color: '#4A4A4A' }, // Perna 2
      { type: 'cylinder', size: [0.05, 0.5], position: [-0.8, 0, 0.3], color: '#4A4A4A' }, // Perna 3
      { type: 'cylinder', size: [0.05, 0.5], position: [0.8, 0, 0.3], color: '#4A4A4A' }, // Perna 4
    ],
  },
  chair: {
    type: 'compound',
    parts: [
      { type: 'box', size: [0.5, 0.05, 0.5], position: [0, 0.3, 0], color: '#8B4513' }, // Assento
      { type: 'box', size: [0.5, 0.5, 0.05], position: [0, 0.55, -0.22], color: '#A0522D' }, // Encosto
      { type: 'cylinder', size: [0.02, 0.3], position: [-0.2, 0, -0.2], color: '#4A4A4A' }, // Perna 1
      { type: 'cylinder', size: [0.02, 0.3], position: [0.2, 0, -0.2], color: '#4A4A4A' }, // Perna 2
      { type: 'cylinder', size: [0.02, 0.3], position: [-0.2, 0, 0.2], color: '#4A4A4A' }, // Perna 3
      { type: 'cylinder', size: [0.02, 0.3], position: [0.2, 0, 0.2], color: '#4A4A4A' }, // Perna 4
    ],
  },
  tv: {
    type: 'compound',
    parts: [
      { type: 'box', size: [2, 1.2, 0.1], position: [0, 0.6, 0], color: '#1A1A1A' }, // Tela
      { type: 'box', size: [1.8, 1, 0.05], position: [0, 0.6, 0.01], color: '#333333' }, // Display
      { type: 'box', size: [0.5, 0.1, 0.3], position: [0, 0, 0], color: '#2A2A2A' }, // Base
    ],
  },
  lamp: {
    type: 'compound',
    parts: [
      { type: 'cylinder', size: [0.15, 0.05], position: [0, 0, 0], color: '#4A4A4A' }, // Base
      { type: 'cylinder', size: [0.02, 1], position: [0, 0.5, 0], color: '#3A3A3A' }, // Haste
      { type: 'cone', size: [0.3, 0.4], position: [0, 1.2, 0], color: '#FFF8DC' }, // Cúpula
    ],
  },
  book: {
    type: 'box',
    size: [0.2, 0.03, 0.15],
    color: '#8B0000',
  },
  window: {
    type: 'compound',
    parts: [
      { type: 'box', size: [1.5, 1.5, 0.05], position: [0, 0, 0], color: '#87CEEB', opacity: 0.3 }, // Vidro
      { type: 'box', size: [1.6, 0.05, 0.1], position: [0, 0.75, 0], color: '#8B4513' }, // Moldura superior
      { type: 'box', size: [1.6, 0.05, 0.1], position: [0, -0.75, 0], color: '#8B4513' }, // Moldura inferior
      { type: 'box', size: [0.05, 1.5, 0.1], position: [-0.75, 0, 0], color: '#8B4513' }, // Moldura esquerda
      { type: 'box', size: [0.05, 1.5, 0.1], position: [0.75, 0, 0], color: '#8B4513' }, // Moldura direita
    ],
  },
  door: {
    type: 'compound',
    parts: [
      { type: 'box', size: [1, 2, 0.1], position: [0, 1, 0], color: '#8B4513' }, // Porta
      { type: 'sphere', size: [0.05], position: [0.35, 1, 0.06], color: '#FFD700' }, // Maçaneta
    ],
  },
};

/**
 * Criar primitivo simples
 */
function createSimplePrimitive(type: string, size: any, color: string, opacity: number = 1): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (type) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(size[0] || 1, 32, 32);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(size[0], size[0], size[1], 32);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size[0], size[1], 32);
      break;
    case 'box':
    default:
      geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      break;
  }

  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(color),
    transparent: opacity < 1,
    opacity: opacity,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Criar objeto composto a partir de múltiplos primitivos
 */
function createCompoundObject(config: any): THREE.Group {
  const group = new THREE.Group();

  for (const part of config.parts) {
    const mesh = createSimplePrimitive(
      part.type,
      part.size,
      part.color,
      part.opacity || 1
    );
    mesh.position.set(...part.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return group;
}

/**
 * Função principal para carregar/criar objetos 3D
 */
export async function loadGameObject(
  objectName: string,
  config?: ModelConfig
): Promise<THREE.Object3D> {
  console.log(`[GLTFLoader] Carregando objeto: ${objectName}`);

  // 1. Tentar usar primitivo estilizado primeiro
  const primitiveConfig = OBJECT_PRIMITIVES[objectName.toLowerCase()];
  if (primitiveConfig) {
    console.log(`[GLTFLoader] Usando primitivo estilizado para: ${objectName}`);
    
    if (primitiveConfig.type === 'compound') {
      return createCompoundObject(primitiveConfig);
    } else {
      return createSimplePrimitive(
        primitiveConfig.type,
        primitiveConfig.size,
        primitiveConfig.color || '#4CAF50'
      );
    }
  }

  // 2. Se tiver config com OBJ, tentar carregar
  if (config?.type === 'obj' && config.path) {
    try {
      console.log(`[GLTFLoader] Tentando carregar OBJ: ${config.path}`);
      const asset = Asset.fromModule(config.path);
      await asset.downloadAsync();
      
      if (asset.localUri) {
        const obj = await loadObjAsync({ asset });
        return obj;
      }
    } catch (error) {
      console.error(`[GLTFLoader] Erro ao carregar OBJ:`, error);
    }
  }

  // 3. Fallback para primitivo genérico
  console.log(`[GLTFLoader] Usando fallback genérico para: ${objectName}`);
  return createSimplePrimitive(
    'box',
    [1, 1, 1],
    config?.color || '#2196F3'
  );
}

/**
 * Criar sprite 2.5D isométrico como alternativa
 */
export function create2DSprite(imagePath: string, size: [number, number] = [1, 1]): THREE.Sprite {
  const texture = new THREE.TextureLoader().load(imagePath);
  const material = new THREE.SpriteMaterial({ 
    map: texture,
    transparent: true,
  });
  
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size[0], size[1], 1);
  
  return sprite;
}

/**
 * Helper para criar ambiente completo
 */
export function createRoomEnvironment(roomType: string): THREE.Group {
  const room = new THREE.Group();

  switch (roomType) {
    case 'living':
      // Criar sala de estar
      const sofaPos: [number, number, number] = [-2, 0.5, 0];
      const sofa = loadGameObject('sofa');
      sofa.then(obj => {
        obj.position.set(...sofaPos);
        room.add(obj);
      });

      const tablePos: [number, number, number] = [0, 0.25, 0];
      const table = loadGameObject('table');
      table.then(obj => {
        obj.position.set(...tablePos);
        room.add(obj);
      });

      const tvPos: [number, number, number] = [2, 1, -3];
      const tv = loadGameObject('tv');
      tv.then(obj => {
        obj.position.set(...tvPos);
        room.add(obj);
      });
      break;

    case 'kitchen':
      // Criar cozinha
      // ... adicionar objetos da cozinha
      break;

    case 'bedroom':
      // Criar quarto
      // ... adicionar objetos do quarto
      break;

    case 'classroom':
      // Criar sala de aula
      // ... adicionar objetos da sala de aula
      break;
  }

  return room;
}

// Exportar tipos e configurações
export { OBJECT_PRIMITIVES };
export type { ModelConfig };
