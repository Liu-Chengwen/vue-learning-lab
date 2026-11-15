# Spring Boot 用户控制台：前端边界与部署

用户控制台的业务页面全部位于 **vue-lab**。Spring Boot 原先临时增加的 `static/index.html`、`lab.js`、`lab.css` 已移除；Java 项目只负责接口、认证、数据库、缓存、消息和 OpenAPI。Swagger 是接口文档工具，不承担用户管理业务页面。

## 源码从哪里读

- `src/features/backend/BackendLabView.vue`：控制台入口，连接登录、列表、编辑和观察面板。
- `src/stores/backendAuth.js`：Pinia 管理共享的登录身份；没有把密码或会话令牌放入 localStorage。
- `src/services/backendLabService.js`：同源 API、CSRF、Cookie 和统一错误处理。
- `src/features/backend/BackendDemoView.vue`：保留最初的问候接口练习。
- `vite.config.js`：开发代理。
- `infra/nginx.conf`、`infra/compose.yml`、`Dockerfile`：独立前端生产部署。

组件内部的表单草稿、筛选与页码留在页面；共享身份放 Pinia。服务端始终检查权限，前端隐藏写按钮只是交互反馈。管理员“新增资料”不设置密码；注册入口才创建带密码的 USER 账号。

## 开发运行

先在相邻的 `springboot-lab` 目录启动完整后端：

```sh
./scripts/lab.py run
```

后端默认监听 8080；当前本机另有旧的 8080 Java 进程，最新的 Docker 后端位于 8081，所以本机前端 `.env.local` 的 `SPRING_BOOT_PROXY_TARGET` 指向 `http://127.0.0.1:8081`。新环境未设置覆盖值时，`vite.config.js` 默认使用 8080。

在 **vue-lab** 目录：

```sh
pnpm dev
```

打开 <http://localhost:5173/#/backend-lab>。开发代理由 Vite 执行，浏览器始终请求 5173 同源路径，不直接跨源请求 Java。修改代理目标后按 Vite 的提示重启开发服务。

| 浏览器路径 | Java 收到的路径 | 用途 |
| --- | --- | --- |
| `/api/v1/...` | `/api/v1/...` | 真实业务 API，保留版本前缀 |
| `/backend-health` | `/actuator/health` | 控制台服务状态 |
| `/swagger-ui/...` | `/swagger-ui/...` | 接口文档资源 |
| `/v3/api-docs...` | `/v3/api-docs...` | OpenAPI 与 Swagger 配置 |

开发中的其他 `/api` 请求仍交给独立 Node Mock；两组接口不能混用。生产配置不会启动 Node Mock，其未知 `/api` 路径返回 JSON 404。

Spring Boot 根地址不再渲染业务 HTML。Java 的 `GET /` 只按 `LAB_FRONTEND_URL` 重定向到 Vue 页面，默认 `http://localhost:5173/#/backend-lab`。部署时可设为实际前端的绝对 URL，例如 `http://localhost:8088/#/backend-lab`；不要设成后端自身的 `/`，否则可能形成重定向循环。

## Session 与 CSRF 为什么仍然正常

页面、业务请求和文档使用同一个浏览器来源。Session Cookie 是 HttpOnly、host-only、Path=/，由浏览器发送，不需要跨域配置或手动复制 Cookie。API 客户端使用 `credentials: "same-origin"`。

写请求先调用 `GET /api/v1/auth/csrf`，拿到 `headerName` 和 `token` 后发送相应请求头。登录和退出会轮换会话或令牌，客户端必须重新获取；CSRF token 不是登录凭证，也不能代替 ADMIN 权限。失败的写请求不会因自动重试而重复创建用户。

Swagger 从 **前端同源地址** <http://localhost:5173/swagger-ui/index.html> 打开。先在 Vue 控制台登录，再在 Swagger 执行 CSRF 查询，点击 Authorize 填入返回的 token，调试写接口。OpenAPI 的 server 使用相对 `/`，Try it out 会继续请求前端同源 `/api/v1`，不会跳到后端 8080/8081。

## 生产部署：Vue 静态镜像独立运行

先保证相邻后端的 Docker 服务已启动：

```sh
# 在 springboot-lab 中执行；保留原数据库数据卷
./scripts/lab.py package
./scripts/lab.py deploy
```

如果原 Java 占用 8080，可使用 `LAB_HTTP_PORT=8081 ./scripts/lab.py deploy`。后端 Compose 创建 `learning-lab_default` 网络，Java 的服务 DNS 是 `app:8080`。

然后在 **vue-lab** 中执行：

```sh
pnpm build
docker compose -f infra/compose.yml up -d --build --wait
```

打开 <http://localhost:8088/#/backend-lab>，文档地址为 <http://localhost:8088/swagger-ui/index.html>。前端的 Compose 只有 `web` 服务，加入已有后端网络，经 Nginx 将业务接口发给 `app:8080`；它不创建数据库，也不管理后端数据卷。Java 的宿主机映射端口不会影响这个容器内部地址。

镜像只复制本项目 `dist` 和 Nginx 配置，不把 Vue 产物复制回 Spring Boot。`.dockerignore` 采用白名单，不包含本地 `.env`、源码或 node_modules。`dist` 中的浏览器代码和 source map 属于公开构建产物，不能包含秘密。

Nginx 对 `/api/v1`、文档、健康检查先做代理；静态资源缺失时直接返回 404；最后才执行 SPA 回退。构建哈希资源长期缓存，`index.html` 不长期缓存。Docker DNS 缓存会定期更新，后端容器重建换 IP 后无需手工修改代理目标。

管理前端部署：

```sh
docker compose -f infra/compose.yml ps
docker compose -f infra/compose.yml logs web
docker compose -f infra/compose.yml down
```

最后一条命令只停止前端项目，不删除后端网络和数据。修改 Vue 代码后重新 `pnpm build` 并重建前端镜像；修改 Java 代码后重新打包并部署后端。开发时使用 Vite HMR；生产 Nginx 不负责编译 `.vue`。

## 验证建议

1. 前端页面能打开、登录恢复与退出正常；USER 只有读权限，ADMIN 可写。
2. 从前端同源 `/api/v1/users` 得到真实 API 状态；匿名应为 401，不能返回 SPA HTML。
3. `/api/not-a-real-api` 返回 JSON 404；`/assets/not-a-real-file.js` 返回 404。
4. Swagger 的脚本、配置、OpenAPI 和 Try it out 均保持前端来源。
5. 后端 `clean package` 后，Jar 中不再含 `BOOT-INF/classes/static/index.html`、`lab.js`、`lab.css`，避免旧构建资源残留。

相关官方说明：[Vite 开发代理](https://vite.dev/config/server-options.html#server-proxy)、[Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)、[springdoc 配置](https://springdoc.org/v2/)。

本次迁移实际验证记录见相邻后端的 [迁移记录](../../springboot-lab/docs/frontend-migration.md)。
