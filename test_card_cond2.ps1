$browser = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$url = "https://www.amazon.com.au/s?i=warehouse-deals&pct-off=50-90"
$html = & $browser --headless=new --dump-dom --disable-gpu $url | Out-String

$cardMatches = [regex]::Matches($html, '(?s)<div[^>]+data-asin="(?<asin>[A-Z0-9]{10})"[^>]*>(?<content>.*?)(?=<div[^>]+data-asin="[A-Z0-9]{10}"|\Z)')
Write-Host "Found $($cardMatches.Count) cards"

$found = 0
foreach ($c in $cardMatches) {
    $content = $c.Groups['content'].Value
    if ($content -match '(?i)(Used\s*-\s*(?:Like New|Very Good|Good|Acceptable))') {
        Write-Host "Card ASIN $($c.Groups['asin'].Value) Condition: $($Matches[1])"
        $found++
    }
}
Write-Host "Found condition on $found cards"

# Check if there are condition filters in the left sidebar
$condFilters = [regex]::Matches($html, '(?i)p_n_condition-type[^\"]*')
Write-Host "Found $($condFilters.Count) condition filter links in sidebar:"
$condFilters | ForEach-Object { $_.Value } | Select-Object -Unique -First 10
