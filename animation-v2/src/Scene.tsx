/**
 * Scene — 虚拟像素办公室场景元素
 * 包含：地板、Orchestrator 指挥台、Worktree 工位、休息区
 */

import { interpolate } from "remotion";
import { COLORS, LAYOUT } from "./types";

const C = COLORS;
const L = LAYOUT;

// ─── 地板网格 ─────────────────────────────────────────────────────────────────

export function Floor() {
  const lines = [];
  // 水平线
  for (let y = 300; y < L.H; y += 40) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={L.W} y2={y}
        stroke={C.floorLine} strokeWidth={1} opacity={0.4} />
    );
  }
  // 垂直线（透视感）
  for (let x = 0; x <= L.W; x += 60) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={300} x2={x} y2={L.H}
        stroke={C.floorLine} strokeWidth={1} opacity={0.3} />
    );
  }
  return (
    <g>
      <rect x={0} y={0} width={L.W} height={300} fill={C.wall} />
      <rect x={0} y={295} width={L.W} height={5} fill={C.wallTop} />
      <rect x={0} y={300} width={L.W} height={L.H - 300} fill={C.floor} />
      {lines}
      {/* 踢脚线 */}
      <rect x={0} y={298} width={L.W} height={4} fill="#0d1117" opacity={0.6} />
    </g>
  );
}

// ─── 像素植物 ─────────────────────────────────────────────────────────────────

function PixelPlant({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {/* 花盆 */}
      <rect x={x - 8} y={y - 14} width={16} height={14} fill="#4a3728" rx={2} />
      <rect x={x - 10} y={y - 16} width={20} height={4} fill="#5a4738" rx={1} />
      {/* 茎 */}
      <rect x={x - 1} y={y - 32} width={3} height={18} fill={C.plantGreen} />
      {/* 叶子 */}
      <ellipse cx={x - 8} cy={y - 30} rx={8} ry={5} fill={C.plantGreen} transform={`rotate(-30,${x - 8},${y - 30})`} />
      <ellipse cx={x + 8} cy={y - 26} rx={8} ry={5} fill={C.plantGreen2} transform={`rotate(30,${x + 8},${y - 26})`} />
      <ellipse cx={x} cy={y - 36} rx={6} ry={4} fill={C.plantGreen2} />
    </g>
  );
}

// ─── Orchestrator 指挥台 ──────────────────────────────────────────────────────

export function OrchestratorDesk({
  phase,
  frame,
}: {
  phase: "idle" | "decomposing" | "dispatching" | "done";
  frame: number;
}) {
  const x = L.ORCH_X;
  const y = L.ORCH_Y;
  const dw = L.ORCH_DESK_W;
  const dh = L.ORCH_DESK_H;
  const t = frame / 30;

  const isActive = phase === "decomposing" || phase === "dispatching";

  // 屏幕闪烁
  const screenColor = phase === "done" ? C.screenDone
    : isActive ? C.screenActive : C.screen;

  return (
    <g>

      {/* 桌面 */}
      <rect x={x} y={y} width={dw} height={dh}
        fill={C.deskBase} rx={6}
        stroke={isActive ? "#3d59a1" : "#2a2d3a"} strokeWidth={2}
      />
      {/* 桌面顶部 */}
      <rect x={x} y={y} width={dw} height={12}
        fill={C.deskTop} rx={6} />
      <rect x={x} y={y + 6} width={dw} height={6}
        fill={C.deskTop} />

      {/* 显示器 */}
      <rect x={x + dw / 2 - 36} y={y + 14} width={72} height={44}
        fill={screenColor} rx={4}
        stroke="#3d59a1" strokeWidth={1}
      />
      {/* 显示器内文字 */}
      {phase === "decomposing" && (
        <>
          <text x={x + dw / 2} y={y + 32} textAnchor="middle"
            fontSize={8} fill="#4a9eff" fontFamily="monospace">
            decomposing...
          </text>
          <text x={x + dw / 2} y={y + 44} textAnchor="middle"
            fontSize={7} fill="#565f89" fontFamily="monospace">
            {`depth: ${Math.floor(t % 4) + 1}/4`}
          </text>
        </>
      )}
      {(phase === "dispatching" || phase === "done") && (
        <text x={x + dw / 2} y={y + 38} textAnchor="middle"
          fontSize={9} fill="#4ade80" fontFamily="monospace">
          ✓ complete
        </text>
      )}

      {/* 键盘 */}
      <rect x={x + dw / 2 - 28} y={y + 62} width={56} height={12}
        fill="#1f2335" rx={2} stroke="#2a2d3a" strokeWidth={1} />
      {[0, 1, 2, 3, 4].map(k => (
        <rect key={k} x={x + dw / 2 - 22 + k * 11} y={y + 64} width={8} height={8}
          fill="#2a2d3a" rx={1} />
      ))}

      {/* 标签 */}
      <text x={x + dw / 2} y={y + dh + 16} textAnchor="middle"
        fontSize={12} fill={C.text} fontFamily="monospace" fontWeight={700}>
        orchestrator
      </text>

      {/* 植物装饰 */}
      <PixelPlant x={x - 18} y={y + dh} />
    </g>
  );
}

