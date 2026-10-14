# Excel 转业务 JSON：本次示例代码

本目录保存了“模板分项工程模板安装检验批质量验收记录”的实际提取程序。
业务提取脚本在原代码基础上仅增加了输入、输出路径参数，提取规则不变。

## 两阶段流程

1. `ExtractExcel.java` 调用项目中的 `ExcelReader.readMultSheet()`，生成 `WorkBookData → SheetData → CellContent` 布局 JSON，同时生成内容核对报告。
2. `extract-business.mjs` 使用 Node.js 读取布局 JSON，按这张表的坐标和合并区域生成中文业务字段 JSON，不调用大模型，不需要 npm 安装。

`SheetData.java`、`CellContent.java` 是模型类，实际读取逻辑在项目的 `ExcelReader.java` 中。

## 直接复现业务 JSON

安装 Node.js 后，在项目根目录执行（输入 JSON 路径替换为实际文件）：

```powershell
node script/excel-json/extract-business.mjs "D:/data/01020301_workbook.json" "D:/data/010203001_business.json"
```

输出目录须预先存在。程序会覆盖指定的输出文件，输入文件保持不变。
也可以把已生成的 `01020301_workbook.json` 放在脚本旁边，直接执行 `node script/excel-json/extract-business.mjs`。

## 从原始 Excel 开始

`run.ps1` 使用 JDK 17、Node.js 和本地 Maven 仓库编译项目已有 Excel 代码，执行两阶段转换。
它不启动 Spring Boot，也不连接数据库或下载依赖。缺少依赖时会报错，需先通过正常项目构建准备依赖。

```powershell
./script/excel-json/run.ps1 `
  -InputFile "C:/Users/23223/Desktop/01020301_模板分项工程模板安装检验批质量验收记录).xlsx" `
  -OutputDirectory "D:/data/excel-json-result" `
  -JavaHome "D:/CodeSoft/Java/jdk17" `
  -MavenRepository "D:/CodeSoft/apache-maven-3.9.16/repository"
```

生成 `workbook.json`（布局数据）、`verification.json`（结构读取核对）和 `business.json`（业务数据）。
编译缓存写入输出目录的 `.build` 子目录。

## 规则与局限

- 主表标题取 B2；编号拼接 S3、W3、X3、Y3，后缀取 Z3。
- 工作表 ID、基本信息坐标、检查项目行范围均针对本示例固定。
- 检查明细通过合并区域找到所属条款和上级项目；它不具备任意版式的自动语义识别能力。
- 原示例的三项验收结论为空，因此代码中固定为 null；工程名称差异说明也是针对原示例写的。对另一份已填写表格复用前，必须改成实际区域读取和动态比较，否则会漏掉内容或保留过时说明。
- AB8 的额外规范文字、检查记录-1 的 L31:N31 数字被单独保留，未推断它们的业务含义。
- 通用 Java 读取器会规范部分签章标点、额外预留空行列，并不保证所有 Excel 特性的无损转换。
- Java 核对程序统计公式但不验证公式结果；原文件没有公式。核对合并区域数量不等于验证全部业务映射正确。
- 这是一份可复现本次结果的模板示例代码，尚未实现其他模板适配、结构变化校验或生产级异常处理。

## 验证基准

本次原文件共 3 个工作表、179 个非空单元格、291 个合并区域；业务结果包含 4 项主控项目、7 项一般项目、36 条检查明细，完整编号为 `010203001（1）`。
