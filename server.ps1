# Amazon Warehouse Deal Hunter - Local Backend Server
param(
    [int]$Port = 3000,
    [int]$InternalPort = 38472
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$publicDir = Join-Path $scriptDir "public"

# Locate Chrome or Edge
$browserPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $browserPath)) {
    $browserPath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
}

# Compile LAN Bridge if not already in session
if (-not ([System.Management.Automation.PSTypeName]'WarehouseLanBridge').Type) {
    $bridgeCode = @"
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

public class WarehouseLanBridge {
    private TcpListener listener;
    private int targetPort;
    private bool isRunning;

    public WarehouseLanBridge(int listenPort, int targetPort) {
        this.targetPort = targetPort;
        this.listener = new TcpListener(IPAddress.Any, listenPort);
    }

    public void Start() {
        this.isRunning = true;
        this.listener.Start();
        Task.Factory.StartNew(AcceptLoop);
    }

    public void Stop() {
        this.isRunning = false;
        try { this.listener.Stop(); } catch {}
    }

    private void AcceptLoop() {
        while (this.isRunning) {
            try {
                var client = this.listener.AcceptTcpClient();
                Task.Factory.StartNew(() => HandleClient(client));
            } catch {
                if (!this.isRunning) break;
            }
        }
    }

    private void HandleClient(TcpClient client) {
        using (client)
        using (var target = new TcpClient()) {
            try {
                target.Connect("127.0.0.1", this.targetPort);
                using (var clientStream = client.GetStream())
                using (var targetStream = target.GetStream()) {
                    byte[] buffer = new byte[8192];
                    int bytesRead = clientStream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) return;

                    string req = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    var lines = req.Split(new string[] { "\r\n" }, StringSplitOptions.None);
                    for (int i = 0; i < lines.Length; i++) {
                        if (lines[i].StartsWith("Host:", StringComparison.OrdinalIgnoreCase)) {
                            lines[i] = "Host: localhost:" + this.targetPort;
                        }
                    }
                    string rewrittenReq = string.Join("\r\n", lines);
                    byte[] rewrittenBytes = Encoding.UTF8.GetBytes(rewrittenReq);

                    targetStream.Write(rewrittenBytes, 0, rewrittenBytes.Length);

                    var t1 = clientStream.CopyToAsync(targetStream);
                    var t2 = targetStream.CopyToAsync(clientStream);
                    Task.WaitAny(t1, t2);
                }
            } catch {}
        }
    }
}
"@
    Add-Type -TypeDefinition $bridgeCode -Language CSharp
}

# Start Internal HttpListener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$InternalPort/")
$listener.Prefixes.Add("http://localhost:$InternalPort/")
$listener.Start()

# Start LAN Bridge on 0.0.0.0:Port
$bridge = New-Object WarehouseLanBridge($Port, $InternalPort)
$bridge.Start()

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|Tailscale' } | Select-Object -First 1).IPAddress

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Amazon Warehouse Hunter Backend Server is Running!" -ForegroundColor Green
Write-Host " Local Access: http://localhost:$Port" -ForegroundColor Yellow
Write-Host " LAN Access:   http://${lanIp}:$Port" -ForegroundColor Green
Write-Host " Using browser: $browserPath" -ForegroundColor DarkGray
Write-Host " Press Ctrl+C in this console to stop the server." -ForegroundColor DarkGray
Write-Host "========================================================" -ForegroundColor Cyan

