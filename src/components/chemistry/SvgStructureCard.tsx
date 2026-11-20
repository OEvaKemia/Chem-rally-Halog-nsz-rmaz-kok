import type { SvgAtomNode, SvgBondEdge } from '../../game/chemistry/checkpointData';

interface SvgStructureCardProps {
  nodes: SvgAtomNode[];
  bonds: SvgBondEdge[];
  selectedCarbonId?: string | null;
  onSelectCarbon?: (carbonId: string) => void;
  heightClass?: string;
}

export function SvgStructureCard({
  nodes,
  bonds,
  selectedCarbonId,
  onSelectCarbon,
  heightClass = 'h-24',
}: SvgStructureCardProps) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg
      viewBox="0 0 300 142"
      className={`w-full ${heightClass} select-none`}
      role="img"
      aria-label="Szerkezeti képlet"
    >
      {/* Kovalens kötések */}
      {bonds.map((b, idx) => {
        const a = nodeMap.get(b.from);
        const c = nodeMap.get(b.to);
        if (!a || !c) return null;
        return (
          <line
            key={`${b.from}-${b.to}-${idx}`}
            x1={a.x}
            y1={a.y}
            x2={c.x}
            y2={c.y}
            stroke="#a1a1aa"
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Atomcsomópontok */}
      {nodes.map((n) => {
        const isSelected = selectedCarbonId === n.id;
        const canClick = Boolean(onSelectCarbon && n.clickable && n.kind === 'C');

        const fill =
          n.kind === 'Br'
            ? '#7f1d1d'
            : n.kind === 'Cl'
              ? '#065f46'
              : isSelected
                ? '#ea580c'
                : '#18181b';

        const stroke =
          n.kind === 'Br'
            ? '#f87171'
            : n.kind === 'Cl'
              ? '#34d399'
              : isSelected
                ? '#fdba74'
                : canClick
                  ? '#71717a'
                  : '#52525b';

        const textColor =
          n.kind === 'Br'
            ? '#fecaca'
            : n.kind === 'Cl'
              ? '#a7f3d0'
              : '#fafafa';

        return (
          <g
            key={n.id}
            onClick={canClick ? () => onSelectCarbon?.(n.id) : undefined}
            className={canClick ? 'cursor-pointer' : undefined}
          >
            {/* Nagyított érintési célterület szénatomokhoz */}
            {canClick && (
              <circle
                cx={n.x}
                cy={n.y}
                r={24}
                fill="transparent"
              />
            )}
            <rect
              x={n.x - (n.label.length >= 3 ? 21 : 16)}
              y={n.y - 14}
              width={n.label.length >= 3 ? 42 : 32}
              height={28}
              rx={8}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSelected ? 2.6 : 1.6}
            />
            <text
              x={n.x}
              y={n.y + 5}
              textAnchor="middle"
              fill={textColor}
              fontSize="13.5"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {n.label}
            </text>
            {isSelected && (
              <text
                x={n.x + 19}
                y={n.y - 11}
                textAnchor="middle"
                fill="#fdba74"
                fontSize="13"
                fontWeight="700"
              >
                *
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
