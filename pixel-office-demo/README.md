# Pixel Office Demo

一个完全独立于现有 `animation/` 的像素办公室演示。

## 启动

```bash
cd /home/cheng/projects/Fractals/pixel-office-demo
npm start
```

默认地址：

```text
http://localhost:4173
```

## 交互

- 在输入框里填写一个模拟用户任务，点击“启动编排”
- 点击“随机任务”快速生成一个新的示例
- 点击“触发报错波次”观察第二波任务中的失败与重试动画

## 动画逻辑

- `idle`: agent 在 lounge 轻微游荡
- `walking`: agent 领取叶子任务并前往 worktree desk
- `working`: 到达工位后播放敲击/工作抖动
- `done`: 头顶显示 `✓`，随后返回 lounge
- `error`: 头顶显示 `!` 并冒烟，随后回到 lounge，任务重新入队
