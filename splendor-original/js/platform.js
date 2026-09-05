/* Platform boundary: the same game runs in a browser or an offline native shell. */
(()=>{'use strict';
const android=typeof window.AndroidHost!=='undefined';
const ios=!!window.webkit?.messageHandlers?.SplendorHost;
const native=android||ios,key='splendor-classic-offline-v1';
const pending=new Map();let sequence=0;
if(native){
 document.documentElement.classList.add('android-app');
 if(ios)document.documentElement.classList.add('ios-app');
 window.SplendorNativeResponse=data=>{const request=pending.get(data.id);if(!request)return;pending.delete(data.id);if(data.error)request.reject(new Error(data.error));else request.resolve(data.result);};
 if(android)window.AndroidHost.onmessage=event=>window.SplendorNativeResponse(JSON.parse(event.data));
}
function request(method,payload=''){return new Promise((resolve,reject)=>{const id=String(++sequence),message=JSON.stringify({id,method,payload});pending.set(id,{resolve,reject});try{if(android)window.AndroidHost.postMessage(message);else window.webkit.messageHandlers.SplendorHost.postMessage(message);}catch(e){pending.delete(id);reject(e);}});}
window.SplendorPlatform={
 native,platform:android?'android':ios?'ios':'web',
 async load(){return native?request('load'):localStorage.getItem(key);},
 async save(text){if(native)return request('save',text);localStorage.setItem(key,text);return true;},
 async export(text,name){
  if(native)return request('export',text);
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;
 },
 async import(){
  if(native)return request('import');
  return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.oncancel=()=>resolve(null);input.onchange=async()=>{try{const f=input.files[0];if(!f)return resolve(null);if(f.size>1000000)throw new Error('存档文件过大');resolve(await f.text());}catch(e){reject(e);}};input.click();});
 }
};
})();
