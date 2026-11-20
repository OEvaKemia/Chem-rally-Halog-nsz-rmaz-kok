export interface Atom3D {
  id: string;
  element: 'C' | 'H' | 'Br';
  x: number;
  y: number;
  z: number;
}

export interface Bond3D {
  from: number;
  to: number;
}

export interface Molecule3DModel {
  id: string;
  isCorrect: boolean;
  /** Csak hibás visszajelzéshez használjuk, a modelltáblán nem jelenik meg előre! */
  secretName: string;
  wrongFeedback: string;
  atoms: Atom3D[];
  bonds: Bond3D[];
}

export type GarageCategory = 'primer' | 'szekunder' | 'tercier';

export interface GarageCompound {
  id: string;
  name: string;
  formula: string;
  category: GarageCategory;
  explanation: string;
}

export type GemVicGroup = 'geminal' | 'vicinal';

export interface SvgAtomNode {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: 'C' | 'Cl' | 'Br';
  clickable?: boolean;
}

export interface SvgBondEdge {
  from: string;
  to: string;
}

export interface GemVicCompound {
  id: string;
  /** A feladat szabálya szerint nem jelenik meg a kártyán, csak ellenőrzésnél/magyarázatnál */
  secretName: string;
  group: GemVicGroup;
  nodes: SvgAtomNode[];
  bonds: SvgBondEdge[];
}

export interface IsomerCardData {
  id: string;
  /** C5H11Cl konstitúciós izomer szerkezeti gráfja (csillag nélkül!) */
  name: string;
  condensed: string;
  chiralCarbonId: string | null;
  explanation: string;
  nodes: SvgAtomNode[];
  bonds: SvgBondEdge[];
}

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Pontos tetraéderes (109,47°) sp3 pentánváz-generátor a 3D-s molekulamodellekhez.
 */
function buildPentane3D(
  substituentsByCarbon: Array<Array<'H' | 'Br'>>,
): { atoms: Atom3D[]; bonds: Bond3D[] } {
  const atoms: Atom3D[] = [];
  const bonds: Bond3D[] = [];

  const ccLen = 1.54;
  const chLen = 1.09;
  const cbrLen = 1.94;
  const halfTet = (54.735 * Math.PI) / 180;
  const dx = ccLen * Math.sin(halfTet);
  const dy = ccLen * Math.cos(halfTet);

  // 5 szénatom cikcakkban az XY síkban (középre igazítva)
  const rawCarbons: Array<[number, number, number]> = [
    [-2 * dx, -0.5 * dy, 0], // C1 (lefelé nyíló vége)
    [-dx, 0.5 * dy, 0],      // C2 (csúcs felfelé)
    [0, -0.5 * dy, 0],       // C3 (csúcs lefelé)
    [dx, 0.5 * dy, 0],       // C4 (csúcs felfelé)
    [2 * dx, -0.5 * dy, 0],  // C5 (lefelé nyíló vége)
  ];

  const cIndices: number[] = [];
  for (let i = 0; i < 5; i++) {
    const [x, y, z] = rawCarbons[i];
    cIndices.push(atoms.length);
    atoms.push({ id: `C${i + 1}`, element: 'C', x, y, z });
    if (i > 0) {
      bonds.push({ from: cIndices[i - 1], to: cIndices[i] });
    }
  }

  const addSubstituent = (cIdx: number, dirX: number, dirY: number, dirZ: number, el: 'H' | 'Br') => {
    const len = el === 'Br' ? cbrLen : chLen;
    const norm = Math.hypot(dirX, dirY, dirZ) || 1;
    const c = atoms[cIdx];
    const atomIdx = atoms.length;
    atoms.push({
      id: `${el}-${atomIdx}`,
      element: el,
      x: c.x + (dirX / norm) * len,
      y: c.y + (dirY / norm) * len,
      z: c.z + (dirZ / norm) * len,
    });
    bonds.push({ from: cIdx, to: atomIdx });
  };

  // Belső szénatomok (C2, C3, C4): pontos tetraéderes ±Z elágazás
  const cosHalf = Math.cos(halfTet);
  const sinHalf = Math.sin(halfTet);
  for (const i of [1, 2, 3]) {
    const signY = i % 2 === 1 ? 1 : -1; // C2, C4 csúcsa +Y; C3 csúcsa -Y
    const subs = substituentsByCarbon[i];
    addSubstituent(cIndices[i], 0, signY * cosHalf, sinHalf, subs[0]);
    addSubstituent(cIndices[i], 0, signY * cosHalf, -sinHalf, subs[1]);
  }

  // Terminális szénatomok (C1 és C5): nyitott láncvég + 2 nyitott tetraéderes állás
  const addTerminal = (i: number, neighborIdx: number, subs: Array<'H' | 'Br'>) => {
    const c = atoms[cIndices[i]];
    const nb = atoms[cIndices[neighborIdx]];
    // Szén-szén tengely (befelé mutató)
    const ux = nb.x - c.x;
    const uy = nb.y - c.y;
    const lenU = Math.hypot(ux, uy) || 1;
    const ax = ux / lenU;
    const ay = uy / lenU;

    // Tengelyre merőleges bázis az XY síkban és a Z tengely mentén
    const px = -ay;
    const py = ax;
    const tetAngle = (109.47 * Math.PI) / 180;
    const along = Math.cos(tetAngle); // -1/3 (kifelé mutat)
    const radial = Math.sin(tetAngle); // sqrt(8)/3

    for (let k = 0; k < 3; k++) {
      const phi = (k * 2 * Math.PI) / 3;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);
      const vx = along * ax + radial * cosP * px;
      const vy = along * ay + radial * cosP * py;
      const vz = radial * sinP;
      addSubstituent(cIndices[i], vx, vy, vz, subs[k]);
    }
  };

  addTerminal(0, 1, substituentsByCarbon[0]);
  addTerminal(4, 3, substituentsByCarbon[4]);

  return { atoms, bonds };
}

