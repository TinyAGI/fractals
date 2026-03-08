/**
 * PixelOffice — 主动画组件
 *
 * 时序：
 *   0s    标题 + 地板出现
 *   0.5s  Orchestrator 出现
 *   1.5s  开始分解任务（打字 + 投影板动效）
 *   3.0s  Worktree 工位淡入
 *   3.5s  3 个 Agent 从休息区出现
 *   5.0s  Agent 0 领任务 → 走向工位 → 开始工作
 *   5.8s  Agent 1 同上
 *   6.6s  Agent 2 同上
 *   12s   Agent 0 完成 → 庆祝 → 返回休息区
 *   13.5s Agent 1 完成
 *   15s   Agent 2 完成
 *   16.5s 全部完成 banner
 */

import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { COLORS, LAYOUT, TIMELINE, FPS } from "./types";
import { PixelChar, SpeechBubble } from "./PixelChar";
import {
  Floor,
  OrchestratorDesk,
  WorktreeDesk,
  WorktreeDeskLabel,
  TaskTreePanel,
  Lounge,
  SceneTitle,
  StatusBar,
  DoneBanner,
} from "./Scene";

const C = COLORS;
const L = LAYOUT;
const TL = TIMELINE;

// ─── 帧到秒 ───────────────────────────────────────────────────────────────────

const f = (s: number) => Math.round(s * FPS);

// ─── Agent 位置调度逻辑 ───────────────────────────────────────────────────────

type AgentAnim = "idle" | "walk" | "type" | "celebrate" | "error" | "sleep" | "returning";

// 休息区内 3 个 agent 的待命坐标
const LOUNGE_SPOTS = [
  { x: L.LOUNGE_X + 45, y: L.LOUNGE_Y + 140 },
  { x: L.LOUNGE_X + 110, y: L.LOUNGE_Y + 140 },
  { x: L.LOUNGE_X + 175, y: L.LOUNGE_Y + 140 },
];

// 工位上方的工作坐标（小人站在桌子前）
function deskSpot(deskIndex: number) {
  const x = L.DESK_START_X + deskIndex * (L.DESK_W + L.DESK_GAP) + L.DESK_W / 2;
  const y = L.DESK_Y - 5;
  return { x, y };
}

// 根据时间计算 agent 的 x/y（线性插值 + spring）
function agentPosition(
  frame: number,
  agentIndex: number,
  dispatchTime: number,
  arriveTime: number,
  returnTime: number,
  deskIndex: number,
): { x: number; y: number } {
  const t = frame / FPS;
  const lounge = LOUNGE_SPOTS[agentIndex];
  const desk = deskSpot(deskIndex);

  if (t < dispatchTime) {
    // 在休息区待命
    return lounge;
  }

  if (t < arriveTime) {
    // 走向工位（spring 插值）
    const progress = (t - dispatchTime) / (arriveTime - dispatchTime);
    const ease = Math.min(1, progress * progress * (3 - 2 * progress)); // smoothstep
    return {
      x: lounge.x + (desk.x - lounge.x) * ease,
      y: lounge.y + (desk.y - lounge.y) * ease,
    };
  }

  if (t < returnTime) {
    // 在工位工作
    return desk;
  }

  // 返回休息区
  const doneTime = returnTime - 0.8; // 庆祝结束才开始走
  const returnProgress = Math.min(1, (t - returnTime) / 1.5);
  const ease = Math.min(1, returnProgress * returnProgress * (3 - 2 * returnProgress));
  return {
    x: desk.x + (lounge.x - desk.x) * ease,
    y: desk.y + (lounge.y - desk.y) * ease,
  };
}

function agentAnim(
  frame: number,
  dispatchTime: number,
  arriveTime: number,
  workDoneTime: number,
  returnTime: number,
): AgentAnim {
  const t = frame / FPS;
  if (t < dispatchTime) return "sleep";
  if (t < arriveTime) return "walk";
  if (t < workDoneTime) return "type";
  if (t < returnTime) return "celebrate";
  return "walk"; // 返回途中
}

