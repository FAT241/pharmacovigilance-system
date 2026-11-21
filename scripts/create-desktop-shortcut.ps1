$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$ShortcutPath = Join-Path $DesktopPath "Khoi-Dong-DACS4-Host.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "D:\DACS4\scripts\start-host-online.bat"
$Shortcut.WorkingDirectory = "D:\DACS4"
$Shortcut.Description = "Khởi động máy chủ DACS4 và Cloudflare Tunnel cho người dùng Internet"
$Shortcut.IconLocation = "shell32.dll,14"
$Shortcut.Save()

Write-Host "Da tao shortcut tai: $ShortcutPath"