export const TASK_1_MOLECULES: Molecule3DModel[] = [
  {
    id: '2,3-dibromopentane',
    isCorrect: true,
    secretName: '2,3-dibrómpentán',
    wrongFeedback: '',
    ...buildPentane3D([
      ['H', 'H', 'H'],
      ['Br', 'H'],
      ['H', 'Br'],
      ['H', 'H'],
      ['H', 'H', 'H'],
    ]),
  },
  {
    id: '2,2-dibromopentane',
    isCorrect: false,
    secretName: '2,2-dibrómpentán',
    wrongFeedback:
      'Ez a 2,2-dibrómpentán: mindkét brómatom ugyanazon a 2. szénatomon (geminális helyzetben) kapcsolódik. A 2,3-dibrómpentánban két szomszédos szénatomon van egy-egy brómatom.',
    ...buildPentane3D([
      ['H', 'H', 'H'],
      ['Br', 'Br'],
      ['H', 'H'],
      ['H', 'H'],
      ['H', 'H', 'H'],
    ]),
  },
  {
    id: '1,3-dibromopentane',
    isCorrect: false,
    secretName: '1,3-dibrómpentán',
    wrongFeedback:
      'Ez az 1,3-dibrómpentán: az egyik brómatom a láncvégi 1. szénatomon, a másik a 3. szénatomon található. A 2,3-dibrómpentánban a 2. és a 3. szénatomon vannak a brómatomok.',
    ...buildPentane3D([
      ['Br', 'H', 'H'],
      ['H', 'H'],
      ['Br', 'H'],
      ['H', 'H'],
      ['H', 'H', 'H'],
    ]),
  },
];

export const TASK_2_GARAGE_COMPOUNDS: GarageCompound[] = [
  {
    id: '1-chloropentane',
    name: '1-klórpentán',
    formula: 'CH₃–CH₂–CH₂–CH₂–CH₂Cl',
    category: 'primer',
    explanation: 'A klórt hordozó 1. szénatom csak egy másik szénatomhoz (C2) kapcsolódik.',
  },
  {
    id: '1-bromo-2-methylpropane',
    name: '1-bróm-2-metilpropán',
    formula: 'BrCH₂–CH(CH₃)–CH₃',
    category: 'primer',
    explanation: 'A brómatomot viselő C1 szénatom csak a C2 szénatomhoz kötődik, így primer.',
  },
  {
    id: '2-bromopentane',
    name: '2-brómpentán',
    formula: 'CH₃–CH(Br)–CH₂–CH₂–CH₃',
    category: 'szekunder',
    explanation: 'A brómot hordozó C2 szénatom két másik szénatomhoz (C1 és C3) kapcsolódik.',
  },
  {
    id: '3-chlorohexane',
    name: '3-klórhexán',
    formula: 'CH₃–CH₂–CH(Cl)–CH₂–CH₂–CH₃',
    category: 'szekunder',
    explanation: 'A klórt hordozó C3 szénatom két másik szénatomhoz (C2 és C4) kötődik.',
  },
  {
    id: '2-chloro-2-methylbutane',
    name: '2-klór-2-metilbután',
    formula: 'CH₃–C(Cl)(CH₃)–CH₂–CH₃',
    category: 'tercier',
    explanation: 'A klórt viselő C2 szénatom három másik szénatomhoz kapcsolódik, így tercier.',
  },
  {
    id: '2-bromo-2-methylpropane',
    name: '2-bróm-2-metilpropán',
    formula: '(CH₃)₃C–Br',
    category: 'tercier',
    explanation: 'A brómot hordozó középső szénatomhoz három metilcsoport (3 szénatom) kötődik.',
  },
];

