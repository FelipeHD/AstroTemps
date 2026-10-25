const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(require('node:path').join(__dirname,'../AstroTemps_Full_Legacy_1.9.3.js'),'utf8');
function extract(name,end){const a=s.indexOf('function '+name+'(');return s.slice(a,s.indexOf('\n}',a)+2);}
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

Object.assign(ctx,{Frame:widget,FrameStyle_Box:1,FrameStyle_Sunken:2,TextAlign_HorzCenter:1,TextAlign_VertCenter:2,TextAlign_Right:4,
 TAPSTAR_previewZoomIndexFromFactor:()=>0,TAPSTAR_previewZoomFactorFromIndex:i=>[1,2,4,8][i],
 TAPSTAR_closeViewQuietly(){},TAPSTAR_closeExtractedChannels(){},uniqueImageId:x=>x,
 TAPSTAR_makeReducedPreviewSource:()=>({image:{kind:'input'}}),TAPSTAR_extractChannel:()=>({}),
 TAPSTAR_combineNBtoRGB:(a,b,c,d,show)=>{assert.equal(show,false);return {image:{kind:'nb'}};},
 TAPSTAR_processSetiStarStretch:(a,b,c,d,e,show)=>{assert.equal(show,false);return {image:{kind:'stars'}};},
 TAPSTAR_applySCNR(){},TAPSTAR_applyMTF(){},TAPSTAR_reverseMTF(){},TAPSTAR_applyStarStretch(){}
});
ctx.processEvents=ctx.CoreApplication.processEvents;
vm.createContext(ctx);
vm.runInContext(extract('TAPRH_addEmbeddedPreview','function TAPRH_RangeDialog_init('),ctx);
for(const kind of ['NBtoRGB','SetiStarStretch']){
 vm.runInContext(extract('TAPSTAR_'+kind+'Dialog_init','var TAPSTAR_'+kind+'Dialog ='),ctx);
 const d=new widget();ctx['TAPSTAR_'+kind+'Dialog_init'].call(d,{id:'stars'},{});
 assert(d.previewControl.image.from);d.previewZoomIn.onClick();d.refreshPreview();assert.equal(d.previewControl.zoom,1.25);
 d.previewZoomOut.onClick();assert.equal(d.previewControl.zoom,1);
 d.previewBusy=true;assert.equal(d.onClose(),false);d.previewBusy=false;
 d.onClose();assert.equal(d.previewControl.image,null);d.refreshPreview();assert.equal(d.previewControl.image,null);
}
assert.equal(placed,0);
// Execute the actual Lighthouse layout changes with a sizer that tracks order.
const dialog={applyContinue_Button:{id:'continue'},cancel_Button:{id:'cancel',hide(){this.hidden=true;}},astroTempsSkip_Button:{id:'skip'}};
const items=[{id:'apply'},dialog.applyContinue_Button,dialog.cancel_Button];
dialog.button_Sizer={remove(x){items.splice(items.indexOf(x),1);},add(x){items.push(x);}};
ctx.lighthouseDialog=dialog;
const start=s.indexOf('lighthouseDialog.button_Sizer.remove(');
vm.runInContext(s.slice(start,s.indexOf('lighthouseDialog.adjustToContents();',start)),ctx);
assert.deepEqual(items.map(x=>x.id),['apply','skip','continue']);assert(dialog.cancel_Button.hidden);
assert(extract('TAPNBN_InteractiveDialog_init','var TAPNBN_InteractiveDialog =').includes('var embeddedPreview = TAPRH_addEmbeddedPreview( this )'));
console.log('PASS - StarStretch embedded rendering, hidden previews, zoom persistence, close guards; Lighthouse button order; NBN shared zoom');
