const canvas = document.getElementById("office-canvas");
const ctx = canvas.getContext("2d");
const form = document.getElementById("control-form");
const input = document.getElementById("task-input");
const randomBtn = document.getElementById("random-btn");
const errorBtn = document.getElementById("error-btn");
const phasePill = document.getElementById("phase-pill");
const stateSummary = document.getElementById("state-summary");
const taskTree = document.getElementById("task-tree");
const eventLog = document.getElementById("event-log");

const PIXEL = 4;
const TASK_PRESETS = [
  "给 Fractals 做一个像素风办公大厅，显示 orchestrator 拆任务和 executor 们的工作状态。",
  "设计一个虚拟办公室，让 Agent Swarm 处理 UI、轮询、worktree 管理和错误恢复。",
  "用可爱像素动画展示递归任务树从 plan 到 execute 的流转。",
];

class Agent {
  constructor(config, phase) {
    this.id = config.id;
    this.name = config.name;
    this.color = config.color;
    this.home = { x: config.x, y: config.y };
    this.x = config.x;
    this.y = config.y;
    this.target = { x: config.x, y: config.y };
    this.anchor = { x: config.x, y: config.y };
    this.status = "idle";
    this.taskId = null;
    this.taskLabel = "Zzz";
    this.stateAge = 0;
    this.frame = 0;
    this.phase = phase;
  }

  get available() {
    return this.status === "idle" && this.taskId === null;
  }

  assign(task, desk) {
    this.taskId = task.id;
    this.taskLabel = task.label;
    this.anchor = {
      x: desk.x + desk.width / 2,
      y: desk.y + desk.height - 22,
    };
    this.target = { ...this.anchor };
    this.status = "walking";
    this.stateAge = 0;
  }

  succeed() {
    this.status = "done";
    this.stateAge = 0;
    this.taskLabel = `✓ ${this.taskLabel}`;
  }

  fail() {
    this.status = "error";
    this.stateAge = 0;
    this.taskLabel = `! ${this.taskLabel}`;
  }

  goHome() {
    this.status = "returning";
    this.stateAge = 0;
    this.target = { ...this.home };
  }

  release() {
    this.status = "idle";
    this.stateAge = 0;
    this.taskId = null;
    this.taskLabel = "Zzz";
  }

  update(dt) {
    this.frame += dt * 12;
    this.stateAge += dt;

    if (this.status === "idle") {
      this.x = this.home.x + Math.sin(this.frame * 0.18 + this.phase) * 10;
      this.y = this.home.y + Math.cos(this.frame * 0.11 + this.phase) * 6;
      return;
    }

    if (this.status === "walking" || this.status === "returning") {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);
      const speed = 120;

      if (distance <= 1) {
        this.x = this.target.x;
        this.y = this.target.y;
        if (this.status === "walking") {
          this.status = "working";
          this.stateAge = 0;
        } else {
          this.release();
        }
        return;
      }

      const step = Math.min(distance, speed * dt);
      this.x += (dx / distance) * step;
      this.y += (dy / distance) * step;
      return;
    }

    if (this.status === "working") {
      this.x = this.anchor.x + Math.sin(this.frame * 2.2) * 1.8;
      this.y = this.anchor.y + Math.cos(this.frame * 3.1) * 1.2;
      return;
    }

    if (this.status === "done" && this.stateAge > 1.2) {
      this.goHome();
      return;
    }

    if (this.status === "error" && this.stateAge > 1.6) {
      this.goHome();
      return;
    }
  }
}

class PixelOfficeDemo {
  constructor() {
    this.width = canvas.width;
    this.height = canvas.height;
    this.lastTime = 0;
    this.timers = [];
    this.phase = "idle";
    this.prompt = "";
    this.tickId = 0;
    this.taskMap = {};
    this.tasks = [];
    this.events = [];
    this.desks = [];
    this.assignmentMap = new Map();
    this.orchestratorState = "idle";
    this.orchestratorPulse = 0;
    this.runningWave = 0;
    this.forceErrorWave = false;
    this.agents = [
      new Agent({ id: "a-1", name: "Byte", color: "#4f7ab4", x: 102, y: 616 }, 0.3),
      new Agent({ id: "a-2", name: "Patch", color: "#c55f4d", x: 172, y: 638 }, 1.1),
      new Agent({ id: "a-3", name: "Nova", color: "#63a063", x: 240, y: 604 }, 1.9),
      new Agent({ id: "a-4", name: "Ember", color: "#d69134", x: 292, y: 642 }, 2.5),
    ];
  }