export const TASK_3_GEM_VIC_COMPOUNDS: GemVicCompound[] = [
  {
    id: '1,1-dibromobutane',
    secretName: '1,1-dibrómbután',
    group: 'geminal',
    nodes: [
      { id: 'c4', label: 'CH₃', x: 35, y: 65, kind: 'C' },
      { id: 'c3', label: 'CH₂', x: 95, y: 65, kind: 'C' },
      { id: 'c2', label: 'CH₂', x: 155, y: 65, kind: 'C' },
      { id: 'c1', label: 'CH', x: 215, y: 65, kind: 'C' },
      { id: 'br1', label: 'Br', x: 215, y: 20, kind: 'Br' },
      { id: 'br2', label: 'Br', x: 262, y: 65, kind: 'Br' },
    ],
    bonds: [
      { from: 'c4', to: 'c3' },
      { from: 'c3', to: 'c2' },
      { from: 'c2', to: 'c1' },
      { from: 'c1', to: 'br1' },
      { from: 'c1', to: 'br2' },
    ],
  },
  {
    id: '2,2-dibromopentane-gv',
    secretName: '2,2-dibrómpentán',
    group: 'geminal',
    nodes: [
      { id: 'c1', label: 'CH₃', x: 30, y: 65, kind: 'C' },
      { id: 'c2', label: 'C', x: 90, y: 65, kind: 'C' },
      { id: 'br1', label: 'Br', x: 90, y: 20, kind: 'Br' },
      { id: 'br2', label: 'Br', x: 90, y: 110, kind: 'Br' },
      { id: 'c3', label: 'CH₂', x: 150, y: 65, kind: 'C' },
      { id: 'c4', label: 'CH₂', x: 208, y: 65, kind: 'C' },
      { id: 'c5', label: 'CH₃', x: 265, y: 65, kind: 'C' },
    ],
    bonds: [
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'br1' },
      { from: 'c2', to: 'br2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'c4' },
      { from: 'c4', to: 'c5' },
    ],
  },
  {
    id: '2,3-dichloropentane',
    secretName: '2,3-diklórpentán',
    group: 'vicinal',
    nodes: [
      { id: 'c1', label: 'CH₃', x: 30, y: 65, kind: 'C' },
      { id: 'c2', label: 'CH', x: 90, y: 65, kind: 'C' },
      { id: 'cl1', label: 'Cl', x: 90, y: 20, kind: 'Cl' },
      { id: 'c3', label: 'CH', x: 150, y: 65, kind: 'C' },
      { id: 'cl2', label: 'Cl', x: 150, y: 20, kind: 'Cl' },
      { id: 'c4', label: 'CH₂', x: 208, y: 65, kind: 'C' },
      { id: 'c5', label: 'CH₃', x: 265, y: 65, kind: 'C' },
    ],
    bonds: [
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'cl1' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'cl2' },
      { from: 'c3', to: 'c4' },
      { from: 'c4', to: 'c5' },
    ],
  },
  {
    id: '1,2-dichlorobutane',
    secretName: '1,2-diklórbután',
    group: 'vicinal',
    nodes: [
      { id: 'cl1', label: 'Cl', x: 32, y: 20, kind: 'Cl' },
      { id: 'c1', label: 'CH₂', x: 32, y: 65, kind: 'C' },
      { id: 'c2', label: 'CH', x: 98, y: 65, kind: 'C' },
      { id: 'cl2', label: 'Cl', x: 98, y: 20, kind: 'Cl' },
      { id: 'c3', label: 'CH₂', x: 165, y: 65, kind: 'C' },
      { id: 'c4', label: 'CH₃', x: 232, y: 65, kind: 'C' },
    ],
    bonds: [
      { from: 'c1', to: 'cl1' },
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'cl2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'c4' },
    ],
  },
];

