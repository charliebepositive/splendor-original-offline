/* AI reads only the current player's hand, public market and public bonuses. */
(function(){
const E=typeof module!=='undefined'?require('./engine.js'):window.Splendor;
function choose(s){const p=s.players[s.current],b=E.bonuses(p),visible=Object.values(s.market).flat().concat(p.reserved);
 const deficit=(id,tokens=p.tokens)=>{const d=E.due(p,id);return Math.max(0,E.COLORS.reduce((n,c)=>n+Math.max(0,d[c]-tokens[c]),0)-tokens.gold);};
 const nobleValue=c=>s.nobles.reduce((v,id)=>{const req=E.nobles[id].cost;if(!req[c]||b[c]>=req[c])return v;const gap=Object.entries(req).reduce((n,[k,x])=>n+Math.max(0,x-b[k]),0);return v+2/(gap+1);},0);
 const value=id=>{const c=E.cards[id];return 2+c.points*2.6+Math.max(0,1.5-b[c.bonus]*.25)+nobleValue(c.bonus)*2;};
 if(s.phase==='noble')return{type:'noble',id:E.eligible(s)[0]};
 if(s.phase==='return'){
  const tokens={...p.tokens},ret=E.zero();const target=visible.slice().sort((a,b)=>(deficit(a)+1)/value(a)-(deficit(b)+1)/value(b))[0];const d=target?E.due(p,target):E.zero();
  while(E.sum(tokens)>10){const c=E.ALL.filter(c=>tokens[c]).sort((a,b)=>((tokens[b]-(d[b]||0))-(b==='gold'?100:0))-((tokens[a]-(d[a]||0))-(a==='gold'?100:0)))[0];tokens[c]--;ret[c]++;}return{type:'return',tokens:ret};
 }
 let best={type:'pass'},bestValue=-Infinity;
 for(const a of E.actions(s)){let v=-100;
  if(a.type==='buy'){const c=E.cards[a.id];v=value(a.id)+4-E.sum(E.payment(p,a.id))*.25;const next=E.apply(s,a);if(E.score(next.players[s.current])>=15)v+=100;}
  if(a.type==='take'){const t={...p.tokens};for(const c of E.COLORS)t[c]+=a.tokens[c]||0;v=Math.max(...visible.map(id=>(deficit(id)-deficit(id,t))*value(id)/(deficit(id)+1)))+E.sum(a.tokens)*.18-Math.max(0,E.sum(t)-10)*.7;}
  if(a.type==='reserve'&&a.id){v=value(a.id)/(deficit(a.id)+2)+(s.bank.gold?1:0)-p.reserved.length*.8;if(deficit(a.id)>5)v-=3;}
  if(v>bestValue){bestValue=v;best=a;}
 }return best;
}
if(typeof module!=='undefined')module.exports={choose};else window.SplendorAI={choose};
})();