  start(prompt, options = {}) {
    this.reset();
    this.prompt = prompt.trim();
    this.forceErrorWave = Boolean(options.forceErrorWave);
    this.phase = "plan";
    this.orchestratorState = "decomposing";

    const scenario = createScenario(this.prompt);
    this.tasks = scenario.tasks;
    this.taskMap = Object.fromEntries(this.tasks.map((task) => [task.id, task]));
    this.desks = scenario.desks;

    this.pushEvent("用户输入", `收到任务：${this.prompt}`);
    this.pushEvent("Plan", "Orchestrator 开始递归拆解任务树。");
    this.renderDom();

    this.schedule(500, () => {
      for (const task of this.tasks.filter((item) => item.kind === "composite")) {
        task.status = "decomposing";
      }
      this.renderDom();
    });

    this.schedule(1800, () => {
      for (const task of this.tasks.filter((item) => item.kind === "leaf")) {
        task.status = "ready";
      }
      for (const task of this.tasks.filter((item) => item.kind === "composite")) {
        task.status = "done";
      }
      this.phase = "execute";
      this.orchestratorState = "dispatching";
      this.pushEvent("Execute", "叶子任务已进入 worktree 队列，等待分配。");
      this.renderDom();
      this.launchNextWave();
    });
  }

  reset() {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    this.timers = [];
    this.phase = "idle";
    this.tickId += 1;
    this.taskMap = {};
    this.tasks = [];
    this.events = [];
    this.assignmentMap.clear();
    this.orchestratorState = "idle";
    this.runningWave = 0;
    for (const agent of this.agents) {
      agent.status = "idle";
      agent.taskId = null;
      agent.taskLabel = "Zzz";
      agent.stateAge = 0;
      agent.target = { ...agent.home };
    }
    this.renderDom();
  }

  schedule(delay, fn) {
    const id = window.setTimeout(fn, delay);
    this.timers.push(id);
  }

  launchNextWave() {
    const readyTasks = this.tasks.filter((task) => task.kind === "leaf" && task.status === "ready");
    if (readyTasks.length === 0) {
      this.schedule(1800, () => {
        this.phase = "done";
        this.orchestratorState = "watching";
        this.pushEvent("Wrap", "所有波次处理完成，办公室进入收工状态。");
        this.renderDom();
      });
      return;
    }

    const waveTasks = readyTasks.slice(0, 2);
    this.runningWave += 1;
    this.pushEvent("Batch", `第 ${this.runningWave} 波任务开始执行。`);

    for (const task of waveTasks) {
      task.status = "running";
      const desk = this.desks.find((item) => item.taskId === task.id);
      const agent = this.agents.find((item) => item.available);
      if (!desk || !agent) continue;

      this.assignmentMap.set(task.id, agent.id);
      agent.assign(task, desk);
      this.pushEvent("Dispatch", `${agent.name} 从休息区前往 ${desk.label}。`);
    }

    this.renderDom();

    this.schedule(2800, () => {
      for (const task of waveTasks) {
        const agentId = this.assignmentMap.get(task.id);
        const agent = this.agents.find((item) => item.id === agentId);
        if (!agent) continue;

        const shouldFail = this.forceErrorWave && this.runningWave === 2 && task.id === waveTasks[0].id;
        task.status = shouldFail ? "error" : "done";

        if (shouldFail) {
          agent.fail();
          this.pushEvent("Error", `${task.label} 发生异常，小精灵返回休息区。`);
        } else {
          agent.succeed();
          this.pushEvent("Done", `${task.label} 已完成，agent 正在回程。`);
        }
      }
      this.renderDom();
    });

    this.schedule(4700, () => {
      for (const task of waveTasks) {
        if (task.status === "error") {
          task.status = "ready";
          this.pushEvent("Retry", `${task.label} 已重新入队，等待下一波重试。`);
        }
      }
      this.renderDom();
      this.launchNextWave();
    });
  }