// ─── Worktree 工位 ────────────────────────────────────────────────────────────

export function WorktreeDesk({
  index,
  taskDesc,
  agentLabel,
  status,
  opacity = 1,
  frame,
}: {
  index: number;
  taskDesc: string;
  agentLabel: string;
  status: "empty" | "pending" | "running" | "done" | "error";
  opacity?: number;
  frame: number;
}) {
  const x = L.DESK_START_X + index * (L.DESK_W + L.DESK_GAP);
  const y = L.DESK_Y;
  const dw = L.DESK_W;
  const dh = L.DESK_H;
  const t = frame / 30;

  const isRunning = status === "running";
  const isDone = status === "done";
  const isError = status === "error";

  const deskColor = isDone ? C.deskTopDone : isError ? C.deskTopError : isRunning ? C.deskTopBusy : C.deskBase;
  const borderColor = isDone ? "#4ade80" : isError ? "#f7768e" : isRunning ? "#4a9eff" : "#2a2d3a";
  const screenColor = isDone ? C.screenDone : isError ? "#2d0d0d" : isRunning ? C.screenActive : C.screen;

  // 发光效果
  const glowOpacity = isRunning ? 0.3 + Math.sin(t * Math.PI * 2) * 0.2
    : isDone ? 0.25 : 0;
  const glowColor = isDone ? C.glowGreen : isError ? C.glowRed : C.glowBlue;

  return (
    <g opacity={opacity}>
      {/* 发光底层 */}
      {(isRunning || isDone) && (
        <rect x={x - 8} y={y - 8} width={dw + 16} height={dh + 16}
          fill={glowColor} rx={12} opacity={glowOpacity} />
      )}

      {/* 桌腿 */}
      <rect x={x + 20} y={y + dh} width={8} height={30} fill="#1a1d27" rx={2} />
      <rect x={x + dw - 28} y={y + dh} width={8} height={30} fill="#1a1d27" rx={2} />

      {/* 桌面主体 */}
      <rect x={x} y={y} width={dw} height={dh}
        fill={deskColor} rx={8}
        stroke={borderColor} strokeWidth={isRunning || isDone ? 2 : 1}
      />
      {/* 桌面顶条 */}
      <rect x={x} y={y} width={dw} height={10} fill={C.deskTop} rx={8} />
      <rect x={x} y={y + 5} width={dw} height={5} fill={C.deskTop} />

      {/* 显示器 */}
      <rect x={x + dw / 2 - 44} y={y + 14} width={88} height={54}
        fill={screenColor} rx={5}
        stroke={borderColor} strokeWidth={1}
      />
      {/* 显示器支架 */}
      <rect x={x + dw / 2 - 4} y={y + 68} width={8} height={8} fill="#1a1d27" />
      <rect x={x + dw / 2 - 14} y={y + 74} width={28} height={4} fill="#1a1d27" rx={1} />

      {/* 显示器内容 */}
      {isRunning && (
        <>
          {/* 代码行 */}
          {[0, 1, 2, 3].map(row => (
            <rect key={row}
              x={x + dw / 2 - 36 + (row % 2) * 8}
              y={y + 20 + row * 10}
              width={30 + (row * 7) % 20}
              height={6}
              fill="#4a9eff" rx={1}
              opacity={0.4 + (row === Math.floor(t * 2) % 4 ? 0.5 : 0)}
            />
          ))}
          {/* 光标闪烁 */}
          {Math.floor(t * 2) % 2 === 0 && (
            <rect x={x + dw / 2 - 36} y={y + 20 + (Math.floor(t * 2) % 4) * 10}
              width={3} height={6} fill="#c0caf5" />
          )}
        </>
      )}
      {isDone && (
        <text x={x + dw / 2} y={y + 46} textAnchor="middle"
          fontSize={16} fill="#4ade80" fontFamily="monospace">
          ✓
        </text>
      )}
      {isError && (
        <text x={x + dw / 2} y={y + 46} textAnchor="middle"
          fontSize={16} fill="#f7768e" fontFamily="monospace">
          ✗
        </text>
      )}

      {/* 键盘 */}
      <rect x={x + dw / 2 - 38} y={y + 86} width={76} height={16}
        fill="#1f2335" rx={3} stroke="#2a2d3a" strokeWidth={1}
      />
      {[0, 1, 2, 3, 4, 5].map(k => (
        <rect key={k} x={x + dw / 2 - 32 + k * 13} y={y + 89} width={10} height={10}
          fill={isRunning && Math.floor(t * 8 + k) % 6 === 0 ? "#4a9eff" : "#2a2d3a"} rx={2}
          opacity={0.9}
        />
      ))}

      {/* 工位标签 */}
      <rect x={x + 4} y={y + dh - 18} width={dw - 8} height={16}
        fill="#0d1117" rx={3} opacity={0.7} />
      <text x={x + dw / 2} y={y + dh - 7} textAnchor="middle"
        fontSize={9} fill={borderColor} fontFamily="monospace">
        {`worktree/${index + 1}`}
      </text>

    </g>
  );
}

