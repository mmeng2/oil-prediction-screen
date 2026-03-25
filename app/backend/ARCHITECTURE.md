# Backend Architecture Documentation

## 目录结构

```
app/backend/
├── api/                        # API 层（路由和依赖注入）
│   ├── deps.py                # 依赖注入函数
│   └── v1/                    # API v1 版本
│       ├── __init__.py
│       ├── aihub.py          # AI 相关接口
│       ├── auth.py           # 认证接口
│       ├── user.py           # 用户接口
│       ├── settings.py       # 配置接口
│       └── health.py         # 健康检查
├── core/                       # 核心配置和异常
│   ├── __init__.py
│   ├── config.py             # 应用配置
│   └── exceptions.py         # 自定义异常类
├── drivers/                    # AI 模型驱动层
│   ├── __init__.py           # 驱动工厂
│   ├── base.py               # 基础驱动抽象类
│   ├── openai_driver.py      # OpenAI 格式驱动
│   └── mock_driver.py        # Mock 驱动（打桩）
├── models/                     # 数据库模型层
│   ├── __init__.py
│   ├── base.py               # 模型基类
│   └── auth.py               # 用户模型
├── repositories/               # 数据库操作层
│   ├── __init__.py
│   ├── base.py               # 基础 Repository
│   └── user.py               # 用户数据操作
├── schemas/                    # Pydantic 模式
│   ├── __init__.py
│   ├── aihub.py
│   ├── auth.py
│   └── common.py             # 通用响应格式
├── services/                   # 业务逻辑层
│   ├── __init__.py
│   ├── aihub.py              # AI 服务
│   ├── auth.py               # 认证服务
│   └── user.py               # 用户服务
├── utils/                      # 通用工具
│   └── database.py           # 数据库管理
├── dependencies/               # 旧依赖（兼容层）
├── main.py                     # 应用入口
└── requirements.txt            # 依赖
```

## 架构分层说明

### 1. API 层 (`api/`)
- **职责**: 处理 HTTP 请求和响应
- **包含**: 路由定义、依赖注入、请求验证
- **特点**: 不包含业务逻辑，只负责调度和响应格式化

### 2. Service 层 (`services/`)
- **职责**: 实现核心业务逻辑
- **包含**: 业务流程编排、外部服务调用
- **依赖**: 使用 Repository 进行数据操作，使用 Driver 进行 AI 交互

### 3. Repository 层 (`repositories/`)
- **职责**: 封装数据库操作
- **包含**: CRUD 操作、查询构建
- **特点**: 提供统一的数据访问接口

### 4. Driver 层 (`drivers/`)
- **职责**: 抽象 AI 模型接口
- **包含**: 不同厂商的 AI 模型实现
- **特点**: 策略模式，支持动态切换

### 5. Model 层 (`models/`)
- **职责**: 定义数据库表结构
- **包含**: SQLAlchemy ORM 模型

### 6. Schema 层 (`schemas/`)
- **职责**: 定义数据验证和序列化规则
- **包含**: Pydantic 模型

## AI 驱动架构

### 驱动抽象

```python
# drivers/base.py
class BaseDriver(ABC):
    @abstractmethod
    async def generate_text(...) -> str:
        pass
    
    @abstractmethod
    async def generate_text_stream(...) -> AsyncGenerator[str, None]:
        pass
    
    @abstractmethod
    async def generate_image(...) -> List[str]:
        pass
```

### 驱动工厂

```python
# drivers/__init__.py
def get_driver(provider: str | None = None) -> BaseDriver:
    """
    获取驱动实例
    
    支持的 provider:
    - openai: OpenAI 格式驱动（默认）
    - mock: Mock 驱动（打桩模式）
    """
```

### 配置方式

通过环境变量配置 AI Provider：

```bash
# .env
AI_PROVIDER=openai          # 或 mock
AI_MOCK_ENABLED=false       # 启用打桩模式
APP_AI_KEY=your-api-key
APP_AI_BASE_URL=https://api.openai.com/v1
```