function Scrape-Amazon-Store {
    param(
        [string]$StoreType = "warehouse",
        [string]$Keyword,
        [string]$Category = "all",
        [int]$MinDiscount = 60,
        [int]$MaxDiscount = 90,
        [string]$Domain = "amazon.com.au",
        [string]$Sort = "",
        [int]$Page = 1,
        [int]$MaxPages = 1,
        [bool]$AvailableOnly = $true,
        [double]$MinPrice = 0,
        [double]$MaxPrice = 0,
        [string]$NegativeKeywords = "",
        [string]$Condition = "all"
    )

    if (-not $StoreType) { $StoreType = "warehouse" }
    if (-not $Category) { $Category = "all" }
    if (-not $Domain) { $Domain = "amazon.com.au" }
    if ($MinDiscount -le 0) { $MinDiscount = 60 }
    if ($MaxDiscount -le 0) { $MaxDiscount = 90 }
    if ($Page -le 0) { $Page = 1 }
    if ($MaxPages -le 0) { $MaxPages = 1 }

    $allProducts = @()
    $seenAsins = [System.Collections.Generic.HashSet[string]]::new()
    $lastTargetUrl = ""

    # Parse negative keywords
    $negTerms = @()
    if ($NegativeKeywords -and $NegativeKeywords.Trim() -ne "") {
        $rawNegs = $NegativeKeywords -split '[,;]'
        foreach ($rn in $rawNegs) {
            $cleaned = $rn.Trim().TrimStart('-').Trim()
            if ($cleaned) { $negTerms += $cleaned.ToLower() }
        }
    }

    # Condition terms for query
    $condKw = ""
    if ($Condition -and $Condition -ne "all") {
        if ($Condition -eq "like-new") { $condKw = "like new" }
        elseif ($Condition -eq "very-good") { $condKw = "very good" }
        elseif ($Condition -eq "good") { $condKw = "good" }
        elseif ($Condition -eq "acceptable") { $condKw = "acceptable" }
    }

    # Category keyword mapping for Warehouse Deals
    $catKwMap = @{
        "electronics"    = "electronics"
        "pc"             = "computers"
        "kitchen"        = "home kitchen"
        "hi"             = "tools"
        "videogames"     = "video games"
        "sporting"       = "sports"
        "toys-and-games" = "toys"
        "beauty"         = "beauty"
        "stripbooks"     = "books"
        "automotive"     = "automotive"
        "pets"           = "pet supplies"
        "office-products"= "office products"
    }

    for ($currentPage = $Page; $currentPage -lt ($Page + $MaxPages); $currentPage++) {
        $kwList = @()
        if ($StoreType -eq "normal") {
            $iParam = if ($Category -eq "all" -or $Category -eq "warehouse-deals") { "aps" } else { $Category }
            $targetUrl = "https://www.$Domain/s?i=$iParam&pct-off=$MinDiscount-$MaxDiscount"
            if ($Keyword -and $Keyword.Trim() -ne "") { $kwList += $Keyword.Trim() }
        } else {
            # Warehouse Deals
            $targetUrl = "https://www.$Domain/s?i=warehouse-deals&pct-off=$MinDiscount-$MaxDiscount"
            $catKw = if ($catKwMap.ContainsKey($Category)) { $catKwMap[$Category] } else { "" }
            if ($catKw) { $kwList += $catKw }
            if ($Keyword -and $Keyword.Trim() -ne "") { $kwList += $Keyword.Trim() }
        }

        if ($condKw) { $kwList += $condKw }
        foreach ($nt in $negTerms) { $kwList += "-$nt" }

        if ($kwList.Count -gt 0) {
            $encodedK = [System.Uri]::EscapeDataString(($kwList -join " "))
            $targetUrl += "&k=$encodedK"
        }

        if ($MinPrice -gt 0) {
            $targetUrl += "&low-price=$MinPrice"
        }
        if ($MaxPrice -gt 0) {
            $targetUrl += "&high-price=$MaxPrice"
        }

        if ($Sort -and $Sort.Trim() -ne "") {
            $targetUrl += "&s=$Sort"
        }
        if ($AvailableOnly) {
            $availCode = "2661600011"
            if ($Domain -match "amazon\.com\.au") {
                $availCode = "4910513051"
            } elseif ($Domain -match "amazon\.co\.jp") {
                $availCode = "2227307051"
            } elseif ($Domain -match "amazon\.co\.uk") {
                $availCode = "419162031"
            } elseif ($Domain -match "amazon\.ca") {
                $availCode = "12035748011"
            } elseif ($Domain -match "amazon\.de") {
                $availCode = "419116031"
            }
            $targetUrl += "&rh=p_n_availability%3A$availCode"
        }
        if ($currentPage -gt 1) {
            $targetUrl += "&page=$currentPage"
        }

        $lastTargetUrl = $targetUrl
        Write-Host "[SCRAPE] ($StoreType / Page $currentPage) Fetching: $targetUrl" -ForegroundColor Cyan

        $tempHtml = [System.IO.Path]::GetTempFileName() + ".html"

        try {
            $argList = @(
                "--headless=new",
                "--dump-dom",
                "--disable-gpu",
                "--disable-extensions",
                $targetUrl
            )

            $proc = Start-Process -FilePath $browserPath -ArgumentList $argList -NoNewWindow -Wait -PassThru -RedirectStandardOutput $tempHtml

            if (-not (Test-Path $tempHtml) -or (Get-Item $tempHtml).Length -lt 1000) {
                Write-Warning "Failed to capture HTML for page $currentPage"
                break
            }

            $html = Get-Content -Raw -Encoding UTF8 $tempHtml
            $matches = [regex]::Matches($html, '(?s)<div[^>]+data-asin="(?<asin>[A-Z0-9]{10})"[^>]*>(?<content>.*?)(?=<div[^>]+data-asin="[A-Z0-9]{10}"|\Z)')
            
            $pageAdded = 0
            foreach ($m in $matches) {
                $asin = $m.Groups['asin'].Value
                if ($seenAsins.Contains($asin)) { continue }
                $seenAsins.Add($asin) | Out-Null

                $content = $m.Groups['content'].Value

                # Title
                $title = ""
                if ($content -match '(?s)<h2[^>]*>(?:<span[^>]*>)?(?<t>.*?)(?:</span>)?</h2>') {
                    $raw = $Matches['t'] -replace '<[^>]+>', ''
                    $title = [System.Net.WebUtility]::HtmlDecode($raw).Trim()
                }
                if (-not $title -or $title.Length -lt 3) { continue }

                # Negative keywords filter on title
                if ($negTerms.Count -gt 0) {
                    $titleLower = $title.ToLower()
                    $skipNeg = $false
                    foreach ($nt in $negTerms) {
                        if ($titleLower -match "(?i)\b$([regex]::Escape($nt))\b") {
                            $skipNeg = $true
                            break
                        }
                    }
                    if ($skipNeg) { continue }
                }

                # Image
                $img = ""
                if ($content -match 'class="s-image"[^>]*src="(?<img>https://[^"]+)"') {
                    $img = $Matches['img']
                }

                # Price
                $price = ""
                if ($content -match 'class="a-price"[^>]*>.*?<span class="a-offscreen">(?<p>[^<]+)</span>') {
                    $price = $Matches['p'].Trim()
                } elseif ($content -match 'More Buying Choices</span>\s*<br>\s*<span[^>]*>(?<p>[^<]+)</span>') {
                    $price = $Matches['p'].Trim()
                } elseif ($content -match '<span class="a-offscreen">(?<p>[^<]+)</span>') {
                    $price = $Matches['p'].Trim()
                } elseif ($content -match '<span class="a-color-base">(?<p>\$[\d,.]+)</span>') {
                    $price = $Matches['p'].Trim()
                }

                # If AvailableOnly is true, skip items that don't have an available deal price
                if ($AvailableOnly) {
                    if (-not $price -or $price -eq "See Options" -or $price -match "Currently unavailable") {
                        continue
                    }
                }

                # List Price
                $listPrice = ""
                if ($content -match 'class="a-price a-text-price"[^>]*>.*?<span class="a-offscreen">(?<lp>[^<]+)</span>') {
                    $listPrice = $Matches['lp'].Trim()
                }

                # Rating
                $rating = ""
                if ($content -match '(?<r>\d+(?:\.\d+)?)\s*out of 5 stars') {
                    $rating = $Matches['r']
                }

                # Reviews
                $reviews = ""
                if ($content -match 'aria-label="(?<revs>[\d,]+)\s*ratings"') {
                    $reviews = $Matches['revs']
                }

                # Discount calculation & price bounds
                $priceNum = $price -replace '[^\d.]', ''
                $listNum = $listPrice -replace '[^\d.]', ''
                $discountPct = ""
                if ($priceNum) {
                    try {
                        $pVal = [double]$priceNum
                        if ($MinPrice -gt 0 -and $pVal -lt $MinPrice) { continue }
                        if ($MaxPrice -gt 0 -and $pVal -gt $MaxPrice) { continue }

                        if ($listNum) {
                            $lVal = [double]$listNum
                            if ($lVal -gt $pVal -and $lVal -gt 0) {
                                $discountPct = "$([Math]::Round((($lVal - $pVal) / $lVal) * 100))% OFF"
                            }
                        }
                    } catch {}
                }
                if (-not $discountPct) {
                    $discountPct = "$MinDiscount-$MaxDiscount% OFF"
                }

                # Condition detection
                $detectedCond = ""
                if ($content -match '(?i)(Used\s*-\s*(?:Like New|Very Good|Good|Acceptable))') {
                    $detectedCond = $Matches[1]
                } elseif ($StoreType -eq "normal") {
                    $detectedCond = "Brand New"
                } else {
                    $detectedCond = if ($condKw) { "Used - $($condKw.Substring(0,1).ToUpper() + $condKw.Substring(1))" } else { "Warehouse Deal" }
                }

                $allProducts += @{
                    asin = $asin
                    title = $title
                    price = if ($price) { $price } else { "See Options" }
                    listPrice = $listPrice
                    discount = $discountPct
                    rating = $rating
                    reviews = $reviews
                    image = $img
                    url = "https://www.$Domain/dp/$asin"
                    store = $StoreType
                    page = $currentPage
                    condition = $detectedCond
                }
                $pageAdded++
            }
            Write-Host "[SCRAPE] ($StoreType) Page $currentPage yielded $pageAdded items." -ForegroundColor Green

            $lastHasNext = ($html -match 'class="[^"]*s-pagination-next[^"]*"' -and $html -notmatch 's-pagination-next\s+s-pagination-disabled')
            if ($html -match 'class="s-pagination-item s-pagination-disabled"[^>]*>(\d+)<') {
                $lastTotalPages = [int]$Matches[1]
            } elseif ($lastHasNext) {
                $lastTotalPages = [Math]::Max(2, $currentPage + 1)
            } else {
                $lastTotalPages = $currentPage
            }

            if ($html -match '(?i)<span>(?<info>\d+-\d+\s+of\s+[^<]+results)</span>' -or
                $html -match '(?i)<span>(?<info>[^<]*results\s+for[^<]*)</span>' -or
                $html -match '(?i)<span>(?<info>\d+\s+results)</span>') {
                $lastResultInfo = $Matches['info'] -replace '<[^>]+>', ' '
            }

            if ($matches.Count -eq 0 -or -not $lastHasNext) { break }
        }
        catch {
            Write-Error "Error during scrape on page ${currentPage}: $_"
            break
        }
        finally {
            if (Test-Path $tempHtml) { Remove-Item $tempHtml -Force -ErrorAction SilentlyContinue }
        }
    }

    return @{
        products = $allProducts
        targetUrl = $lastTargetUrl
        hasNextPage = [bool]$lastHasNext
        totalPages = [int]$lastTotalPages
        resultInfo = $lastResultInfo
    }
}