export const TASK_4_ISOMERS: IsomerCardData[] = [
  {
    id: '1-chloropentane-iso',
    name: '1-klórpentán',
    condensed: 'ClCH₂–CH₂–CH₂–CH₂–CH₃',
    chiralCarbonId: null,
    explanation: 'Egyetlen szénatomhoz sem kapcsolódik négy különböző atomcsoport (minden láncszénen legalább 2 H van).',
    nodes: [
      { id: 'cl', label: 'Cl', x: 28, y: 22, kind: 'Cl' },
      { id: 'c1', label: 'CH₂', x: 28, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'CH₂', x: 88, y: 74, kind: 'C', clickable: true },
      { id: 'c3', label: 'CH₂', x: 148, y: 74, kind: 'C', clickable: true },
      { id: 'c4', label: 'CH₂', x: 208, y: 74, kind: 'C', clickable: true },
      { id: 'c5', label: 'CH₃', x: 268, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'cl' },
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'c4' },
      { from: 'c4', to: 'c5' },
    ],
  },
  {
    id: '2-chloropentane-iso',
    name: '2-klórpentán',
    condensed: 'CH₃–CH(Cl)–CH₂–CH₂–CH₃',
    chiralCarbonId: 'c2',
    explanation: 'A C2 szénatom négy különböző csoportot hordoz: –H, –Cl, –CH₃ és –CH₂CH₂CH₃.',
    nodes: [
      { id: 'c1', label: 'CH₃', x: 28, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'CH', x: 88, y: 74, kind: 'C', clickable: true },
      { id: 'cl', label: 'Cl', x: 88, y: 22, kind: 'Cl' },
      { id: 'c3', label: 'CH₂', x: 148, y: 74, kind: 'C', clickable: true },
      { id: 'c4', label: 'CH₂', x: 208, y: 74, kind: 'C', clickable: true },
      { id: 'c5', label: 'CH₃', x: 268, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'cl' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'c4' },
      { from: 'c4', to: 'c5' },
    ],
  },
  {
    id: '3-chloropentane-iso',
    name: '3-klórpentán',
    condensed: 'CH₃–CH₂–CH(Cl)–CH₂–CH₃',
    chiralCarbonId: null,
    explanation: 'A középső C3 szénatomhoz két azonos etilcsoport (–CH₂CH₃) kapcsolódik, így a molekula szimmetrikus.',
    nodes: [
      { id: 'c1', label: 'CH₃', x: 28, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'CH₂', x: 88, y: 74, kind: 'C', clickable: true },
      { id: 'c3', label: 'CH', x: 148, y: 74, kind: 'C', clickable: true },
      { id: 'cl', label: 'Cl', x: 148, y: 22, kind: 'Cl' },
      { id: 'c4', label: 'CH₂', x: 208, y: 74, kind: 'C', clickable: true },
      { id: 'c5', label: 'CH₃', x: 268, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'cl' },
      { from: 'c3', to: 'c4' },
      { from: 'c4', to: 'c5' },
    ],
  },
  {
    id: '1-chloro-2-methylbutane-iso',
    name: '1-klór-2-metilbután',
    condensed: 'ClCH₂–CH(CH₃)–CH₂–CH₃',
    chiralCarbonId: 'c2',
    explanation: 'A C2 elágazási szénatomhoz négy különböző csoport kötődik: –H, –CH₂Cl, –CH₃ és –CH₂CH₃.',
    nodes: [
      { id: 'cl', label: 'Cl', x: 42, y: 22, kind: 'Cl' },
      { id: 'c1', label: 'CH₂', x: 42, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'CH', x: 112, y: 74, kind: 'C', clickable: true },
      { id: 'm2', label: 'CH₃', x: 112, y: 122, kind: 'C', clickable: true },
      { id: 'c3', label: 'CH₂', x: 182, y: 74, kind: 'C', clickable: true },
      { id: 'c4', label: 'CH₃', x: 252, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'cl' },
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'm2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'c4' },
    ],
  },
  {
    id: '1-chloro-3-methylbutane-iso',
    name: '1-klór-3-metilbután',
    condensed: 'ClCH₂–CH₂–CH(CH₃)–CH₃',
    chiralCarbonId: null,
    explanation: 'A C3 szénatomhoz két azonos metilcsoport (–CH₃) kapcsolódik, ezért nincs kiralitáscentrum.',
    nodes: [
      { id: 'cl', label: 'Cl', x: 42, y: 22, kind: 'Cl' },
      { id: 'c1', label: 'CH₂', x: 42, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'CH₂', x: 112, y: 74, kind: 'C', clickable: true },
      { id: 'c3', label: 'CH', x: 182, y: 74, kind: 'C', clickable: true },
      { id: 'm3', label: 'CH₃', x: 182, y: 122, kind: 'C', clickable: true },
      { id: 'c4', label: 'CH₃', x: 252, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'cl' },
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'm3' },
      { from: 'c3', to: 'c4' },
    ],
  },
  {
    id: '2-chloro-2-methylbutane-iso',
    name: '2-klór-2-metilbután',
    condensed: 'CH₃–C(Cl)(CH₃)–CH₂–CH₃',
    chiralCarbonId: null,
    explanation: 'A C2 szénatom két azonos metilcsoportot (–CH₃) visel, tehát nem aszimmetrikus.',
    nodes: [
      { id: 'c1', label: 'CH₃', x: 42, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'C', x: 112, y: 74, kind: 'C', clickable: true },
      { id: 'cl', label: 'Cl', x: 112, y: 22, kind: 'Cl' },
      { id: 'm2', label: 'CH₃', x: 112, y: 122, kind: 'C', clickable: true },
      { id: 'c3', label: 'CH₂', x: 182, y: 74, kind: 'C', clickable: true },
      { id: 'c4', label: 'CH₃', x: 252, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'cl' },
      { from: 'c2', to: 'm2' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'c4' },
    ],
  },
  {
    id: '2-chloro-3-methylbutane-iso',
    name: '2-klór-3-metilbután',
    condensed: 'CH₃–CH(Cl)–CH(CH₃)–CH₃',
    chiralCarbonId: 'c2',
    explanation: 'A klórt viselő C2 szénatom négy különböző csoportot hordoz: –H, –Cl, –CH₃ és –CH(CH₃)₂.',
    nodes: [
      { id: 'c1', label: 'CH₃', x: 42, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'CH', x: 112, y: 74, kind: 'C', clickable: true },
      { id: 'cl', label: 'Cl', x: 112, y: 22, kind: 'Cl' },
      { id: 'c3', label: 'CH', x: 182, y: 74, kind: 'C', clickable: true },
      { id: 'm3', label: 'CH₃', x: 182, y: 122, kind: 'C', clickable: true },
      { id: 'c4', label: 'CH₃', x: 252, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'cl' },
      { from: 'c2', to: 'c3' },
      { from: 'c3', to: 'm3' },
      { from: 'c3', to: 'c4' },
    ],
  },
  {
    id: '1-chloro-2,2-dimethylpropane-iso',
    name: '1-klór-2,2-dimetilpropán',
    condensed: 'ClCH₂–C(CH₃)₃',
    chiralCarbonId: null,
    explanation: 'A középső C2 szénatomhoz három azonos metilcsoport (–CH₃) kötődik, így szimmetrikus (akirális).',
    nodes: [
      { id: 'cl', label: 'Cl', x: 52, y: 22, kind: 'Cl' },
      { id: 'c1', label: 'CH₂', x: 52, y: 74, kind: 'C', clickable: true },
      { id: 'c2', label: 'C', x: 142, y: 74, kind: 'C', clickable: true },
      { id: 'm1', label: 'CH₃', x: 142, y: 22, kind: 'C', clickable: true },
      { id: 'm2', label: 'CH₃', x: 142, y: 122, kind: 'C', clickable: true },
      { id: 'c3', label: 'CH₃', x: 232, y: 74, kind: 'C', clickable: true },
    ],
    bonds: [
      { from: 'c1', to: 'cl' },
      { from: 'c1', to: 'c2' },
      { from: 'c2', to: 'm1' },
      { from: 'c2', to: 'm2' },
      { from: 'c2', to: 'c3' },
    ],
  },
];