## 统一响应格式

所有 API 响应都使用统一格式：

```python
class APIResponse(BaseModel, Generic[T]):
    code: int = 0                    # 0 表示成功
    message: str = "success"         # 响应消息
    data: Optional[T] = None         # 响应数据
```

示例响应：
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "content": "AI 生成的文本",
    "model": "gpt-4"
  }
}
```

## 异常处理

### 自定义异常

```python
# core/exceptions.py
class BusinessException(Exception):
    """业务异常基类"""

class AuthenticationError(BusinessException):
    """认证失败 (401)"""

class AuthorizationError(BusinessException):
    """授权失败 (403)"""

class NotFoundError(BusinessException):
    """资源不存在 (404)"""

class AIServiceError(BusinessException):
    """AI 服务错误 (503)"""
```

### 全局异常处理器

在 `main.py` 中注册了全局异常处理器，自动捕获并格式化所有异常。

## 打桩模式

### 启用方式

1. **环境变量方式**（推荐）:
```bash
AI_MOCK_ENABLED=true
```

2. **Provider 方式**:
```bash
AI_PROVIDER=mock
```

### Mock 驱动特性

- 返回预定义的文本响应
- 支持流式输出模拟
- 返回占位图片
- 无需外部 API 密钥
- 适合开发和测试

## 数据库配置

使用 PostgreSQL 数据库：

```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/oil_prediction
```

## API 端点

### 健康检查
- `GET /api/v1/health` - 基本健康检查
- `GET /api/v1/health/ready` - 就绪检查

### AI 服务
- `POST /api/v1/aihub/gentxt` - 文本生成
- `POST /api/v1/aihub/genimg` - 图片生成
- `GET /api/v1/aihub/health` - AI 服务健康检查

### 认证
- `GET /api/v1/auth/me` - 获取当前用户信息

### 用户管理
- `GET /api/v1/users` - 用户列表（管理员）
- `GET /api/v1/users/{user_id}` - 用户详情（管理员）

### 配置管理
- `GET /api/v1/admin/settings` - 获取配置（管理员）
- `PUT/POST/DELETE /api/v1/admin/settings/{type}/{key}` - 配置管理

## 快速开始

### 1. 安装依赖

```bash
cd app/backend
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和 AI 密钥
```

### 3. 启用打桩模式（可选）

```bash
# 在 .env 中设置
AI_MOCK_ENABLED=true
```

### 4. 启动服务

```bash
python main.py
```

### 5. 测试 API

```bash
# 健康检查
curl http://localhost:8000/api/v1/health

# 文本生成（打桩模式）
curl -X POST http://localhost:8000/api/v1/aihub/gentxt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "model": "gpt-4"
  }'
```

## 性能优化

1. **异步 I/O**: 所有数据库和 AI 调用都使用异步
2. **连接池**: 数据库连接池配置优化
3. **缓存**: 可在 Service 层添加缓存逻辑
4. **批量操作**: Repository 支持批量操作

## 扩展指南

### 添加新的 AI 驱动

1. 继承 `BaseDriver` 类
2. 实现所有抽象方法
3. 在 `drivers/__init__.py` 中注册

```python
# drivers/gemini_driver.py
class GeminiDriver(BaseDriver):
    async def generate_text(...) -> str:
        # 实现 Gemini API 调用
        pass

# drivers/__init__.py
DRIVER_REGISTRY["gemini"] = GeminiDriver
```

### 添加新的 API 端点

1. 在 `api/v1/` 创建新的路由文件
2. 在 `api/v1/__init__.py` 中导出
3. 在 `main.py` 中注册路由

### 添加新的数据库模型

1. 在 `models/` 创建模型类
2. 在 `repositories/` 创建对应的 Repository
3. 在 `services/` 添加业务逻辑
