import type { StageConfig } from '../types';

export const ALPINE_GRAVEL_STAGE: StageConfig = {
  id: 'alpine-gravel-01',
  stageNumber: 1,
  name: 'Alpoki Murva',
  subtitle: '1. Szakasz · Hegyi hágó',
  surface: 'gravel',
  surfaceLabel: 'Murva',
  roadHalfWidth: 5.2,
  shoulderWidth: 1.6,
  // Carefully crafted ~1,160m point-to-point mountain rally stage
  // with sweeping curves, elevation climbs, hairpin, downhill run, and chicane
  controlPoints: [
    [0, 2.0, -210],      // Start gate straight
    [0, 2.0, -155],      // Launch zone
    [14, 2.6, -100],     // Entry into Turn 1
    [52, 4.2, -52],      // Sweeping right-hander
    [102, 6.8, -22],     // Climbing traverse
    [138, 10.2, 24],     // Left crest
    [118, 13.5, 82],     // S-bend climb
    [68, 15.8, 114],     // Ridge plateau
    [94, 17.0, 172],     // Approach to hairpin
    [144, 16.5, 212],    // Hairpin entry
    [112, 15.0, 250],    // Hairpin apex
    [45, 12.2, 232],     // Fast exit
    [-12, 8.8, 186],     // Downhill pine straight
    [-68, 5.4, 142],     // High-speed valley entry
    [-116, 4.2, 92],     // Rocky cliff right-hander
    [-102, 5.6, 30],     // Technical chicane entry
    [-144, 7.0, -24],    // Chicane apex
    [-124, 5.5, -84],    // Valley curve
    [-76, 3.6, -134],    // Final sweep
    [-40, 2.4, -172],    // Finish straight approach
    [-32, 2.2, -222],    // Finish gate
  ],
  palette: {
    skyTop: '#2c5d8f',
    skyHorizon: '#b9d6e8',
    fogColor: '#b9d6e8',
    sunColor: '#fff1d6',
    sunIntensity: 2.4,
    hemiSkyColor: '#9ad0f5',
    hemiGroundColor: '#5c5340',
    roadColor: '#9f8b73',
    shoulderColor: '#7a6f5a',
    grassColor: '#4e6f40',
    rockColor: '#6f7378',
    foliageColors: ['#2a4d2c', '#335c34', '#234227'],
  },
  checkpoints: [
    {
      id: 'cp-1',
      progress: 0.2,
      label: '1. Ellenőrzőpont · Molekulafelismerés',
      taskType: 'molecular-recognition',
      lessonId: 'halogen-nomenclature',
    },
    {
      id: 'cp-2',
      progress: 0.42,
      label: '2. Ellenőrzőpont · Három garázs',
      taskType: 'three-garages',
      lessonId: 'halogen-classification',
    },
    {
      id: 'cp-3',
      progress: 0.65,
      label: '3. Ellenőrzőpont · Geminális vagy vicinális?',
      taskType: 'geminal-vicinal',
      lessonId: 'halogen-isomerism',
    },
    {
      id: 'cp-4',
      progress: 0.86,
      label: '4. Ellenőrzőpont · Kiralitás',
      taskType: 'chirality',
      lessonId: 'halogen-chirality',
    },
  ],
};