  pushEvent(title, message) {
    this.events.unshift({
      id: `${Date.now()}-${Math.random()}`,
      title,
      message,
      time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    });
    this.events = this.events.slice(0, 8);
  }

  update(dt) {
    this.orchestratorPulse += dt;
    for (const agent of this.agents) {
      agent.update(dt);
    }
  }

  renderDom() {
    phasePill.textContent = this.phase.toUpperCase();
    stateSummary.textContent = summaryText(this.phase, this.orchestratorState, this.tasks);

    taskTree.innerHTML = "";
    for (const task of this.tasks) {
      const node = document.createElement("div");
      node.className = "tree-node";
      node.dataset.depth = String(task.depth);
      node.dataset.status = task.status;
      node.innerHTML = `<strong>${task.label}</strong><small>${task.kind} · ${task.status}</small>`;
      taskTree.appendChild(node);
    }

    eventLog.innerHTML = "";
    for (const event of this.events) {
      const item = document.createElement("div");
      item.className = "event-item";
      item.innerHTML = `<strong>${event.title}</strong><small>${event.time}</small><div>${event.message}</div>`;
      eventLog.appendChild(item);
    }
  }

  render() {
    ctx.clearRect(0, 0, this.width, this.height);
    drawBackground(ctx, this.width, this.height);
    drawProjection(ctx, this.prompt, this.tasks);
    drawOrchestratorDesk(ctx, this.orchestratorState, this.orchestratorPulse);
    drawLounge(ctx);

    for (const desk of this.desks) {
      drawDesk(ctx, desk, this.taskMap[desk.taskId]?.status || "pending");
    }

    for (const agent of this.agents) {
      drawAgent(ctx, agent);
    }

    drawBanner(ctx, this.phase);
  }
}

const demo = new PixelOfficeDemo();
demo.renderDom();

function frame(time) {
  const dt = Math.min((time - demo.lastTime) / 1000 || 0.016, 0.05);
  demo.lastTime = time;
  demo.update(dt);
  demo.render();
  window.requestAnimationFrame(frame);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  demo.start(input.value);
});

randomBtn.addEventListener("click", () => {
  input.value = TASK_PRESETS[Math.floor(Math.random() * TASK_PRESETS.length)];
  demo.start(input.value);
});

errorBtn.addEventListener("click", () => {
  demo.start(input.value, { forceErrorWave: true });
});

window.requestAnimationFrame(frame);

function createScenario(prompt) {
  const subject = extractSubject(prompt);
  const compositeA = {
    id: "plan-root",
    label: "拆分主任务",
    kind: "composite",
    status: "pending",
    depth: 0,
  };
  const compositeB = {
    id: "exec-root",
    label: "安排执行波次",
    kind: "composite",
    status: "pending",
    depth: 0,
  };

  const leaves = [
    `任务树投影 ${subject}`,
    `Worktree 工位布局 ${subject}`,
    `Executor 打字动画 ${subject}`,
    `错误提示与重试 ${subject}`,
  ].map((label, index) => ({
    id: `leaf-${index + 1}`,
    label,
    kind: "leaf",
    status: "pending",
    depth: 1,
  }));

  const desks = [
    { id: "desk-1", taskId: "leaf-1", label: "wt-tree", x: 730, y: 220, width: 136, height: 96 },
    { id: "desk-2", taskId: "leaf-2", label: "wt-layout", x: 930, y: 220, width: 136, height: 96 },
    { id: "desk-3", taskId: "leaf-3", label: "wt-motion", x: 730, y: 420, width: 136, height: 96 },
    { id: "desk-4", taskId: "leaf-4", label: "wt-retry", x: 930, y: 420, width: 136, height: 96 },
  ];

  return {
    tasks: [compositeA, compositeB, ...leaves],
    desks,
  };
}