/* ============================================================================
 * 2. SZAKASZ – 5–8. ELLENŐRZŐPONT ADATAI
 * ============================================================================ */

export type SynthesisSelectivityKey =
  | 'most-selective'
  | 'markovnikov-minor'
  | 'radical-mixture';

export interface SynthesisRouteCard {
  id: string;
  reactionTitle: string;
  equationHint: string;
  mechanismLabel: string;
  correctProfile: SynthesisSelectivityKey;
  isBestSelective: boolean;
  explanation: string;
}

export interface SynthesisSelectivityProfile {
  key: SynthesisSelectivityKey;
  title: string;
  detail: string;
}

export const TASK_5_PROFILES: SynthesisSelectivityProfile[] = [
  {
    key: 'most-selective',
    title: 'Legszelektívebb út → szinte kizárólag 2-klórbután',
    detail: 'Szimmetrikus kettős kötés addíciója: mindkét addíciós irány ugyanazt a terméket adja.',
  },
  {
    key: 'markovnikov-minor',
    title: 'Főtermék 2-klórbután + kevés 1-klórbután melléktermék',
    detail: 'Aszimmetrikus alkén elektrofil addíciója a Markovnyikov-szabály szerint.',
  },
  {
    key: 'radical-mixture',
    title: 'Izomerkeverék (1- és 2-klórbután) + többszörös klórozás',
    detail: 'Gyökös szubsztitúció, ahol többféle C–H kötés is reagálhat.',
  },
];

export const TASK_5_ROUTES: SynthesisRouteCard[] = [
  {
    id: 'but-2-ene-hcl',
    reactionTitle: 'But-2-én + HCl',
    equationHint: 'CH₃–CH=CH–CH₃ + HCl',
    mechanismLabel: 'Elektrofil addíció (szimmetrikus alkén)',
    correctProfile: 'most-selective',
    isBestSelective: true,
    explanation:
      'A but-2-én kettős kötésének mindkét szénatomja szekunder helyzetű, ezért a HCl mindkét addíciós iránya ugyanazt a 2-klórbutánt adja.',
  },
  {
    id: 'but-1-ene-hcl',
    reactionTitle: 'But-1-én + HCl',
    equationHint: 'CH₂=CH–CH₂–CH₃ + HCl',
    mechanismLabel: 'Elektrofil addíció (aszimmetrikus alkén)',
    correctProfile: 'markovnikov-minor',
    isBestSelective: false,
    explanation:
      'Ebben a reakcióban is képződik 2-klórbután főtermékként, de mivel a C1 és C2 nem ekvivalens, kisebb mennyiségben 1-klórbután melléktermék is keletkezik.',
  },
  {
    id: 'butane-cl2-uv',
    reactionTitle: 'Bután + Cl₂, UV-fény',
    equationHint: 'CH₃–CH₂–CH₂–CH₃ + Cl₂ (hν)',
    mechanismLabel: 'Gyökös szubsztitúció',
    correctProfile: 'radical-mixture',
    isBestSelective: false,
    explanation:
      'A gyökös klórozásban is keletkezik 2-klórbután, azonban a primer és szekunder C–H kötések reakciója miatt 1-klórbután és poliklórozott termékek elegye is képződik.',
  },
];

