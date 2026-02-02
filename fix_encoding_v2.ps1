
$targetDir = "C:\Users\Stanj\QualitySites\QL_Test"
$files = Get-ChildItem -Path $targetDir -Recurse -Filter "*.html"
$enDash = [char]0x2013

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $originalContent = $content
    
    # Regex to match "Mon <garbage> Fri"
    # Matches "Mon" followed by spaces, then one or more non-word/non-whitespace chars, then spaces, then "Fri"
    $content = $content -replace "Mon\s+[^\w\s]+\s+Fri", "Mon $enDash Fri"
    $content = $content -replace "8:00am\s+[^\w\s]+\s+5:00pm", "8:00am $enDash 5:00pm"
    $content = $content -replace "Sat\s+[^\w\s]+\s+Sun", "Sat $enDash Sun"

    if ($content -ne $originalContent) {
        Write-Host "Fixing $($file.FullName)"
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    }
}
