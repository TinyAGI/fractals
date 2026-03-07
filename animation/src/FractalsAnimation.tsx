import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskNode = {
  id: string;
  description: string;
  children: TaskNode[];
};

export const sampleTree: TaskNode = {
  id: "1",
  description: "Build a landing page for Fractals",
  children: [
    { id: "1.1", description: "Create HTML structure", children: [] },
    { id: "1.2", description: "Dark-theme CSS styling", children: [] },
    { id: "1.3", description: "Mandelbrot JS animation", children: [] },
  ],
};

// ─── Palette ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#0f1117",
  panel: "#1a1d27",
  panelBorder: "#2a2d3a",
  panelDone: "#0d2b1e",
  panelBorderDone: "#4ade80",
  text: "#e2e8f0",
  muted: "#64748b",
  accent: "#4a9eff",
  green: "#4ade80",
  amber: "#f59e0b",
  orchestratorBody: "#7c3aed",
  orchestratorSkin: "#fbbf24",
  agentBody: ["#2563eb", "#059669", "#dc2626"],
  agentSkin: "#fbbf24",
};

// ─── Timing (seconds) ─────────────────────────────────────────────────────────

const T = {
  orchestratorIn: 0.2,
  think: 1.2,         // thinking bubble appears
  agentReceive: 2.5,  // agents + worktrees appear
  agentWalk: 4.5,     // agents walk to worktrees
  agentWork: 6.0,     // agents start working
  agent0Done: 8.5,
  agent1Done: 9.8,
  agent2Done: 11.0,
  allDone: 11.8,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const f = (s: number, fps: number) => Math.round(s * fps);

function useSpr(startS: number, cfg?: { damping?: number; stiffness?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - f(startS, fps),
    fps,
    config: { damping: cfg?.damping ?? 18, stiffness: cfg?.stiffness ?? 130 },
  });
}


// ─── Pixel-art character ──────────────────────────────────────────────────────

/**
 * Cute pixel-art character:
 * - Square head with pixel eyes/mouth
 * - Square body
 * - Circle hands on stick arms
 * - Stick legs with square feet
 */
