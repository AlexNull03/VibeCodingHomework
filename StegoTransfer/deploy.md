# deploy.md —— 静态站点部署到 alexcn.work 全程实录与复用指南

> 本文完整记录 Qoder 站点（`D:\Data\Homework\Work2\Qoder` → `https://www.alexcn.work/Work2/Qoder/`）的部署过程，
> 包括每一步"谁执行、执行了什么、为什么"。部署其他项目时按第 5 节的通用流程替换路径即可。

## 0. 环境事实（先弄清这三件事，能省掉 90% 的 404）

| 事实 | 本机情况 | 为什么重要 |
|---|---|---|
| 服务器 | Ubuntu 24.04（nginx 1.24），SSH 用户 `alex@www.alexcn.work` | 所有远端命令以此用户执行 |
| 网站根 | **不是** `/home/alex`。nginx 默认站点 root 是 `/var/www/html`；域名 `alexcn.work` 的 443 server 块在 **`/etc/nginx/conf.d/purenavigation.conf`**（certbot 把证书配置写进了这个文件） | 改错配置文件（比如去改 `sites-available/default`）会"配置全对但依然 404" |
| 本地 | 只有 Windows、无 bash；`.bat` 必须 **CRLF 行尾 + 纯 ASCII**；日常操作双击 .bat，服务器命令由人工粘贴执行 | 决定上传工具用 scp（Windows 自带 OpenSSH 客户端） |

## 1. 本地侧：决定上传什么、不上传什么

本项目是纯静态站（零后端），部署 = 把文件放上去 + nginx 指路。

**上传白名单**（只有这些进服务器）：

```
index.html
css/style.css
js/crypto.js  js/stego.js  js/app.js
```

**明确不上传**：`progress.md`、`detail.md`、`target.md`、`test/` 等开发档案——含算法与常数细节，
一旦 `https://…/progress.md` 能访问就等于把原理公开。**部署任何项目前都先过一遍这个"可见面"审查**：
服务器上最终目录里，每个文件都要假设用户会直接在浏览器地址栏访问它。

## 2. 本地侧：写上传脚本 deploy.bat

双击运行、失败有提示、成功后给出访问地址。核心就是 `ssh mkdir -p` + 三段 `scp`：

```bat
@echo off
chcp 65001 >nul
setlocal

set HOST=alex@www.alexcn.work
set REMOTE=/home/alex/Work2/Qoder

echo === Creating remote directories ===
ssh %HOST% "mkdir -p %REMOTE%/css %REMOTE%/js"
if errorlevel 1 (
    echo [FAIL] Cannot create remote directories
    pause
    exit /b 1
)

echo === Uploading index.html ===
scp index.html %HOST%:%REMOTE%/
if errorlevel 1 goto :fail

echo === Uploading css/style.css ===
scp css\style.css %HOST%:%REMOTE%/css/
if errorlevel 1 goto :fail

echo === Uploading js files ===
scp js\crypto.js js\stego.js js\app.js %HOST%:%REMOTE%/js/
if errorlevel 1 goto :fail

echo.
echo === Upload complete ===
echo Visit: https://www.alexcn.work/Work2/Qoder/
pause
exit /b 0

:fail
echo [FAIL] Upload failed
pause
exit /b 1
```

写 .bat 的硬规矩（本项目踩过的坑）：

1. **CRLF 行尾**：在 MSYS/Git-Bash 环境下生成文件时，`sed 's/$/\r/'` 加回车；注意 `sed -i` 之后会把 CR 剥掉，**内容修改要一次做完再加 CRLF**，最后用 `file deploy.bat` 确认显示 `with CRLF line terminators`。
2. **纯 ASCII**：echo 文案别写中文（chcp 65001 也救不了部分代码页切换时机问题）。
3. 访问地址**末尾带斜杠**（原因见 4.3）。

## 3. 服务器侧：文件落位确认（只读命令块）

上传后先确认"文件在、读得到"，再怀疑 nginx：

```bash
ls -la ~/Work2/Qoder ~/Work2/Qoder/css ~/Work2/Qoder/js
```

本项目实测：文件全部就位（index.html 10076 字节，时间戳与上传一致）。

## 4. 服务器侧：nginx 接入（本次 404 的完整排查链）

### 4.1 第一站就找错了配置文件

最初把 location 块加进了 `/etc/nginx/sites-available/default`——它确实生效，但那是
`listen 80 default_server; server_name _` 的默认站点；而 `www.alexcn.work` 的请求
（尤其 HTTPS）根本不走它。

**正确定位方法**（部署新项目第一步就用这个，别猜）：

```bash
grep -rl 'alexcn.work\|ssl_certificate\|listen 443' /etc/nginx/
```

本项目结果锁定 `/etc/nginx/conf.d/purenavigation.conf`——certbot 签发后把 443 server 块
直接写进了这个文件，域名所有 HTTPS 流量都由它接管。

### 4.2 目录权限：www-data 进不了 /home/alex

`/home/alex` 默认 750（`drwxr-x---`），nginx worker 以 `www-data` 运行，连"路过"你家目录都不行。

