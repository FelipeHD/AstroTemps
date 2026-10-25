const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').join(__dirname,'../AstroTemps_AutoProcessing_Tool.js'),'utf8');
const a=s.indexOf('function TAP_openMainImage(');assert(a>=0,'Main window must open an image');
const b=s.indexOf('function AstroTempsAutoProcessingDialog_init(',a);
let accept=false,fail=false,shown=0,selected=null,pumped=0;
const view={id:'MasterLight',isNull:false};const window={mainView:view,isNull:false,show(){shown++;},bringToFront(){}};
const ctx={Math,Error,isFinite,TAP_TR_UI:x=>x,ImageWindow:{windows:[window],open(){if(fail)throw Error('bad file');return [window];}},
OpenFileDialog:function(){this.loadImageFilters=()=>{};this.execute=()=>accept;this.fileNames=['master.xisf'];},
TAP_errorText:String,StdIcon_Error:1,StdButton_Ok:1,TAP_UIMessageBox:()=>({execute(){}}),CoreApplication:{processEvents(exclude){assert.equal(exclude,false);pumped++;d.finishInterface(true);}},msleep(){},TAP_refreshMainImages:()=>{}};
vm.createContext(ctx);vm.runInContext(s.slice(a,b),ctx);
const d={fileOpenBusy:false,interfaceFinished:false,openImage_Button:{enabled:true},target_ViewList:{currentView:{id:'old',isNull:false},getMainViews(){}},show(){},hide(){},finishInterface(ok){this.interfaceAccepted=ok;this.interfaceFinished=true;}};
ctx.TAP_openMainImage(d);assert.equal(d.target_ViewList.currentView.id,'old');assert(!d.fileOpenBusy);
accept=true;ctx.TAP_openMainImage(d);assert.equal(d.target_ViewList.currentView,view);assert.equal(shown,1);assert(d.openImage_Button.enabled);
fail=true;ctx.TAP_openMainImage(d);assert(!d.fileOpenBusy);assert(d.openImage_Button.enabled);
assert.equal(ctx.TAP_executeMainModeless(d),true);assert.equal(pumped,1);
let current={x:100,y:80};const c={width:700,height:1000,position:current,windowCompact:false,workflowScroll:{visible:true},minimize_Button:{},restore_Button:{},resize(w,h){this.width=w;this.height=h;},move(x,y){this.position={x,y};},adjustToContents(){this.height=90;},fitWorkflowContent(){}};
ctx.TAP_setMainCompact(c,true);assert(!c.workflowScroll.visible);assert(c.windowCompact);assert.equal(c.height,90);
ctx.TAP_setMainCompact(c,false);assert(c.workflowScroll.visible);assert.equal(c.height,1000);assert.equal(c.width,700);assert.deepEqual(c.position,current);
console.log('PASS - open/cancel/error, modeless completion, compact/restore geometry');

let hidden=0;const aborted={interfaceFinished:false,show(){},hide(){hidden++;}};
ctx.CoreApplication.processEvents=()=>{throw Error('abort');};
assert.throws(()=>ctx.TAP_executeMainModeless(aborted),/abort/);assert.equal(hidden,1);
ctx.CoreApplication.processEvents=()=>{aborted.interfaceFinished=true;aborted.interfaceAccepted=false;};
aborted.interfaceFinished=false;assert.equal(ctx.TAP_executeMainModeless(aborted),false);
console.log('PASS - modeless cancellation and exception cleanup');