function deskStatus(
  frame: number,
  arriveTime: number,
  workDoneTime: number,
): "empty" | "pending" | "running" | "done" {
  const t = frame / FPS;
  if (t < arriveTime - 0.5) return "empty";
  if (t < arriveTime) return "pending";
  if (t < workDoneTime) return "running";
  return "done";
}


// ─── 任务卡片（从 orchestrator 飞出） ────────────────────────────────────────

function TaskCard({
  label,
  startS,
  color,
  targetX,
  targetY,
}: {
  label: string;
  startS: number;
  color: string;
  targetX: number;
  targetY: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame: frame - f(startS),
    fps,
    config: { damping: 18, stiffness: 90 },
  });

  const fromX = L.ORCH_X + L.ORCH_DESK_W / 2;
  const fromY = L.ORCH_Y + L.ORCH_DESK_H / 2;

  const x = interpolate(spr, [0, 1], [fromX, targetX]);
  const y = interpolate(spr, [0, 1], [fromY, targetY]);
  const opacity = interpolate(spr, [0, 0.05, 0.9, 1], [0, 1, 1, 0.7]);
  const scale = interpolate(spr, [0, 0.1, 1], [0, 1.2, 1]);

  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
      <rect x={-40} y={-12} width={80} height={24}
        fill={color + "22"} rx={5}
        stroke={color} strokeWidth={1.5}
      />
      <text x={0} y={5} textAnchor="middle"
        fontSize={17} fill={color} fontFamily="monospace" fontWeight={700}>
        {label}
      </text>
    </g>
  );
}

// ─── 主动画组件 ───────────────────────────────────────────────────────────────

const TASKS = [
  { id: "1.1", description: "Create HTML structure" },
  { id: "1.2", description: "Dark-theme CSS styling" },
  { id: "1.3", description: "Mandelbrot JS animation" },
];

const AGENT_COLORS = [C.agentColors[0], C.agentColors[1], C.agentColors[2]];

// 每个 agent 的时间参数
const AGENT_SCHEDULE = [
  { dispatch: TL.dispatch0, arrive: TL.work0Start, done: TL.work0Done, return: TL.return0 },
  { dispatch: TL.dispatch1, arrive: TL.work1Start, done: TL.work1Done, return: TL.return1 },
  { dispatch: TL.dispatch2, arrive: TL.work2Start, done: TL.work2Done, return: TL.return2 },
];