```bash
namei -l /home/alex/Work2/Qoder/index.html     # 逐级看权限，定位卡在哪一层
chmod o+x /home/alex                            # 只给"穿过"权限，不给列目录
sudo -u www-data cat /home/alex/Work2/Qoder/index.html >/dev/null && echo READ-OK   # 以 nginx 的身份实测读取
```

判读：`namei` 里 `/home/alex` 出现 `---------`（other 无 x）就是它挡的；
`sudo -u www-data cat` 通过才说明权限链打通。

### 4.3 在正确的 server 块里加 location

`purenavigation.conf` 的 443 server 块里有一条兜底 `location / { return 404; }`，
所有未匹配路径直接 404。**必须在它之前**插入子站点的 location；顺序错了（比如插到
server 块大括号外面）`nginx -t` 会报 `location directive is not allowed here`。

```nginx
    location /Work2/Qoder/ {
        alias /home/alex/Work2/Qoder/;
        index index.html;
    }
    location / {
        return 404;
    }
```

**为什么用 `alias` 而不是 `root`**：URL 是 `/Work2/Qoder/xxx`，磁盘是 `/home/alex/Work2/Qoder/xxx`，
两者前缀不一致。`root` 会把完整 URL 拼到指定目录后面（变成 `/home/alex/Work2/Qoder/Work2/Qoder/xxx`），
只有目录结构和 URL 路径完全同构时才用 `root`。`alias` 结尾和 location 结尾的斜杠要成对出现。

**为什么末尾要带斜杠访问**：`/Work2/Qoder`（无斜杠）不会匹配 `location /Work2/Qoder/`，
会落进兜底 404。要兼容无斜杠访问，加一条跳转：

```nginx
    location = /Work2/Qoder {
        return 301 /Work2/Qoder/;
    }
```

### 4.4 验证与热加载

```bash
sudo nginx -t                        # 语法检查，必须 OK 才继续
sudo systemctl reload nginx          # 平滑重载（不是 restart，不断已有连接）
curl -I https://www.alexcn.work/Work2/Qoder/          # 期望 200 + Content-Type: text/html
curl -I https://www.alexcn.work/Work2/Qoder/index.html
```

本项目实测：reload 后两条 curl 均 `HTTP/1.1 200 OK`。浏览器若仍 404，多半是缓存了
之前的 404 响应，Ctrl+Shift+R 强刷。

## 5. 通用流程：部署下一个项目（替换尖括号即可）

```
① 审查可见面：列出要上传的文件清单，开发档案/密钥/测试目录不进清单
② 本地脚本：复制 deploy.bat 模板，改 HOST/REMOTE/文件清单三处；CRLF+ASCII 检查
③ 上传后（服务器，只读）：ls -la 确认落位；namei -l 检查权限链
④ 权限：家目录被挡 → chmod o+x /home/<user>；sudo -u www-data cat 实测
⑤ 定位配置：grep -rl '<域名>\|listen 443' /etc/nginx/ → 找到真正生效的 server 块
⑥ 插入 location（alias + index），必须在 return 404 / 兜底 location 之前
⑦ sudo nginx -t && sudo systemctl reload nginx
⑧ curl -I 验证 200；浏览器强刷
```

## 6. 本次部署的坑清单（新项目上线前先自查）

| 症状 | 根因 | 处置 |
|---|---|---|
| 文件在、配置改了，仍 404 | 改的不是域名实际生效的 server 块（HTTPS 走 certbot 写入的 conf.d 文件） | 5-⑤ 的 grep 定位 |
| `nginx -t` 报 location not allowed | location 插到了 server 块大括号外 | 插进 443 server 块内部 |
| 404 且 error log 一片空白 | 命中了 `return 404` 兜底（它不产生 error log） | 检查 location 顺序与拼写 |
| 403 Forbidden | www-data 无权限路过 /home/alex | `chmod o+x` + `sudo -u www-data cat` 实测 |
| 带斜杠 200、不带斜杠 404 | location 只写了带斜杠版本 | 加 `location = /path { return 301 /path/; }` |
| curl 200 但浏览器 404 | 浏览器缓存了旧 404 | Ctrl+Shift+R 强刷 |
| .bat 双击闪退/命令错乱 | LF 行尾或含中文 | CRLF + 纯 ASCII 重写 |

## 7. 本项目部署记录（时间线）

- 2026-09-18：`upload.bat` 首次上传成功，文件落位 `/home/alex/Work2/Qoder/`；访问 404
- 2026-09-18：误改 `sites-available/default` 一次（location 插到 server 块外，nginx -t emerg，已回退）
- 2026-09-19：`chmod o+x /home/alex`；grep 定位到 `conf.d/purenavigation.conf`；在兜底 `location /` 前插入 `alias` 块；`nginx -t` OK → reload → curl 200 → 浏览器验证通过
- 2026-09-19：界面改版（第 9/10 轮）后生成 `deploy.bat`（同 upload.bat 逻辑 + 带斜杠地址），待运行
