# 安全报告

请针对仓库最新版本报告安全问题。报告时提供受影响的提交或版本、复现步骤、影响范围及可能的修复建议，使用虚构数据并遮盖所有密钥。

请优先通过 [GitHub 私密漏洞报告](https://github.com/GL-Wen/huiman-ark/security/advisories/new) 联系维护者。此入口需仓库启用相关功能；若不可用，请发送邮件至 [toowell2015@126.com](mailto:toowell2015@126.com)。不要在公开 Issue 或 Pull Request 中披露可利用细节、真实 Key、用户内容或凭据。

## 使用和部署

- 仅在自己部署或信任的 HTTPS 站点中填写 API Key。请求会经过应用服务器，再发送到配置的 AI 上游。
- 用户填写的 Key 只在页面内存中保留，刷新后清空；不要将它写入 localStorage、IndexedDB 或日志。请求地址和模型偏好可以本地保存。
- 可选的 `AI_API_KEY` 是服务端默认 Key，不下发给浏览器；`GET /api/ai/config` 仅公开默认地址、模型和 `hasApiKey`。不要将真实 Key 提交到仓库或放入 `NEXT_PUBLIC_*` 变量。
- 部署者配置默认 Key 后，留空 Key 的访客会使用部署者的接口额度。默认 Key 仅用于默认接口的同一 origin；用户改用其他 origin 时必须提供自己的 Key。
- 用户覆盖为不同地址时仅接受公网 HTTPS，拒绝内网、环回、保留 IP 及解析到这些地址的域名。部署环境的默认地址属于部署者配置的可信地址，可使用 HTTP/HTTPS；只应将其指向可信服务。
- 部署者应检查反向代理、应用日志和监控配置，不记录认证请求头、请求体及原始上游错误。
- 若 Key 已泄露，立即在服务商处撤销并重新生成。删除文件或 Git 提交不能使旧 Key 失效。
