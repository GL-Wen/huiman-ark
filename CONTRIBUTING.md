# 贡献指南

欢迎通过 Issue 报告问题、讨论改进，或提交 Pull Request。安全问题请先阅读 [SECURITY.md](./SECURITY.md)，不要在公开 Issue 中贴出漏洞细节或 API Key。

## 开发

使用 Node.js 22.18 或以上版本及 pnpm 10.34.5，按 [README](./README.md) 完成本地配置。依赖统一使用 pnpm，只提交 `pnpm-lock.yaml`。

提交前运行：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 提交修改

1. Fork 仓库，从最新代码创建主题明确的分支。
2. 保持改动聚焦；修复逻辑问题时补充能复现问题的测试。
3. 修改界面文案时同步 `messages/zh.json`、`messages/en.json` 和 `messages/ja.json`；行为或配置变化时更新文档。
4. Pull Request 说明解决的问题、用户可见变化和验证结果，界面变化可附去除敏感内容的截图。

不要提交真实 `.env` 文件、Key、用户故事、参考素材或生成结果。调试信息中的 Authorization 头与请求内容必须脱敏。不要把 API Key 加入浏览器持久化或服务端日志。

提交贡献即表示你有权提供这些内容，并同意以本项目的 [MIT 许可证](./LICENSE) 发布。第三方代码或素材应保留其许可和来源说明。
