// Only a loopback built preview; these headers are test principals, not real login.
import assert from 'node:assert/strict';
const base=process.env.CHEF_LOCAL_URL||'http://127.0.0.1:8789';
const url=new URL(base);if(!['127.0.0.1','localhost'].includes(url.hostname)||url.protocol!=='http:')throw new Error('Loopback test target required');
const owner='local-acceptance-fixture',id='local-test-lot';
async function call(path,body,who=owner){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{...(who?{'oai-authenticated-user-id':who}:{}),...(body?{'Content-Type':'application/json','Origin':base}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
async function rpc(name,args){const r=await call('/mcp',{jsonrpc:'2.0',id:'fixture',method:'tools/call',params:{name,arguments:args}});assert.equal(r.status,200);assert.equal(r.data.result.isError,false);return r.data.result.structuredContent;}
assert.equal((await call('/api/inventory',undefined,null)).status,401);
assert.equal((await call('/api/inventory',undefined,'other-fixture')).data.items.length,0);
if(process.argv.includes('--read-only')){assert.equal((await call('/api/inventory/item?id='+id)).data.item.quantity,2);console.log('PASS: restarted local Worker retained the same owner inventory.');process.exit(0);}
const old=await call('/api/inventory/item?id='+id);const body={operationId:crypto.randomUUID(),baseRevision:old.status===404?0:old.data.item.revision,lot:{id,name:'로컬 연결 시험용 · 실제 식재료 아님',quantity:4,unit:'개',storage:null,sellBy:null,useBy:null}};
const p=await call('/api/inventory/preview',body);assert.equal(p.status,200);const a=await call('/api/inventory/apply',{...body,confirmed:true,confirmation:p.data.confirmation});assert.equal(a.status,200);
const record=(await rpc('inventory_list',{})).items.find(x=>x.id===id);assert.equal(record.quantity,4);
const edit={...body,operationId:crypto.randomUUID(),baseRevision:record.revision,lot:{...body.lot,quantity:2}};const preview=await rpc('inventory_preview_write',edit);await rpc('inventory_apply_write',{...edit,confirmed:true,confirmation:preview.confirmation});
assert.equal((await call('/api/inventory/item?id='+id)).data.item.quantity,2);assert.equal((await call('/api/inventory/item?id='+id,undefined,'other-fixture')).status,404);console.log('PASS: built Worker HTTP create → MCP read/update → HTTP readback, anonymous denial and owner isolation.');
