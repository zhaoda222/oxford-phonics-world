# Oxford Phonics World (Levels 1-5) 安卓与全平台互动学习应用

仿照 Oxford Phonics World 官方移动端打造的 **自然拼读互动学习与练习 App**。涵盖 **Level 1 至 Level 3 全部 24 个单元、260+ 核心词汇**，支持纯正英语发音、音效激励、闪卡翻转、听音辨词及拼写小游戏。

---

## 🌟 核心功能特色

1. **三阶完整课程体系 (1-5 级)**
   - **Level 1: The Alphabet (字母发音与首音)**: Aa-Zz 26 个英文字母纯正发音及 100+ 基础启蒙词汇（Unit 1 至 Unit 8）。
   - **Level 2: Short Vowels (短元音与辅音结合)**: 短元音 a, e, i, o, u，包含 -am/-an, -ap/-at, -en/-et, -in/-it, -og/-ot, -ug/-ut 等拼读族（Unit 1 至 Unit 8）。
   - **Level 3: Long Vowels (长元音与魔术 e)**: 长元音 a_e, i_e, o_e, u_e，以及 ai/ay, ee/ea, oa/ow 等双元音拼读规则（Unit 1 至 Unit 8）。

2. **四大沉浸式学习模式**
   - 📖 **课程模块 (Learn)**：按单元系统浏览单词、音标、中文释义，支持**自然拼读拆音发音（Phonics Blending）**。
   - 🃏 **智能闪卡 (Flashcards)**：3D 翻转卡片，正反面双重记忆强化，支持一键拼读拆音。
   - 🎯 **听音辨词挑战 (Quiz)**：听标准真人发音，从 4 个图文选项中选出正确答案，实时音效反馈与星星奖励。
   - 🔤 **字母拼词大闯关 (Spelling Game)**：听音看图，通过打乱的字母方块拼出正确单词，培养自主拼词能力。

3. **内置音频引擎**
   - 无需外置大体积 mp3 资源，内置 Web Speech API 高清拟真发音引擎与 Web Audio 8-bit/16-bit 胜利音效与答题反馈，纯离线轻量高效。

---

## 📱 打包为安卓 APK 安装包指南

本项目采用标准的跨平台移动端 Web/PWA 架构，可直接通过以下方式一键打包为原生 Android APK：

### 方法一：使用 Capacitor（推荐，最现代快捷）
```bash
# 1. 在本项目目录下安装 Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. 初始化 Capacitor 配置
npx cap init "Oxford Phonics World" "com.oup.elt.phonicsworld.app" --web-dir .

# 3. 添加 Android 工程
npx cap add android

# 4. 同步代码
npx cap sync

# 5. 用 Android Studio 打开工程或直接打包 APK
npx cap open android
```
在 Android Studio 中点击 **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**，即可生成 `.apk` 安装包传输到手机安装。

---

### 方法二：手机 Chrome / 浏览器直接安装（PWA）
本项目已内置 `manifest.json` 与移动端视口自适应配置：
1. 启动本地服务：`npx serve .` 或将文件上传至任意静态服务器（如 GitHub Pages、Vercel）。
2. 在安卓手机自带浏览器或 Chrome 中打开网址。
3. 点击浏览器右上角菜单 **“添加到主屏幕”** 或 **“安装应用”**。
4. 手机桌面上会立即生成独立的 App 图标，体验与原生 App 完全一致！

---

## 💻 本地即时运行与体验

可以在电脑浏览器或手机局域网内直接运行：
```bash
# 运行本地开发服务器
npx serve .
```
或者直接双击打开 `index.html` 即可在浏览器中全功能体验！
