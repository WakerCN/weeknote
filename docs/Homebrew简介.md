# 🍺 Homebrew 简介

Homebrew 是 macOS（以及 Linux）上最流行的**包管理器**（Package Manager）。它可以帮助你轻松地安装、更新和管理各种命令行工具和应用程序。

## 📦 什么是包管理器？

包管理器就像是一个"应用商店"，但是用于命令行工具和开发软件。它可以：

- 自动下载和安装软件
- 管理软件之间的依赖关系
- 方便地更新和卸载软件

## ✨ Homebrew 的主要特点

| 特点 | 说明 |
|------|------|
| 🚀 简单易用 | 一条命令即可安装软件 |
| 📚 软件丰富 | 拥有数千个软件包可供选择 |
| 🔄 自动处理依赖 | 自动安装软件所需的依赖项 |
| 🧹 干净整洁 | 所有软件安装在 `/opt/homebrew`（Apple Silicon）或 `/usr/local`（Intel Mac） |
| 🔐 安全可靠 | 开源社区维护，代码透明 |

## 🛠️ 常用命令

```bash
# 安装软件
brew install <软件名>

# 卸载软件
brew uninstall <软件名>

# 更新 Homebrew 自身
brew update

# 升级所有已安装的软件
brew upgrade

# 查看已安装的软件
brew list

# 搜索软件
brew search <关键词>

# 查看软件信息
brew info <软件名>

# 清理旧版本
brew cleanup
```

## 📥 如何安装 Homebrew

在终端中运行以下命令：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## 🎯 使用示例

```bash
# 安装 Node.js
brew install node

# 安装 Git
brew install git

# 安装 VS Code（通过 cask 安装 GUI 应用）
brew install --cask visual-studio-code

# 安装 Chrome
brew install --cask google-chrome
```

## 📝 Homebrew 术语

| 术语 | 含义 |
|------|------|
| **Formula** | 命令行软件的安装脚本/配方 |
| **Cask** | GUI 应用程序的安装方式 |
| **Tap** | 第三方软件仓库 |
| **Cellar** | Homebrew 安装软件的目录 |
| **Bottle** | 预编译的二进制包 |

## 🔗 相关链接

- 官网：[https://brew.sh](https://brew.sh)
- GitHub：[https://github.com/Homebrew/brew](https://github.com/Homebrew/brew)
- 软件包搜索：[https://formulae.brew.sh](https://formulae.brew.sh)

## 🌟 为什么推荐使用 Homebrew？

1. **开发者必备** - 几乎所有开发工具都可以通过 Homebrew 安装
2. **版本管理** - 可以轻松切换软件版本
3. **统一管理** - 所有软件集中管理，便于维护
4. **社区活跃** - 持续更新，软件包丰富

---

> 💡 **小贴士**：Homebrew 的名字来源于"自酿啤酒"的概念，意味着你可以像自己酿造啤酒一样，自由地"酿造"（安装）你需要的软件！
