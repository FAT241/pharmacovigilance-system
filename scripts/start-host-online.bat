@echo off
chcp 65001 >nul
title DACS4 Host Server Online

echo ==========================================================
echo        DACS4 - MÁY CHỦ HOST CHO NGƯỜI DÙNG INTERNET
echo ==========================================================
echo.
echo [1/3] Đang kiểm tra PostgreSQL và mô hình AI...
echo [2/3] Đang khởi động Server DACS4 trên cổng 3000...

cd /d "%~dp0\.."

start "DACS4 Backend Server" cmd /k "npm run dev:server"

timeout /t 3 >nul

echo [3/3] Đang tạo đường hầm Internet công khai (Cloudflare Tunnel)...
echo.
echo ====================================================================
echo  SAU KHI ĐƯỜNG HẦM MỞ, HÃY COPY ĐƯỜNG LINK DẠNG:
echo  https://xxxx-xxxx.trycloudflare.com
echo  ĐỂ GỬI CHO NGƯỜI DÙNG HOẶC ĐIỀN VÀO FILE CONFIG CỦA DESKTOP APP!
echo ====================================================================
echo.

cloudflared tunnel --url http://localhost:3000

pause