export interface BoilingPointCompound {
  id: 'ch3cl' | 'ch3br' | 'ch3i';
  formula: string;
  name: string;
  molarMass: string;
  bpReveal: string;
  rank: number; // 0 = lowest, 2 = highest
}

export const TASK_6_BOILING_COMPOUNDS: BoilingPointCompound[] = [
  {
    id: 'ch3cl',
    formula: 'CH₃Cl',
    name: 'Klórmetán',
    molarMass: '50,5 g/mol',
    bpReveal: '−24 °C',
    rank: 0,
  },
  {
    id: 'ch3br',
    formula: 'CH₃Br',
    name: 'Brómmetán',
    molarMass: '94,9 g/mol',
    bpReveal: '+4 °C',
    rank: 1,
  },
  {
    id: 'ch3i',
    formula: 'CH₃I',
    name: 'Jódmetán',
    molarMass: '141,9 g/mol',
    bpReveal: '+42 °C',
    rank: 2,
  },
];

export type FunctionalTokenId = 'OH' | 'Br' | 'O_DBL' | 'NH2' | 'H' | 'ONa' | 'Cl';

export interface FunctionalToken {
  id: FunctionalTokenId;
  label: string;
  desc: string;
}

export const TASK_7_TOKENS: FunctionalToken[] = [
  { id: 'OH', label: '–OH', desc: 'Hidroxilcsoport' },
  { id: 'O_DBL', label: '=O', desc: 'Oxocsoport' },
  { id: 'Br', label: '–Br', desc: 'Brómatom' },
  { id: 'NH2', label: '–NH₂', desc: 'Aminocsoport' },
  { id: 'H', label: '–H', desc: 'Hidrogénatom' },
];

export const TASK_8_TOKENS_A: FunctionalToken[] = [
  { id: 'O_DBL', label: '=O', desc: 'Kettős kötésű oxigén' },
  { id: 'H', label: '–H', desc: 'Hidrogénatom' },
  { id: 'OH', label: '–OH', desc: 'Hidroxilcsoport' },
  { id: 'ONa', label: '–ONa', desc: 'Nátrium-oxid csoport' },
  { id: 'Br', label: '–Br', desc: 'Brómatom' },
];

export const TASK_8_TOKENS_B: FunctionalToken[] = [
  { id: 'O_DBL', label: '=O', desc: 'Kettős kötésű oxigén' },
  { id: 'ONa', label: '–ONa', desc: 'Karboxilát (-ONa)' },
  { id: 'OH', label: '–OH', desc: 'Hidroxilcsoport (-OH)' },
  { id: 'H', label: '–H', desc: 'Hidrogénatom' },
  { id: 'Cl', label: '–Cl', desc: 'Klóratom' },
];

/* ============================================================================
 * 3. SZAKASZ – 9–12. ELLENŐRZŐPONT ADATAI
 * ============================================================================ */

export type AmineDegree = 'primer' | 'szekunder' | 'tercier';
export type AmineBondTokenId = 'C4H9' | 'H' | 'Br';

export interface AmineAlkylationStep {
  stepNumber: 1 | 2 | 3;
  name: string;
  formula: string;
  equation: string;
  degree: AmineDegree;
  requiredButylCount: number;
  requiredHCount: number;
}

export const TASK_9_STEPS: AmineAlkylationStep[] = [
  {
    stepNumber: 1,
    name: 'Bután-1-amin',
    formula: 'CH₃–CH₂–CH₂–CH₂–NH₂',
    equation: 'NH₃ + C₄H₉Br → C₄H₉–NH₂ + HBr',
    degree: 'primer',
    requiredButylCount: 1,
    requiredHCount: 2,
  },
  {
    stepNumber: 2,
    name: 'Dibutil-amin',
    formula: '(C₄H₉)₂NH',
    equation: 'C₄H₉–NH₂ + C₄H₉Br → (C₄H₉)₂NH + HBr',
    degree: 'szekunder',
    requiredButylCount: 2,
    requiredHCount: 1,
  },
  {
    stepNumber: 3,
    name: 'Tributil-amin',
    formula: '(C₄H₉)₃N',
    equation: '(C₄H₉)₂NH + C₄H₉Br → (C₄H₉)₃N + HBr',
    degree: 'tercier',
    requiredButylCount: 3,
    requiredHCount: 0,
  },
];

