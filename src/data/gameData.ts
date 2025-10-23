// Complete game data structure with all environments, rooms, and interactive objects

export interface GameObject {
  id: string;
  word: string;
  translation: string;
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  shape: 'box' | 'cylinder' | 'sphere';
}

export interface Room {
  id: string;
  name: string;
  backgroundColor: string;
  objects: GameObject[];
}

export interface Environment {
  id: string;
  name: string;
  emoji: string;
  rooms: Room[];
}

export const environments: Environment[] = [
  {
    id: 'house',
    name: 'Casa',
    emoji: '🏠',
    rooms: [
      {
        id: 'living_room',
        name: 'Sala de Estar',
        backgroundColor: '#F5F5DC',
        objects: [
          { id: 'sofa', word: 'sofa', translation: 'sofá', position: [-2, 0, 0], scale: [2, 1, 1], color: '#8B4513', shape: 'box' },
          { id: 'table', word: 'table', translation: 'mesa', position: [0, 0, 1], scale: [1, 0.5, 1], color: '#D2691E', shape: 'box' },
          { id: 'tv', word: 'tv', translation: 'televisão', position: [0, 1, -2], scale: [2, 1, 0.2], color: '#2F4F4F', shape: 'box' },
        ]
      },
      {
        id: 'kitchen',
        name: 'Cozinha',
        backgroundColor: '#FFF8DC',
        objects: [
          { id: 'refrigerator', word: 'refrigerator', translation: 'geladeira', position: [-3, 1, -2], scale: [0.8, 2, 0.7], color: '#F0F8FF', shape: 'box' },
          { id: 'stove', word: 'stove', translation: 'fogão', position: [2, 0.5, -2.2], scale: [1, 1, 0.8], color: '#696969', shape: 'box' },
          { id: 'sink', word: 'sink', translation: 'pia', position: [0, 0.5, -2.3], scale: [1.2, 0.3, 0.8], color: '#C0C0C0', shape: 'box' },
          { id: 'microwave', word: 'microwave', translation: 'microondas', position: [1, 1.3, -2], scale: [0.6, 0.4, 0.4], color: '#D3D3D3', shape: 'box' },
          { id: 'table', word: 'dining table', translation: 'mesa de jantar', position: [0, 0, 0.5], scale: [2, 0.3, 1.2], color: '#8B4513', shape: 'box' },
          { id: 'chair1', word: 'chair', translation: 'cadeira', position: [-0.8, 0, 1.3], scale: [0.5, 1, 0.5], color: '#A0522D', shape: 'box' },
          { id: 'chair2', word: 'chair', translation: 'cadeira', position: [0.8, 0, 1.3], scale: [0.5, 1, 0.5], color: '#A0522D', shape: 'box' },
          { id: 'cabinet', word: 'cabinet', translation: 'armário', position: [-2, 1, -2.4], scale: [1.2, 1.8, 0.4], color: '#8B4513', shape: 'box' },
          { id: 'toaster', word: 'toaster', translation: 'torradeira', position: [-1, 0.8, -2], scale: [0.4, 0.3, 0.3], color: '#CD853F', shape: 'box' },
          { id: 'kettle', word: 'kettle', translation: 'chaleira', position: [1.5, 0.8, -2], scale: [0.3, 0.4, 0.3], color: '#C0C0C0', shape: 'cylinder' },
          { id: 'fruit-bowl', word: 'fruit bowl', translation: 'fruteira', position: [0, 0.4, 0.5], scale: [0.6, 0.2, 0.6], color: '#DDA0DD', shape: 'cylinder' },
        ]
      },
      {
        id: 'bedroom',
        name: 'Quarto',
        backgroundColor: '#E6E6FA',
        objects: [
          { id: 'bed', word: 'bed', translation: 'cama', position: [0, 0.3, -1.5], scale: [2.2, 0.6, 1.8], color: '#FFB6C1', shape: 'box' },
          { id: 'pillow', word: 'pillow', translation: 'travesseiro', position: [0, 0.7, -2], scale: [0.8, 0.3, 0.4], color: '#FFFFFF', shape: 'box' },
          { id: 'blanket', word: 'blanket', translation: 'cobertor', position: [0, 0.65, -1], scale: [2, 0.1, 1.5], color: '#4169E1', shape: 'box' },
          { id: 'closet', word: 'closet', translation: 'guarda-roupa', position: [-2.8, 1, -2], scale: [0.6, 2, 1.2], color: '#8B4513', shape: 'box' },
          { id: 'desk', word: 'desk', translation: 'escrivaninha', position: [2.5, 0.4, 0], scale: [1.2, 0.8, 0.6], color: '#D2691E', shape: 'box' },
          { id: 'chair', word: 'chair', translation: 'cadeira', position: [2.5, 0, 0.8], scale: [0.5, 1, 0.5], color: '#A0522D', shape: 'box' },
          { id: 'bedside-table', word: 'nightstand', translation: 'criado-mudo', position: [1.5, 0.3, -1.5], scale: [0.6, 0.6, 0.4], color: '#8B4513', shape: 'box' },
          { id: 'lamp', word: 'lamp', translation: 'luminária', position: [1.5, 0.9, -1.5], scale: [0.15, 0.8, 0.15], color: '#FFFF99', shape: 'cylinder' },
          { id: 'mirror', word: 'mirror', translation: 'espelho', position: [-2.7, 1.5, -2], scale: [0.05, 1, 0.8], color: '#C0C0C0', shape: 'box' },
          { id: 'window', word: 'window', translation: 'janela', position: [3, 1.2, -1], scale: [0.05, 1.5, 1.2], color: '#87CEEB', shape: 'box' },
          { id: 'curtains', word: 'curtains', translation: 'cortinas', position: [2.9, 1.2, -1], scale: [0.1, 1.5, 1.3], color: '#DDA0DD', shape: 'box' },
          { id: 'rug', word: 'rug', translation: 'tapete', position: [0, -0.45, -0.5], scale: [2.5, 0.05, 2], color: '#8FBC8F', shape: 'box' },
          { id: 'toy-box', word: 'toy box', translation: 'caixa de brinquedos', position: [-1.5, 0.2, 1.5], scale: [0.8, 0.4, 0.6], color: '#FF69B4', shape: 'box' },
          { id: 'teddy-bear', word: 'teddy bear', translation: 'ursinho de pelúcia', position: [0.5, 0.7, -1.8], scale: [0.3, 0.4, 0.3], color: '#D2B48C', shape: 'cylinder' },
          { id: 'book', word: 'book', translation: 'livro', position: [2.3, 0.5, 0], scale: [0.2, 0.3, 0.15], color: '#FF6347', shape: 'box' },
        ]
      },
      {
        id: 'bathroom',
        name: 'Banheiro',
        backgroundColor: '#F0FFFF',
        objects: [
          { id: 'toilet', word: 'toilet', translation: 'vaso sanitário', position: [-2, 0.3, -2], scale: [0.6, 0.6, 0.8], color: '#FFFFFF', shape: 'box' },
          { id: 'sink', word: 'sink', translation: 'pia', position: [2, 0.4, -2], scale: [0.8, 0.8, 0.5], color: '#FFFFFF', shape: 'box' },
          { id: 'bathtub', word: 'bathtub', translation: 'banheira', position: [0, 0.3, 2], scale: [1.8, 0.6, 0.8], color: '#FFFFFF', shape: 'box' },
          { id: 'shower', word: 'shower', translation: 'chuveiro', position: [-2.8, 1.5, 2], scale: [0.1, 0.3, 0.1], color: '#C0C0C0', shape: 'cylinder' },
          { id: 'mirror', word: 'mirror', translation: 'espelho', position: [2, 1.2, -2.4], scale: [0.05, 1, 0.8], color: '#C0C0C0', shape: 'box' },
          { id: 'towel', word: 'towel', translation: 'toalha', position: [1.5, 1, -2], scale: [0.05, 0.8, 0.4], color: '#FFB6C1', shape: 'box' },
          { id: 'toothbrush', word: 'toothbrush', translation: 'escova de dente', position: [1.8, 0.5, -1.8], scale: [0.02, 0.02, 0.15], color: '#FF6347', shape: 'cylinder' },
          { id: 'toothpaste', word: 'toothpaste', translation: 'pasta de dente', position: [1.9, 0.5, -1.8], scale: [0.05, 0.15, 0.05], color: '#00CED1', shape: 'box' },
          { id: 'soap', word: 'soap', translation: 'sabonete', position: [2.1, 0.5, -1.7], scale: [0.08, 0.05, 0.12], color: '#FFD700', shape: 'box' },
          { id: 'shampoo', word: 'shampoo', translation: 'xampu', position: [0.3, 0.4, 2.3], scale: [0.08, 0.25, 0.08], color: '#32CD32', shape: 'cylinder' },
          { id: 'toilet-paper', word: 'toilet paper', translation: 'papel higiênico', position: [-2.5, 0.8, -1.5], scale: [0.15, 0.15, 0.15], color: '#FFFFFF', shape: 'cylinder' },
          { id: 'bath-mat', word: 'bath mat', translation: 'tapete do banheiro', position: [0, -0.4, -0.5], scale: [1.5, 0.05, 1], color: '#FF69B4', shape: 'box' },
          { id: 'shower-curtain', word: 'shower curtain', translation: 'cortina do chuveiro', position: [-1.5, 1, 2.4], scale: [0.05, 2, 1.8], color: '#87CEEB', shape: 'box' },
          { id: 'scale', word: 'scale', translation: 'balança', position: [1, -0.4, 0], scale: [0.4, 0.05, 0.3], color: '#696969', shape: 'box' },
        ]
      }
    ]
  },
  {
    id: 'school',
    name: 'Escola',
    emoji: '🏫',
    rooms: [
      {
        id: 'classroom',
        name: 'Sala de Aula',
        backgroundColor: '#F0F8FF',
        objects: [
          { id: 'blackboard', word: 'blackboard', translation: 'quadro', position: [0, 1.2, -2.8], scale: [3, 1.5, 0.1], color: '#2F4F4F', shape: 'box' },
          { id: 'teacher-desk', word: 'desk', translation: 'mesa do professor', position: [0, 0.4, -2], scale: [1.5, 0.8, 0.8], color: '#8B4513', shape: 'box' },
          { id: 'student-desk1', word: 'desk', translation: 'carteira', position: [-1.5, 0.4, 0], scale: [0.8, 0.8, 0.6], color: '#D2691E', shape: 'box' },
          { id: 'student-desk2', word: 'desk', translation: 'carteira', position: [0, 0.4, 0], scale: [0.8, 0.8, 0.6], color: '#D2691E', shape: 'box' },
          { id: 'student-desk3', word: 'desk', translation: 'carteira', position: [1.5, 0.4, 0], scale: [0.8, 0.8, 0.6], color: '#D2691E', shape: 'box' },
          { id: 'chair1', word: 'chair', translation: 'cadeira', position: [-1.5, 0, 0.7], scale: [0.4, 0.8, 0.4], color: '#A0522D', shape: 'box' },
          { id: 'chair2', word: 'chair', translation: 'cadeira', position: [0, 0, 0.7], scale: [0.4, 0.8, 0.4], color: '#A0522D', shape: 'box' },
          { id: 'chair3', word: 'chair', translation: 'cadeira', position: [1.5, 0, 0.7], scale: [0.4, 0.8, 0.4], color: '#A0522D', shape: 'box' },
          { id: 'book1', word: 'book', translation: 'livro', position: [-1.5, 0.5, 0], scale: [0.2, 0.3, 0.15], color: '#FF6347', shape: 'box' },
          { id: 'book2', word: 'book', translation: 'livro', position: [0, 0.5, 0], scale: [0.2, 0.3, 0.15], color: '#32CD32', shape: 'box' },
          { id: 'book3', word: 'book', translation: 'livro', position: [1.5, 0.5, 0], scale: [0.2, 0.3, 0.15], color: '#4169E1', shape: 'box' },
          { id: 'pencil1', word: 'pencil', translation: 'lápis', position: [-1.3, 0.5, 0.1], scale: [0.02, 0.02, 0.3], color: '#FFD700', shape: 'cylinder' },
          { id: 'pencil2', word: 'pencil', translation: 'lápis', position: [0.2, 0.5, 0.1], scale: [0.02, 0.02, 0.3], color: '#FF6347', shape: 'cylinder' },
          { id: 'pencil3', word: 'pencil', translation: 'lápis', position: [1.7, 0.5, 0.1], scale: [0.02, 0.02, 0.3], color: '#32CD32', shape: 'cylinder' },
          { id: 'eraser1', word: 'eraser', translation: 'borracha', position: [-1.2, 0.5, 0], scale: [0.1, 0.05, 0.05], color: '#FF69B4', shape: 'box' },
          { id: 'eraser2', word: 'eraser', translation: 'borracha', position: [0.3, 0.5, 0], scale: [0.1, 0.05, 0.05], color: '#FF69B4', shape: 'box' },
          { id: 'eraser3', word: 'eraser', translation: 'borracha', position: [1.8, 0.5, 0], scale: [0.1, 0.05, 0.05], color: '#FF69B4', shape: 'box' },
          { id: 'globe', word: 'globe', translation: 'globo', position: [0.8, 0.7, -2], scale: [0.3, 0.3, 0.3], color: '#4169E1', shape: 'sphere' },
          { id: 'ruler', word: 'ruler', translation: 'régua', position: [0, 0.5, -2], scale: [0.02, 0.02, 0.6], color: '#FFFFFF', shape: 'box' },
          { id: 'chalk', word: 'chalk', translation: 'giz', position: [-0.3, 0.5, -2], scale: [0.02, 0.02, 0.1], color: '#FFFFFF', shape: 'cylinder' },
          { id: 'backpack1', word: 'backpack', translation: 'mochila', position: [-2, 0.3, 1], scale: [0.3, 0.6, 0.2], color: '#FF6347', shape: 'box' },
          { id: 'backpack2', word: 'backpack', translation: 'mochila', position: [2, 0.3, 1], scale: [0.3, 0.6, 0.2], color: '#32CD32', shape: 'box' },
          { id: 'clock', word: 'clock', translation: 'relógio', position: [2.8, 1.5, -1], scale: [0.05, 0.6, 0.6], color: '#FFFFFF', shape: 'cylinder' },
        ]
      }
    ]
  },
  {
    id: 'park',
    name: 'Parque',
    emoji: '🌳',
    rooms: [
      {
        id: 'playground',
        name: 'Playground',
        backgroundColor: '#87CEEB',
        objects: [
          { id: 'swing-set', word: 'swing', translation: 'balanço', position: [-2.5, 0.8, 0], scale: [0.3, 1.6, 0.3], color: '#8B4513', shape: 'box' },
          { id: 'swing-seat1', word: 'swing', translation: 'assento do balanço', position: [-2.2, 0.5, 0], scale: [0.5, 0.1, 0.3], color: '#FF6347', shape: 'box' },
          { id: 'swing-seat2', word: 'swing', translation: 'assento do balanço', position: [-2.8, 0.5, 0], scale: [0.5, 0.1, 0.3], color: '#32CD32', shape: 'box' },
          { id: 'slide', word: 'slide', translation: 'escorregador', position: [2.5, 0.8, 0], scale: [2, 0.1, 1.2], color: '#FF6347', shape: 'box' },
          { id: 'slide-ladder', word: 'ladder', translation: 'escada', position: [2.5, 0.8, -0.8], scale: [0.1, 1.6, 0.4], color: '#FFD700', shape: 'box' },
          { id: 'seesaw', word: 'seesaw', translation: 'gangorra', position: [0, 0.3, -1], scale: [3, 0.1, 0.3], color: '#4169E1', shape: 'box' },
          { id: 'seesaw-support', word: 'support', translation: 'apoio', position: [0, 0.15, -1], scale: [0.2, 0.3, 0.2], color: '#8B4513', shape: 'box' },
          { id: 'tree', word: 'tree', translation: 'árvore', position: [0, 1, -3], scale: [0.4, 2, 0.4], color: '#8B4513', shape: 'cylinder' },
          { id: 'tree-leaves', word: 'leaves', translation: 'folhas', position: [0, 2.5, -3], scale: [1.5, 1.5, 1.5], color: '#228B22', shape: 'sphere' },
          { id: 'bench1', word: 'bench', translation: 'banco', position: [-1, 0.2, 2.5], scale: [1.5, 0.4, 0.4], color: '#8B4513', shape: 'box' },
          { id: 'bench2', word: 'bench', translation: 'banco', position: [1, 0.2, 2.5], scale: [1.5, 0.4, 0.4], color: '#8B4513', shape: 'box' },
          { id: 'sandbox', word: 'sandbox', translation: 'caixa de areia', position: [-1, 0.1, -0.5], scale: [1.5, 0.2, 1.5], color: '#F4A460', shape: 'box' },
          { id: 'bucket', word: 'bucket', translation: 'baldinho', position: [-1.2, 0.15, -0.2], scale: [0.2, 0.3, 0.2], color: '#FF69B4', shape: 'cylinder' },
          { id: 'shovel', word: 'shovel', translation: 'pazinha', position: [-0.8, 0.12, -0.8], scale: [0.03, 0.03, 0.4], color: '#FFD700', shape: 'box' },
          { id: 'flowers1', word: 'flowers', translation: 'flores', position: [3, 0.2, -2], scale: [0.3, 0.4, 0.3], color: '#FF69B4', shape: 'cylinder' },
          { id: 'flowers2', word: 'flowers', translation: 'flores', position: [-3, 0.2, -1], scale: [0.3, 0.4, 0.3], color: '#FFD700', shape: 'cylinder' },
          { id: 'grass', word: 'grass', translation: 'grama', position: [0, -0.45, 0], scale: [8, 0.05, 6], color: '#228B22', shape: 'box' },
          { id: 'ball', word: 'ball', translation: 'bola', position: [1.5, 0.3, 1], scale: [0.3, 0.3, 0.3], color: '#FF6347', shape: 'sphere' },
          { id: 'trash-can', word: 'trash can', translation: 'lata de lixo', position: [3, 0.4, 2], scale: [0.3, 0.8, 0.3], color: '#696969', shape: 'cylinder' },
          { id: 'fountain', word: 'fountain', translation: 'fonte', position: [0, 0.5, 2], scale: [0.8, 1, 0.8], color: '#87CEEB', shape: 'cylinder' },
        ]
      }
    ]
  }
];

// Helper to count total objects
export const getTotalObjects = (): number => {
  return environments.reduce((total, env) =>
    total + env.rooms.reduce((roomTotal, room) =>
      roomTotal + room.objects.length, 0
    ), 0
  );
};

// Helper to get environment by ID
export const getEnvironmentById = (id: string): Environment | undefined => {
  return environments.find(env => env.id === id);
};

// Helper to get room by ID
export const getRoomById = (environmentId: string, roomId: string): Room | undefined => {
  const environment = getEnvironmentById(environmentId);
  return environment?.rooms.find(room => room.id === roomId);
};
