/**
 * Room3D Component
 * Renderização 3D de salas com objetos interativos
 * Usando expo-three e Three.js
 * 
 * Funcionalidades:
 * - Carregamento de modelos GLTF/GLB
 * - Interação por toque
 * - Câmera navegável
 * - Fallback para sprites 2D
 * - Otimização de performance
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Configurações de qualidade baseadas no dispositivo
const getQualitySettings = () => {
  const pixelRatio = Platform.select({
    ios: 1.5,
    android: 1.0,
    default: 1.0,
  });

  return {
    pixelRatio,
    shadowMapSize: Platform.select({
      ios: 1024,
      android: 512,
      default: 512,
    }),
    maxLights: Platform.select({
      ios: 4,
      android: 2,
      default: 2,
    }),
  };
};

interface GameObject3D {
  id: string;
  word: string;
  translation: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  modelPath?: string;
  color?: string;
  isLearned?: boolean;
}

interface Room3DProps {
  objects: GameObject3D[];
  onObjectClick: (object: GameObject3D) => void;
  roomTheme?: 'living-room' | 'bedroom' | 'kitchen' | 'school' | 'park';
  quality?: 'low' | 'medium' | 'high';
  enableShadows?: boolean;
  enableParticles?: boolean;
}

export default function Room3D({
  objects,
  onObjectClick,
  roomTheme = 'living-room',
  quality = 'medium',
  enableShadows = true,
  enableParticles = false,
}: Room3DProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedObject, setSelectedObject] = useState<GameObject3D | null>(null);
  
  // Refs para Three.js
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const frameIdRef = useRef<number | null>(null);

  // Configurações de qualidade
  const qualitySettings = getQualitySettings();

  /**
   * Inicializa a cena 3D
   */
  const onContextCreate = async (gl: WebGLRenderingContext) => {
    try {
      console.log('[Room3D] 🎮 Inicializando cena 3D...');
      
      // Criar renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      
      if (enableShadows && quality !== 'low') {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      }
      
      rendererRef.current = renderer;

      // Criar cena
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(getRoomColor(roomTheme));
      scene.fog = new THREE.Fog(getRoomColor(roomTheme), 10, 50);
      sceneRef.current = scene;

      // Criar câmera
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        1000
      );
      camera.position.set(0, 5, 10);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // Adicionar luzes
      setupLights(scene);

      // Criar ambiente (chão, paredes)
      await createEnvironment(scene);

      // Carregar objetos
      await loadObjects(scene);

      // Adicionar partículas (se habilitado)
      if (enableParticles && quality === 'high') {
        createParticles(scene);
      }

      // Iniciar loop de renderização
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);
        
        // Rotacionar objetos selecionados
        if (selectedObject) {
          const obj = objectsRef.current.get(selectedObject.id);
          if (obj) {
            obj.rotation.y += 0.01;
          }
        }

        // Renderizar
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };
      
      animate();
      setIsLoading(false);
      
      console.log('[Room3D] ✅ Cena 3D inicializada');
    } catch (error) {
      console.error('[Room3D] ❌ Erro ao criar cena:', error);
      setIsLoading(false);
    }
  };

  /**
   * Configura iluminação da cena
   */
  const setupLights = (scene: THREE.Scene) => {
    // Luz ambiente
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Luz direcional (sol)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = enableShadows;
    
    if (enableShadows) {
      directionalLight.shadow.camera.near = 0.1;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -10;
      directionalLight.shadow.camera.right = 10;
      directionalLight.shadow.camera.top = 10;
      directionalLight.shadow.camera.bottom = -10;
      directionalLight.shadow.mapSize.width = qualitySettings.shadowMapSize;
      directionalLight.shadow.mapSize.height = qualitySettings.shadowMapSize;
    }
    
    scene.add(directionalLight);

    // Luz pontual (lâmpada)
    if (qualitySettings.maxLights > 2) {
      const pointLight = new THREE.PointLight(0xffaa00, 0.5, 10);
      pointLight.position.set(0, 5, 0);
      scene.add(pointLight);
    }
  };

  /**
   * Cria o ambiente da sala
   */
  const createEnvironment = async (scene: THREE.Scene) => {
    // Chão
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: getFloorColor(roomTheme),
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = enableShadows;
    scene.add(floor);

    // Paredes
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: getWallColor(roomTheme),
      roughness: 0.9,
      metalness: 0.1,
    });

    // Parede de trás
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      wallMaterial
    );
    backWall.position.z = -10;
    backWall.receiveShadow = enableShadows;
    scene.add(backWall);

    // Parede esquerda
    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      wallMaterial
    );
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.x = -10;
    leftWall.receiveShadow = enableShadows;
    scene.add(leftWall);

    // Parede direita
    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 10),
      wallMaterial
    );
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.x = 10;
    rightWall.receiveShadow = enableShadows;
    scene.add(rightWall);
  };

  /**
   * Carrega objetos 3D na cena
   */
  const loadObjects = async (scene: THREE.Scene) => {
    const totalObjects = objects.length;
    let loadedObjects = 0;

    for (const gameObject of objects) {
      try {
        let object3D: THREE.Object3D;

        if (gameObject.modelPath) {
          // Tentar carregar modelo GLTF/GLB
          object3D = await loadGLTFModel(gameObject.modelPath);
        } else {
          // Fallback: criar primitivo 3D
          object3D = createPrimitiveObject(gameObject);
        }

        // Configurar posição, escala e rotação
        object3D.position.set(...gameObject.position);
        object3D.scale.set(...gameObject.scale);
        
        if (gameObject.rotation) {
          object3D.rotation.set(...gameObject.rotation);
        }

        // Adicionar sombras
        object3D.castShadow = enableShadows;
        object3D.receiveShadow = enableShadows;

        // Adicionar indicador de aprendizado
        if (gameObject.isLearned) {
          addLearnedIndicator(object3D);
        }

        // Armazenar referência
        object3D.userData = { gameObject };
        objectsRef.current.set(gameObject.id, object3D);

        // Adicionar à cena
        scene.add(object3D);

        loadedObjects++;
        setLoadingProgress((loadedObjects / totalObjects) * 100);
      } catch (error) {
        console.error(`[Room3D] Erro ao carregar objeto ${gameObject.id}:`, error);
        
        // Criar fallback simples em caso de erro
        const fallback = createPrimitiveObject(gameObject);
        fallback.position.set(...gameObject.position);
        fallback.scale.set(...gameObject.scale);
        objectsRef.current.set(gameObject.id, fallback);
        scene.add(fallback);
      }
    }
  };

  /**
   * Carrega modelo GLTF/GLB
   */
  const loadGLTFModel = async (modelPath: string): Promise<THREE.Object3D> => {
    // Nota: Em React Native, precisamos usar Asset.loadAsync
    // e depois criar o modelo manualmente
    // Isso é uma simplificação - na prática, você precisaria
    // de um loader GLTF específico para React Native
    
    console.log(`[Room3D] Carregando modelo: ${modelPath}`);
    
    // Por enquanto, retornar um cubo como placeholder
    // TODO: Implementar carregamento real de GLTF
    return createPrimitiveObject({
      id: 'placeholder',
      word: '',
      translation: '',
      position: [0, 0, 0],
      scale: [1, 1, 1],
      color: '#888888',
    });
  };

  /**
   * Cria objeto primitivo 3D (fallback)
   */
  const createPrimitiveObject = (gameObject: GameObject3D): THREE.Mesh => {
    // Escolher geometria baseada no objeto
    let geometry: THREE.BufferGeometry;
    
    switch (gameObject.word.toLowerCase()) {
      case 'ball':
        geometry = new THREE.SphereGeometry(0.5, 32, 16);
        break;
      case 'table':
        geometry = new THREE.BoxGeometry(2, 0.1, 1);
        break;
      case 'chair':
        geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
        break;
      case 'tv':
        geometry = new THREE.BoxGeometry(2, 1.5, 0.2);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }

    const material = new THREE.MeshStandardMaterial({
      color: gameObject.color || getObjectColor(gameObject.word),
      roughness: 0.7,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = enableShadows;
    mesh.receiveShadow = enableShadows;

    return mesh;
  };

  /**
   * Adiciona indicador de objeto aprendido
   */
  const addLearnedIndicator = (object3D: THREE.Object3D) => {
    // Criar estrela dourada acima do objeto
    const starGeometry = new THREE.ConeGeometry(0.2, 0.3, 5);
    const starMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      emissive: 0xffd700,
      emissiveIntensity: 0.5,
    });
    
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.y = 2;
    star.rotation.z = Math.PI;
    
    object3D.add(star);

    // Animar estrela
    const animateStar = () => {
      star.rotation.y += 0.02;
      star.position.y = 2 + Math.sin(Date.now() * 0.001) * 0.2;
    };
    
    // Adicionar à animação global (simplificado)
    star.userData.animate = animateStar;
  };

  /**
   * Cria sistema de partículas
   */
  const createParticles = (scene: THREE.Scene) => {
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 20;
      positions[i + 1] = Math.random() * 10;
      positions[i + 2] = (Math.random() - 0.5) * 20;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);

    // Animar partículas
    particleSystem.userData.animate = () => {
      particleSystem.rotation.y += 0.001;
      
      const positions = particleSystem.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.01;
        if (positions[i] < 0) {
          positions[i] = 10;
        }
      }
      particleSystem.geometry.attributes.position.needsUpdate = true;
    };
  };

  /**
   * Manipula toque na tela
   */
  const handleTouch = useCallback((event: any) => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    // Obter coordenadas do toque
    const { locationX, locationY } = event.nativeEvent;
    
    // Converter para coordenadas normalizadas (-1 a 1)
    mouseRef.current.x = (locationX / screenWidth) * 2 - 1;
    mouseRef.current.y = -(locationY / screenHeight) * 2 + 1;

    // Raycasting para detectar objetos
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    
    const intersectObjects = Array.from(objectsRef.current.values());
    const intersects = raycasterRef.current.intersectObjects(intersectObjects, true);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      
      // Buscar o GameObject associado
      let gameObject: GameObject3D | null = null;
      
      // Verificar userData do objeto ou seus pais
      let current = clickedObject;
      while (current && !gameObject) {
        if (current.userData?.gameObject) {
          gameObject = current.userData.gameObject;
        }
        current = current.parent as THREE.Object3D;
      }

      if (gameObject) {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        // Selecionar objeto
        setSelectedObject(gameObject);
        
        // Chamar callback
        onObjectClick(gameObject);
        
        // Animar objeto clicado
        animateObjectClick(clickedObject);
      }
    }
  }, [onObjectClick]);

  /**
   * Anima objeto quando clicado
   */
  const animateObjectClick = (object: THREE.Object3D) => {
    const originalScale = object.scale.clone();
    const targetScale = originalScale.clone().multiplyScalar(1.2);
    
    // Aumentar escala
    object.scale.copy(targetScale);
    
    // Voltar ao normal após 300ms
    setTimeout(() => {
      object.scale.copy(originalScale);
    }, 300);
  };

  /**
   * Cores baseadas no tema da sala
   */
  const getRoomColor = (theme: string): number => {
    const colors: Record<string, number> = {
      'living-room': 0xe8f4f8,
      'bedroom': 0xfff5e6,
      'kitchen': 0xf0f8e8,
      'school': 0xfffacd,
      'park': 0x87ceeb,
    };
    return colors[theme] || 0xf0f0f0;
  };

  const getFloorColor = (theme: string): number => {
    const colors: Record<string, number> = {
      'living-room': 0x8b4513,
      'bedroom': 0xdeb887,
      'kitchen': 0xd3d3d3,
      'school': 0xf5deb3,
      'park': 0x228b22,
    };
    return colors[theme] || 0xcccccc;
  };

  const getWallColor = (theme: string): number => {
    const colors: Record<string, number> = {
      'living-room': 0xf5f5dc,
      'bedroom': 0xffe4e1,
      'kitchen': 0xffffff,
      'school': 0xf0e68c,
      'park': 0x87ceeb,
    };
    return colors[theme] || 0xeeeeee;
  };

  const getObjectColor = (objectName: string): number => {
    const colors: Record<string, number> = {
      'sofa': 0x8b4513,
      'table': 0x654321,
      'tv': 0x333333,
      'chair': 0xa0522d,
      'lamp': 0xffff00,
      'book': 0x0000ff,
      'ball': 0xff0000,
    };
    return colors[objectName.toLowerCase()] || 0x888888;
  };

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      
      // Limpar objetos Three.js
      objectsRef.current.forEach(obj => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            Carregando ambiente 3D... {Math.round(loadingProgress)}%
          </Text>
        </View>
      )}
      
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
        onTouchStart={handleTouch}
      />

      {/* Controles de câmera */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (cameraRef.current) {
              cameraRef.current.position.z -= 1;
            }
          }}
        >
          <Text style={styles.controlText}>⬆️</Text>
        </TouchableOpacity>
        
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              if (cameraRef.current) {
                cameraRef.current.position.x -= 1;
              }
            }}
          >
            <Text style={styles.controlText}>⬅️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              if (cameraRef.current) {
                cameraRef.current.position.set(0, 5, 10);
                cameraRef.current.lookAt(0, 0, 0);
              }
            }}
          >
            <Text style={styles.controlText}>🏠</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              if (cameraRef.current) {
                cameraRef.current.position.x += 1;
              }
            }}
          >
            <Text style={styles.controlText}>➡️</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => {
            if (cameraRef.current) {
              cameraRef.current.position.z += 1;
            }
          }}
        >
          <Text style={styles.controlText}>⬇️</Text>
        </TouchableOpacity>
      </View>

      {/* Objeto selecionado */}
      {selectedObject && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedWord}>{selectedObject.word}</Text>
          <Text style={styles.selectedTranslation}>{selectedObject.translation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 50,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  controlText: {
    fontSize: 24,
  },
  selectedInfo: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 15,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedWord: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
  },
  selectedTranslation: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
});