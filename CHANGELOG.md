# Changelog

## v1.0.3
- Fix "Speed" matching inside "Casting Speed" and "Attack Speed" — regex now uses letter+space lookbehind

## v1.0.2
- Fix screenshot/preview crashing with null error after automation stops
- Fix Start button staying disabled — OCR ready signal now waits for renderer to load
- Replace screenshot-desktop with PowerShell-based capture (no .NET compiler dependency)

## v1.0.1
- Fix mouse not moving / clicking when running as installed .exe — the clicker script path now resolves correctly in packaged builds

## v1.0.0
- Initial release
