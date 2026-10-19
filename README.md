# 心情打卡 · Mood Log for Mi Band

> 抬手 3 秒记下此刻心情。纯本地、不联网、不上传，用一张情绪热力图看清自己这一个多月过得怎么样。

![version](https://img.shields.io/badge/version-1.1.0-brightgreen)
![size](https://img.shields.io/badge/rpk-74.3%20KB-blue)
![platform](https://img.shields.io/badge/Xiaomi%20Vela-QuickApp-orange)

**下载**：[米坛社区 · 心情打卡](https://www.bandbbs.cn/resources/8661/)

---

## 它是什么

一个极简的心情打卡应用。**没有菜单层级、没有确认弹窗** —— 打开就是 7 个表情，点一下即记。

| 页面 | 内容 |
|---|---|
| **打卡** | 表情网格 + 顶部「今天 N 次 / 连续 N 天」 |
| **回看** | 最近 7 天，每天一行：日期 + 彩色圆点 + 主导心情 |
| **统计** | 近 35 天情绪热力图 + 各心情占比 |
| **关于** | 头像 / 理念 / 版本 |

**7 种心情**：喜笑颜开 / 得意 / 冷漠 / 无语 / 冷汗 / 放声大哭 / 小丑

## 加进来的小细节

- **滑动返回**：在回看 / 统计 / 关于页横向滑动 → 回主界面；在主界面滑动 → 退出应用
- 滑动时**不会误记一笔心情**
- 数据全部存在应用私有存储，卸载即清空，不跟随任何账号

## 技术要点

- 小米 Vela 快应用（HyperOS 4 / NuttX），产物 `.rpk`
- 表情素材：**Microsoft Fluent Emoji**（MIT），透明底 PNG
- 纯本地 `@system.storage`，无网络请求、无权限

## 编译

```bash
npm install
npx aiot build --complete-feature      # 开发包
npx aiot release --complete-feature    # 发布包（需先准备签名）
```

`sign/private.pem` + `sign/certificate.pem` 放 `sign/` 目录（已被 `.gitignore` 排除，**不要提交私钥**）。

## 安装到手环

1. 小米运动健康 → 我的 → 关于 → 连点橙色 logo 进开发者模式，拿 AuthKey
2. 手环切到「连接新手机」模式
3. 用**表盘自定义工具**或 **AstroBox** 侧载 rpk

## 已知限制

- **卸载应用 = 记录全部清空**，数据不跟随账号
- 手环最多装 20 个快应用
- 只在小米手环 11 上测试过

## 许可

MIT，见 [LICENSE](./LICENSE)。表情素材版权归 Microsoft，遵循其 MIT 许可。

开发过程记录见 [开发记录.md](./开发记录.md)。

## 相关

- 同作者另一个手环应用：[水果切乐](https://github.com/Amaratha-AIlr/miband-fruit-slice)
- 开发踩坑记录：[miband-vela-notes](https://github.com/Amaratha-AIlr/miband-vela-notes)
