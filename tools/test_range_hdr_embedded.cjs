const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').join(__dirname,'../AstroTemps_AutoProcessing_Tool.js'),'utf8');
function extract(name,end){return s.slice(s.indexOf('function '+name+'('),s.indexOf(end,s.indexOf('function '+name+'(')));}
function widget(){this.label={};this.slider={setRange(){}};this.width=700;this.value=0;this.enabled=true;}
for(const name of ['add','addStretch','addSpacing','addItem','setRange','setPrecision','setScaledFixedSize','setScaledMinSize','adjustToContents','setFixedWidth','setMinWidth','resize','ok','cancel'])widget.prototype[name]=function(){};
widget.prototype.setValue=function(v){this.value=v;};widget.prototype.scaledResource=x=>x;
let placed=0,clones=0,maskShown=null,processed=null;
const ctx={Math,Error,Label:widget,NumericControl:widget,CheckBox:widget,SpinBox:widget,ComboBox:widget,RadioButton:widget,GroupBox:widget,PushButton:widget,ToolButton:widget,HorizontalSizer:widget,VerticalSizer:widget,
TAP_TR_UI:x=>x,TAPRH_defaultRangeSettings:()=>({lowerLimit:0,upperLimit:1,fuzziness:0,smoothness:0}),TAPRH_defaultHDRSettings:()=>({}),
TAPMC_PreviewControl:function(){this.zoom=1;this.setScaledMinSize=()=>{};this.clear=keep=>{this.image=null;if(!keep)this.zoom=1;};this.setImage=im=>{this.image=im;};this.updateZoom=z=>{this.zoom=z;};},
Image:function(im){this.from=im;},Timer:function(){this.start=()=>{};this.stop=()=>{};},CoreApplication:{processEvents(){}},TAPIC_closeView(){},TAPIC_unlinkMask(){},TAPIC_linkMask(){},
TAPIC_cloneReduced:()=>{clones++;return {image:{kind:'source'}};},TAPRH_createRangeMask:(v,c,id,show)=>{maskShown=show;return {image:{kind:'mask'}};},TAPRH_makeHDRProcess:cfg=>({executeOn(v){processed=v;return true;}}),TAPIC_placePreviewWindow(){placed++;},
StdIcon_Error:1,StdButton_Ok:1,TAP_errorText:e=>String(e),TAP_UIMessageBox:()=>{throw Error('Unexpected preview error');}};
vm.createContext(ctx);
const helperStart=s.indexOf('function TAPRH_addEmbeddedPreview(');
if(helperStart>=0)vm.runInContext(s.slice(helperStart,s.indexOf('function TAPRH_RangeDialog_init(',helperStart)),ctx);
vm.runInContext(extract('TAPRH_RangeDialog_init','var TAPRH_RangeDialog ='),ctx);
vm.runInContext(extract('TAPRH_HDRDialog_init','var TAPRH_HDRDialog ='),ctx);
for(const kind of ['Range','HDR']){
 const d=new widget(),view={id:'work',window:{bringToFront(){}}};ctx['TAPRH_'+kind+'Dialog_init'].call(d,view,{id:'mask'});
 assert(d.previewControl,kind+' must embed its preview');
 d.updatePreview();assert.equal(d.previewControl.image.from.kind,kind==='Range'?'mask':'source');
 d.previewZoomIn.onClick();assert.equal(d.previewControl.zoom,1.25);
 d.updatePreview();assert.equal(d.previewControl.zoom,1.25);
 d.previewZoomOut.onClick();assert.equal(d.previewControl.zoom,1);
 const before=clones;d.previewBusy=true;d.updatePreview();assert.equal(clones,before);assert(d.previewQueued);
 assert.equal(d.onClose(),false);d.previewBusy=false;d.onClose();assert.equal(d.previewControl.image,null);
 assert(d.previewClosing);
}
assert.equal(maskShown,false,'Reduced range mask must stay hidden');assert.equal(placed,0,'No detached preview windows');
console.log('PASS - Range/HDR embedded rendering, zoom buttons, refresh framing, busy guard and close cleanup');
