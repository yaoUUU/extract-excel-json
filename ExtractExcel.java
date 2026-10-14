import cn.earchives.data.excel.buz.reader.ExcelReader;
import cn.earchives.data.excel.model.book.WorkBookData;
import cn.earchives.data.excel.model.sheet.SheetData;
import cn.earchives.data.excel.model.cell.CellContent;
import cn.hutool.json.JSONUtil;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import java.nio.file.*;
import java.util.*;

public class ExtractExcel {
  public static void main(String[] args) throws Exception {
    WorkBookData data = ExcelReader.readMultSheet(args[0]);
    data.setName(Path.of(args[0]).getFileName().toString());
    List<Map<String,Object>> checks = new ArrayList<>();
    try (var in = Files.newInputStream(Path.of(args[0])); var wb = new XSSFWorkbook(in)) {
      for (int i=0;i<wb.getNumberOfSheets();i++) {
        Sheet src=wb.getSheetAt(i); SheetData dst=data.getSheets().get("SheetData"+i);
        int filled=0, formulas=0; List<String> mismatches=new ArrayList<>();
        for(Row row:src) for(Cell cell:row) {
          if(cell.getCellType()==CellType.BLANK) continue;
          CellContent out=dst.getCellData().getOrDefault(cell.getRowIndex(),Map.of()).get(cell.getColumnIndex());
          if(cell.getCellType()==CellType.FORMULA) { formulas++; continue; }
          String expected=cell.toString(); if(expected.isEmpty()) continue; filled++;
          String actual=out==null?"":out.getV()!=null?out.getV().toString():out.getP()!=null&&out.getP().getBody()!=null?out.getP().getBody().getDataStream():"";
          if(!norm(expected).equals(norm(actual))) mismatches.add(cell.getAddress()+": "+expected+" => "+actual);
        }
        Map<String,Object> check=new LinkedHashMap<>();
        check.put("sheet",src.getSheetName());check.put("sourceLastRow",src.getLastRowNum()+1);
        check.put("jsonRowCount",dst.getRowCount());check.put("jsonColumnCount",dst.getColumnCount());
        check.put("nonEmptyCells",filled);check.put("formulaCells",formulas);
        check.put("sourceMergedRegions",src.getNumMergedRegions());check.put("jsonMergedRegions",dst.getMergeData()==null?0:dst.getMergeData().length);
        check.put("contentDifferences",mismatches);checks.add(check);
      }
    }
    Files.writeString(Path.of(args[1]),JSONUtil.toJsonPrettyStr(data));
    Files.writeString(Path.of(args[2]),JSONUtil.toJsonPrettyStr(checks));
    System.out.println(JSONUtil.toJsonPrettyStr(checks));
  }
  static String norm(String s){return s.replace("\r\n","\n").replace('\r','\n').strip();}
}
