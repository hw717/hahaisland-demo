import {haversine} from './mobile-core.mjs';
export function validPhotoLocation(location){
 return !!(location&&location.confirmed===true&&['gps','map'].includes(location.source)&&Number.isFinite(location.lat)&&Number.isFinite(location.lng)&&Math.abs(location.lat)<=90&&Math.abs(location.lng)<=180);
}
function nearbyName(lng,lat,points){
 let closest=null,distance=80;
 for(const point of points){const d=haversine([lng,lat],[point.lng,point.lat]);if(d<distance){closest=point;distance=d;}}
 return closest?`${closest.name}附近`:`${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
export function locationFromGPS(position,points=[],now=Date.now()){
 const {latitude:lat,longitude:lng,accuracy}=position?.coords||{};
 const location={lat,lng,accuracy:Number.isFinite(accuracy)?accuracy:null,source:'gps',confirmed:true,timestamp:Number.isFinite(position.timestamp)?position.timestamp:now,name:''};
 if(!validPhotoLocation(location))throw Error('未能获取有效位置，请在地图上选点');
 location.name=nearbyName(lng,lat,points);return location;
}
export function locationFromMap(latlng,points=[],now=Date.now()){
 const location={lat:latlng.lat,lng:latlng.lng,accuracy:null,source:'map',confirmed:true,timestamp:now,name:''};
 if(!validPhotoLocation(location))throw Error('请选择有效的地图位置');
 location.name=nearbyName(location.lng,location.lat,points);return location;
}
export function createPhotoPoint({id,photoId,location,note='',walkId=null,date=new Date().toISOString()}){
 if(typeof id!=='string'||!id)throw Error('记录编号无效');
 if(!photoId||typeof photoId!=='string')throw Error('先拍一张照片');
 if(!validPhotoLocation(location))throw Error('先确认照片的位置');
 return {id,kind:'point',title:location.name||'我的照片点位',date,note,photoId,location:{...location},walkId,route:null,elapsedSeconds:null,visit:'not_claimed',fit:null,mood:null};
}
export function personalPhotoPoints(records){return Array.isArray(records)?records.filter(r=>r&&typeof r.id==='string'&&typeof r.photoId==='string'&&r.photoId&&validPhotoLocation(r.location)):[];}
