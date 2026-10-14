import fs from 'node:fs';
import path from 'node:path';
// 本次示例的模板规则：固定工作表 ID、坐标、明细范围。
// 此文件是实际使用的提取代码，仅增加输入/输出路径参数以便保存和复现。
// 结论 null 和工程名称差异说明对应原始示例，处理其他数据前需适配。
const dir = new URL('./', import.meta.url);
const input = process.argv[2] ? path.resolve(process.argv[2]) : new URL('01020301_workbook.json', dir);
const output = process.argv[3] ? path.resolve(process.argv[3]) : new URL('010203001_business.json', dir);
const book = JSON.parse(fs.readFileSync(input, 'utf8'));
const clean = v => typeof v === 'string' ? v.replace(/[\r\n]+/g, '').trim() : v;
function value(s,r,c,merged=false) {
  if(merged) { const m=s.mergeData.find(m=>r>=m.startRow&&r<=m.endRow&&c>=m.startColumn&&c<=m.endColumn); if(m){r=m.startRow;c=m.startColumn;} }
  const cell=s.cellData[r]?.[c];
  const v=clean(cell?.v ?? cell?.p?.body?.dataStream ?? null);
  return v===''?null:v;
}
const main=book.sheets.SheetData0;
const number=[18,22,23,24].map(c=>value(main,2,c)).join('').replace(/^编号[：:]/,'');
const result={
  '标题':value(main,1,1), '编号':number, '编号后缀':value(main,2,25),
  '完整编号':number+value(main,2,25),
  '基本信息':{
    '单位（子单位）工程名称':value(main,4,5),
    '分部（子分部）工程名称':value(main,4,15),
    '分项工程名称':value(main,4,23),
    '施工单位':value(main,5,5),'项目负责人':value(main,5,15),'检验批容量':value(main,5,23),
    '分包单位':value(main,6,5),'分包单位项目负责人':value(main,6,15),'检验批部位':value(main,6,23),
    '施工依据':value(main,7,5),'验收依据':value(main,7,15)
  },
  '主控项目':[], '一般项目':[],
  '施工单位检查结果':null,'监理单位验收结论':null,'建设单位验收结论':null,
  '检查记录':[],
  '提取说明':{
    '空值含义':'原表未填写，使用 null；不推断检查结果或验收结论。',
    '编号来源':'主表 S3、W3、X3、Y3 拼接，Z3 保存后缀；与两张检查记录表的编号核对一致。',
    '工程名称差异':'主表为 AAA建材，两张检查记录为 项目工程，分别保留原值。',
    '其他原文':[
      {'来源':'主表!AB8','内容':value(main,7,27),'说明':'位于主表主体外的规范文字，单独保留，未自动并入验收依据。'},
      {'来源':'检查记录-1!L31:N31','内容':[11,12,13].map(c=>value(book.sheets.SheetData1,30,c)),'说明':'位于明细末尾的数值，业务归属未确认，未作为实测值。'}
    ]
  }
};
for(let r=9;r<=19;r++) {
  const item={'序号':Number(value(main,r,2)),'验收项目':value(main,r,3),'设计要求及规范规定':value(main,r,11),
    '最小抽样数量':value(main,r,15),'实际抽样数量':value(main,r,17),
    '检查记录':value(main,r,18),'检查结果':value(main,r,25),'来源':`主表!C${r+1}:AA${r+1}`};
  result[r<=12?'主控项目':'一般项目'].push(item);
}
for(const [id,end] of [['SheetData1',29],['SheetData2',19]]){
  const s=book.sheets[id];
  if(value(s,5,18)!==result['完整编号'])throw new Error('编号不一致');
  const record={'工作表':s.name,'标题':value(s,1,1),'单位（子单位）工程名称':value(s,4,5),
    '检验批名称':value(s,5,5),'检验批编号':value(s,5,18),'检查明细':[]};
  for(let r=7;r<=end;r++){
    const names=[value(s,r,4,true),value(s,r,6,true)].filter(v=>v!==null);
    record['检查明细'].push({'依据条款':value(s,r,1,true),'验收项目': [...new Set(names)].join(' / '),
      '验收部位':value(s,r,11,true),'检查原始记录':value(s,r,15,true),'备注':value(s,r,25,true),
      '来源':`${s.name}!B${r+1}:AA${r+1}`});
  }
  if(id==='SheetData2')record['注释']=value(s,25,1);
  result['检查记录'].push(record);
}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({title:result['标题'],number,fullNumber:result['完整编号'],mainItems:result['主控项目'].length,generalItems:result['一般项目'].length,detailItems:result['检查记录'].map(r=>r['检查明细'].length)},null,2));