export const GRAVEL_SPECIAL_STAGE: StageConfig = {
  id: 'gravel-special-02',
  stageNumber: 2,
  name: 'Murvás Gyorsasági',
  subtitle: '2. Szakasz · Sóderrallye',
  description:
    'Széles, tempós murvás ralipálya kanyonkanyarokkal, dombháttal és négy új kémiai ellenőrzőponttal.',
  surface: 'gravel',
  surfaceLabel: 'Murva',
  roadHalfWidth: 5.5,
  shoulderWidth: 1.7,
  controlPoints: [
    [0, 2.0, -240],
    [0, 2.0, -180],
    [-18, 2.6, -120],
    [-64, 4.4, -72],
    [-118, 6.8, -32],
    [-150, 9.6, 28],
    [-120, 12.2, 92],
    [-62, 13.8, 126],
    [-10, 14.5, 178],
    [54, 13.4, 214],
    [114, 11.2, 198],
    [144, 8.8, 136],
    [116, 6.4, 70],
    [156, 5.2, 8],
    [142, 4.4, -56],
    [88, 3.8, -104],
    [64, 3.0, -162],
    [52, 2.4, -222],
  ],
  palette: {
    skyTop: '#325a82',
    skyHorizon: '#d9c8b4',
    fogColor: '#d9c8b4',
    sunColor: '#ffe8c2',
    sunIntensity: 2.55,
    hemiSkyColor: '#b7d4ec',
    hemiGroundColor: '#6b5842',
    roadColor: '#ac8e68',
    shoulderColor: '#84654a',
    grassColor: '#58693b',
    rockColor: '#7a7066',
    foliageColors: ['#314d28', '#3c5c30', '#294022'],
  },
  checkpoints: [
    {
      id: 'cp-5',
      progress: 0.18,
      label: '5. Ellenőrzőpont · Előállítási utak',
      taskType: 'synthesis-routes',
      lessonId: 'halogen-synthesis',
    },
    {
      id: 'cp-6',
      progress: 0.40,
      label: '6. Ellenőrzőpont · Forráspontok',
      taskType: 'boiling-points',
      lessonId: 'halogen-physical-properties',
    },
    {
      id: 'cp-7',
      progress: 0.64,
      label: '7. Ellenőrzőpont · Vicinális hidrolízis',
      taskType: 'vicinal-hydrolysis',
      lessonId: 'halogen-hydrolysis-vicinal',
    },
    {
      id: 'cp-8',
      progress: 0.85,
      label: '8. Ellenőrzőpont · Geminális hidrolízisek',
      taskType: 'geminal-hydrolyses',
      lessonId: 'halogen-hydrolysis-geminal',
    },
  ],
};

export const FOREST_TECHNICAL_STAGE: StageConfig = {
  id: 'forest-technical-03',
  stageNumber: 3,
  name: 'Erdei Technikai Szakasz',
  subtitle: '3. Szakasz · Erdei szerpentin',
  description:
    'Sűrű fenyőerdőben kanyargó, technikás ralipálya ritmusos S-kanyarokkal és a 9–12. kémiai ellenőrzőponttal.',
  surface: 'forest',
  surfaceLabel: 'Erdei murva',
  roadHalfWidth: 4.9,
  shoulderWidth: 1.4,
  controlPoints: [
    [0, 2.0, -235],
    [0, 2.0, -178],
    [22, 2.8, -122],
    [72, 4.5, -78],
    [54, 6.2, -22],
    [104, 8.2, 24],
    [146, 10.4, 78],
    [102, 12.6, 134],
    [40, 14.0, 114],
    [-12, 15.2, 168],
    [-72, 14.2, 206],
    [-124, 11.8, 174],
    [-98, 9.5, 112],
    [-148, 7.6, 56],
    [-122, 5.8, -8],
    [-72, 4.4, -44],
    [-112, 3.6, -104],
    [-82, 2.8, -164],
    [-58, 2.4, -220],
  ],
  palette: {
    skyTop: '#244a5e',
    skyHorizon: '#a8c7bc',
    fogColor: '#a8c7bc',
    sunColor: '#fff2d2',
    sunIntensity: 2.25,
    hemiSkyColor: '#98c2b8',
    hemiGroundColor: '#453e2e',
    roadColor: '#7d654b',
    shoulderColor: '#594837',
    grassColor: '#375433',
    rockColor: '#5c645f',
    foliageColors: ['#1e3f23', '#274f2b', '#17331c'],
  },
  checkpoints: [
    {
      id: 'cp-9',
      progress: 0.19,
      label: '9. Ellenőrzőpont · Aminok alkilezése',
      taskType: 'amine-alkylation',
      lessonId: 'halogen-ammonia',
    },
    {
      id: 'cp-10',
      progress: 0.42,
      label: '10. Ellenőrzőpont · Grignard-reagens',
      taskType: 'grignard-reagent',
      lessonId: 'halogen-magnesium',
    },
    {
      id: 'cp-11',
      progress: 0.65,
      label: '11. Ellenőrzőpont · Elimináció és Zajcev-szabály',
      taskType: 'zaitsev-elimination',
      lessonId: 'halogen-elimination',
    },
    {
      id: 'cp-12',
      progress: 0.87,
      label: '12. Ellenőrzőpont · Az elimináció zsákutcája',
      taskType: 'elimination-dead-end',
      lessonId: 'halogen-elimination-limit',
    },
  ],
};

