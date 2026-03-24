# 使用 Node.js 18 作为构建镜像
FROM node:18-alpine AS build

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package.json ./

# 安装依赖
RUN npm install

# 复制项目代码
COPY . .

# 构建项目
RUN npm run build

# 使用 nginx 作为运行时镜像
FROM nginx:alpine AS runtime

# 复制构建产物到 nginx 静态目录
COPY --from=build /app/dist /usr/share/nginx/html

# 复制 nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露 80 端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]