# DeviceToggle-Windows
Binds a configurable single key or key combo to toggle a device driver on or off. This would be most helpful for custom setups or peripherals that aren't cooperating with typical OS settings, or when those settings take too long to change.

This works with an AutoHotKey script that triggers a task on the Task Scheduler with administrator privileges. The task runs a batch file that utilizes pnputil (native to Windows) to disable and enable the targeted driver(s). It should come as no surprise that this is very insecure and should be used on non-sensitive personal machines only. Use at your own risk.

My inspiration for this project was a particularly temperamental laptop trackpad that would frequently pick up the lightest touch of my cuff as I typed, and wouldn't respond to being disabled through normal Windows settings. Since I usually worked with a peripheral mouse anyway, I didn't need the trackpad all the time, but couldn't keep it permanently disabled for those times when I did need it. The Device Manager became my way to disable/enable it, but this way simplifies those 6 clicks, two loading screens, and a UAC check into a single keybind.