export const TASK_9_TOKENS: Array<{ id: AmineBondTokenId; label: string; desc: string }> = [
  { id: 'C4H9', label: '–C₄H₉', desc: 'Butilcsoport' },
  { id: 'H', label: '–H', desc: 'Hidrogénatom' },
  { id: 'Br', label: '–Br', desc: 'Brómatom' },
];

export type GrignardSlotKey =
  | 'step1Reagent'
  | 'step1Medium'
  | 'intermediate'
  | 'step2Reagent'
  | 'finalProduct'
  | 'byproduct';

export interface GrignardToken {
  id: string;
  label: string;
  sublabel?: string;
}

export const TASK_10_TOKENS: GrignardToken[] = [
  { id: 'Mg', label: 'Mg', sublabel: 'fém' },
  { id: 'dry-ether', label: 'vízmentes éter', sublabel: 'oldószer' },
  { id: 'grignard', label: 'CH₃–CH(MgBr)–CH₃', sublabel: 'Grignard-vegyület' },
  { id: 'H2O', label: 'H₂O', sublabel: 'hidrolízis' },
  { id: 'propane', label: 'Propán', sublabel: 'CH₃–CH₂–CH₃' },
  { id: 'MgBrOH', label: 'MgBrOH', sublabel: 'bázisos só' },
  { id: 'alc-koh', label: 'alkoholos KOH', sublabel: 'oldószer' },
  { id: 'propene', label: 'Propén', sublabel: 'CH₃–CH=CH₂' },
  { id: 'propan2ol', label: 'Propán-2-ol', sublabel: 'CH₃–CH(OH)–CH₃' },
  { id: 'aq-naoh', label: 'vizes NaOH', sublabel: 'lúgoldat' },
];

export const TASK_10_SOLUTION: Record<GrignardSlotKey, string> = {
  step1Reagent: 'Mg',
  step1Medium: 'dry-ether',
  intermediate: 'grignard',
  step2Reagent: 'H2O',
  finalProduct: 'propane',
  byproduct: 'MgBrOH',
};

export interface ZaitsevAlkeneOption {
  id: string;
  name: string;
  formula: string;
  isFormed: boolean;
  isMajor: boolean;
  doubleBondPath: 'c1-c2' | 'c2-c3' | null;
}

export const TASK_11_ALKENES: ZaitsevAlkeneOption[] = [
  {
    id: '2-methylbut-2-ene',
    name: '2-metilbut-2-én',
    formula: 'CH₃–CH=C(CH₃)–CH₃',
    isFormed: true,
    isMajor: true,
    doubleBondPath: 'c2-c3',
  },
  {
    id: '3-methylbut-1-ene',
    name: '3-metilbut-1-én',
    formula: 'CH₂=CH–CH(CH₃)–CH₃',
    isFormed: true,
    isMajor: false,
    doubleBondPath: 'c1-c2',
  },
  {
    id: '2-methylbut-1-ene',
    name: '2-metilbut-1-én',
    formula: 'CH₂=C(CH₃)–CH₂–CH₃',
    isFormed: false,
    isMajor: false,
    doubleBondPath: null,
  },
  {
    id: 'but-2-ene',
    name: 'But-2-én',
    formula: 'CH₃–CH=CH–CH₃',
    isFormed: false,
    isMajor: false,
    doubleBondPath: null,
  },
];

export interface DeadEndConclusionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export const TASK_12_CONCLUSIONS: DeadEndConclusionOption[] = [
  {
    id: 'no-beta-h',
    text: 'Nincs megfelelő β-hidrogén',
    isCorrect: true,
    feedback:
      'Pontos felismerés! A brómot hordozó C1 szénatom egyetlen szomszédja a középső C2 szénatom (β-szénatom), amely négy másik szénatomhoz kapcsolódik, így nincs rajta eltávolítható β-hidrogén.',
  },
  {
    id: 'alpha-h-c1',
    text: 'A brómot hordozó C1 szénatomon lévő hidrogének β-hidrogének',
    isCorrect: false,
    feedback:
      'A C1 szénatomon lévő hidrogének α-helyzetűek (ugyanahhoz a szénatomhoz kapcsolódnak, amelyhez a bróm is). A szokásos β-eliminációhoz szomszédos (β) szénatomon lévő hidrogén kell.',
  },
  {
    id: 'gamma-h-ch3',
    text: 'A szélső –CH₃ csoportok hidrogénjei β-hidrogénként eliminálhatók',
    isCorrect: false,
    feedback:
      'A három –CH₃ csoport a C2-höz kapcsolódik, vagyis γ-helyzetben vannak a C1–Br kötéshez képest (két C–C kötésre). Nem tudnak közvetlenül C1=C2 kettős kötést kialakítani.',
  },
  {
    id: 'c2-has-h',
    text: 'A középső C2 szénatomon lévő hidrogénnel megy végbe az elimináció',
    isCorrect: false,
    feedback:
      'Nézd meg a középső C2 szénatom kötéseit: C1-hez és három metilcsoporthoz kapcsolódik (4 darab C–C kötés), tehát egyetlen hidrogénatom sem kapcsolódik hozzá!',
  },
];