function Scrape-Amazon {
    param(
        [string]$StoreType = "warehouse",
        [string]$Keyword,
        [string]$Category = "all",
        [int]$MinDiscount = 60,
        [int]$MaxDiscount = 90,
        [string]$Domain = "amazon.com.au",
        [string]$Sort = "",
        [int]$Page = 1,
        [int]$MaxPages = 1,
        [bool]$AvailableOnly = $true,
        [double]$MinPrice = 0,
        [double]$MaxPrice = 0,
        [string]$NegativeKeywords = "",
        [string]$Condition = "all"
    )

    if ($StoreType -eq "both") {
        Write-Host "[SEARCH] Querying BOTH Normal Amazon and Amazon Warehouse..." -ForegroundColor Yellow
        $pagesPerStore = [Math]::Max(1, [Math]::Ceiling($MaxPages / 2))
        $wRes = Scrape-Amazon-Store -StoreType "warehouse" -Keyword $Keyword -Category $Category -MinDiscount $MinDiscount -MaxDiscount $MaxDiscount -Domain $Domain -Sort $Sort -Page $Page -MaxPages $pagesPerStore -AvailableOnly $AvailableOnly -MinPrice $MinPrice -MaxPrice $MaxPrice -NegativeKeywords $NegativeKeywords -Condition $Condition
        $nRes = Scrape-Amazon-Store -StoreType "normal" -Keyword $Keyword -Category $Category -MinDiscount $MinDiscount -MaxDiscount $MaxDiscount -Domain $Domain -Sort $Sort -Page $Page -MaxPages $pagesPerStore -AvailableOnly $AvailableOnly -MinPrice $MinPrice -MaxPrice $MaxPrice -NegativeKeywords $NegativeKeywords -Condition $Condition

        # Interleave products
        $combined = @()
        $maxLen = [Math]::Max($wRes.products.Count, $nRes.products.Count)
        for ($i = 0; $i -lt $maxLen; $i++) {
            if ($i -lt $wRes.products.Count) { $combined += $wRes.products[$i] }
            if ($i -lt $nRes.products.Count) { $combined += $nRes.products[$i] }
        }
        $hasNext = ($wRes.hasNextPage -or $nRes.hasNextPage)
        $totalPages = [Math]::Max($wRes.totalPages, $nRes.totalPages)
        $wInfo = if ($wRes.resultInfo) { $wRes.resultInfo } else { "$($wRes.products.Count) deals" }
        $nInfo = if ($nRes.resultInfo) { $nRes.resultInfo } else { "$($nRes.products.Count) deals" }
        $resultInfo = "Warehouse: $wInfo | Normal: $nInfo"

        return @{
            products = $combined
            targetUrl = $wRes.targetUrl
            currentPage = $Page
            nextPages = ($Page + $MaxPages)
            hasNextPage = [bool]$hasNext
            totalPages = [int]$totalPages
            resultInfo = $resultInfo
            warehouseCount = $wRes.products.Count
            normalCount = $nRes.products.Count
        }
    } else {
        $res = Scrape-Amazon-Store -StoreType $StoreType -Keyword $Keyword -Category $Category -MinDiscount $MinDiscount -MaxDiscount $MaxDiscount -Domain $Domain -Sort $Sort -Page $Page -MaxPages $MaxPages -AvailableOnly $AvailableOnly -MinPrice $MinPrice -MaxPrice $MaxPrice -NegativeKeywords $NegativeKeywords -Condition $Condition
        return @{
            products = $res.products
            targetUrl = $res.targetUrl
            currentPage = $Page
            nextPages = ($Page + $MaxPages)
            hasNextPage = [bool]$res.hasNextPage
            totalPages = [int]$res.totalPages
            resultInfo = $res.resultInfo
        }
    }
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $path = $request.Url.AbsolutePath
            $rawQuery = $request.Url.Query

            # CORS
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

            if ($request.HttpMethod -eq "OPTIONS") {
                $response.StatusCode = 200
                $response.Close()
                continue
            }

            Write-Host "[$($request.HttpMethod)] $path" -ForegroundColor DarkGray

            # API: Health
            if ($path -eq "/api/health") {
                $json = '{"status":"ok","version":"1.0"}'
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            # API: Open Browser
            if ($path -eq "/api/open") {
                $url = $request.QueryString["url"]
                if ($url) {
                    Write-Host "[OPEN] Launching browser: $url" -ForegroundColor Yellow
                    Start-Process -FilePath $browserPath -ArgumentList $url
                    $json = '{"success":true}'
                } else {
                    $json = '{"error":"Missing URL"}'
                }
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            # API: Search
            if ($path -eq "/api/search") {
                $storeType = $request.QueryString["storeType"]
                if (-not $storeType) { $storeType = "warehouse" }
                $keyword = $request.QueryString["keyword"]
                $category = $request.QueryString["category"]
                $minDiscount = 60
                if ($request.QueryString["minDiscount"]) { [int]::TryParse($request.QueryString["minDiscount"], [ref]$minDiscount) | Out-Null }
                $maxDiscount = 90
                if ($request.QueryString["maxDiscount"]) { [int]::TryParse($request.QueryString["maxDiscount"], [ref]$maxDiscount) | Out-Null }
                $domain = $request.QueryString["domain"]
                if (-not $domain) { $domain = "amazon.com.au" }
                $sort = $request.QueryString["sort"]
                $page = 1
                if ($request.QueryString["page"]) { [int]::TryParse($request.QueryString["page"], [ref]$page) | Out-Null }
                $maxPages = 1
                if ($request.QueryString["maxPages"]) { [int]::TryParse($request.QueryString["maxPages"], [ref]$maxPages) | Out-Null }
                $availableOnly = $true
                if ($request.QueryString["availableOnly"] -eq "false") { $availableOnly = $false }

                $minPrice = 0
                if ($request.QueryString["minPrice"]) { [double]::TryParse($request.QueryString["minPrice"], [ref]$minPrice) | Out-Null }
                $maxPrice = 0
                if ($request.QueryString["maxPrice"]) { [double]::TryParse($request.QueryString["maxPrice"], [ref]$maxPrice) | Out-Null }
                $negKeywords = $request.QueryString["negKeywords"]
                $condition = $request.QueryString["condition"]
                if (-not $condition) { $condition = "all" }

                $result = Scrape-Amazon -StoreType $storeType -Keyword $keyword -Category $category -MinDiscount $minDiscount -MaxDiscount $maxDiscount -Domain $domain -Sort $sort -Page $page -MaxPages $maxPages -AvailableOnly $availableOnly -MinPrice $minPrice -MaxPrice $maxPrice -NegativeKeywords $negKeywords -Condition $condition
                $json = $result | ConvertTo-Json -Depth 5 -Compress
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $response.ContentType = "application/json; charset=utf-8"
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
                continue
            }

            # Static Files
            $filePath = ""
            if ($path -eq "/" -or $path -eq "/index.html") {
                $filePath = Join-Path $publicDir "index.html"
                $contentType = "text/html; charset=utf-8"
            } elseif ($path -eq "/app.css") {
                $filePath = Join-Path $publicDir "app.css"
                $contentType = "text/css; charset=utf-8"
            } elseif ($path -eq "/app.js") {
                $filePath = Join-Path $publicDir "app.js"
                $contentType = "application/javascript; charset=utf-8"
            }

            if ($filePath -and (Test-Path $filePath)) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentType = $contentType
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
                $response.Close()
            } else {
                $response.StatusCode = 404
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                $response.OutputStream.Write($notFound, 0, $notFound.Length)
                $response.Close()
            }
        }
        catch {
            Write-Warning "Request failed or client aborted connection: $_"
            try {
                if ($response) {
                    $response.Close()
                }
            } catch {}
        }
    }
}
finally {
    if ($bridge) {
        $bridge.Stop()
    }
    if ($listener.IsListening) {
        $listener.Stop()
        $listener.Close()
    }
    Write-Host "Server stopped." -ForegroundColor Red
}
