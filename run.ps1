param(
    [Parameter(Mandatory=$true)][string]$InputFile,
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [Parameter(Mandatory=$true)][string]$JavaHome,
    [Parameter(Mandatory=$true)][string]$MavenRepository,
    [string]$NodeExecutable = 'node'
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$inputPath = (Resolve-Path -LiteralPath $InputFile).Path
$java = Join-Path $JavaHome 'bin/java.exe'
$javac = Join-Path $JavaHome 'bin/javac.exe'
if (!(Test-Path -LiteralPath $java) -or !(Test-Path -LiteralPath $javac)) { throw 'JavaHome 必须包含 java.exe 和 javac.exe。' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$outputPath = (Resolve-Path -LiteralPath $OutputDirectory).Path
$buildPath = Join-Path $outputPath '.build'
$classesPath = Join-Path $buildPath 'classes'
New-Item -ItemType Directory -Force -Path $classesPath | Out-Null
$jars = Get-ChildItem -LiteralPath $MavenRepository -Recurse -Filter '*.jar' | Where-Object {
    $_.Name -notmatch '-sources|-javadoc' -and (
        $_.FullName -match '\\(poi|xmlbeans|commons-collections4|commons-compress|commons-math3|curvesapi|SparseBitSet|lombok|jackson-core|jackson-databind|jackson-annotations|log4j-api|spring-[^\\]+)\\' -or
        $_.Name -match '^(hutool-all-5\.8\.35|commons-io-2\.16\.1|commons-codec-1\.17\.2|slf4j-api-2\.0\.17)\.jar$'
    )
}
if (!$jars) { throw '本地 Maven 仓库中没有找到所需依赖。' }
$classpath = $jars.FullName -join ';'
$argsList = [Collections.Generic.List[string]]::new()
$argsList.Add('-encoding UTF-8')
$argsList.Add('-cp "' + $classpath.Replace('\','/') + '"')
$argsList.Add('-processor lombok.launch.AnnotationProcessorHider$AnnotationProcessor')
$argsList.Add('-d "' + $classesPath.Replace('\','/') + '"')
Get-ChildItem -LiteralPath (Join-Path $projectRoot 'earchives-modules/earchives-data/src/main/java/cn/earchives/data/excel') -Recurse -Filter '*.java' | ForEach-Object {
    $argsList.Add('"' + $_.FullName.Replace('\','/') + '"')
}
$argsList.Add('"' + (Join-Path $projectRoot 'earchives-common/earchives-common-core/src/main/java/com/earchives/common/core/utils/SpringUtils.java').Replace('\','/') + '"')
$argsList.Add('"' + (Join-Path $PSScriptRoot 'ExtractExcel.java').Replace('\','/') + '"')
$argsFile = Join-Path $buildPath 'compile.args'
[IO.File]::WriteAllLines($argsFile, $argsList, [Text.UTF8Encoding]::new($false))
& $javac '-J-Dfile.encoding=UTF-8' "@$argsFile"
if ($LASTEXITCODE -ne 0) { throw 'Java 编译失败。' }
$workbook = Join-Path $outputPath 'workbook.json'
$verification = Join-Path $outputPath 'verification.json'
$business = Join-Path $outputPath 'business.json'
& $java '-Dfile.encoding=UTF-8' -cp "$classesPath;$classpath" ExtractExcel $inputPath $workbook $verification
if ($LASTEXITCODE -ne 0) { throw 'Excel 读取失败。' }
& $NodeExecutable (Join-Path $PSScriptRoot 'extract-business.mjs') $workbook $business
if ($LASTEXITCODE -ne 0) { throw '业务字段提取失败。' }
Write-Output "已生成：$business"
