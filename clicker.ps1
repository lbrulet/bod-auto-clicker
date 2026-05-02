# Load Windows Forms for DPI-safe cursor positioning
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class MouseHelper {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint cButtons, IntPtr dwExtraInfo);

    public static void LeftClick() {
        mouse_event(0x0002, 0, 0, 0, IntPtr.Zero);
        System.Threading.Thread.Sleep(10);
        mouse_event(0x0004, 0, 0, 0, IntPtr.Zero);
    }
}
"@

$stdin = [System.Console]::In
while ($true) {
    $line = $stdin.ReadLine()
    if ($null -eq $line) { break }
    $cmd = $line.Trim()
    if ($cmd -eq "quit") { break }

    # "clickat X Y" — move cursor then left-click
    if ($cmd -match "^clickat (-?\d+) (-?\d+)$") {
        $pt = New-Object System.Drawing.Point([int]$Matches[1], [int]$Matches[2])
        [System.Windows.Forms.Cursor]::Position = $pt
        Start-Sleep -Milliseconds 60
        [MouseHelper]::LeftClick()
    }
}
