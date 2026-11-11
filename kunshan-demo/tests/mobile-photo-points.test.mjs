import test from 'node:test';
import assert from 'node:assert/strict';
import {validPhotoLocation,locationFromGPS,locationFromMap,createPhotoPoint,personalPhotoPoints} from '../dist/mobile-photo-points.mjs';
const known=[{name:'大礼堂',lat:40.00244,lng:116.31827}];
test('photo points require a confirmed GPS or explicit map location',()=>{
 assert.equal(validPhotoLocation(null),false);assert.equal(validPhotoLocation({lat:40,lng:116,source:'browse',confirmed:true}),false);assert.equal(validPhotoLocation({lat:40,lng:116,source:'gps',confirmed:false}),false);assert.equal(validPhotoLocation({lat:NaN,lng:116,source:'gps',confirmed:true}),false);assert.equal(validPhotoLocation({lat:91,lng:116,source:'map',confirmed:true}),false);
 assert.throws(()=>createPhotoPoint({id:'1',photoId:'photo',location:null}));assert.throws(()=>createPhotoPoint({id:'1',photoId:null,location:locationFromMap({lat:40,lng:116})}));
});
test('GPS coordinates and accuracy are retained without snapping to a sample landmark',()=>{
 const location=locationFromGPS({coords:{latitude:40.0024512,longitude:116.3182891,accuracy:7},timestamp:123},known);
 assert.equal(location.lat,40.0024512);assert.equal(location.lng,116.3182891);assert.equal(location.accuracy,7);assert.equal(location.timestamp,123);assert.equal(location.source,'gps');assert.equal(location.name,'大礼堂附近');
});
test('map confirmation is distinguished from GPS and supports non-road photo positions',()=>{
 const location=locationFromMap({lat:40.0029,lng:116.3189},known,456);assert.equal(location.source,'map');assert.equal(location.timestamp,456);assert.equal(location.lat,40.0029);assert.equal(location.lng,116.3189);assert.equal(location.accuracy,null);assert.equal(location.confirmed,true);
});
test('a mid-walk photo links to the walk without ending it or granting a task visit',()=>{
 const walk={id:'active',startedAt:1,route:{id:'route-1'}};const location=locationFromMap({lat:40.002,lng:116.318});
 const record=createPhotoPoint({id:'record',photoId:'actual-photo',location,note:'树荫',walkId:walk.id});
 assert.equal(record.kind,'point');assert.equal(record.walkId,'active');assert.equal(record.visit,'not_claimed');assert.equal(record.photoId,'actual-photo');assert.equal(walk.startedAt,1);assert.equal(walk.route.id,'route-1');location.lat=0;assert.equal(record.location.lat,40.002);
});
test('only saved photos with confirmed geographic metadata become map markers',()=>{
 const valid=createPhotoPoint({id:'1',photoId:'img',location:locationFromMap({lat:40,lng:116})});
 assert.deepEqual(personalPhotoPoints([valid,{...valid,id:'2',location:null},{...valid,id:'3',photoId:null},{...valid,id:'4',location:{lat:40,lng:116}}]),[valid]);
});
