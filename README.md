# A-Insight · 大A分析小助手

面向个人每日复盘的 A 股市场仪表盘。项目是纯静态网页，可直接部署到 GitHub Pages。

## 功能

- 核心指数、市场宽度、情绪评分、风险温度与板块强弱
- 公共行情接口读取失败时明确回退到演示快照
- 自选股、持仓成本、仓位集中度与每日复盘，本地浏览器保存
- 支持 OpenAI Responses、Chat Completions、Gemini generateContent、Claude Messages
- 支持 OpenAI / DeepSeek / Gemini / Anthropic / New API / Sub2API / 自建中转
- 可读取 `/models`，也可以手动输入模型名称
- 自定义系统提示词、风险偏好、持有周期、附加分析要求
- 深色/浅色模式、红涨绿跌/绿涨红跌切换、移动端适配

## GitHub Pages

仓库包含 `.github/workflows/pages.yml`。首次使用时进入：

`Settings → Pages → Build and deployment → Source → GitHub Actions`

保存后，在 `Actions` 页面运行 **Deploy A-Insight to Pages**，或重新提交一次代码。网站通常发布到：

`https://9991314.github.io/a-share-analysis-assistant/`

## API 配置

以 OpenAI 兼容中转为例：

- 服务商：OpenAI 兼容
- API Base URL：`https://你的域名/v1`
- API Key：你的密钥
- 点击“读取模型”，或手动填写模型名
- 根据接口选择 Responses API 或 Chat Completions

密钥不会提交到 GitHub。默认只存当前浏览器会话；启用“长期记住”后才写入本机 `localStorage`。

> GitHub Pages 是纯前端网站，浏览器会直接向目标 API 发请求。目标 API 必须允许 CORS。公开给多人使用时，不应共享同一平台密钥，应增加服务端代理、用户鉴权、限流和审计。

## 本地预览

```bash
python -m http.server 8080
```

然后打开 `http://127.0.0.1:8080`。

## 风险声明

本项目只用于信息整理、研究辅助与复盘，不构成投资建议，不保证行情接口完整、实时或准确，也不承诺任何收益。
