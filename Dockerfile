# 前端独立构建和部署：先 pnpm build，产物留在 vue-lab/dist。
# 运行镜像只提供静态页面与同源反向代理，不把 Vue 产物复制到 Spring Boot。
FROM nginx:stable-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
