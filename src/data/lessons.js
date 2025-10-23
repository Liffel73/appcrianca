export const lessons = [
  {
    id: 1,
    title: 'Cores Divertidas',
    theme: 'colors',
    icon: '🎨',
    difficulty: 1,
    words: [
      { english: 'red', portuguese: 'vermelho', image: require('../assets/images/colors/red.png') },
      { english: 'blue', portuguese: 'azul', image: require('../assets/images/colors/blue.png') },
      { english: 'yellow', portuguese: 'amarelo', image: require('../assets/images/colors/yellow.png') },
      { english: 'green', portuguese: 'verde', image: require('../assets/images/colors/green.png') },
    ],
    exercises: [
      {
        type: 'match',
        question: 'Qual é a cor?',
        image: require('../assets/images/colors/red_apple.png'),
        options: ['red', 'blue', 'yellow', 'green'],
        correct: 'red',
      },
    ],
  },
  {
    id: 2,
    title: 'Animais da Fazenda',
    theme: 'animals',
    icon: '🐶',
    difficulty: 1,
    words: [
      { english: 'dog', portuguese: 'cachorro', image: require('../assets/images/animals/dog.png') },
      { english: 'cat', portuguese: 'gato', image: require('../assets/images/animals/cat.png') },
      { english: 'cow', portuguese: 'vaca', image: require('../assets/images/animals/cow.png') },
      { english: 'pig', portuguese: 'porco', image: require('../assets/images/animals/pig.png') },
    ],
    exercises: [
      {
        type: 'choice',
        question: 'Qual animal faz "woof woof"?',
        options: ['dog', 'cat', 'cow', 'pig'],
        correct: 'dog',
      },
    ],
  },
];
