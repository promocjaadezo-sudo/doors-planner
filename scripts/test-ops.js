// Test harness for operationsCatalog transformations
function normalizeOpNumbers(arr){
  return arr.slice().sort((a,b)=>(a.no||0)-(b.no||0)).map((o,i)=>({...o,no:i+1}));
}
function moveOpById(arr,id,dir){
  const a = arr.slice().sort((x,y)=>(x.no||0)-(y.no||0));
  const idx = a.findIndex(x=>x.id===id); if(idx===-1) return a;
  const newIdx = dir==='up'?Math.max(0,idx-1):Math.min(a.length-1,idx+1);
  if(newIdx===idx) return a;
  const [it] = a.splice(idx,1);
  a.splice(newIdx,0,it);
  return a.map((o,i)=>({...o,no:i+1}));
}
function insertOrUpdate(arr,payload){
  const ops = arr.slice();
  const existingIndex = ops.findIndex(x=>x.id===payload.id);
  if(existingIndex !== -1){
    ops[existingIndex] = Object.assign({}, ops[existingIndex], payload);
    // reposition
    const filtered = ops.filter(x=>x.id!==payload.id);
    const insertAt = Math.max(0, Math.min(payload.no-1, filtered.length));
    filtered.splice(insertAt,0,payload);
    return filtered.map((o,i)=>({...o,no:i+1}));
  } else {
    const insertAt = Math.max(0, Math.min(payload.no-1, ops.length));
    ops.splice(insertAt,0,payload);
    return ops.map((o,i)=>({...o,no:i+1}));
  }
}

function dump(msg,arr){
  console.log(msg);
  arr.forEach(o=>console.log(`${o.no}. ${o.id} - ${o.name}`));
  console.log('---');
}

let ops = [
  {id:'a',no:1,name:'Cut'},
  {id:'b',no:2,name:'Drill'},
  {id:'c',no:3,name:'Paint'},
];

dump('initial',ops);
ops = moveOpById(ops,'b','up'); dump('move b up',ops);
ops = moveOpById(ops,'a','down'); dump('move a down',ops);
ops = insertOrUpdate(ops,{id:'x',no:2,name:'Glue'}); dump('insert x at 2',ops);
ops = insertOrUpdate(ops,{id:'b',no:4,name:'Drill updated'}); dump('update b set no=4',ops);
ops = insertOrUpdate(ops,{id:'y',no:100,name:'Last'}); dump('insert y at end',ops);

// normalize
ops = normalizeOpNumbers(ops); dump('normalized',ops);
