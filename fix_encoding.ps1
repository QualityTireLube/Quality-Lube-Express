
$targetDir = "C:\Users\Stanj\QualitySites\QL_Test"
$files = Get-ChildItem -Path $targetDir -Recurse -Filter "*.html"

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content

    # Fix Mon [garbage] Fri
    # Matches Mon followed by any non-word characters and Fri
    $content = $content -replace "Mon\s+[^\w\s]+\s+Fri", "Mon – Fri"
    $content = $content -replace "8:00am\s+[^\w\s]+\s+5:00pm", "8:00am – 5:00pm"
    $content = $content -replace "Sat\s+[^\w\s]+\s+Sun", "Sat – Sun"
    
    # Also specifically target the garbled variations seen in diagnostics 
    $content = $content -replace "Mon â€“ Fri", "Mon – Fri"
    $content = $content -replace "8:00am â€“ 5:00pm", "8:00am – 5:00pm"
    $content = $content -replace "Sat â€“ Sun", "Sat – Sun"

    if ($content -ne $originalContent) {
        Write-Host "Fixing $($file.Name)"
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    }
}