function extractSubject(prompt) {
  const normalized = prompt.replace(/[，。,.]/g, " ").trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.slice(0, 3).join(" ");
}

function summaryText(phase, orchestratorState, tasks) {
  if (phase === "idle") {
    return "等待新的用户输入，休息区内的小精灵处于待命状态。";
  }

  const running = tasks.filter((task) => task.status === "running").length;
  const done = tasks.filter((task) => task.status === "done").length;
  const errors = tasks.filter((task) => task.status === "error").length;
  return `阶段 ${phase.toUpperCase()}，Orchestrator 当前为 ${orchestratorState}，运行中 ${running} 项，完成 ${done} 项，异常 ${errors} 项。`;
}

function drawBackground(context, width, height) {
  fillRect(context, 0, 0, width, height, "#f1ddb0");
  fillRect(context, 0, 512, width, 248, "#d0aa74");
  fillRect(context, 0, 560, width, 200, "#bf915c");

  context.strokeStyle = "rgba(95, 67, 36, 0.12)";
  context.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y < height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawProjection(context, prompt, tasks) {
  fillRect(context, 118, 48, 352, 152, "#304354");
  strokeRect(context, 118, 48, 352, 152, "#b6dbff");
  pixelText(context, "TASK TREE", 144, 74, "#eef8ff", 2.3);
  pixelText(context, prompt.slice(0, 22).toUpperCase(), 144, 104, "#fff3d3", 1.5);

  tasks.slice(2).forEach((task, index) => {
    fillRect(context, 142, 122 + index * 18, 304, 14, taskStatusColor(task.status));
    pixelText(context, task.label.slice(0, 26).toUpperCase(), 150, 132 + index * 18, "#fff8e7", 1.3);
  });
}

function drawOrchestratorDesk(context, state, pulse) {
  fillRect(context, 164, 242, 244, 118, "#7b5a3c");
  fillRect(context, 184, 258, 204, 30, "#533827");
  fillRect(context, 242, 194, 88, 44, "#8caccc");
  fillRect(context, 252, 204, 68, 22, "#17374e");
  fillRect(context, 196, 360, 32, 86, "#604229");
  fillRect(context, 342, 360, 32, 86, "#604229");

  if (state === "decomposing") {
    for (let i = 0; i < 3; i += 1) {
      const wobble = Math.sin(pulse * 5 + i) * 4;
      fillRect(context, 362 + i * 20, 162 - i * 18 + wobble, 26, 16, "#fff3c6");
      strokeRect(context, 362 + i * 20, 162 - i * 18 + wobble, 26, 16, "#684b2f");
    }
  }

  const bubble = state === "decomposing" ? "split" : state === "dispatching" ? "assign" : "watch";
  drawMiniAgent(context, 286, 324, "#7856d1", state === "decomposing" ? "working" : "idle", bubble);
}

function drawLounge(context) {
  fillRect(context, 52, 548, 286, 148, "#efd8ac");
  strokeRect(context, 52, 548, 286, 148, "#886341");
  fillRect(context, 88, 590, 136, 42, "#c26253");
  fillRect(context, 88, 576, 136, 18, "#de8c7e");
  fillRect(context, 252, 578, 26, 52, "#7d6040");
  fillRect(context, 258, 550, 14, 28, "#f8f3e4");
  pixelText(context, "LOUNGE", 78, 570, "#5d4127", 1.8);
}

function drawDesk(context, desk, status) {
  fillRect(context, desk.x, desk.y, desk.width, desk.height, "#efd8b6");
  strokeRect(context, desk.x, desk.y, desk.width, desk.height, "#7d613f");
  fillRect(context, desk.x + 22, desk.y + 14, 54, 32, "#91abc4");
  fillRect(context, desk.x + 28, desk.y + 20, 42, 18, "#193b53");
  fillRect(context, desk.x + 84, desk.y + 58, 30, 16, "#bc8757");
  fillRect(context, desk.x + 16, desk.y + desk.height, 16, 38, "#7d613f");
  fillRect(context, desk.x + desk.width - 32, desk.y + desk.height, 16, 38, "#7d613f");
  pixelText(context, desk.label.toUpperCase(), desk.x + 14, desk.y + 80, "#594028", 1.5);
  fillRect(context, desk.x + desk.width - 38, desk.y + 10, 24, 12, taskStatusColor(status));
}

function drawAgent(context, agent) {
  drawMiniAgent(context, agent.x, agent.y, agent.color, agent.status, agent.taskLabel);
}

function drawMiniAgent(context, x, y, color, state, bubbleText) {
  const px = snap(x);
  const py = snap(y);
  const body = state === "error" ? "#b94f42" : color;
  const skin = "#f0c48d";
  const shake = state === "error" ? Math.sin(Date.now() * 0.025) * 2 : 0;

  fillRect(context, px - 10 + shake, py - 28, 20, 16, skin);
  fillRect(context, px - 14 + shake, py - 12, 28, 24, body);
  fillRect(context, px - 18 + shake, py - 6, 8, 6, body);
  fillRect(context, px + 10 + shake, py - 6, 8, 6, body);
  fillRect(context, px - 10 + shake, py + 12, 8, 12, body);
  fillRect(context, px + 2 + shake, py + 12, 8, 12, body);
  fillRect(context, px - 6 + shake, py - 22, 4, 4, "#2d2318");
  fillRect(context, px + 2 + shake, py - 22, 4, 4, "#2d2318");

  if (state === "walking") {
    fillRect(context, px - 14 + shake, py + 18, 8, 4, "#432d1c");
    fillRect(context, px + 6 + shake, py + 22, 8, 4, "#432d1c");
  } else {
    fillRect(context, px - 14 + shake, py + 22, 8, 4, "#432d1c");
    fillRect(context, px + 6 + shake, py + 22, 8, 4, "#432d1c");
  }

  drawBubble(context, px + 18, py - 46, bubbleText, state);
}

function drawBubble(context, x, y, text, state) {
  const width = Math.max(56, Math.min(180, text.length * 7 + 16));
  fillRect(context, x, y, width, 22, bubbleFill(state));
  strokeRect(context, x, y, width, 22, "#533926");
  fillRect(context, x + 10, y + 22, 8, 6, bubbleFill(state));
  strokeRect(context, x + 10, y + 22, 8, 6, "#533926");
  pixelText(context, text.slice(0, 18).toUpperCase(), x + 8, y + 14, "#fff8ea", 1.35);

  if (state === "error") {
    fillRect(context, x + width - 18, y - 10, 8, 8, "#5f5f5f");
    fillRect(context, x + width - 10, y - 18, 10, 10, "#7b7b7b");
  }
}

function drawBanner(context, phase) {
  fillRect(context, 24, 22, 102, 30, "#ffefcc");
  strokeRect(context, 24, 22, 102, 30, "#65472a");
  pixelText(context, "FRACTALS", 34, 40, "#4f3722", 1.8);

  fillRect(context, 1060, 22, 180, 30, "#ffefcc");
  strokeRect(context, 1060, 22, 180, 30, "#65472a");
  pixelText(context, phase.toUpperCase(), 1108, 40, "#4f3722", 1.8);
}

function taskStatusColor(status) {
  if (status === "running") return "#4f7ab4";
  if (status === "done") return "#6ba24e";
  if (status === "error") return "#c05a48";
  if (status === "decomposing") return "#c78a35";
  return "#9b7d58";
}

function bubbleFill(state) {
  if (state === "working") return "#4f7ab4";
  if (state === "walking") return "#c78a35";
  if (state === "done") return "#6ba24e";
  if (state === "error") return "#c05a48";
  return "#f7edd6";
}

function pixelText(context, text, x, y, color, size = 1.4) {
  context.fillStyle = color;
  context.font = `${size * 8}px monospace`;
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}

function fillRect(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(snap(x), snap(y), snap(width), snap(height));
}

function strokeRect(context, x, y, width, height, color) {
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.strokeRect(snap(x) + 2, snap(y) + 2, snap(width) - 4, snap(height) - 4);
}

function snap(value) {
  return Math.round(value / PIXEL) * PIXEL;
}
