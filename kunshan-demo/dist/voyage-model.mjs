export const SEA_SIZE={width:1152,height:648};
export const SEA_ZOOM={min:1.3,max:10/3,normal:1.3};
export const SEA_WATER_BOUNDS=[{x:365,y:275},{x:475,y:235},{x:700,y:235},{x:795,y:325},{x:790,y:460},{x:705,y:525},{x:450,y:500},{x:350,y:390}];
export const SEA_START={x:582,y:475};
export const SEA_PORTS=[
 {id:'art',name:'文艺岛',x:75,y:28,width:330,height:265,dock:{x:405,y:312},land:{x:210,y:215,rx:172,ry:70}},
 {id:'healing',name:'疗愈岛',x:435,y:12,width:350,height:235,dock:{x:610,y:278},land:{x:610,y:150,rx:165,ry:79}},
 {id:'graffiti',name:'涂鸦岛',x:750,y:100,width:402,height:260,dock:{x:738,y:315},land:{x:955,y:260,rx:175,ry:90}},
 {id:'nature',name:'自然岛',x:30,y:322,width:410,height:310,dock:{x:435,y:428},land:{x:225,y:520,rx:185,ry:95}},
 {id:'lighthouse',name:'灯塔岛',x:775,y:355,width:350,height:278,dock:{x:742,y:448},land:{x:950,y:520,rx:172,ry:76}}
];
export const pointDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function fitDesignViewport(width,height){const scale=Math.min(1,width/402,height/874);return {scale,width:402*scale,height:874*scale,bottom:(height-874*scale)/2};}
export function clampSeaZoom(value){return Number.isFinite(value)?Math.max(SEA_ZOOM.min,Math.min(SEA_ZOOM.max,value)):SEA_ZOOM.normal;}
export function followShipCamera(ship,zoom,anchor={x:201,y:510}){
 const z=clampSeaZoom(zoom),width=62.7*z,height=84.6*z;
 const screen={x:Math.max(24+width/2,Math.min(378-width/2,anchor.x)),y:Math.max(210+height,Math.min(735,anchor.y))};
 return {x:ship.x,y:ship.y,zoom:z,anchor:screen,translateX:screen.x-ship.x*z,translateY:screen.y-ship.y*z};
}
function insideCentralWater(p,padding){
 let inside=false;
 for(let i=0,j=SEA_WATER_BOUNDS.length-1;i<SEA_WATER_BOUNDS.length;j=i++){
  const a=SEA_WATER_BOUNDS[i],b=SEA_WATER_BOUNDS[j];
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<padding)return false;
 }
 return inside;
}
export function waterAt(p,padding=12){return Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&insideCentralWater(p,padding)&&SEA_PORTS.every(port=>{const l=port.land;return ((p.x-l.x)/(l.rx+padding))**2+((p.y-l.y)/(l.ry+padding))**2>1;});}
export function newVoyage(saved){const position=waterAt(saved)?{x:saved.x,y:saved.y}:{...SEA_START};return {...position,vx:0,vy:0};}
export function advanceShip(ship,input,seconds){
 const dt=Math.max(0,Math.min(.05,seconds)),m=Math.hypot(input.x,input.y),speed=112,blend=1-Math.exp(-dt*9);
 const desired=m>1?{x:input.x/m,y:input.y/m}:input;
 const vx=ship.vx+(desired.x*speed-ship.vx)*blend,vy=ship.vy+(desired.y*speed-ship.vy)*blend;
 let next={x:ship.x+vx*dt,y:ship.y+vy*dt,vx,vy};
 if(!waterAt(next)){
  next={...ship,vx,vy};
  if(waterAt({x:ship.x+vx*dt,y:ship.y}))next.x+=vx*dt;else next.vx=0;
  if(waterAt({x:next.x,y:ship.y+vy*dt}))next.y+=vy*dt;else next.vy=0;
 }
 return next;
}
export function nearbyPort(position,radius=48){return SEA_PORTS.filter(p=>pointDistance(position,p.dock)<=radius).sort((a,b)=>pointDistance(position,a.dock)-pointDistance(position,b.dock))[0]||null;}
export function clearWaterLine(a,b){const steps=Math.ceil(pointDistance(a,b)/10);for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!waterAt({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}))return false;}return true;}
export function waterRoute(start,goal){
 if(!waterAt(start)||!waterAt(goal))return [];
 if(clearWaterLine(start,goal))return [{...goal}];
 const unit=24,cols=Math.floor((SEA_SIZE.width-48)/unit)+1,rows=Math.floor((SEA_SIZE.height-48)/unit)+1;
 const xy=id=>({x:24+id%cols*unit,y:24+Math.floor(id/cols)*unit});
 const closest=point=>{let best=-1,dist=Infinity;for(let id=0;id<cols*rows;id++){const q=xy(id),d=pointDistance(q,point);if(d<dist&&waterAt(q)&&clearWaterLine(point,q)){best=id;dist=d;}}return best;};
 const source=closest(start),target=closest(goal);if(source<0||target<0)return [];
 const cost=new Map([[source,0]]),prev=new Map(),open=new Set([source]);
 while(open.size){let current=-1,score=Infinity;for(const id of open){const f=cost.get(id)+pointDistance(xy(id),xy(target));if(f<score){score=f;current=id;}}if(current===target)break;open.delete(current);const x=current%cols,y=Math.floor(current/cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;const next=ny*cols+nx;if(!waterAt(xy(next))||!clearWaterLine(xy(current),xy(next)))continue;const c=cost.get(current)+Math.hypot(dx,dy)*unit;if(c<(cost.get(next)??Infinity)){cost.set(next,c);prev.set(next,current);open.add(next);}}}
 if(!cost.has(target))return [];
 const route=[{...goal}];let id=target;while(id!==source){route.push(xy(id));id=prev.get(id);if(id===undefined)return [];}route.push(xy(source));route.reverse();
 const simplified=[];let from=start,index=0;while(index<route.length){let end=index;while(end+1<route.length&&clearWaterLine(from,route[end+1]))end++;simplified.push(route[end]);from=route[end];index=end+1;}return simplified;
}