export const CHAMPIONSHIP_FINAL_STAGE: StageConfig = {
  id: 'championship-final-04',
  stageNumber: 4,
  name: 'Bajnoki Döntő',
  subtitle: '4. Szakasz · Hegyi döntő',
  description:
    'Látványos, pörgős hegyi ralipálya szervizparkkal, célkapuval és a mindent eldöntő 13–16. kémiai ellenőrzőponttal.',
  surface: 'gravel',
  surfaceLabel: 'Hegyi murva',
  roadHalfWidth: 5.3,
  shoulderWidth: 1.6,
  // Compact ~790m championship mountain finale so driving between the 4 final checkpoints stays brisk and fun
  controlPoints: [
    [0, 2.0, -180],
    [0, 2.0, -130],
    [16, 2.8, -82],
    [62, 4.8, -42],
    [104, 7.6, 6],
    [92, 10.6, 64],
    [40, 12.2, 98],
    [-20, 11.4, 82],
    [-68, 9.2, 124],
    [-108, 6.8, 86],
    [-92, 4.6, 24],
    [-64, 3.2, -34],
    [-46, 2.4, -92],
    [-38, 2.2, -148],
  ],
  palette: {
    skyTop: '#1e3e6e',
    skyHorizon: '#e6bd92',
    fogColor: '#dcb994',
    sunColor: '#ffdda6',
    sunIntensity: 2.65,
    hemiSkyColor: '#c2d8f0',
    hemiGroundColor: '#615241',
    roadColor: '#998874',
    shoulderColor: '#736555',
    grassColor: '#48663a',
    rockColor: '#6d6b68',
    foliageColors: ['#264a28', '#335c31', '#1f3d21'],
  },
  checkpoints: [
    {
      id: 'cp-13',
      progress: 0.20,
      label: '13. Ellenőrzőpont · Régen és ma',
      taskType: 'uses-past-present',
      lessonId: 'halogen-applications',
    },
    {
      id: 'cp-14',
      progress: 0.44,
      label: '14. Ellenőrzőpont · Építsd meg a reakcióláncot!',
      taskType: 'reaction-chain-butene',
      lessonId: 'halogen-reaction-chains',
    },
    {
      id: 'cp-15',
      progress: 0.68,
      label: '15. Ellenőrzőpont · A számításos szerviz',
      taskType: 'stoichiometry-service',
      lessonId: 'halogen-stoichiometry',
    },
    {
      id: 'cp-16',
      progress: 0.88,
      label: '16. Ellenőrzőpont · A bajnoki reakciótervezés',
      taskType: 'championship-planner',
      lessonId: 'halogen-synthesis-design',
    },
  ],
};

export const STAGE_REGISTRY: StageConfig[] = [
  ALPINE_GRAVEL_STAGE,
  GRAVEL_SPECIAL_STAGE,
  FOREST_TECHNICAL_STAGE,
  CHAMPIONSHIP_FINAL_STAGE,
];

export function getStageById(stageId: string): StageConfig {
  return STAGE_REGISTRY.find((s) => s.id === stageId) ?? ALPINE_GRAVEL_STAGE;
}
