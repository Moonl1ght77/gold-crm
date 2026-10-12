@echo off
rem 黄金CRM 点击原型：已在运行就直接打开，没运行就启动后打开。关掉"原型服务"窗口即停止。
cd /d "%~dp0"
set "URL=http://127.0.0.1:5174/"
call :up 2 && goto open
if not exist "app\node_modules" (
  echo 第一次运行，先安装依赖……
  call npm --prefix app install || goto fail
)
start "黄金CRM 原型服务（关掉此窗口即停止）" cmd /k npm --prefix app run dev
echo 正在启动原型服务……
call :up 30 || goto fail
:open
start "" "%URL%"
exit /b 0

:up
rem 最多等 %1 秒，地址有响应就返回 0
powershell -NoProfile -Command "for($i=0;$i -lt %1;$i++){ try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '%URL%' | Out-Null; exit 0 } catch { Start-Sleep 1 } }; exit 1"
exit /b %errorlevel%

:fail
echo 启动失败：看"原型服务"窗口里的报错，或把报错发给 Claude。
pause
exit /b 1
