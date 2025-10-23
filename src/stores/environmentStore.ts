import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

export interface GameObject {
  id: string;
  word: string;
  translation: string;
  image: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Room {
  id: string;
  name: string;
  backgroundImage: string;
  objects: GameObject[];
}

export interface Environment {
  id: string;
  name: string;
  emoji: string;
  rooms: Room[];
}

export interface UserProgress {
  learnedWords: Set<string>;
  visitedRooms: Set<string>;
  stars: number;
  level: number;
  lastPlayed: Date;
}

interface EnvironmentStore {
  environments: Environment[];
  userProgress: UserProgress;
  currentEnvironment: string | null;
  currentRoom: string | null;

  // Actions
  setEnvironments: (environments: Environment[]) => void;
  setCurrentEnvironment: (environmentId: string) => void;
  setCurrentRoom: (roomId: string) => void;
  addWordProgress: (word: string, environmentId: string, roomId: string) => void;
  getWordProgress: (word: string) => boolean;
  calculateProgress: () => number;
}

const defaultEnvironments: Environment[] = [
  {
    id: 'house',
    name: 'Casa',
    emoji: '🏠',
    rooms: [
      {
        id: 'living_room',
        name: 'Sala de Estar',
        backgroundImage: '/assets/environments/house/living_room.jpg',
        objects: [
          { id: 'sofa', word: 'sofa', translation: 'sofá', image: '/assets/objects/sofa.png' },
          { id: 'table', word: 'table', translation: 'mesa', image: '/assets/objects/table.png' },
          { id: 'chair', word: 'chair', translation: 'cadeira', image: '/assets/objects/chair.png' },
          { id: 'tv', word: 'television', translation: 'televisão', image: '/assets/objects/tv.png' },
          { id: 'window', word: 'window', translation: 'janela', image: '/assets/objects/window.png' },
        ]
      },
      {
        id: 'kitchen',
        name: 'Cozinha',
        backgroundImage: '/assets/environments/house/kitchen.jpg',
        objects: [
          { id: 'refrigerator', word: 'refrigerator', translation: 'geladeira', image: '/assets/objects/fridge.png' },
          { id: 'stove', word: 'stove', translation: 'fogão', image: '/assets/objects/stove.png' },
          { id: 'sink', word: 'sink', translation: 'pia', image: '/assets/objects/sink.png' },
          { id: 'microwave', word: 'microwave', translation: 'microondas', image: '/assets/objects/microwave.png' },
        ]
      },
      {
        id: 'bedroom',
        name: 'Quarto',
        backgroundImage: '/assets/environments/house/bedroom.jpg',
        objects: [
          { id: 'bed', word: 'bed', translation: 'cama', image: '/assets/objects/bed.png' },
          { id: 'closet', word: 'closet', translation: 'guarda-roupa', image: '/assets/objects/closet.png' },
          { id: 'desk', word: 'desk', translation: 'escrivaninha', image: '/assets/objects/desk.png' },
          { id: 'lamp', word: 'lamp', translation: 'luminária', image: '/assets/objects/lamp.png' },
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
        backgroundImage: '/assets/environments/school/classroom.jpg',
        objects: [
          { id: 'blackboard', word: 'blackboard', translation: 'quadro', image: '/assets/objects/blackboard.png' },
          { id: 'book', word: 'book', translation: 'livro', image: '/assets/objects/book.png' },
          { id: 'pencil', word: 'pencil', translation: 'lápis', image: '/assets/objects/pencil.png' },
          { id: 'eraser', word: 'eraser', translation: 'borracha', image: '/assets/objects/eraser.png' },
        ]
      }
    ]
  }
];

export const useEnvironmentStore = create<EnvironmentStore>()(
  persist(
    (set, get) => ({
      environments: defaultEnvironments,
      userProgress: {
        learnedWords: new Set<string>(),
        visitedRooms: new Set<string>(),
        stars: 0,
        level: 1,
        lastPlayed: new Date()
      },
      currentEnvironment: null,
      currentRoom: null,

      setEnvironments: (environments) => set({ environments }),

      setCurrentEnvironment: (environmentId) =>
        set({ currentEnvironment: environmentId, currentRoom: null }),

      setCurrentRoom: (roomId) => {
        const state = get();
        const updatedProgress = {
          ...state.userProgress,
          visitedRooms: new Set([...state.userProgress.visitedRooms, roomId]),
          lastPlayed: new Date()
        };

        set({
          currentRoom: roomId,
          userProgress: updatedProgress
        });
      },

      addWordProgress: (word, environmentId, roomId) => {
        const state = get();
        const newLearnedWords = new Set([...state.userProgress.learnedWords, word]);
        const isNewWord = !state.userProgress.learnedWords.has(word);

        const updatedProgress = {
          ...state.userProgress,
          learnedWords: newLearnedWords,
          stars: state.userProgress.stars + (isNewWord ? 10 : 1),
          lastPlayed: new Date()
        };

        set({ userProgress: updatedProgress });
      },

      getWordProgress: (word) => {
        const state = get();
        return state.userProgress.learnedWords.has(word);
      },

      calculateProgress: () => {
        const state = get();
        const totalWords = state.environments.reduce((total, env) =>
          total + env.rooms.reduce((roomTotal, room) =>
            roomTotal + room.objects.length, 0), 0);

        return totalWords > 0
          ? (state.userProgress.learnedWords.size / totalWords) * 100
          : 0;
      }
    }),
    {
      name: 'environment-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          if (!value) return null;

          const parsed = JSON.parse(value);
          // Convert Set serialized as array back to Set
          if (parsed.state?.userProgress?.learnedWords) {
            parsed.state.userProgress.learnedWords = new Set(parsed.state.userProgress.learnedWords);
          }
          if (parsed.state?.userProgress?.visitedRooms) {
            parsed.state.userProgress.visitedRooms = new Set(parsed.state.userProgress.visitedRooms);
          }
          return parsed;
        },
        setItem: async (name, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              userProgress: {
                ...value.state.userProgress,
                // Convert Set to array for serialization
                learnedWords: Array.from(value.state.userProgress.learnedWords),
                visitedRooms: Array.from(value.state.userProgress.visitedRooms)
              }
            }
          };
          await AsyncStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      }
    }
  )
);