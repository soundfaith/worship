param(
  [Parameter(Mandatory = $true)][string]$Source,
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [Parameter(Mandatory = $true)][string]$ConfigPath
)

$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$existingPowerPoint = @(Get-Process POWERPNT -ErrorAction SilentlyContinue).Count -gt 0
$app = $null
$presentation = $null

function Round-Value($value) { [Math]::Round([double]$value, 4) }

function Find-TextShapes($shapes) {
  foreach ($shape in $shapes) {
    if ($shape.Type -eq 6) {
      Find-TextShapes $shape.GroupItems
    } elseif ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) {
      $shape
    }
  }
}

function Get-Box($shape, $width, $height) {
  $text = $shape.TextFrame.TextRange
  $font = $text.Characters(1, 1).Font
  $rgb = [int]$font.Color.RGB
  $color = '{0:X2}{1:X2}{2:X2}' -f ($rgb -band 255), (($rgb -shr 8) -band 255), (($rgb -shr 16) -band 255)
  @{
    x = Round-Value ($shape.Left / $width)
    y = Round-Value ($shape.Top / $height)
    w = Round-Value ($shape.Width / $width)
    h = Round-Value ($shape.Height / $height)
    size = Round-Value ($font.Size * 720 / $width)
    color = $color
    align = $(if ($text.ParagraphFormat.Alignment -eq 2) { 'center' } else { 'left' })
    font = $font.Name
  }
}

function Get-DefaultBox($kind, $color) {
  if ($kind -eq 'title') {
    return @{ x = 0.08; y = 0.12; w = 0.84; h = 0.18; size = 40; color = $color; align = 'center'; font = 'Inter' }
  }
  return @{ x = 0.08; y = 0.34; w = 0.84; h = 0.5; size = 28; color = $color; align = 'center'; font = 'Inter' }
}

try {
  $app = New-Object -ComObject PowerPoint.Application
  foreach ($openPresentation in $app.Presentations) {
    if ([string]::Equals($openPresentation.FullName, $Source, [StringComparison]::OrdinalIgnoreCase)) {
      throw "Close '$Source' in PowerPoint before importing it, so the open presentation is not modified."
    }
  }
  $presentation = $app.Presentations.Open($Source, -1, 0, 0)
  $width = $presentation.PageSetup.SlideWidth
  $height = $presentation.PageSetup.SlideHeight
  if ([Math]::Abs($width / $height - 16.0 / 9.0) -gt 0.01) {
    throw 'Only 16:9 presentations are supported. Change the slide size in PowerPoint before importing.'
  }
  if ($presentation.Slides.Count -lt 1) { throw 'The presentation has no slides.' }
  $layouts = @{}
  $warnings = [System.Collections.Generic.List[string]]::new()
  $warnings.Add('Editable slide text is removed, including grouped text. Master/layout text and text embedded in images cannot be removed and may remain visible.')
  foreach ($name in @('cover', 'song', 'content', 'image')) {
    $item = $config.layouts.$name
    if ($null -eq $item) { continue }
    $number = [int]$item.slide
    if ($number -lt 1 -or $number -gt $presentation.Slides.Count) {
      throw "Layout '$name' refers to slide $number, but the presentation has $($presentation.Slides.Count) slides."
    }
    $slide = $presentation.Slides.Item($number)
    $textShapes = @(Find-TextShapes $slide.Shapes)
    $title = $null
    $body = $null
    if ($item.titleShape) { $title = $textShapes | Where-Object { $_.Name -eq $item.titleShape } | Select-Object -First 1 }
    else { $title = $textShapes | Sort-Object { $_.TextFrame.TextRange.Characters(1, 1).Font.Size } -Descending | Select-Object -First 1 }
    if ($item.bodyShape) { $body = $textShapes | Where-Object { $_.Name -eq $item.bodyShape } | Select-Object -First 1 }
    else { $body = $textShapes | Where-Object { $null -eq $title -or $_.Id -ne $title.Id } | Sort-Object { $_.Width * $_.Height } -Descending | Select-Object -First 1 }
    if ($null -ne $title -and $null -ne $body -and $title.Id -eq $body.Id) { $body = $null }
    if ($null -eq $title -or $null -eq $body) {
      $warnings.Add("Layout '$name' on slide $number has fewer than two matching text boxes; using default text geometry where needed.")
    }
    $titleBox = if ($null -ne $title) { Get-Box $title $width $height } else { $null }
    $bodyBox = if ($null -ne $body) { Get-Box $body $width $height } else { $null }
    $fallbackColor = if ($null -ne $bodyBox) { $bodyBox.color } elseif ($null -ne $titleBox) { $titleBox.color } else { 'FFFFFF' }
    if ($null -eq $titleBox) { $titleBox = Get-DefaultBox 'title' $fallbackColor }
    if ($null -eq $bodyBox) { $bodyBox = Get-DefaultBox 'body' $fallbackColor }
    foreach ($pair in @(@($titleBox, $item.title), @($bodyBox, $item.body))) {
      if ($null -ne $pair[1]) {
        foreach ($property in $pair[1].PSObject.Properties) { $pair[0][$property.Name] = $property.Value }
      }
    }
    $layouts[$name] = @{ title = $titleBox; body = $bodyBox }
    if ($item.image) { $layouts[$name].image = $item.image }
  }
  for ($number = 1; $number -le $presentation.Slides.Count; $number++) {
    $slide = $presentation.Slides.Item($number).Duplicate().Item(1)
    try {
      foreach ($shape in @(Find-TextShapes $slide.Shapes)) { $shape.TextFrame.TextRange.Text = '' }
      $slide.Export((Join-Path $OutputDir "slide-$number.png"), 'PNG', 1920, 1080)
    } finally {
      $slide.Delete()
    }
  }
  @{ layouts = $layouts; warnings = @($warnings.ToArray()) } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath (Join-Path $OutputDir 'rendered.json') -Encoding UTF8
} finally {
  if ($null -ne $presentation) { $presentation.Close() }
  if ($null -ne $app) {
    if (-not $existingPowerPoint) { $app.Quit() }
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($app)
  }
}
