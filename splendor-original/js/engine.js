/* Pure, serializable classic Splendor rules. Inspired by the reference project's
 * separation of engine, AI and UI; no Pokémon or networking rules are loaded. */
(function(){
'use strict';
const D=typeof module!=='undefined'?require('./data.js'):window.SplendorData;
const COLORS=['white','blue','green','red','black'], ALL=[...COLORS,'gold'];
const cards=Object.fromEntries(D.cards.map(c=>[c.id,c]));
const nobles=Object.fromEntries(D.nobles.map(c=>[c.id,c]));
const zero=()=>Object.fromEntries(ALL.map(c=>[c,0]));
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
const clone=o=>JSON.parse(JSON.stringify(o));
const assert=(x,m)=>{if(!x)throw new Error(m);};
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function create(players,seed=Date.now()){
 assert(players.length>=2&&players.length<=4,'需要 2–4 位玩家');
 const random=rng(seed),n=players.length,bank=zero();COLORS.forEach(c=>bank[c]=n===2?4:n===3?5:7);bank.gold=5;
 const decks={},market={};for(let l=1;l<=3;l++){decks[l]=shuffle(D.cards.filter(c=>c.level===l).map(c=>c.id),random);market[l]=decks[l].splice(0,4);}
 return {version:1,seed,players:players.map((p,i)=>({name:String(p.name||`玩家 ${i+1}`).slice(0,24),ai:!!p.ai,tokens:zero(),owned:[],reserved:[],nobles:[]})),bank,decks,market,nobles:shuffle(D.nobles.map(n=>n.id),random).slice(0,n+1),current:0,turn:1,phase:'action',finalRound:false,winners:[],log:[]};
}
function bonuses(p){const b=zero();p.owned.forEach(id=>b[cards[id].bonus]++);return b;}
function score(p){return p.owned.reduce((a,id)=>a+cards[id].points,0)+p.nobles.length*3;}
function due(p,id){const b=bonuses(p);return Object.fromEntries(COLORS.map(c=>[c,Math.max(0,(cards[id].cost[c]||0)-b[c])]));}
function payment(p,id){const d=due(p,id),pay=zero();for(const c of COLORS){pay[c]=Math.min(p.tokens[c],d[c]);pay.gold+=d[c]-pay[c];}return pay.gold<=p.tokens.gold?pay:null;}
function eligible(s){const b=bonuses(s.players[s.current]);return s.nobles.filter(id=>Object.entries(nobles[id].cost).every(([c,n])=>b[c]>=n));}
function finish(s){const p=s.players[s.current];if(score(p)>=15)s.finalRound=true;if(s.current===s.players.length-1&&s.finalRound){s.phase='ended';let best=Math.max(...s.players.map(score));let tied=s.players.map((p,i)=>i).filter(i=>score(s.players[i])===best);const fewest=Math.min(...tied.map(i=>s.players[i].owned.length));s.winners=tied.filter(i=>s.players[i].owned.length===fewest);return;}s.current=(s.current+1)%s.players.length;s.turn++;s.phase='action';}
function after(s){if(sum(s.players[s.current].tokens)>10){s.phase='return';return;}const choices=eligible(s);if(choices.length){s.phase='noble';if(choices.length===1)claim(s,choices[0]);}else finish(s);}
function claim(s,id){assert(eligible(s).includes(id),'尚未达到这位贵族的条件');s.nobles.splice(s.nobles.indexOf(id),1);s.players[s.current].nobles.push(id);s.log.push(`${s.players[s.current].name} 获得贵族来访（+3 分）`);finish(s);}
function locate(s,id){for(let l=1;l<=3;l++){const index=s.market[l].indexOf(id);if(index!==-1)return {level:l,index};}return null;}
function removeMarket(s,loc){const a=s.market[loc.level];const id=a[loc.index];if(s.decks[loc.level].length)a[loc.index]=s.decks[loc.level].pop();else a.splice(loc.index,1);return id;}
function checkTokens(o){assert(o&&typeof o==='object'&&!Array.isArray(o),'筹码数据错误');assert(Object.keys(o).every(c=>ALL.includes(c))&&Object.values(o).every(n=>Number.isInteger(n)&&n>=0),'筹码数量无效');}
function apply(state,a){
 assert(state.phase!=='ended','对局已结束');const s=clone(state),p=s.players[s.current];
 if(s.phase==='return'){assert(a.type==='return','请先归还多余筹码');checkTokens(a.tokens);assert(sum(a.tokens)===sum(p.tokens)-10,'请恰好归还多出的筹码');for(const c of ALL){let n=a.tokens[c]||0;assert(n<=p.tokens[c],'持有筹码不足');p.tokens[c]-=n;s.bank[c]+=n;}after(s);return s;}
 if(s.phase==='noble'){assert(a.type==='noble','请选择一位贵族');claim(s,a.id);return s;}
 assert(s.phase==='action','回合状态错误');
 if(a.type==='take'){
  checkTokens(a.tokens);const keys=Object.keys(a.tokens).filter(c=>a.tokens[c]>0);assert(!keys.includes('gold'),'黄金只能通过保留卡牌获得');
  const required=Math.min(3,COLORS.filter(c=>s.bank[c]>0).length);
  const different=keys.length>0&&keys.length===required&&keys.every(c=>a.tokens[c]===1);
  const same=keys.length===1&&a.tokens[keys[0]]===2&&s.bank[keys[0]]>=4;
  assert(different||same,`请选择 ${required} 种不同宝石，或库存至少 4 时拿 2 枚同色宝石`);
  for(const c of keys){assert(s.bank[c]>=a.tokens[c],'供应区筹码不足');s.bank[c]-=a.tokens[c];p.tokens[c]+=a.tokens[c];}
  s.log.push(`${p.name} 拿取 ${sum(a.tokens)} 枚宝石`);
 }else if(a.type==='reserve'){
  assert(p.reserved.length<3,'最多保留 3 张卡');let id;
  if(a.level){assert([1,2,3].includes(a.level)&&s.decks[a.level].length,'牌堆已空');id=s.decks[a.level].pop();}
  else{const loc=locate(s,a.id);assert(loc,'这张卡不在市场');id=removeMarket(s,loc);}
  p.reserved.push(id);if(s.bank.gold){s.bank.gold--;p.tokens.gold++;}s.log.push(`${p.name} 保留一张${a.level?'暗':'市场'}牌`);
 }else if(a.type==='buy'){
  const loc=locate(s,a.id),hand=p.reserved.indexOf(a.id);assert(loc||hand!==-1,'只能购买市场或自己保留的卡');
  const pay=a.payment||payment(p,a.id);assert(pay,'宝石不足');checkTokens(pay);const d=due(p,a.id);
  let gold=0;for(const c of COLORS){const n=pay[c]||0;assert(n<=p.tokens[c]&&n<=d[c],'支付宝石数量错误');gold+=d[c]-n;}assert((pay.gold||0)===gold&&gold<=p.tokens.gold,'黄金数量错误');
  for(const c of ALL){let n=pay[c]||0;p.tokens[c]-=n;s.bank[c]+=n;}if(loc)removeMarket(s,loc);else p.reserved.splice(hand,1);p.owned.push(a.id);s.log.push(`${p.name} 购买 ${a.id}（+${cards[a.id].points} 分）`);
 }else if(a.type==='pass'){assert(actions(s).length===0,'仍有合法行动，不能跳过');s.log.push(`${p.name} 无合法行动，跳过`);}
 else throw new Error('未知行动');
 s.log=s.log.slice(-60);after(s);return s;
}
function actions(s){if(s.phase==='noble')return eligible(s).map(id=>({type:'noble',id}));if(s.phase!=='action')return[];const p=s.players[s.current],a=[];const avail=COLORS.filter(c=>s.bank[c]);
 for(let mask=1;mask<1<<avail.length;mask++){const cs=avail.filter((_,i)=>mask&(1<<i));if(cs.length===Math.min(3,avail.length))a.push({type:'take',tokens:Object.fromEntries(cs.map(c=>[c,1]))});}
 for(const c of COLORS)if(s.bank[c]>=4)a.push({type:'take',tokens:{[c]:2}});
 for(const id of [...Object.values(s.market).flat(),...p.reserved])if(payment(p,id))a.push({type:'buy',id});
 if(p.reserved.length<3){for(const id of Object.values(s.market).flat())a.push({type:'reserve',id});for(let level=1;level<=3;level++)if(s.decks[level].length)a.push({type:'reserve',level});}return a;
}
function validate(s){
 assert(s&&s.version===1&&s.players?.length>=2&&s.players.length<=4,'存档版本或人数错误');
 assert(Number.isInteger(s.current)&&s.current>=0&&s.current<s.players.length&&Number.isInteger(s.turn)&&s.turn>0,'存档回合无效');
 assert(['action','return','noble','ended'].includes(s.phase)&&Array.isArray(s.log),'存档阶段无效');
 assert(typeof s.finalRound==='boolean'&&Array.isArray(s.winners)&&s.winners.every(i=>Number.isInteger(i)&&i>=0&&i<s.players.length),'存档胜负数据无效');
 assert(s.phase!=='ended'||s.winners.length>0,'结束存档缺少胜者');
 const ids=[...Object.values(s.market).flat(),...Object.values(s.decks).flat(),...s.players.flatMap(p=>[...p.owned,...p.reserved])];assert(ids.length===90&&new Set(ids).size===90&&ids.every(id=>cards[id]),'存档卡牌不完整');
 for(let l=1;l<=3;l++)assert(s.market[l].length<=4&&[...s.market[l],...s.decks[l]].every(id=>cards[id].level===l),'存档牌堆无效');
 checkTokens(s.bank);for(const [i,p] of s.players.entries()){checkTokens(p.tokens);assert(ALL.every(c=>Number.isInteger(p.tokens[c]))&&p.reserved.length<=3&&typeof p.name==='string'&&typeof p.ai==='boolean','存档玩家无效');assert(sum(p.tokens)<=10||(s.phase==='return'&&i===s.current&&sum(p.tokens)<=13),'存档筹码上限错误');}
 assert(s.phase!=='return'||sum(s.players[s.current].tokens)>10,'存档归还阶段错误');
 assert(s.phase!=='noble'||eligible(s).length>1,'存档贵族选择错误');
 const ns=[...s.nobles,...s.players.flatMap(p=>p.nobles)];assert(ns.length===s.players.length+1&&new Set(ns).size===ns.length&&ns.every(id=>nobles[id]),'存档贵族无效');
 for(const c of ALL)assert(s.bank[c]+s.players.reduce((n,p)=>n+p.tokens[c],0)===(c==='gold'?5:s.players.length===2?4:s.players.length===3?5:7),'筹码守恒错误');
 return true;
}
const api={COLORS,ALL,cards,nobles,zero,sum,clone,rng,create,bonuses,score,due,payment,eligible,apply,actions,validate};if(typeof module!=='undefined')module.exports=api;else window.Splendor=api;
})();
