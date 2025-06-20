# Find and kill processes using ports
$ports = @(5501, 5502)

foreach ($port in $ports) {
    Write-Host "Checking port ${port}"
    $processInfo = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

    if ($processInfo) {
        $process = Get-Process -Id $processInfo.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Found process using port ${port}"
            Write-Host "Name: $($process.Name)"
            Write-Host "ID: $($process.Id)"
            
            Write-Host "Stopping process..."
            Stop-Process -Id $process.Id -Force
            Write-Host "Process stopped successfully"
        }
    } else {
        Write-Host "No process found using port ${port}"
    }
}

Write-Host "Port cleanup complete"