function StickFigure({
  size = 60,
  bodyColor = "#4a9eff",
  skinColor = "#fbbf24",
  hat = false,
  typing = false,
  celebrate = false,
  frame = 0,
  fps = 30,
}: {
  size?: number;
  bodyColor?: string;
  skinColor?: string;
  hat?: boolean;
  typing?: boolean;
  celebrate?: boolean;
  frame?: number;
  fps?: number;
}) {
  const s = size / 60;

  // animation cycles
  const typingCycle = Math.sin((frame / fps) * Math.PI * 6);
  const sway = Math.sin((frame / fps) * Math.PI * 1.8) * 6;
  const bounceY = typing ? Math.sin((frame / fps) * Math.PI * 6) * 1.5 : 0;

  // dimensions (pixel-grid aligned)
  const P = (n: number) => Math.round(n * s); // pixel-snap helper

  const headW = P(20);
  const headH = P(18);
  const bodyW = P(15);
  const bodyH = P(16);
  const armLen = P(13);
  const handR = P(4);   // circle hand
  const legLen = P(8);  // half of original 16
  const limbW = P(3);

  const cx = P(30); // character center x
  const headX = cx - headW / 2;
  const headY = P(2);
  const neckY = headY + headH;
  const bodyX = cx - bodyW / 2;
  const bodyY = neckY + P(2) + bounceY;
  const hipY = bodyY + bodyH;

  // arm pivot: sides of body, 1/3 down
  const armPivotY = bodyY + bodyH * 0.3;

  // arm end positions
  const leftArmAngle = celebrate ? -150 : typing ? -55 + typingCycle * 22 : -65;
  const rightArmAngle = celebrate ? -30 : typing ? -125 - typingCycle * 22 : -115;

  function armEnd(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return {
      ex: cx + Math.cos(rad) * armLen,
      ey: armPivotY + Math.sin(rad) * armLen,
    };
  }

  const la = armEnd(leftArmAngle);
  const ra = armEnd(rightArmAngle);

  // leg angles — hat (orchestrator) legs stay still
  const llAngle = hat ? 15 : celebrate ? 25 : 15 + sway;
  const rlAngle = hat ? -15 : celebrate ? -25 : -15 - sway;

  function legEnd(deg: number) {
    const rad = ((deg + 90) * Math.PI) / 180;
    return {
      ex: cx + Math.cos(rad) * legLen,
      ey: hipY + Math.sin(rad) * legLen,
    };
  }

  const ll = legEnd(llAngle);
  const rl = legEnd(rlAngle);

  const footR = P(4); // circle foot radius
  const totalH = hipY + legLen + footR + P(4);

  return (
    <svg width={P(60)} height={totalH} style={{ overflow: "visible", imageRendering: "pixelated" }}>
      {/* ── Hat (orchestrator only) ── */}
      {hat && (
        <>
          {/* brim */}
          <rect x={cx - P(15)} y={headY - P(5)} width={P(30)} height={P(5)} fill={bodyColor} />
          {/* crown */}
          <rect x={cx - P(10)} y={headY - P(15)} width={P(20)} height={P(10)} fill={bodyColor} />
        </>
      )}

      {/* ── Head (square, pixel) ── */}
      <rect x={headX} y={headY} width={headW} height={headH} fill={skinColor} rx={P(2)} />
      {/* pixel eyes */}
      <rect x={cx - P(6)} y={headY + P(5)} width={P(4)} height={P(4)} fill="#1a1a2e" />
      <rect x={cx + P(2)} y={headY + P(5)} width={P(4)} height={P(4)} fill="#1a1a2e" />
      {/* pixel mouth */}
      <rect x={cx - P(4)} y={headY + P(13)} width={P(3)} height={P(2)} fill="#1a1a2e" />
      <rect x={cx - P(1)} y={headY + P(14)} width={P(3)} height={P(2)} fill="#1a1a2e" />
      <rect x={cx + P(2)} y={headY + P(13)} width={P(3)} height={P(2)} fill="#1a1a2e" />

      {/* ── Body (square) ── */}
      <rect x={bodyX} y={bodyY} width={bodyW} height={bodyH} fill={bodyColor} rx={P(2)} />

      {/* ── Left arm + circle hand ── */}
      <line x1={cx - bodyW / 2} y1={armPivotY} x2={la.ex} y2={la.ey}
        stroke={bodyColor} strokeWidth={limbW} strokeLinecap="round" />
      <circle cx={la.ex} cy={la.ey} r={handR} fill={skinColor} />

      {/* ── Right arm + circle hand ── */}
      <line x1={cx + bodyW / 2} y1={armPivotY} x2={ra.ex} y2={ra.ey}
        stroke={bodyColor} strokeWidth={limbW} strokeLinecap="round" />
      <circle cx={ra.ex} cy={ra.ey} r={handR} fill={skinColor} />

      {/* ── Left leg + circle foot ── */}
      <line x1={cx - P(4)} y1={hipY} x2={ll.ex} y2={ll.ey}
        stroke={bodyColor} strokeWidth={limbW} strokeLinecap="round" />
      <circle cx={ll.ex} cy={ll.ey} r={footR} fill={bodyColor} />

      {/* ── Right leg + circle foot ── */}
      <line x1={cx + P(4)} y1={hipY} x2={rl.ex} y2={rl.ey}
        stroke={bodyColor} strokeWidth={limbW} strokeLinecap="round" />
      <circle cx={rl.ex} cy={rl.ey} r={footR} fill={bodyColor} />
    </svg>
  );
}

// ─── Thinking bubble ──────────────────────────────────────────────────────────

function ThinkBubble({ visible }: { visible: boolean }) {
  const spr = useSpr(T.think, { damping: 14 });
  const scale = visible ? interpolate(spr, [0, 1], [0, 1]) : 0;

  return (
    <div
      style={{
        position: "absolute",
        top: -55,
        left: 50,
        transform: `scale(${scale})`,
        transformOrigin: "bottom left",
        pointerEvents: "none",
      }}
    >
      {/* dots */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 6 + i * 3,
            height: 6 + i * 3,
            borderRadius: "50%",
            background: "#fff",
            opacity: 0.6,
            left: 2 + i * 10,
            top: 42 - i * 10,
          }}
        />
      ))}
      {/* bubble */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "8px 12px",
          fontSize: 11,
          color: "#1a1a2e",
          fontFamily: "monospace",
          fontWeight: 600,
          whiteSpace: "nowrap",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          marginLeft: 24,
        }}
      >
        decomposing task...
      </div>
    </div>
  );
}

// ─── Worktree panel ───────────────────────────────────────────────────────────

