# 安全报告

请针对仓库最新版本报告安全问题。报告时提供受影响的提交或版本、复现步骤、影响范围及可能的修复建议，使用虚构数据并遮盖所有密钥。

请优先通过 [GitHub 私密漏洞报告](https://github.com/GL-Wen/huiman-ark/security/advisories/new) 联系维护者。此入口需仓库启用相关功能；若不可用，请通过 [维护者 GitHub 主页](https://github.com/GL-Wen) 公布的联系方式私下联系。不要在公开 Issue 或 Pull Request 中披露可利用细节、真实 Key、用户内容或凭据。

## 使用和部署

- 仅在自己部署或信任的 HTTPS 站点中填写 API Key。请求会经过应用服务器，再发送到配置的 AI 上游。
- Key 只在页面内存中保留，刷新后重新填写；不要将它写入 localStorage、IndexedDB 或日志。
- 部署者应检查反向代理、应用日志和监控配置，不记录认证请求头、请求体及原始上游错误。
- 若 Key 已泄露，立即在服务商处撤销并重新生成。删除文件或 Git 提交不能使旧 Key 失效。
