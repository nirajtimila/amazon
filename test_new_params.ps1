$res = Invoke-RestMethod -Uri "http://localhost:3000/api/search?storeType=warehouse&category=electronics&minDiscount=50&maxDiscount=90&domain=amazon.com.au&page=1&minPrice=20&maxPrice=300&negKeywords=case,cover,cable&condition=like-new"
Write-Host "Scraped URL: $($res.targetUrl)"
Write-Host "Products found: $($res.products.Count)"
if ($res.products.Count -gt 0) {
    Write-Host "First item title: $($res.products[0].title)"
    Write-Host "First item price: $($res.products[0].price)"
    Write-Host "First item condition: $($res.products[0].condition)"
}