function WorktreePanel({
  x,
  y,
  width,
  label,
  taskDesc,
  phase,
  agentIndex,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  taskDesc: string;
  phase: "hidden" | "idle" | "working" | "done";
  agentIndex: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = useSpr(T.agentWalk + agentIndex * 0.3, { damping: 16 });
  const slideY = interpolate(spr, [0, 1], [40, 0]);
  const opacity = interpolate(spr, [0, 0.3], [0, 1]);

  const isDone = phase === "done";
  const isWorking = phase === "working";

  // Typing cursor blink
  const blink = Math.floor((frame / fps) * 2) % 2 === 0;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + slideY,
        opacity: phase === "hidden" ? 0 : opacity,
        width,
        background: isDone ? C.panelDone : C.panel,
        border: `2px solid ${isDone ? C.panelBorderDone : isWorking ? C.accent : C.panelBorder}`,
        borderRadius: 16,
        padding: 16,
        boxShadow: isDone
          ? `0 0 20px ${C.green}33`
          : isWorking
            ? `0 0 16px ${C.accent}33`
            : "none",
        transition: "border-color 0.1s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isDone ? C.green : isWorking ? C.accent : C.muted,
            boxShadow: isWorking ? `0 0 6px ${C.accent}` : "none",
          }}
        />
        <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
          {label}
        </span>
      </div>

      {/* Task description */}
      <div
        style={{
          fontSize: 12,
          color: isDone ? C.green : C.text,
          fontFamily: "monospace",
          fontWeight: 600,
          lineHeight: 1.4,
          marginBottom: 10,
        }}
      >
        {taskDesc}
      </div>

      {/* Fake code lines */}
      {(isWorking || isDone) && (
        <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
          <div style={{ color: "#7c3aed" }}>{"// agent executing..."}</div>
          <div>
            <span style={{ color: "#4a9eff" }}>const</span>
            <span style={{ color: C.text }}> result </span>
            <span style={{ color: "#4ade80" }}>=</span>
            <span style={{ color: C.text }}> await claude.run(task)</span>
            {isWorking && blink && <span style={{ color: C.text }}>|</span>}
          </div>
          {isDone && (
            <>
              <div style={{ color: C.green }}>✓ git commit -m "task complete"</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Agent character ──────────────────────────────────────────────────────────

function Agent({
  index,
  startX,
  startY,
  destX,
  destY,
  bodyColor,
  phase,
}: {
  index: number;
  startX: number;
  startY: number;
  destX: number;
  destY: number;
  bodyColor: string;
  phase: "hidden" | "idle" | "walking" | "working" | "done";
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Appear
  const appearSpr = useSpr(T.agentReceive + index * 0.2, { damping: 14 });
  const appearScale = interpolate(appearSpr, [0, 1], [0, 1]);

  // Walk to destination
  const walkSpr = useSpr(T.agentWalk + index * 0.3, { damping: 22, stiffness: 80 });
  const x = interpolate(walkSpr, [0, 1], [startX, destX]);
  const y = interpolate(walkSpr, [0, 1], [startY, destY]);

  // Celebrate bounce
  const celebrateBounce =
    phase === "done"
      ? Math.abs(Math.sin((frame / fps) * Math.PI * 3)) * 12
      : 0;

  const isTyping = phase === "working";
  const isCelebrate = phase === "done";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - celebrateBounce,
        transform: `scale(${appearScale})`,
        transformOrigin: "bottom center",
        opacity: phase === "hidden" ? 0 : 1,
      }}
    >
      <StickFigure
        size={52}
        bodyColor={bodyColor}
        skinColor={C.agentSkin}
        typing={isTyping}
        celebrate={isCelebrate}
        frame={frame}
        fps={fps}
      />
      {/* Name tag */}
      <div
        style={{
          textAlign: "center",
          fontSize: 20,
          color: bodyColor,
          fontFamily: "monospace",
          fontWeight: 700,
          marginTop: 4,
        }}
      >
        agent {index + 1}
      </div>
    </div>
  );
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

function Orchestrator({ thinking }: { thinking: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spr = useSpr(T.orchestratorIn, { damping: 14 });
  const scale = interpolate(spr, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "relative",
        transform: `scale(${scale})`,
        transformOrigin: "bottom center",
      }}
    >
      <ThinkBubble visible={thinking} />
      <StickFigure
        size={72}
        bodyColor={C.orchestratorBody}
        skinColor={C.orchestratorSkin}
        hat
        frame={frame}
        fps={fps}
      />
      <div
        style={{
          textAlign: "center",
          fontSize: 22,
          color: C.orchestratorBody,
          fontFamily: "monospace",
          fontWeight: 700,
          marginTop: 4,
        }}
      >
        orchestrator
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header() {
  const spr = useSpr(0);
  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const y = interpolate(spr, [0, 1], [-16, 0]);
  return (
    <div
      style={{
        position: "absolute",
        top: 32,
        left: 52,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>
        Fractals 🌀
      </div>
      <div style={{ fontSize: 12, color: C.muted, fontFamily: "monospace" }}>
        recursive agentic task orchestrator
      </div>
    </div>
  );
}

// ─── Status bar ───────────────────────────────────────────────────────────────

function StatusBar({ label, startS }: { label: string; startS: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(
    frame,
    [f(startS, fps), f(startS + 0.35, fps)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        position: "absolute",
        bottom: 32,
        left: 52,
        opacity,
        fontSize: 12,
        color: C.muted,
        fontFamily: "monospace",
        background: C.panel,
        padding: "5px 14px",
        borderRadius: 8,
        border: `1px solid ${C.panelBorder}`,
      }}
    >
      {label}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const FractalsAnimation = ({ tree }: { tree: TaskNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const children = tree.children;

  // Layout
  const orchX = 580; // orchestrator center-x
  const orchY = 160; // orchestrator top-y
  const orchFigureW = 72;

  // Worktree panels
  const panelW = 300;
  const panelY = 380;
  const panelGap = 50;
  const totalW = children.length * panelW + (children.length - 1) * panelGap;
  const panelStartX = (1280 - totalW) / 2;

  const panels = children.map((_child, i) => ({
    x: panelStartX + i * (panelW + panelGap),
    y: panelY,
    centerX: panelStartX + i * (panelW + panelGap) + panelW / 2,
  }));

  // Agent phases
  const agentPhases = children.map((_, i) => {
    const workStart = T.agentWork + i * 0.4;
    const doneTime = [T.agent0Done, T.agent1Done, T.agent2Done][i];
    if (t < T.agentReceive + i * 0.2) return "hidden" as const;
    if (t < T.agentWalk + i * 0.3) return "idle" as const;
    if (t < workStart) return "walking" as const;
    if (t < doneTime) return "working" as const;
    return "done" as const;
  });

  const worktreePhases = children.map((_, i) => {
    const workStart = T.agentWork + i * 0.4;
    const doneTime = [T.agent0Done, T.agent1Done, T.agent2Done][i];
    if (t < T.agentWalk + i * 0.3) return "hidden" as const;
    if (t < workStart) return "idle" as const;
    if (t < doneTime) return "working" as const;
    return "done" as const;
  });

  // Orchestrator state
  const isThinking = t >= T.think && t < T.agentReceive;
  const allDone = t >= T.allDone;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Header />

      {/* Worktree panels */}
      {children.map((child, i) => (
        <WorktreePanel
          key={child.id}
          x={panels[i].x}
          y={panels[i].y}
          width={panelW}
          label={`worktree/${child.id}`}
          taskDesc={child.description}
          phase={worktreePhases[i]}
          agentIndex={i}
        />
      ))}

      {/* Agents */}
      {children.map((_, i) => (
        <Agent
          key={i}
          index={i}
          startX={orchX + orchFigureW / 2 + (i - 1) * 30 - 26}
          startY={orchY + 10}
          destX={panels[i].centerX - 26}
          destY={panelY - 90}
          bodyColor={C.agentBody[i]}
          phase={agentPhases[i]}
        />
      ))}

      {/* Orchestrator */}
      <div style={{ position: "absolute", left: orchX, top: orchY }}>
        <Orchestrator thinking={isThinking} />
      </div>

      {/* All done banner */}
      {allDone && (
        <Sequence from={f(T.allDone, fps)} premountFor={fps} durationInFrames={f(3, fps)}>
          <AllDoneBanner />
        </Sequence>
      )}

      {/* Status labels */}
      <Sequence from={0} durationInFrames={f(T.think, fps)} premountFor={fps}>
        <StatusBar label="● phase 1 — planning" startS={0} />
      </Sequence>
      <Sequence from={f(T.think, fps)} durationInFrames={f(T.agentReceive - T.think, fps)} premountFor={fps}>
        <StatusBar label="● decomposing task tree..." startS={T.think} />
      </Sequence>
      <Sequence from={f(T.agentReceive, fps)} durationInFrames={f(T.agentWork - T.agentReceive, fps)} premountFor={fps}>
        <StatusBar label="● dispatching agents to worktrees..." startS={T.agentReceive} />
      </Sequence>
      <Sequence from={f(T.agentWork, fps)} durationInFrames={f(T.allDone - T.agentWork, fps)} premountFor={fps}>
        <StatusBar label="● phase 2 — agents executing in parallel" startS={T.agentWork} />
      </Sequence>
      <Sequence from={f(T.allDone, fps)} premountFor={fps} durationInFrames={f(3, fps)}>
        <StatusBar label="✓ all tasks complete — 3 commits" startS={T.allDone} />
      </Sequence>
    </AbsoluteFill>
  );
};

// ─── All done banner ──────────────────────────────────────────────────────────

function AllDoneBanner() {
  const spr = useSpr(T.allDone, { damping: 12, stiffness: 180 });
  const scale = interpolate(spr, [0, 1], [0.5, 1]);
  const opacity = interpolate(spr, [0, 0.3], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        right: 60,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "top right",
        background: C.panelDone,
        border: `2px solid ${C.green}`,
        borderRadius: 14,
        padding: "12px 24px",
        fontFamily: "monospace",
        fontSize: 16,
        fontWeight: 700,
        color: C.green,
        boxShadow: `0 0 24px ${C.green}44`,
      }}
    >
      ✓ execution complete
    </div>
  );
}
