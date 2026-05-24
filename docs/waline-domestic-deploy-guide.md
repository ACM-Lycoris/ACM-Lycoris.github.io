# Waline 评论系统国内可访问部署教程

这份教程是给当前项目 `D:\BlogNew\myblog` 专门写的。目标只有一个：让博客浏览和评论在不开代理的情况下也足够流畅。

## 0. 先说结论

你现在的博客不是因为 Hugo 静态页面本身慢，而是评论后端还在 Vercel。

当前配置在：

```text
D:\BlogNew\myblog\config\_default\params.yml
```

里面有：

```yml
waline:
  enable: true
  serverURL: "https://acm-lycoris-waline.vercel.app"
```

浏览器打开文章页后，评论框会向这个地址发请求。你朋友不开代理时报 `Failed to fetch`，说明浏览器连不上这个 Waline 后端。开启代理能正常评论，进一步说明问题在“到 Vercel 的网络路径”，不是评论框样式、头像、Hugo 构建或 GitHub Pages 静态资源。

解决办法不是继续压缩图片，而是把 `serverURL` 换成一个国内能稳定访问的 Waline 后端地址。

## 1. 你需要理解的三个小概念

### 静态博客

你的博客页面由 Hugo 生成，最后变成 HTML、CSS、JS、图片等静态文件。静态文件本身没有数据库，也不会保存评论。

### Waline 前端

文章页里的评论框是 Waline 前端。它负责显示评论框、展示评论、把用户输入的评论发出去。

这部分我们已经尽量本地化处理了，减少了外部 CDN 和头像服务依赖。

### Waline 后端

真正保存评论、读取评论、管理评论的是 Waline 后端。它必须有一个 API 地址，也就是 `serverURL`。

你现在这个 API 地址是：

```text
https://acm-lycoris-waline.vercel.app
```

Vercel 在国内网络环境下不稳定，所以必须迁走。

## 2. 推荐路线

我推荐你使用：

```text
腾讯 CloudBase 云开发部署 Waline
```

理由：

- 不需要你买服务器。
- 不需要你手写 Nginx。
- 不需要你处理 Docker、端口、防火墙、SSL 证书。
- Waline 官方支持 CloudBase 一键部署。
- 国内访问通常比 Vercel 更适合你的使用场景。

暂时不推荐：

- 继续用 Vercel：根因没变。
- Giscus、Gitalk：依赖 GitHub API，国内网络同样可能失败。
- 让用户上传头像：会增加存储、审核、安全和速度负担，当前没必要。
- 一上来用 VPS：稳定，但对新手步骤太多，容易卡在域名、证书、防火墙、反向代理。

## 3. 开始前准备

你需要准备：

1. 一个腾讯云账号。
2. 可以完成腾讯云登录和实名验证。
3. 你的博客主域名：

```text
acm-lycoris.cn
```

4. 一个你的邮箱，例如：

```text
your-mail@example.com
```

5. 一个随机密钥 `JWT_TOKEN`。

在 Windows PowerShell 里可以这样生成：

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

生成出来会像这样：

```text
x7QkP9mL2Za8sVtNwY4R0...
```

注意：这个值不要发到公开仓库，也不要截图公开。它是后端登录签名用的密钥。

## 4. 用 CloudBase 一键部署 Waline

### 如果新版控制台只显示“静态网站托管”

腾讯云新版控制台把 Web 应用托管能力合并到了“静态网站托管”入口里，所以你看到“网站部署 / 静态网站托管”不是点错了。

但是 Waline 的 CloudBase 模板 `walinejs/tcb-starter` 不是普通 HTML/CSS/JS 静态网站。它是一个 CloudBase Framework Node 应用。模板仓库里的 `cloudbaserc.json` 写的是：

```json
{
  "framework": {
    "name": "waline",
    "plugins": {
      "node": {
        "inputs": {
          "entry": "app.js",
          "name": "waline",
          "path": "/waline"
        }
      }
    }
  }
}
```

如果你在控制台里选择“静态网站托管 -> Git 仓库部署”，并且部署日志出现：

```text
tcb hosting deploy ./ /waline
```

说明它把 Waline 当成静态网站上传了。这条路是错的，可能会上传整个 `node_modules`，然后报：

```text
ECONNRESET
socket hang up
```

遇到这种情况，不要继续重试“静态网站托管”。改用本地命令行执行 Waline 模板官方 README 写的 Framework 部署命令：

```powershell
cd D:\BlogNew
git clone https://github.com/walinejs/tcb-starter.git waline-tcb-starter
cd waline-tcb-starter
npm install
npx -p @cloudbase/cli tcb login
npx -p @cloudbase/cli tcb framework deploy --verbose -e 你的环境ID
```

环境 ID 可以在 CloudBase 控制台地址栏里找。例如地址里有：

