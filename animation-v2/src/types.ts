// ─── Task tree (mirrors Fractals backend) ─────────────────────────────────────

export type TaskStatus = "pending" | "ready" | "running" | "done" | "error";

export type LeafTask = {
  id: string;
  description: string;
  status: TaskStatus;
};

// ─── Agent state machine ───────────────────────────────────────────────────────
//
//  idle ──> walking ──> working ──> done_celebrate ──> returning ──> idle
//                                └──> error
//

export type AgentStatus =
  | "idle"           // 在休息区，待命或喝咖啡
  | "walking"        // 走向工位
  | "working"        // 在工位敲键盘
  | "error"          // 任务失败，头顶冒烟
  | "done_celebrate" // 任务完成，举手庆祝
  | "returning";     // 返回休息区

export type AgentState = {
  id: number;
  status: AgentStatus;
  // 当前坐标（像素）
  x: number;
  y: number;
  // 目标坐标（走向工位/休息区）
  targetX: number;
  targetY: number;
  // 分配到的任务 & 工位
  assignedTaskId: string | null;
  assignedDeskIndex: number | null;
  // 动画帧计数（用于精灵切帧）
  frameCount: number;
  // 颜色主题
  color: string;
};

// ─── Worktree desk ────────────────────────────────────────────────────────────

export type DeskState = {
  index: number;
  x: number;
  y: number;
  occupied: boolean;
  taskId: string | null;
  taskStatus: TaskStatus | null;
};

// ─── Office scene state ───────────────────────────────────────────────────────

export type OfficeState = {
  agents: AgentState[];
  desks: DeskState[];
  tasks: LeafTask[];
  orchestratorPhase: "idle" | "decomposing" | "dispatching" | "done";
  frame: number; // global animation frame
};

// ─── Layout constants ─────────────────────────────────────────────────────────

export const LAYOUT = {
  W: 1280,
  H: 720,
  // Orchestrator area (top-center)
  ORCH_X: 540,
  ORCH_Y: 150,
  ORCH_DESK_W: 200,
  ORCH_DESK_H: 80,
  // Lounge area (bottom-left)
  LOUNGE_X: 60,
  LOUNGE_Y: 510,
  LOUNGE_W: 220,
  LOUNGE_H: 180,
  // Worktree desks (bottom row)
  DESK_Y: 470,
  DESK_W: 240,
  DESK_H: 140,
  DESK_GAP: 30,
  DESK_START_X: 310,
  // Pixel grid size
  PX: 1,
} as const;

// ─── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = {
  bg: "#1a1b26",
  floor: "#24283b",
  floorLine: "#2a2e42",
  wall: "#16213e",
  wallTop: "#0d1b2a",
  deskBase: "#2d3561",
  deskTop: "#3d4a7a",
  deskTopBusy: "#1e3a5f",
  deskTopDone: "#1a3d2b",
  deskTopError: "#3d1a1a",
  loungeFloor: "#1e2030",
  loungeAccent: "#414868",
  screen: "#0d1117",
  screenActive: "#0d2137",
  screenDone: "#0d2b1a",
  monitor: "#2d3561",
  plantGreen: "#2d5a27",
  plantGreen2: "#3d7a33",
  // Agent colors
  agentColors: ["#4a9eff", "#4ade80", "#f59e0b", "#f472b6", "#a78bfa"],
  agentSkin: "#fbbf24",
  // UI text
  text: "#c0caf5",
  textMuted: "#565f89",
  textGreen: "#9ece6a",
  textRed: "#f7768e",
  textAmber: "#e0af68",
  // Task card
  cardBg: "#1f2335",
  cardBorder: "#3d59a1",
  // Bubble
  bubbleBg: "#e2e8f0",
  bubbleText: "#1a1b26",
  // glow
  glowBlue: "rgba(74,158,255,0.4)",
  glowGreen: "rgba(74,222,128,0.4)",
  glowRed: "rgba(247,118,142,0.4)",
} as const;

// ─── Timing ───────────────────────────────────────────────────────────────────

export const FPS = 30;
export const TOTAL_SECONDS = 20;

export const TIMELINE = {
  titleIn: 0,
  orchAppear: 0.5,
  orchDecompose: 1.5,   // orchestrator starts typing
  desksAppear: 3.0,     // worktree desks fade in
  agentsAppear: 3.5,    // agents appear in lounge
  dispatch0: 5.0,       // agent 0 gets task, walks to desk
  dispatch1: 5.8,
  dispatch2: 6.6,
  work0Start: 7.2,
  work1Start: 8.0,
  work2Start: 8.8,
  work0Done: 12.0,
  work1Done: 13.5,
  work2Done: 15.0,
  return0: 12.8,
  return1: 14.3,
  return2: 15.8,
  allDone: 16.5,
} as const;
