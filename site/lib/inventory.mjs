export class InventoryError extends Error {constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new InventoryError(status,message);};
const keys=(value,allowed)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!allowed.includes(k)))fail(400,'입력 형식을 확인해 주세요.');};
const identifier=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(v);
function date(value){if(value===null)return null;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(400,'표시된 정확한 날짜를 입력하거나 미확인으로 비워 주세요.');return value;}
export function normalize(body){
 keys(body,['operationId','baseRevision','lot','confirmed','confirmation']);
 if(!identifier(body.operationId)||!Number.isSafeInteger(body.baseRevision)||body.baseRevision<0)fail(400,'변경 번호와 버전을 확인해 주세요.');
 const l=body.lot;keys(l,['id','name','quantity','unit','storage','sellBy','useBy']);
 if(!identifier(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>100||typeof l.unit!=='string'||!l.unit.trim()||l.unit.length>20||!Number.isFinite(l.quantity)||typeof l.quantity!=='number'||l.quantity<0||l.quantity>1000000||![null,'냉장','냉동','실온'].includes(l.storage))fail(400,'재료 이름·수량·단위·보관 위치를 확인해 주세요.');
 return {operationId:body.operationId,baseRevision:body.baseRevision,lot:{id:l.id,name:l.name.trim(),quantity:l.quantity,unit:l.unit.trim(),storage:l.storage,sellBy:date(l.sellBy),useBy:date(l.useBy)}};
}
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(n=>n.toString(16).padStart(2,'0')).join('');
export function inventory(db,owner){
 if(typeof owner!=='string'||!owner.trim()||owner.length>256)fail(401,'ChatGPT로 로그인해 주세요.');
 if(!db)fail(503,'저장소가 아직 연결되지 않았어요.');
 db=db.withSession?db.withSession('first-primary'):db;
 const first=(q,...v)=>db.prepare(q).bind(...v).first();
 const stored=async id=>{const r=await first('SELECT data, revision FROM chef_lots WHERE owner=? AND id=?',owner,id);return r?{...JSON.parse(r.data),revision:r.revision}:null;};
 const prepare=async body=>{const b=normalize(body);const payloadHash=await hash({owner,...b});return {b,payloadHash};};
 return {
 async read(id){if(!identifier(id))fail(400,'재료 번호를 확인해 주세요.');const item=await stored(id);if(!item)fail(404,'재료를 찾을 수 없어요.');return {item};},
 async list(cursor=''){if(typeof cursor!=='string'||(cursor&&!identifier(cursor)))fail(400,'잘못된 다음 페이지입니다.');const r=await db.prepare('SELECT id,data,revision FROM chef_lots WHERE owner=? AND id>? ORDER BY id LIMIT 101').bind(owner,cursor).all();return {items:r.results.slice(0,100).map(r=>({...JSON.parse(r.data),revision:r.revision})),nextCursor:r.results.length>100?r.results[99].id:null};},
 async history(cursor=0){if(!Number.isSafeInteger(cursor)||cursor<0)fail(400,'잘못된 이력 페이지입니다.');const r=await db.prepare('SELECT * FROM chef_events WHERE owner=? AND (?=0 OR seq<?) ORDER BY seq DESC LIMIT 51').bind(owner,cursor,cursor).all();return {items:r.results.slice(0,50).map(r=>({seq:r.seq,operationId:r.operation_id,lotId:r.lot_id,before:r.before_json?JSON.parse(r.before_json):null,after:JSON.parse(r.after_json),createdAt:r.created_at})),nextCursor:r.results.length>50?r.results[49].seq:null};},
 async preview(body){const {b,payloadHash}=await prepare(body);const before=await stored(b.lot.id);if((before?.revision||0)!==b.baseRevision)fail(409,'다른 대화에서 기록이 바뀌었어요. 최신 기록을 확인해 주세요.');return {before,after:{...b.lot,revision:b.baseRevision+1},confirmation:payloadHash};},
 async apply(body){const {b,payloadHash}=await prepare(body);if(body.confirmed!==true||body.confirmation!==payloadHash)fail(400,'변경 내용을 확인한 뒤 저장해 주세요.');
 const retry=async()=>{const r=await first('SELECT payload_hash,after_json,base_revision FROM chef_events WHERE owner=? AND operation_id=?',owner,b.operationId);if(!r)return null;if(r.payload_hash!==payloadHash)fail(409,'같은 변경 번호로 다른 내용을 저장할 수 없어요.');return {item:{...JSON.parse(r.after_json),revision:r.base_revision+1},replayed:true};};
 const old=await retry();if(old)return old;
 const before=await stored(b.lot.id);if((before?.revision||0)!==b.baseRevision)fail(409,'기록이 변경됐어요. 입력을 보존하고 최신 기록을 확인해 주세요.');
 try {await db.prepare('INSERT INTO chef_events(owner,operation_id,payload_hash,lot_id,base_revision,before_json,after_json,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(owner,b.operationId,payloadHash,b.lot.id,b.baseRevision,before?JSON.stringify(before):null,JSON.stringify(b.lot),new Date().toISOString()).run();}
 catch(e){const replay=await retry();if(replay)return replay;if(String(e).includes('CHEF_CONFLICT'))fail(409,'동시에 변경된 기록이 있어요. 다시 확인해 주세요.');throw e;}
 return {item:{...b.lot,revision:b.baseRevision+1},replayed:false};
 }
 };
}