/* ============================================================================
 * 4. SZAKASZ – 13–16. ELLENŐRZŐPONT ADATAI
 * ============================================================================ */

export type UsageEra = 'past' | 'present' | 'both';

export interface ApplicationMatchItem {
  id: 'cfc' | 'vinyl-chloride' | 'chloroform' | 'chloroethane' | 'iodoform';
  compoundName: string;
  formula: string;
  usageText: string;
  era: UsageEra;
  photoAlt: string;
}

export const TASK_13_ITEMS: ApplicationMatchItem[] = [
  {
    id: 'cfc',
    compoundName: 'CFC-k (klór-fluor-szénhidrogének)',
    formula: 'pl. CCl₂F₂',
    usageText:
      'Hűtőközegként és aeroszolok hajtógázaként használták; ózonkárosító hatásuk miatt felhasználásukat jelentősen korlátozták.',
    era: 'past',
    photoAlt: 'Régi hűtőgép-kondenzátor és fém aeroszolos palack műhelyasztalon',
  },
  {
    id: 'vinyl-chloride',
    compoundName: 'Vinil-klorid',
    formula: 'CH₂=CHCl',
    usageText:
      'A PVC előállításának monomerje (csövek, burkolatok gyártása); ma is fontos ipari alapanyag.',
    era: 'present',
    photoAlt: 'Műanyag csövek, idomok és burkolólapok ipari raktárban',
  },
  {
    id: 'chloroform',
    compoundName: 'Kloroform',
    formula: 'CHCl₃',
    usageText:
      'Régebben altatószerként alkalmazták, de egészségkárosító hatásai miatt ma már nem használják rutinszerű altatásra.',
    era: 'past',
    photoAlt: 'Régi sötétbarna patikaüveg és drótvázas műtéti maszk',
  },
  {
    id: 'chloroethane',
    compoundName: 'Klóretán',
    formula: 'C₂H₅Cl',
    usageText:
      'Gyorsan párolgó hűtőspray-k összetevőjeként használják egyes helyi érzéstelenítési eljárásoknál.',
    era: 'present',
    photoAlt: 'Sportoló bokájára permetezett gyorsan párolgó hűtőspray',
  },
  {
    id: 'iodoform',
    compoundName: 'Jodoform',
    formula: 'CHI₃',
    usageText:
      'Történetileg fertőtlenítő és sebkezelő szerként használták; egyes speciális fogászati készítményekben ma is előfordul.',
    era: 'both',
    photoAlt: 'Halványsárga kristályos fertőtlenítő por steril gézzel és fogászati eszközökkel',
  },
];

export type Task14SlotKey = 'reagent1' | 'intermediate' | 'reagent2' | 'finalProduct';

export interface Task14Token {
  id: string;
  label: string;
  sublabel?: string;
}

export const TASK_14_TOKENS: Task14Token[] = [
  { id: 'HBr', label: 'HBr', sublabel: 'addíció' },
  { id: '2-bromobutane', label: '2-brómbután', sublabel: 'CH₃–CHBr–CH₂–CH₃' },
  { id: 'alc-koh', label: 'KOH (alkoholos, melegítés)', sublabel: 'elimináció' },
  { id: 'but-2-ene', label: 'But-2-én', sublabel: 'CH₃–CH=CH–CH₃' },
  { id: '1-bromobutane', label: '1-brómbután', sublabel: 'CH₂Br–CH₂–CH₂–CH₃' },
  { id: 'aq-koh', label: 'KOH (vizes)', sublabel: 'szubsztitúció' },
  { id: 'butane', label: 'Bután', sublabel: 'CH₃–CH₂–CH₂–CH₃' },
  { id: 'H2O', label: 'H₂O', sublabel: 'hidrolízis' },
];

export const TASK_14_SOLUTION: Record<Task14SlotKey, string> = {
  reagent1: 'HBr',
  intermediate: '2-bromobutane',
  reagent2: 'alc-koh',
  finalProduct: 'but-2-ene',
};

export const TASK_15_STOICHIOMETRY = {
  problemText:
    'Egy 24,8 g tömegű elegy 1-klórpropánt és 2,2-diklórpropánt tartalmaz. Az elegyet teljesen hidrolizálják. A keletkezett szerves termékek együttes tömege 14,7 g.\n\nHatározd meg a kiindulási elegyben található két halogénszármazék tömegét!',
  molarMasses: [
    'M(1-klórpropán) = 78,5 g/mol',
    'M(2,2-diklórpropán) = 113 g/mol',
    'M(propán-1-ol) = 60 g/mol',
    'M(propanon) = 58 g/mol',
  ],
  expectedMass1: 7.85,
  expectedMass2: 16.95,
  tolerance: 0.02,
} as const;

export type StationId = 'A' | 'B' | 'C';



