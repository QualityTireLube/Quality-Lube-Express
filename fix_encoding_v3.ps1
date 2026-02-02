
$targetDir = "C:\Users\Stanj\QualitySites\QL_Test"
$files = Get-ChildItem -Path $targetDir -Recurse -Filter "*.html"
$enDash = [char]0x2013

foreach ($file in $files) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        
        # We need to escape the special chars in the regex or use a robust pattern.
        # "Mon" followed by whitespace, then "garbage", then whitespace, then "Fri".
        # The key is that the "garbage" does not contain letters or numbers.
        
        # Replace Mon ... Fri
        $content = $content -replace "Mon\s+(?:[^a-zA-Z0-9<>\n]+)\s+Fri", "Mon $enDash Fri"
        
        # Replace 8:00am ... 5:00pm
        $content = $content -replace "8:00am\s+(?:[^a-zA-Z0-9<>\n]+)\s+5:00pm", "8:00am $enDash 5:00pm"
        
        # Replace Sat ... Sun
        $content = $content -replace "Sat\s+(?:[^a-zA-Z0-9<>\n]+)\s+Sun", "Sat $enDash Sun" # Correcting the replace string
        
        # Handle the "Closed" case if it has garbage? "Sat - Sun | Closed"
        # The grep output showed: Sat â€“ Sun | Closed
        
        if ($content -ne $originalContent) {
            Write-Host "Fixing $($file.FullName)"
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_"
    }
}