```text
envId=waline-blog-d6qeofi0wca743759
```

那环境 ID 就是：

```text
waline-blog-d6qeofi0wca743759
```

部署成功后，命令行或控制台会显示访问地址。Waline 模板的路径通常是 `/waline`，所以最终用于博客前端的 `serverURL` 很可能类似：

```text
https://你的访问域名/waline
```

如果不确定，把部署成功后的控制台页面或命令行输出发给我，我来判断最终应该填哪一个 URL。

### 第 1 步：打开官方 CloudBase 部署文档

打开：

```text
https://waline.js.org/guide/deploy/cloudbase.html
```

页面里会有 CloudBase 的部署入口。点击它，会跳到腾讯云开发的部署页面。

如果页面要求登录，就用你的腾讯云账号登录。

### 第 2 步：选择部署位置

腾讯云页面可能会问你：

```text
选择已有应用 / 新建应用
```

如果你以前没用过 CloudBase，就选：

```text
新建应用
```

应用名可以填：

```text
waline-blog
```

环境名可以填：

```text
waline-blog
```

地区尽量选择国内常用地域，例如：

```text
上海
广州
北京
```

哪个离你和你的朋友更近就选哪个。拿不准就选上海。

### 第 3 步：进入应用配置

官方流程通常是：

```text
下一步：应用配置
```

然后：

```text
完成
```

点完后它会开始自动构建。页面可能显示：

```text
构建中，预计 3-5 分钟
```

这一步不要关闭页面，等它完成。

### 第 4 步：拿到访问地址

部署完成后，页面右侧或卡片上一般会出现：

```text
访问
管理
```

点击：

```text
访问
```

浏览器打开的新地址就是你的 Waline 后端地址，格式可能类似：

```text
https://xxxxxxxx.service.tcloudbase.com
```

把这个地址保存下来。后面我们要把它填进博客配置里的 `serverURL`。

这个地址不要带最后的 `/`。推荐写成：

```text
https://xxxxxxxx.service.tcloudbase.com
```

不要写成：

```text
https://xxxxxxxx.service.tcloudbase.com/
```

## 5. 配置 CloudBase 环境变量

部署完成后，进入 CloudBase 控制台里这个应用的管理页面。

你要找类似下面的入口：

```text
环境变量
变量配置
应用配置
服务配置
```

腾讯云界面可能会改名，不必紧张。核心就是找到可以添加环境变量的地方。

添加下面这些变量。

### 必填变量

```text
SITE_NAME
```

值：

```text
ACM-Lycoris's Blog
```

```text
SITE_URL
```

值：

```text
https://acm-lycoris.cn
```

```text
SERVER_URL
```

值填你刚才拿到的 CloudBase 访问地址，例如：

```text
https://xxxxxxxx.service.tcloudbase.com
```

```text
SECURE_DOMAINS
```

值：

```text
acm-lycoris.cn,www.acm-lycoris.cn,acm-lycoris.github.io
```

注意：

- 这里不要写 `https://`。
- 不要写路径。
- 多个域名用英文逗号分隔。

```text
JWT_TOKEN
```

值填你刚才生成的随机密钥。

### 推荐变量

```text
AKISMET_KEY
```

值：

```text
false
```

原因：Waline 默认可能启用 Akismet 反垃圾评论服务。这个服务是外部网络服务，在国内环境下可能让提交评论变慢。我们先关闭它，保证评论链路干净、直接。

```text
AVATAR_PROXY
```

值：

```text
false
```

原因：你的博客前端已经做了“昵称首字母 / 汉字头像”，不需要后端再代理外部头像。

```text
DISABLE_REGION
```

值：

```text
true
```

原因：评论区不显示地区信息，可以减少额外处理，也更保护隐私。

```text
DISABLE_USERAGENT
```

值：

```text
true
```

原因：评论区不显示浏览器和系统信息，界面更干净，也更保护隐私。

### 可选变量

```text
AUTHOR_EMAIL
```

值填你的邮箱，例如：

```text
your-mail@example.com
```

这个变量主要给博主身份、通知等功能使用。没有邮箱也可以先不填。

## 6. 环境变量保存后必须重新部署

Waline 服务端的环境变量不是保存后立刻生效。保存后你需要在 CloudBase 页面里找：

```text
重新部署
重新发布
Redeploy
发布
```

点一次，让新的环境变量生效。

等部署状态变成成功后，再进入下一步测试。

## 7. 不开代理测试 CloudBase 后端

这一步很重要。先不要改博客配置，先单独测试新后端。

关闭代理，或者让浏览器走直连。

### 测试 1：打开后端首页

打开你的 CloudBase 地址：

```text
https://xxxxxxxx.service.tcloudbase.com
```

只要能正常打开，就说明后端入口可达。