// 单独渲染 worktree 任务名（在 agents 之后调用，保证层级在上）
export function WorktreeDeskLabel({
  index,
  taskDesc,
  status,
}: {
  index: number;
  taskDesc: string;
  status: "empty" | "pending" | "running" | "done" | "error";
}) {
  if (status === "empty") return null;
  const x = L.DESK_START_X + index * (L.DESK_W + L.DESK_GAP);
  const dw = L.DESK_W;
  const dh = L.DESK_H;
  return (
    <text x={x + dw / 2} y={L.DESK_Y + dh + 18} textAnchor="middle"
      fontSize={11} fill={C.text}
      fontFamily="monospace" fontWeight={600}
    >
      {taskDesc.length > 22 ? taskDesc.slice(0, 22) + "…" : taskDesc}
    </text>
  );
}

// ─── 休息区（Lounge） ─────────────────────────────────────────────────────────

export function Lounge() {
  const x = L.LOUNGE_X;
  const y = L.LOUNGE_Y;
  const w = L.LOUNGE_W;
  const h = L.LOUNGE_H;

  return (
    <g>
      {/* 区域底板 */}
      <rect x={x} y={y} width={w} height={h}
        fill={C.loungeFloor} rx={10}
        stroke={C.loungeAccent} strokeWidth={1}
        opacity={0.8}
      />
      {/* 标签 */}
      <rect x={x + w / 2 - 32} y={y - 12} width={64} height={18}
        fill={C.cardBg} rx={4} stroke={C.loungeAccent} strokeWidth={1} />
      <text x={x + w / 2} y={y + 1} textAnchor="middle"
        fontSize={10} fill={C.textMuted} fontFamily="monospace">
        LOUNGE
      </text>

      {/* 沙发 */}
      <rect x={x + 10} y={y + h - 50} width={w - 20} height={35}
        fill={C.loungeAccent} rx={8} />
      <rect x={x + 10} y={y + h - 50} width={w - 20} height={12}
        fill="#4a5289" rx={8} />
      {/* 沙发靠背 */}
      <rect x={x + 10} y={y + h - 80} width={w - 20} height={32}
        fill={C.loungeAccent} rx={8} />
      {/* 沙发扶手 */}
      <rect x={x + 8} y={y + h - 72} width={12} height={55} fill="#4a5289" rx={4} />
      <rect x={x + w - 20} y={y + h - 72} width={12} height={55} fill="#4a5289" rx={4} />

      {/* 咖啡桌 */}
      <rect x={x + w / 2 - 24} y={y + 20} width={48} height={30}
        fill="#2d3561" rx={5} stroke="#3d4a7a" strokeWidth={1} />
      {/* 咖啡杯 */}
      <rect x={x + w / 2 - 6} y={y + 24} width={12} height={16} fill="#5a3e28" rx={2} />
      <rect x={x + w / 2 - 8} y={y + 22} width={16} height={4} fill="#6a4e38" rx={1} />
      {/* 蒸汽 */}
      <path d={`M ${x + w / 2 - 3} ${y + 18} Q ${x + w / 2} ${y + 12} ${x + w / 2 + 3} ${y + 18}`}
        stroke="#c0caf5" strokeWidth={1.5} fill="none" opacity={0.5} />

      {/* 植物角落 */}
      <PixelPlant x={x + w - 20} y={y + h - 15} />
      <PixelPlant x={x + 20} y={y + h - 15} />
    </g>
  );
}

// ─── 标题 ─────────────────────────────────────────────────────────────────────

export function SceneTitle({ opacity }: { opacity: number }) {
  return (
    <g opacity={opacity}>
      <text x={40} y={50} fontSize={28} fill={C.text}
        fontFamily="monospace" fontWeight={700}>
        Fractals 🌀
      </text>
      <text x={40} y={72} fontSize={13} fill={C.textMuted} fontFamily="monospace">
        recursive agentic task orchestrator — pixel office
      </text>
    </g>
  );
}

// ─── 状态栏 ───────────────────────────────────────────────────────────────────

export function StatusBar({ label, opacity }: { label: string; opacity: number }) {
  return (
    <g opacity={opacity}>
      <rect x={40} y={L.H - 44} width={label.length * 8 + 24} height={26}
        fill={C.cardBg} rx={6} stroke={C.cardBorder} strokeWidth={1} />
      <text x={52} y={L.H - 26} fontSize={12} fill={C.text} fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}

// ─── 完成横幅 ─────────────────────────────────────────────────────────────────

export function DoneBanner({ opacity }: { opacity: number }) {
  return (
    <g opacity={opacity}>
      <rect x={L.W - 280} y={40} width={240} height={50}
        fill="#0d2b1a" rx={10}
        stroke="#4ade80" strokeWidth={2}
      />
      <text x={L.W - 160} y={60} textAnchor="middle"
        fontSize={14} fill="#4ade80" fontFamily="monospace" fontWeight={700}>
        ✓ execution complete
      </text>
      <text x={L.W - 160} y={78} textAnchor="middle"
        fontSize={11} fill="#565f89" fontFamily="monospace">
        3 commits · 3 worktrees
      </text>
    </g>
  );
}
