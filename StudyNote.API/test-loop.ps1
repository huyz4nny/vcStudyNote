 = @{ username = "testuser"; password = "password123" } | ConvertTo-Json
 = Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method Post -Body  -ContentType "application/json"
 = $response.token
Write-Output "Got Token: $token"

 = @{
    "Authorization" = "Bearer $token"
}

for ($i = 0; $i -lt 5; $i++) {
    try {
        $resGet = Invoke-RestMethod -Uri http://localhost:5000/api/subjects -Method Get -Headers $headers
        Write-Output "GET Status: OK"
    } catch {
        Write-Output "GET Error: " + $_.Exception.Response.StatusCode
    }

     = @{
        name = "Test subject $i"
        code = "SUBJ"
        credits = 3
        semester = "S1"
        isActive = $true
    } | ConvertTo-Json

    try {
        $resPost = Invoke-RestMethod -Uri http://localhost:5000/api/subjects -Method Post -Headers $headers -Body $bodyPost -ContentType "application/json"
        Write-Output "POST Status: OK"
    } catch {
        Write-Output "POST Error: " + $_.Exception.Response.StatusCode
    }
    Start-Sleep -Seconds 1
}
