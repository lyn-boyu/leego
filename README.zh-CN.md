🚀 LeeGo - 快速提升你的 LeetCode 实力！ 🚀

 一个帮助您提高 Leetcode 练习效率的命令行工具，在本地 IDE 中沉浸式的管理你的 LeetCode 练习进度(目前优先支持 Typescript)，内置间隔重复学习、进度跟踪和 Git 集成。此外，该工具集成了大型语言模型（LLM）来提升你的练习效率，可以自动生成解题方案、调试测试用例以及可视化分析你的薄弱环节。

## 前置要求

在安装 leetgo 之前，你需要先安装 Bun.js：

```bash
# macOS、Linux 和 WSL 用户
curl -fsSL https://bun.sh/install | bash

# 验证安装
bun --version
```

更多安装选项和故障排除，请访问 [bun.sh](https://bun.sh)。

## 功能特点

- 🎯 **问题管理**
  - 自动生成模板添加新题目
  - 提交解决方案并记录完整元数据
  - 追踪练习历史和表现
  - 自动归档历史答题记录

- 📊 **进度追踪**
  - 可视化练习热力图
  - 连续打卡记录
  - 每周目标
  - 练习统计

- 🧠 **间隔重复学习**
  - 基于艾宾浩斯遗忘曲线的智能复习调度
  - 复习提醒
  - 记忆保持率追踪
  - 自定义复习间隔：1、3、7、14、30、90、180 天

- 🔄 **Git 集成**
  - 自动提交并包含详细元数据
  - 结构化提交信息
  - 保存练习历史

- 🤖 **大语言模型支持**
  - 支持多种 LLM ：
    - OpenAI (GPT-4, GPT-3.5)
    - Anthropic (Claude)
    - DeepSeek
    - 自定义 LLM 实现：
      - 本地模型（如 llama.cpp、ggml）
      - 自托管服务
      - 其他提供商
      - 自定义 API 端点
  - 智能代码生成：
    - 解决方案模板
    - 测试用例
    - 代码分析
    - 复杂度分析
  - 可自定义提示词
  - 支持多个模型

## 安装

```bash
# 全局安装 leetgo
npm install -g leetgo
```

## 快速开始

1. 设置工作空间：
```bash
# 初始化工作空间
leetgo setup

# 配置 LeetCode 认证
leetgo set-cookies

# 设置 AI 提供商（可选）
leetgo set-ai-key
```

2. 开始练习：
```bash
# 添加新题目
leetgo add

# 开始练习某个题目
leetgo start <题目编号>

# 提交解答
leetgo submit <题目编号>
```

3. 追踪进度：
```bash
# 查看练习统计
leetgo stats

# 设置每周目标
leetgo set-goals
```

## 认证设置

### 设置 Cookies（推荐方法）

1. 用 Chrome/Edge 打开 [leetcode.com](https://leetcode.com)
2. 登录你的 LeetCode 账号
3. 打开开发者工具：
   - 按 `F12` 或
   - 右键点击任意位置选择"检查"
4. 在开发者工具中：
   - 选择"网络"标签
   - 勾选"XHR"过滤器
   - 在 leetcode.com 上点击任意按钮
5. 在网络面板中：
   - 点击任意发往 leetcode.com 的请求
   - 在请求详情中找到"标头"标签
   - 滚动找到"请求标头"下的"Cookie:"
   - 复制整个 cookie 字符串（以 `cf_clearance=` 开头，以 `_gat=1` 结尾）

6. 在 leetgo 中设置 cookies：
```bash
leetgo set-cookies
```

7. 粘贴复制的 cookie 字符串

工具会在保存前验证 cookies 是否有效。

## 命令说明

### 问题管理

- `leetgo add [题目编号]`
  - 自动获取题目描述，生成README.MD
  - 自动生成解答模板和测试文件
  - 自动按类型归类组织题目
  - 使用 LLM 生成模板（如已配置）

- `leetgo start <题目编号>`
  - 开始练习题目
  - 初始化测试环境
  - 归档之前的尝试
  - 启动测试监视模式

- `leetgo submit <题目编号>`
  - 提交你的解答
  - 运行测试
  - 记录练习元数据
  - 更新学习进度
  - 创建 Git 提交

### 进度追踪

- `leetgo stats`
  - 在浏览器中打开统计面板
  - 显示练习热力图
  - 展示学习进度
  - 显示复习计划

- `leetgo set-goals`
  - 设置每周练习目标
  - 追踪完成率
  - 查看历史表现

### AI 集成

- `leetgo set-ai-key`
  - 配置 AI 提供商
  - 支持的提供商：
    - OpenAI (GPT-4, GPT-3.5)
    - Anthropic (Claude)
    - DeepSeek
  - 支持多个密钥
  - 自动密钥轮换

## 项目结构

```
workspace/
├── 01-arrays-hashing/     # 题目分类
├── 02-two-pointers/
├── 03-sliding-window/
├── ...
└── problem-folder/
    ├── index.ts           # 解答实现
    ├── index.test.ts      # 测试用例
    ├── README.md          # 题目描述
    └── .meta/
        ├── metadata.json  # 练习元数据
        ├── template.ts    # 原始模板
        └── archives/      # 历史解答
```

## 元数据追踪

工具会为每个题目追踪全面的元数据：

- 练习历史
- 花费时间
- 使用的方法
- 复杂度分析
- 测试结果
- 复习计划
- 记忆保持率

## Git 集成

自动提交包含以下信息：

```
solve(0001E): two sum [easy]

Status: passed
Time Spent: 30 minutes
Approach: Hash Table
Time Complexity: O(n)
Space Complexity: O(n)
Timestamp: 24-01-27 15:30:45
```

## 间隔重复系统

工具基于艾宾浩斯遗忘曲线实现了间隔重复系统：

- 复习间隔：1、3、7、14、30、90、180 天
- 基于以下因素计算保持率：
  - 距离上次复习的时间
  - 练习尝试次数
  - 题目难度
- 基于表现的智能调度
- 可视化保持率指标

## 贡献

1. Fork 仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT 许可证 - 详见 LICENSE 文件