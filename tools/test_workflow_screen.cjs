const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').join(__dirname,'../AstroTemps_Full_Legacy_1.8.9.js'),'utf8');
function only(n){const a=s.indexOf('function '+n+'(');return s.slice(a,s.indexOf('\n}',a)+2);}
const a=s.indexOf('function TAP_fitShownWorkflowToScreen('),b=s.indexOf('function AstroTempsAutoProcessingDialog_init(',a);
const ctx={Math,isFinite};vm.createContext(ctx);vm.runInContext(['TAP_fitShownWorkflowToScreen'].map(only).join("\n"),ctx);
for(const [x0,y0,width,height] of [[1920,0,1920,1040],[-1920,0,1920,1040],[0,-1440,2560,1400]]){
 const d={width:660,height:600,availableScreenRect:{x0,y0,width,height},resize(w,h){this.width=w;this.height=h;},move(x,y){this.x=x;this.y=y;}};
 ctx.TAP_fitShownWorkflowToScreen(d);
 assert(d.x>=x0&&d.x+d.width<=x0+width);assert(d.y>=y0&&d.y+d.height<=y0+height);assert.equal(d.height,height-40);
}
console.log('PASS - shown dialog stays within secondary screens, including negative coordinates');
