import {newLocalId} from './id.mjs';
// User-selected photos are stored only in this browser, separate from event metadata.
export async function preparePhoto(file){
  if(!file)return null;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片。');
  if(file.size>5*1024*1024)throw Error('照片需小于 5 MB，请换一张。');
  const bitmap=await createImageBitmap(file),scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return {name:file.name,dataUrl:canvas.toDataURL('image/jpeg',.8),width:canvas.width,height:canvas.height};
}
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('lantu.experience.v1',1);req.onupgradeneeded=()=>req.result.createObjectStore('photos',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function savePhoto(photo){
  const db=await openDB(),record={...photo,id:newLocalId()};
  return new Promise((resolve,reject)=>{const tx=db.transaction('photos','readwrite');tx.objectStore('photos').put(record);tx.oncomplete=()=>{db.close();resolve(record.id);};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};});
}
export async function readPhoto(id){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('photos').objectStore('photos').get(id);req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>{db.close();reject(req.error);};});}
