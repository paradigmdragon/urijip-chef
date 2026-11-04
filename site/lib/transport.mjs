import { inventory, InventoryError } from './inventory.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'oai-authenticated-user-id','X-Content-Type-Options':'nosniff'}});
const lotSchema={type:'object',additionalProperties:false,required:['id','name','quantity','unit','storage','sellBy','useBy'],properties:{id:{type:'string',pattern:'^[A-Za-z0-9_-]{8,100}$'},name:{type:'string',minLength:1,maxLength:100},quantity:{type:'number',minimum:0,maximum:1000000},unit:{type:'string',minLength:1,maxLength:20},storage:{enum:[null,'냉장','냉동','실온']},sellBy:{type:['string','null']},useBy:{type:['string','null']}}};
const writeProps={operationId:{type:'string',pattern:'^[A-Za-z0-9_-]{8,100}$'},baseRevision:{type:'integer',minimum:0},lot:lotSchema};
export const TOOLS=[
 {name:'inventory_list',description:'본인 냉장고 조회. 다른 사람의 기록에는 접근하지 않습니다.',inputSchema:{type:'object',additionalProperties:false,properties:{cursor:{type:'string'}}},annotations:{readOnlyHint:true}},
 {name:'inventory_history',description:'본인 재고 변경 이력 조회.',inputSchema:{type:'object',additionalProperties:false,properties:{cursor:{type:'integer',minimum:0}}},annotations:{readOnlyHint:true}},
 {name:'inventory_preview_write',description:'재료 추가·수량 정정을 미리 확인합니다. 저장하지 않습니다. 미확인 날짜는 null로 두세요.',inputSchema:{type:'object',additionalProperties:false,required:['operationId','baseRevision','lot'],properties:writeProps},annotations:{readOnlyHint:true}},
 {name:'inventory_apply_write',description:'미리보기의 전후 내용을 사용자에게 보여주고 명시적인 저장 승인을 받은 경우만 호출합니다. 동일 operationId·본문으로만 안전하게 재시도하고 오류 뒤 자동 재전송하지 마세요.',inputSchema:{type:'object',additionalProperties:false,required:['operationId','baseRevision','lot','confirmation','confirmed'],properties:{...writeProps,confirmation:{type:'string',pattern:'^[a-f0-9]{64}$'},confirmed:{const:true}}},annotations:{readOnlyHint:false,destructiveHint:true,idempotentHint:true}}
];
function args(value,allowed){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))throw new InventoryError(400,'지원하지 않는 입력입니다.');return value;}
export async function handleInventoryRequest(request,db){
 let rpcId=null;
 try{
  const url=new URL(request.url),mcp=url.pathname==='/mcp';
  const owner=request.headers.get('oai-authenticated-user-id');
  if(!owner)throw new InventoryError(401,'ChatGPT로 로그인해 주세요.');
  const service=inventory(db,owner);
  if(request.method==='GET'&&!mcp){if(url.pathname==='/api/inventory/item')return json(await service.read(url.searchParams.get('id')));if(url.pathname==='/api/inventory')return json(await service.list(url.searchParams.get('cursor')||''));if(url.pathname==='/api/inventory/history')return json(await service.history(Number(url.searchParams.get('cursor')||0)));throw new InventoryError(404,'찾을 수 없습니다.');}
  if(request.method!=='POST')throw new InventoryError(405,'지원하지 않는 요청입니다.');
  const origin=request.headers.get('origin');if((!mcp&&origin!==url.origin)||(mcp&&origin&&origin!==url.origin))throw new InventoryError(403,'이 화면에서 다시 요청해 주세요.');
  if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json')throw new InventoryError(415,'JSON 요청이 필요합니다.');
  const reader=request.body?.getReader();let raw='',size=0;const decoder=new TextDecoder();if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new InventoryError(413,'입력 내용이 너무 큽니다.');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
  let body;try{body=JSON.parse(raw);}catch{throw new InventoryError(400,'요청 내용을 확인해 주세요.');}
  if(!mcp){if(url.pathname==='/api/inventory/preview')return json(await service.preview(body));if(url.pathname==='/api/inventory/apply')return json(await service.apply(body));throw new InventoryError(404,'찾을 수 없습니다.');}
  if(!body||body.jsonrpc!=='2.0'||!(typeof body.id==='string'||Number.isFinite(body.id)))throw new InventoryError(400,'올바른 MCP 요청이 필요합니다.');rpcId=body.id;
  let result;
  if(body.method==='server/discover')result={supportedVersions:['2026-07-28'],capabilities:{tools:{}}};
  else if(body.method==='tools/list')result={tools:TOOLS};
  else if(body.method==='tools/call'){
   const name=body.params?.name,a=body.params?.arguments||{};let data;
   if(name==='inventory_list'){args(a,['cursor']);data=await service.list(a.cursor||'');}
   else if(name==='inventory_history'){args(a,['cursor']);data=await service.history(a.cursor||0);}
   else if(name==='inventory_preview_write'){args(a,Object.keys(writeProps));data=await service.preview(a);}
   else if(name==='inventory_apply_write')data=await service.apply(a);
   else return json({jsonrpc:'2.0',id:rpcId,error:{code:-32602,message:'알 수 없는 도구입니다.'}});
   result={content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data,isError:false};
  }else return json({jsonrpc:'2.0',id:rpcId,error:{code:-32601,message:'지원하지 않는 MCP 요청입니다.'}});
  return json({jsonrpc:'2.0',id:rpcId,result});
 }catch(e){const status=e instanceof InventoryError?e.status:503,message=e instanceof InventoryError?e.message:'저장소 응답을 확인하지 못했어요. 재전송 전에 최신 이력을 확인해 주세요.';return rpcId!==null?json({jsonrpc:'2.0',id:rpcId,result:{isError:true,content:[{type:'text',text:message}],structuredContent:{status,message}}}):json({error:message},status);}
}
