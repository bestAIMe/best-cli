# @best/cli

命令行工具汇总

## 安装

```bash
npm install @best/cli -D
```

## 相关命令

```bash
Usage: best-cli [options]

best frontend command client.

命令：
  best-cli template     Init template.
  best-cli env          Init env files.
  best-cli microApp <project-name>  Create a new microApp project
  best-cli miniApp <project-name>  Create a new miniApp project

选项：
  --help     显示帮助信息                                                 [布尔]
  --version  显示版本号                                                   [布尔]
```

### 环境配置文件初始化

自动生成 env 目录和 env 目录下的相关环境配置文件，环境有 `test`、`dev`、`prd`、`pre`、`prod`。命令如下：

相关选项:

```bash
best-cli env
  -n, --name     用于生成CDN路径的工程名，默认取package.json中的name字段
  -t, --title    用于在env中生成PROJECT_TITLE字段，默认取package.json中的name字
  -e, --environment  环境选择 "koolhaas" or "gateway" ， 默认为: "koolhaas"
                                        [默认值: "koolhaas"]
```

#### 使用说明

1. 注意 git 仓库名、`package.json`的`name`保持一致
2. 在`package.json`的`scripts`增加如下命令：

```
"scripts": {
    "env:init": "best-cli env",
}
```

3. 在`.gitignore`中添加如下内容

```
env
env.back
```

4. 执行命令

```bash
npm run env:init
```

生成文件内容如下：

```bash
PROJECT_ENV_PREFIX = 环境网关
PROJECT_TITLE = 工程名称
PROJECT_CDN = 对应环境CDN构建产物路径
PROJECT_ENV = 当前环境。
NUWA_CDN = 图片手动上传CDN前缀
```

5. 在 webpack 或 vite 构建时使用的常量改为，上述常量

### 微服务创建

#### 主应用

- `best-cli microApp mainAppName`
- 选择主应用
- 填写信息，一键生成

#### 子应用

- `best-cli microApp subAppName`
- 选择子应用
- 填写信息，一键生成

### 多端小程序项目创建

- `best-cli miniApp projectName`
- 填写信息，一键生成

### 为项目生成发布版本

- 使用：`best-cli genVersion`
  > 1. 支持自定义输入版本号、给当前版本号 patch 加 1
  > 2. 同时修改`env/.env.prod`或者`.env.prod`的 包含`PROJECT_CDN` 地址的 version 和`package.json`的 version 字段的值