### 测试 2：打开评论 API

在地址后面加：

```text
/api/comment?path=/
```

完整地址类似：

```text
https://xxxxxxxx.service.tcloudbase.com/api/comment?path=/
```

正常情况会看到一段 JSON。你不需要看懂 JSON，只要不是浏览器直接报打不开、超时、无法访问，就说明 API 大概率可达。

### 测试 3：用手机流量测试

最好再用手机关闭 Wi-Fi，用移动网络打开：

```text
https://xxxxxxxx.service.tcloudbase.com
```

如果手机流量也能打开，说明你的朋友们大概率也能访问。

## 8. 创建 Waline 管理员账号

打开：

```text
https://xxxxxxxx.service.tcloudbase.com/ui/register
```

注册第一个账号。

Waline 的规则是：

```text
第一个注册的人会成为管理员
```

所以这一步一定要你自己先做，不要先发给朋友。

注册完成后，管理后台地址一般是：

```text
https://xxxxxxxx.service.tcloudbase.com/ui
```

这里可以管理评论、删除垃圾评论、审核内容。

如果后台页面加载不出来，但评论 API 可以用，先不要慌。后台界面可能还依赖管理端资源；评论功能本身可以先接入博客测试。

## 9. 把博客切到新的评论后端

等 CloudBase 地址确认不开代理能访问后，修改：

```text
D:\BlogNew\myblog\config\_default\params.yml
```

找到：

```yml
waline:
  enable: true
  serverURL: "https://acm-lycoris-waline.vercel.app"
```

改成：

```yml
waline:
  enable: true
  serverURL: "https://xxxxxxxx.service.tcloudbase.com"
```

这里的 `https://xxxxxxxx.service.tcloudbase.com` 换成你的真实 CloudBase 地址。

如果你不想自己改，直接把 CloudBase 地址发给我。我会替你改配置、构建、提交、推送。

## 10. 本地构建检查

在 PowerShell 执行：

```powershell
cd D:\BlogNew\myblog
hugo --minify --gc
```

看到没有报错，就说明 Hugo 构建成功。

## 11. 提交并推送到 GitHub

如果你自己操作，执行：

```powershell
cd D:\BlogNew\myblog
git status --short
git add config/_default/params.yml docs/waline-domestic-deploy-guide.md
git commit -m "Point Waline to domestic backend"
git push
```

推送后 GitHub Actions 会重新部署你的 Hugo 博客。

你可以打开 GitHub 仓库的：

```text
Actions
```

等待最新部署变绿。

## 12. 线上验证

部署完成后，关闭代理，打开：

```text
https://acm-lycoris.cn
```

进入任意一篇文章，拉到评论区。

检查三件事：

1. 评论框是否很快出现。
2. 提交评论是否成功。
3. 浏览器开发者工具里，评论请求是否已经不再访问 Vercel。

开发者工具检查方法：

1. 按 `F12`。
2. 打开 `Network`。
3. 刷新页面。
4. 在过滤框输入：

```text
comment
```

或：

```text
waline
```

你应该看到请求发往：

```text
https://xxxxxxxx.service.tcloudbase.com
```

而不是：

```text
https://acm-lycoris-waline.vercel.app
```

## 13. 旧评论怎么办

先不要删除旧的 Vercel 项目。

旧评论可能还在旧后端对应的数据库里。迁移旧评论需要先知道旧 Vercel 使用的是哪种数据库，例如：

- Neon / PostgreSQL
- LeanCloud
- MongoDB
- MySQL
- SQLite
- GitHub 存储

你现在本地仓库里看不到旧 Vercel 的真实环境变量，所以我不能直接判断旧评论存在哪里。

最稳妥的顺序是：

1. 先让新 CloudBase 评论跑起来。
2. 确认不开代理可以评论。
3. 保留旧 Vercel 项目。
4. 如果你想迁移旧评论，再打开旧 Vercel 项目的环境变量页面，把“变量名”截图给我。不要把密钥值发出来。

如果旧评论很少，也可以直接从新系统开始。这样最干净，也最不容易引入海外数据库依赖。

## 14. 常见问题

### 问题 0：创建 CloudBase 时提示 This env type is not available

如果你看到：

```text
This env type is not available. Please choose another one
ResourcesSoldOut.PostpayPackageNotAvailable
```

这不是你填错了。这个错误表示腾讯云当前地域或当前套餐类型无法创建这个后付费 CloudBase 环境。

按这个顺序处理：

1. 返回上一页。
2. 换一个地域，优先尝试 `广州`、`北京`、`南京`、`成都`。
3. 环境名称不能和之前重复，可以改成：

```text
waline-blog-gz
waline-blog-bj
waline-blog-nj
```

