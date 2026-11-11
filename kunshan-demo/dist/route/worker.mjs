import {buildGraph,recommend} from './core.mjs';
import {rankPlaces} from './places.mjs';
let graph,places=[];
self.onmessage=({data})=>{
  try{
    if(data.type==='init'){graph=buildGraph(data.graph);places=data.places??[];self.postMessage({type:'ready'});return;}
    if(data.type==='places')self.postMessage({type:'places-result',id:data.id,revision:data.revision,places:rankPlaces(graph,places,data.params)});
    if(data.type==='recommend')self.postMessage({type:'result',id:data.id,routes:recommend(graph,data.params)});
  }catch(e){self.postMessage({type:'error',requestType:data.type,id:data.id,message:e.message});}
};