export const PixelOffice = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / FPS;

  // ── 各元素的 opacity（spring 淡入）
  function fadeIn(startS: number) {
    return interpolate(
      spring({ frame: frame - f(startS), fps, config: { damping: 20 } }),
      [0, 1], [0, 1]
    );
  }

  const titleOpacity = fadeIn(TL.titleIn);
  const orchOpacity = fadeIn(TL.orchAppear);
  const loungeOpacity = fadeIn(TL.agentsAppear - 0.5);
  const desksOpacity = fadeIn(TL.desksAppear);
  const allDoneOpacity = fadeIn(TL.allDone);

  // ── Orchestrator 阶段
  const orchPhase =
    t >= TL.allDone ? "done"
    : t >= TL.dispatch0 ? "dispatching"
    : t >= TL.orchDecompose ? "decomposing"
    : "idle";

  // ── Agent 状态
  const agents = AGENT_SCHEDULE.map((sch, i) => {
    const pos = agentPosition(frame, i, sch.dispatch, sch.arrive, sch.return, i);
    const anim = agentAnim(frame, sch.dispatch, sch.arrive, sch.done, sch.return);
    return { ...pos, anim, color: AGENT_COLORS[i], index: i, schedule: sch };
  });

  // ── 任务卡片是否显示
  const showCards = t >= TL.dispatch0;

  // ── status bar 文字
  const statusLabel =
    t >= TL.allDone ? "✓ all tasks complete — 3 commits"
    : t >= TL.work0Start ? "● phase 2 — agents executing in parallel worktrees"
    : t >= TL.dispatch0 ? "● dispatching agents to worktrees..."
    : t >= TL.orchDecompose ? "● phase 1 — decomposing task tree..."
    : "● initializing...";

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0 }}>
        {/* ── 地板和背景 */}
        <Floor />

        {/* ── 休息区 */}
        <g opacity={loungeOpacity}>
          <Lounge />
        </g>

        {/* ── Worktree 工位 */}
        <g opacity={desksOpacity}>
          {TASKS.map((task, i) => (
            <WorktreeDesk
              key={task.id}
              index={i}
              taskDesc={task.description}
              agentLabel={`Agent-${i + 1}`}
              status={deskStatus(frame, AGENT_SCHEDULE[i].arrive, AGENT_SCHEDULE[i].done)}
              frame={frame}
            />
          ))}
        </g>

        {/* ── Orchestrator 工作台 */}
        <g opacity={orchOpacity}>
          <OrchestratorDesk phase={orchPhase} frame={frame} />
        </g>

        {/* ── 递归任务树（右侧空白区域） */}
        <TaskTreePanel frame={frame} phase={orchPhase} />

        {/* ── Orchestrator 小人 */}
        <g opacity={orchOpacity}>
          <PixelChar
            x={L.ORCH_X + L.ORCH_DESK_W / 2}
            y={L.ORCH_Y - 10}
            color={"#7c3aed"}
            anim={orchPhase === "decomposing" ? "type" : "idle"}
            frame={frame}
            size={1.25}
          />
        </g>

        {/* ── 任务名标签 */}
        <g opacity={desksOpacity}>
          {TASKS.map((task, i) => (
            <WorktreeDeskLabel
              key={task.id}
              index={i}
              taskDesc={task.description}
              status={deskStatus(frame, AGENT_SCHEDULE[i].arrive, AGENT_SCHEDULE[i].done)}
            />
          ))}
        </g>

        {/* ── Agent 小人（最后渲染，始终在最上层） */}
        {t >= TL.agentsAppear && agents.map((agent) => {
          const agentOpacity = fadeIn(TL.agentsAppear + agent.index * 0.3);
          return (
            <g key={agent.index} opacity={agentOpacity}>
              <PixelChar
                x={agent.x}
                y={agent.y}
                color={agent.color}
                anim={agent.anim === "returning" ? "walk" : agent.anim as any}
                frame={frame}
                flip={agent.x < LOUNGE_SPOTS[agent.index].x}
                size={1.1}
              />
              {/* 完成时显示 ✓ 气泡 */}
              {agent.anim === "celebrate" && (
                <SpeechBubble
                  x={agent.x}
                  y={agent.y - 70}
                  text="✓ committed!"
                  color="#0d2b1a"
                  textColor="#4ade80"
                />
              )}
            </g>
          );
        })}

        {/* ── 任务卡片飞出 */}
        {showCards && AGENT_COLORS.map((color, i) => {
          const dest = deskSpot(i);
          return (
            <TaskCard
              key={i}
              label={`Agent-${i + 1}`}
              startS={TL.dispatch0 + i * 0.8}
              color={color}
              targetX={dest.x}
              targetY={dest.y - 80}
            />
          );
        })}

        {/* ── 标题 */}
        <SceneTitle opacity={titleOpacity} />

        {/* ── 完成横幅 */}
        <DoneBanner opacity={allDoneOpacity} />
      </svg>

      {/* ── 状态栏（HTML 层，方便文字渲染） */}
      <div style={{
        position: "absolute",
        top: 310,
        left: "50%",
        transform: "translateX(-50%)",
        background: C.cardBg,
        border: `1px solid ${C.cardBorder}`,
        borderRadius: 8,
        padding: "6px 16px",
        fontFamily: "monospace",
        fontSize: 18,
        color: C.text,
        opacity: titleOpacity,
        whiteSpace: "nowrap",
      }}>
        {statusLabel}
      </div>
    </AbsoluteFill>
  );
};