4. 如果页面有“环境类型 / 套餐 / 付费方式”，不要选“后付费按量计费”，改选可用的基础版、免费版或预付费套餐。
5. 如果所有国内地域都失败，说明当前 CloudBase 一键部署入口暂时不可用，直接改走“国内 VPS + Docker”或“阿里云函数计算”路线。

### 问题 1：CloudBase 地址能打开，但博客评论仍然 Failed to fetch

优先检查：

1. `params.yml` 里的 `serverURL` 有没有真的换掉。
2. GitHub Actions 有没有部署成功。
3. 浏览器是不是缓存了旧页面，按 `Ctrl + F5` 强制刷新。
4. `SECURE_DOMAINS` 是否写了 `https://`。如果写了，删掉协议。

正确：

```text
acm-lycoris.cn,www.acm-lycoris.cn,acm-lycoris.github.io
```

错误：

```text
https://acm-lycoris.cn
```

### 问题 2：评论提交后提示没有权限或域名不允许

检查 CloudBase 环境变量：

```text
SECURE_DOMAINS
```

必须包含你当前访问博客使用的域名。

如果你是通过：

```text
https://acm-lycoris.cn
```

访问博客，就必须包含：

```text
acm-lycoris.cn
```

如果你是通过：

```text
https://acm-lycoris.github.io
```

访问博客，就必须包含：

```text
acm-lycoris.github.io
```

### 问题 3：评论能用，但管理后台很慢

评论功能和管理后台不是完全同一个问题。

评论前端我们已经本地化了；管理后台有时会加载 Waline 管理端资源。如果只有后台慢，先不影响普通访客评论。

后续可以再给管理端资源做国内镜像或自托管。

### 问题 4：想使用自己的评论域名

你可以以后再做一个子域名：

```text
waline.acm-lycoris.cn
```

然后把它绑定到 CloudBase。

这样博客配置会更好看：

```yml
serverURL: "https://waline.acm-lycoris.cn"
```

但这不是第一优先级。第一优先级是先让评论在无代理环境下正常跑起来。

## 15. 备选方案：国内 VPS + Docker

如果 CloudBase 不符合你的预期，再考虑 VPS。

VPS 方案的优点：

- 最可控。
- 数据在自己服务器上。
- 长期稳定性强。

缺点：

- 需要买服务器。
- 需要配置域名。
- 需要 HTTPS 证书。
- 需要 Nginx 反向代理。
- 需要自己备份 SQLite 数据库。

如果你走 VPS，核心 `docker-compose.yml` 类似这样：

```yml
version: "3"

services:
  waline:
    container_name: waline
    image: lizheming/waline:latest
    restart: always
    ports:
      - "127.0.0.1:8360:8360"
    volumes:
      - ./data:/app/data
    environment:
      TZ: "Asia/Shanghai"
      SQLITE_PATH: "/app/data"
      SQLITE_DB: "waline"
      JWT_TOKEN: "换成你的随机密钥"
      SITE_NAME: "ACM-Lycoris's Blog"
      SITE_URL: "https://acm-lycoris.cn"
      SERVER_URL: "https://waline.acm-lycoris.cn"
      SECURE_DOMAINS: "acm-lycoris.cn,www.acm-lycoris.cn,acm-lycoris.github.io"
      AKISMET_KEY: "false"
      AVATAR_PROXY: "false"
      DISABLE_REGION: "true"
      DISABLE_USERAGENT: "true"
```

启动命令：

```bash
docker compose up -d
```

但注意：你的博客是 HTTPS 页面，评论 API 也必须是 HTTPS。不能让 HTTPS 博客去请求普通 HTTP 的评论接口，否则浏览器会拦截。

所以 VPS 方案还必须有：

```text
域名 + SSL 证书 + Nginx 反向代理
```

这就是我不建议你第一步走 VPS 的原因。

## 16. 你现在最该做什么

按顺序做：

1. 打开 Waline CloudBase 部署文档。
2. 用腾讯云账号完成一键部署。
3. 拿到 CloudBase 访问地址。
4. 关闭代理测试这个地址能不能打开。
5. 把这个地址发给我。

你发给我之后，我会继续做：

1. 修改 `config/_default/params.yml` 的 `serverURL`。
2. 本地运行 `hugo --minify --gc`。
3. 提交新 commit。
4. 推送到 GitHub。
5. 告诉你怎么在线验证。

## 17. 参考资料

- Waline 部署总览：`https://waline.js.org/guide/deploy/`
- Waline CloudBase 云开发部署：`https://waline.js.org/guide/deploy/cloudbase.html`
- Waline 独立部署：`https://waline.js.org/guide/deploy/vps.html`
- Waline 服务端环境变量：`https://waline.js.org/reference/server/env.html`
- Waline 快速上手和管理员注册说明：`https://waline.js.org/guide/get-started/`
