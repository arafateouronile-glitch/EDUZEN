(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,211312,e=>{"use strict";let t={save:{key:"s",ctrl:!0},undo:{key:"z",ctrl:!0},redo:{key:"y",ctrl:!0},copy:{key:"c",ctrl:!0},paste:{key:"v",ctrl:!0},cut:{key:"x",ctrl:!0},selectAll:{key:"a",ctrl:!0},bold:{key:"b",ctrl:!0},italic:{key:"i",ctrl:!0},underline:{key:"u",ctrl:!0}};function i(){try{let e=localStorage.getItem("custom-keyboard-shortcuts");if(e)return JSON.parse(e)}catch(e){console.error("Erreur lors du chargement des raccourcis personnalisés:",e)}return{}}function n(e){try{localStorage.setItem("custom-keyboard-shortcuts",JSON.stringify(e))}catch(e){console.error("Erreur lors de la sauvegarde des raccourcis personnalisés:",e)}}function s(e){return t[e]||{key:""}}function a(e,t){return e.key.toLowerCase()===t.key.toLowerCase()&&(!t.ctrl||!!e.ctrlKey||!!e.metaKey)&&(!t.shift||!!e.shiftKey)&&(!t.alt||!!e.altKey)&&(!t.meta||!!e.metaKey)&&(!!t.ctrl||!e.ctrlKey&&!e.metaKey)&&(!!t.shift||!e.shiftKey)&&(!!t.alt||!e.altKey)&&(!!t.meta||!e.metaKey)&&!0}e.s(["DEFAULT_SHORTCUTS",0,t,"getShortcutConfig",()=>s,"loadCustomShortcuts",()=>i,"matchesShortcut",()=>a,"saveCustomShortcuts",()=>n])},606725,e=>{"use strict";var t=e.i(247167),i=e.i(843476),n=e.i(271645),s=e.i(618566),a=e.i(266027),r=e.i(954616),l=e.i(912598),o=e.i(325715),d=e.i(69319),c=e.i(167881),p=e.i(890538),x=e.i(871689),m=e.i(356909),u=e.i(286536),g=e.i(367240),h=e.i(227516),f=e.i(629377),y=e.i(991799),b=e.i(897250),v=e.i(475254);let j=(0,v.default)("Keyboard",[["rect",{width:"20",height:"16",x:"2",y:"4",rx:"2",ry:"2",key:"15u882"}],["path",{d:"M6 8h.001",key:"1ej0i3"}],["path",{d:"M10 8h.001",key:"1x2st2"}],["path",{d:"M14 8h.001",key:"1vkmyp"}],["path",{d:"M18 8h.001",key:"kfsenl"}],["path",{d:"M8 12h.001",key:"1sjpby"}],["path",{d:"M12 12h.001",key:"al75ts"}],["path",{d:"M16 12h.001",key:"931bgk"}],["path",{d:"M7 16h10",key:"wp8him"}]]);var w=e.i(503116),_=e.i(761911),C=e.i(465286),N=e.i(522016),A=e.i(6799),z=e.i(970065),k=e.i(10708),T=e.i(319036),E=e.i(647163);let F=n.forwardRef(({value:e=[0],onValueChange:t,min:n=0,max:s=100,step:a=1,disabled:r,className:l},o)=>{let d=e[0]||n;return(0,i.jsx)("div",{className:(0,E.cn)("relative flex w-full touch-none select-none items-center",l),children:(0,i.jsx)("input",{ref:o,type:"range",min:n,max:s,step:a,value:d,disabled:r,onChange:e=>t?.([Number(e.target.value)]),className:"h-2 w-full cursor-pointer appearance-none rounded-lg bg-input",style:{background:`linear-gradient(to right, #335ACF 0%, #335ACF ${(d-n)/(s-n)*100}%, #E5E7EB ${(d-n)/(s-n)*100}%, #E5E7EB 100%)`}})})});F.displayName="Slider";var S=e.i(437902),L=e.i(494499),D=e.i(256378),M=e.i(436110);e.i(17556),e.i(396075),e.i(726445);var I=e.i(97643),B=e.i(10552),P=(e,t=0)=>{let i=[];return!e.children.length||t>20||Array.from(e.children).forEach(e=>{"SPAN"===e.tagName?i.push(e):e.children.length&&i.push(...P(e,t+1))}),i},q=B.Mark.create({name:"textStyle",priority:101,addOptions:()=>({HTMLAttributes:{},mergeNestedSpanStyles:!0}),parseHTML(){return[{tag:"span",consuming:!1,getAttrs:e=>{var t;return!!e.hasAttribute("style")&&(this.options.mergeNestedSpanStyles&&(t=e).children.length&&P(t).forEach(e=>{var t,i;let n=e.getAttribute("style"),s=null==(i=null==(t=e.parentElement)?void 0:t.closest("span"))?void 0:i.getAttribute("style");e.setAttribute("style",`${s};${n}`)}),{})}}]},renderHTML({HTMLAttributes:e}){return["span",(0,B.mergeAttributes)(this.options.HTMLAttributes,e),0]},addCommands(){return{toggleTextStyle:e=>({commands:t})=>t.toggleMark(this.name,e),removeEmptyTextStyle:()=>({tr:e})=>{let{selection:t}=e;return e.doc.nodesBetween(t.from,t.to,(t,i)=>{if(t.isTextblock)return!0;t.marks.filter(e=>e.type===this.type).some(e=>Object.values(e.attrs).some(e=>!!e))||e.removeMark(i,i+t.nodeSize,this.type)}),!0}}}}),R=B.Extension.create({name:"backgroundColor",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{backgroundColor:{default:null,parseHTML:e=>{var t;let i=e.getAttribute("style");if(i){let e=i.split(";").map(e=>e.trim()).filter(Boolean);for(let t=e.length-1;t>=0;t-=1){let i=e[t].split(":");if(i.length>=2){let e=i[0].trim().toLowerCase(),t=i.slice(1).join(":").trim();if("background-color"===e)return t.replace(/['"]+/g,"")}}}return null==(t=e.style.backgroundColor)?void 0:t.replace(/['"]+/g,"")},renderHTML:e=>e.backgroundColor?{style:`background-color: ${e.backgroundColor}`}:{}}}}]},addCommands:()=>({setBackgroundColor:e=>({chain:t})=>t().setMark("textStyle",{backgroundColor:e}).run(),unsetBackgroundColor:()=>({chain:e})=>e().setMark("textStyle",{backgroundColor:null}).removeEmptyTextStyle().run()})}),O=B.Extension.create({name:"color",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{color:{default:null,parseHTML:e=>{var t;let i=e.getAttribute("style");if(i){let e=i.split(";").map(e=>e.trim()).filter(Boolean);for(let t=e.length-1;t>=0;t-=1){let i=e[t].split(":");if(i.length>=2){let e=i[0].trim().toLowerCase(),t=i.slice(1).join(":").trim();if("color"===e)return t.replace(/['"]+/g,"")}}}return null==(t=e.style.color)?void 0:t.replace(/['"]+/g,"")},renderHTML:e=>e.color?{style:`color: ${e.color}`}:{}}}}]},addCommands:()=>({setColor:e=>({chain:t})=>t().setMark("textStyle",{color:e}).run(),unsetColor:()=>({chain:e})=>e().setMark("textStyle",{color:null}).removeEmptyTextStyle().run()})}),H=B.Extension.create({name:"fontFamily",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{fontFamily:{default:null,parseHTML:e=>e.style.fontFamily,renderHTML:e=>e.fontFamily?{style:`font-family: ${e.fontFamily}`}:{}}}}]},addCommands:()=>({setFontFamily:e=>({chain:t})=>t().setMark("textStyle",{fontFamily:e}).run(),unsetFontFamily:()=>({chain:e})=>e().setMark("textStyle",{fontFamily:null}).removeEmptyTextStyle().run()})}),$=B.Extension.create({name:"fontSize",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{fontSize:{default:null,parseHTML:e=>e.style.fontSize,renderHTML:e=>e.fontSize?{style:`font-size: ${e.fontSize}`}:{}}}}]},addCommands:()=>({setFontSize:e=>({chain:t})=>t().setMark("textStyle",{fontSize:e}).run(),unsetFontSize:()=>({chain:e})=>e().setMark("textStyle",{fontSize:null}).removeEmptyTextStyle().run()})}),V=B.Extension.create({name:"lineHeight",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{lineHeight:{default:null,parseHTML:e=>e.style.lineHeight,renderHTML:e=>e.lineHeight?{style:`line-height: ${e.lineHeight}`}:{}}}}]},addCommands:()=>({setLineHeight:e=>({chain:t})=>t().setMark("textStyle",{lineHeight:e}).run(),unsetLineHeight:()=>({chain:e})=>e().setMark("textStyle",{lineHeight:null}).removeEmptyTextStyle().run()})});B.Extension.create({name:"textStyleKit",addExtensions(){let e=[];return!1!==this.options.backgroundColor&&e.push(R.configure(this.options.backgroundColor)),!1!==this.options.color&&e.push(O.configure(this.options.color)),!1!==this.options.fontFamily&&e.push(H.configure(this.options.fontFamily)),!1!==this.options.fontSize&&e.push($.configure(this.options.fontSize)),!1!==this.options.lineHeight&&e.push(V.configure(this.options.lineHeight)),!1!==this.options.textStyle&&e.push(q.configure(this.options.textStyle)),e}});var U=e.i(76399),G=e.i(103869),W=e.i(795850),X=e.i(612118),K=e.i(728231),Q=e.i(204753),Y=e.i(915085),Z=e.i(206003);let J=(0,v.default)("Strikethrough",[["path",{d:"M16 4H9a3 3 0 0 0-2.83 4",key:"43sutm"}],["path",{d:"M14 12a4 4 0 0 1 0 8H6",key:"nlfj13"}],["line",{x1:"4",x2:"20",y1:"12",y2:"12",key:"1e0a9i"}]]);var ee=e.i(370956),et=e.i(448876),ei=e.i(684428),en=e.i(388909),es=e.i(393430),ea=e.i(40325),er=e.i(921430),el=e.i(323441),eo=e.i(936046),ed=e.i(255149);let ec=(0,v.default)("Heading3",[["path",{d:"M4 12h8",key:"17cfdx"}],["path",{d:"M4 18V6",key:"1rz3zl"}],["path",{d:"M12 18V6",key:"zqpxq5"}],["path",{d:"M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2",key:"68ncm8"}],["path",{d:"M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2",key:"1ejuhz"}]]);var ep=e.i(771649),ex=e.i(283086),em=e.i(752044),eu=e.i(473708),eg=e.i(39312),eh=e.i(896390);let ef=(0,n.forwardRef)(function({value:e,onChange:t,placeholder:s="Saisissez votre texte...",className:a,readOnly:r=!1,height:l=500,fontFamily:o,onFontFamilyChange:d,onTableEditorOpen:p,onShapeEditorOpen:x,onElementPaletteOpen:m,onQuickTemplatesOpen:u,onStylePaletteOpen:g,onWatermarkEditorOpen:h,onSignatureFieldOpen:f,onMapEmbedOpen:y,onAttachmentEmbedOpen:b},v){let[j,w]=(0,n.useState)(!1),[_,C]=(0,n.useState)(o||"Inter"),[N,A]=(0,n.useState)("12");(0,n.useEffect)(()=>{w(!0)},[]);let z=B.Extension.create({name:"fontFamily",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{fontFamily:{default:null,parseHTML:e=>e.style.fontFamily?.replace(/['"]+/g,""),renderHTML:e=>e.fontFamily?{style:`font-family: ${e.fontFamily}`}:{}}}}]},addCommands:()=>({setFontFamily:e=>({chain:t})=>t().setMark("textStyle",{fontFamily:e}).run(),unsetFontFamily:()=>({chain:e})=>e().setMark("textStyle",{fontFamily:null}).removeEmptyTextStyle().run()})}),k=B.Extension.create({name:"fontSize",addOptions:()=>({types:["textStyle"]}),addGlobalAttributes(){return[{types:this.options.types,attributes:{fontSize:{default:null,parseHTML:e=>e.style.fontSize?.replace(/px|pt|em|rem/g,""),renderHTML:e=>e.fontSize?{style:`font-size: ${e.fontSize}pt`}:{}}}}]},addCommands:()=>({setFontSize:e=>({chain:t})=>t().setMark("textStyle",{fontSize:e}).run(),unsetFontSize:()=>({chain:e})=>e().setMark("textStyle",{fontSize:null}).removeEmptyTextStyle().run()})}),T=(0,L.useEditor)({immediatelyRender:!1,extensions:[D.default.configure({heading:{levels:[1,2,3,4,5,6]},underline:!1}),U.default,I.default.configure({types:["heading","paragraph"]}),q,z,k,O,M.Table.configure({resizable:!0,HTMLAttributes:{class:"tiptap-table",style:"width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #335ACF; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(51, 90, 207, 0.1);"}}),M.TableRow,M.TableHeader,M.TableCell,G.default.extend({addAttributes(){return{...this.parent?.(),"data-logo-var":{default:null,parseHTML:e=>{let t=e.getAttribute("data-logo-var");return t?{"data-logo-var":t,src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E"}:null},renderHTML:e=>e["data-logo-var"]?{"data-logo-var":e["data-logo-var"],src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E"}:{}}}},parseHTML:()=>[{tag:"img[data-logo-var]",getAttrs:e=>{if("string"==typeof e)return!1;let t=e.getAttribute("data-logo-var");return!!t&&{"data-logo-var":t,src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E"}}},{tag:"img"}]}).configure({inline:!1,allowBase64:!0,HTMLAttributes:{class:"tiptap-image"}}),W.VariableExtension,X.ConditionalBlockExtension],content:e,editable:!r,onUpdate:({editor:e})=>{t(e.getHTML())},editorProps:{attributes:{class:"document-editor focus:outline-none",style:`min-height: ${l}px;`,"data-placeholder":s},parseOptions:{preserveWhitespace:"full"},handleDrop:(e,t,i,n)=>{if(n)return!1;let s=t.dataTransfer?.getData("application/x-variable-id"),a=t.dataTransfer?.getData("application/x-variable-label"),r=t.dataTransfer?.getData("application/x-variable-value");if(s&&a&&r){t.preventDefault();let i=e.posAtCoords({left:t.clientX,top:t.clientY});if(i){let{schema:t}=e.state;if(t.nodes.variable){let n=t.nodes.variable.create({id:s,label:a,value:r}),l=e.state.tr.insert(i.pos,n);e.dispatch(l)}else{let{tr:t}=e.state;t.insertText(r,i.pos),e.dispatch(t)}return!0}}return!1},handleDOMEvents:{dragover:(e,t)=>!!t.dataTransfer?.types.includes("application/x-variable-id")&&(t.preventDefault(),t.dataTransfer.dropEffect="copy",!0),dragenter:(e,t)=>!!t.dataTransfer?.types.includes("application/x-variable-id")&&(t.preventDefault(),!0)}}});return((0,n.useEffect)(()=>{T&&e!==T.getHTML()&&Promise.resolve().then(()=>{T.commands.setContent(e,!1)})},[e,T]),(0,n.useEffect)(()=>{o&&o!==_&&C(o)},[o]),(0,n.useEffect)(()=>{if(!T)return;let e=()=>{let{from:e,to:t}=T.state.selection;if(e===t)return void C(o||"Inter");let i=(T.state.storedMarks||T.state.selection.$from.marks()).find(e=>"textStyle"===e.type.name&&e.attrs.fontFamily);i?C(i.attrs.fontFamily):C(o||"Inter")};return T.on("selectionUpdate",e),T.on("transaction",e),()=>{T.off("selectionUpdate",e),T.off("transaction",e)}},[T,o]),(0,n.useImperativeHandle)(v,()=>({getEditor:()=>T,insertVariable:e=>{if(T){let t=e.replace(/[{}]/g,"");try{T.chain().focus().insertVariable({id:t,label:t,value:`{${t}}`}).run()}catch{T.chain().focus().insertContent(`<span data-type="variable" data-id="${t}" data-label="${t}" data-value="{${t}}" style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; border: 1px solid #93C5FD; font-size: 0.875em; font-weight: 500;">{${t}}</span>`).run()}}},insertVariableNode:(e,t,i)=>{if(T)try{T.chain().focus().insertVariable({id:e,label:t,value:i}).run()}catch{T.chain().focus().insertContent(`<span data-type="variable" data-id="${e}" data-label="${t}" data-value="${i}" style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; border: 1px solid #93C5FD; font-size: 0.875em; font-weight: 500;">${t}</span>`).run()}},insertConditionalBlock:(e="if")=>{if(T)try{T.chain().focus().insertConditionalBlock({type:e}).run()}catch{let t={if:{border:"#14B8A6",bg:"#F0FDFA",label:"SI"},elseif:{border:"#F59E0B",bg:"#FFFBEB",label:"SINON SI"},else:{border:"#3B82F6",bg:"#EFF6FF",label:"SINON"}}[e];T.chain().focus().insertContent(`<div style="border: 2px solid ${t.border}; background-color: ${t.bg}; padding: 16px; margin: 16px 0; border-radius: 8px;">
                <div style="font-size: 12px; font-weight: 600; color: ${t.border}; margin-bottom: 8px;">${t.label} : Condition...</div>
                <p>Contenu conditionnel...</p>
              </div>`).run()}},insertHTML:e=>{T&&T.chain().focus().insertContent(e).run()},insertTable:(e=3,t=3)=>{T&&T.chain().focus().insertTable({rows:e,cols:t,withHeaderRow:!0}).run()},insertBorderedFrame:e=>{if(T){let t=e?.borderStyle||"solid",i=e?.borderWidth||2,n=e?.borderColor||"#335ACF",s=e?.backgroundColor||"#F9FAFB",a=e?.padding||15,r=`<div style="border: ${i}px ${t} ${n}; background-color: ${s}; padding: ${a}px; margin: 15px 0; border-radius: 6px; min-height: 80px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6;">Contenu du cadre...</p>
</div>`;T.chain().focus().insertContent(r).run()}},insertFramedSection:(e="Titre de la section",t="#335ACF")=>{T&&T.chain().focus().insertContent(`<div style="border: 2px solid ${t}; background-color: #F9FAFB; margin: 15px 0; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <div style="background: linear-gradient(135deg, ${t} 0%, ${t}dd 100%); padding: 12px 15px; border-bottom: 2px solid ${t};">
    <h3 style="margin: 0; color: white; font-size: 14px; font-weight: 600;">${e}</h3>
  </div>
  <div style="padding: 15px; min-height: 50px;">
    <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">Contenu de la section...</p>
  </div>
</div>`).run()},insertAdminTable:(e=["Champ","Valeur"],t=3)=>{if(T){let i='<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #335ACF; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background-color: white;"><thead><tr style="background: linear-gradient(135deg, #335ACF 0%, #1E40AF 100%);">';e.forEach(e=>{i+=`<th style="padding: 12px 15px; border: 1px solid rgba(255,255,255,0.3); text-align: left; font-weight: 600; color: white;">${e}</th>`}),i+="</tr></thead><tbody>";for(let n=0;n<t;n++){let t=n%2==0?"#FAFBFC":"#FFFFFF";i+=`<tr style="background-color: ${t};">`,e.forEach((e,t)=>{let s=0===t?`Ligne ${n+1}`:`Valeur ${n+1}-${t+1}`;i+=`<td style="padding: 10px 15px; border: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${s}</td>`}),i+="</tr>"}i+="</tbody></table>",T.chain().focus().insertContent(i).run()}},insertHTML:e=>{if(T)try{console.log("Tiptap insertHTML appelé avec:",e);let t=e.trim();if(!t)return void console.warn("HTML vide, insertion annulée");let i=t.match(/<img[^>]+src="([^"]+)"[^>]*>/i);if(i&&i[1]){let e=i[1],n=t.match(/alt="([^"]*)"/i)?.[1]||"Image",s=t.match(/width="(\d+)"/i),a=t.match(/height="(\d+)"/i);console.log("Détection d'une image, utilisation de la commande setImage:",{imgSrc:e,imgAlt:n,width:s?.[1],height:a?.[1]}),T.chain().focus().setImage({src:e,alt:n,width:s?parseInt(s[1]):void 0,height:a?parseInt(a[1]):void 0}).run(),console.log("✅ Image insérée via setImage");return}if(t.match(/<hr[^>]*>/i)){console.log("Détection d'un horizontal rule");let e=t.match(/style="([^"]*)"/i);if(e?e[1]:""){console.log("HR avec styles détecté, utilisation de insertContent pour préserver les styles");let e=T.chain().focus().insertContent(t).run();console.log("Résultat insertContent pour HR:",e),setTimeout(()=>{let e=T.getHTML();if(e.includes("<hr")||e.toLowerCase().includes("horizontalrule"))console.log("✅ Horizontal rule stylisé confirmé dans l'éditeur");else{console.warn("⚠️ Horizontal rule non détecté après insertion, utilisation de la méthode alternative");let e=T.getHTML(),i=new DOMParser().parseFromString(`<div>${e}</div>`,"text/html").querySelector("div");i&&(i.insertAdjacentHTML("beforeend",t),T.commands.setContent(i.innerHTML),console.log("✅ Horizontal rule inséré via méthode alternative"))}},100);return}try{if(T.can().setHorizontalRule()){T.chain().focus().setHorizontalRule().run(),console.log("✅ Horizontal rule inséré via setHorizontalRule");return}}catch(e){console.warn("setHorizontalRule non disponible, utilisation de insertContent:",e)}}document.createElement("div").innerHTML=t;try{console.log("Tentative d'insertion directe du HTML");let e=T.chain().focus().insertContent(t).run();console.log("Résultat insertContent:",e),setTimeout(()=>{let e=T.getHTML();console.log("HTML actuel après insertion (premiers 300 caractères):",e.substring(0,300));let i=t.toLowerCase().replace(/\s+/g," "),n=e.toLowerCase().replace(/\s+/g," "),s=n.includes("data:image"),a=n.includes("<img")||n.includes("img src"),r=n.includes("svg")||n.includes("base64"),l=n.includes("<hr")||n.includes("horizontalrule"),o=s||a||r||l||n.includes(i.substring(0,30));if(console.log("Vérification insertion - HTML cherché:",i.substring(0,50)),console.log("Vérification insertion - data:image:",s,"img tag:",a,"svg:",r,"hr:",l),console.log("Vérification insertion - Trouvé:",o),console.log("HTML complet actuel:",e),o)console.log("✅ HTML inséré avec succès via insertContent");else{console.warn("Le HTML n'a pas été inséré correctement, utilisation d'une méthode alternative");try{let e=T.getHTML(),i=new DOMParser().parseFromString(`<div>${e}</div>`,"text/html").querySelector("div");if(i){let e=document.createElement("div");e.innerHTML=t,e.firstElementChild?i.appendChild(e.firstElementChild):i.insertAdjacentHTML("beforeend",t);let n=i.innerHTML;T.commands.setContent(n),console.log("✅ HTML inséré via méthode alternative")}}catch(e){console.error("Erreur lors de la méthode alternative:",e)}}},150)}catch(e){console.error("Erreur lors de l'insertion:",e);try{let e=T.getHTML();T.commands.setContent(e+t)}catch(e){console.error("Erreur lors du fallback final:",e)}}}catch(t){console.error("Erreur lors de l'insertion HTML:",t,e);try{T.chain().focus().insertContent(e).run()}catch(t){console.error("Erreur lors de l'insertion directe:",t);try{let t=T.getHTML()+e;T.commands.setContent(t)}catch(e){console.error("Erreur lors du fallback final:",e)}}}else console.error("Editor non disponible pour insertHTML")}}),[T]),j&&T)?(0,i.jsx)(K.TooltipProvider,{delayDuration:300,children:(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" "+((0,E.cn)("tiptap-editor border rounded-lg overflow-hidden bg-white",a)||""),children:[!r&&(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex flex-wrap items-center gap-1 p-2 border-b bg-gradient-to-r from-gray-50 to-white",children:[(0,i.jsx)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1",children:[(0,i.jsx)(ep.Type,{className:"h-4 w-4 text-gray-500"}),(0,i.jsxs)("select",{value:_,onChange:e=>{let t=e.target.value;C(t),T&&(T.state.selection.empty,T.chain().focus().setFontFamily(t).run()),d&&setTimeout(()=>d(t),0)},title:"Choisir la police (applique au texte sélectionné)",className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[120px]",children:[(0,i.jsx)("option",{value:"Inter",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Inter"}),(0,i.jsx)("option",{value:"Arial",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Arial"}),(0,i.jsx)("option",{value:"Times New Roman",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Times New Roman"}),(0,i.jsx)("option",{value:"Courier New",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Courier New"}),(0,i.jsx)("option",{value:"Georgia",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Georgia"}),(0,i.jsx)("option",{value:"Verdana",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Verdana"}),(0,i.jsx)("option",{value:"Helvetica",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Helvetica"}),(0,i.jsx)("option",{value:"Calibri",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Calibri"}),(0,i.jsx)("option",{value:"Comic Sans MS",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Comic Sans MS"}),(0,i.jsx)("option",{value:"Trebuchet MS",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Trebuchet MS"})]})]})}),(0,i.jsx)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1",children:[(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-500",children:"Taille"}),(0,i.jsxs)("select",{value:N,onChange:e=>{let t=e.target.value;A(t),T&&(T.state.selection.empty,T.chain().focus().setFontSize(t).run())},title:"Choisir la taille de police (applique au texte sélectionné)",className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" h-8 px-2 text-xs border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-[70px]",children:[(0,i.jsx)("option",{value:"8",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"8pt"}),(0,i.jsx)("option",{value:"9",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"9pt"}),(0,i.jsx)("option",{value:"10",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"10pt"}),(0,i.jsx)("option",{value:"11",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"11pt"}),(0,i.jsx)("option",{value:"12",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"12pt"}),(0,i.jsx)("option",{value:"14",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"14pt"}),(0,i.jsx)("option",{value:"16",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"16pt"}),(0,i.jsx)("option",{value:"18",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"18pt"}),(0,i.jsx)("option",{value:"20",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"20pt"}),(0,i.jsx)("option",{value:"24",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"24pt"}),(0,i.jsx)("option",{value:"28",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"28pt"}),(0,i.jsx)("option",{value:"32",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"32pt"}),(0,i.jsx)("option",{value:"36",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"36pt"}),(0,i.jsx)("option",{value:"48",className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"48pt"})]})]})}),(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:[(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().undo().run(),disabled:!T.can().undo(),className:"h-8 w-8 p-0",children:(0,i.jsx)(ea.Undo,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Annuler"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Z"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().redo().run(),disabled:!T.can().redo(),className:"h-8 w-8 p-0",children:(0,i.jsx)(er.Redo,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Refaire"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Shift+Z"})]})]})]}),(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:[(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleHeading({level:1}).run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("heading",{level:1})&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(eo.Heading1,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Titre 1"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Alt+1"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleHeading({level:2}).run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("heading",{level:2})&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(ed.Heading2,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Titre 2"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Alt+2"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleHeading({level:3}).run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("heading",{level:3})&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(ec,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Titre 3"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Alt+3"})]})]})]}),(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:[(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleBold().run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("bold")&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(Q.Bold,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Gras"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+B"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleItalic().run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("italic")&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(Y.Italic,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Italique"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+I"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleUnderline().run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("underline")&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(Z.Underline,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Souligné"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+U"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleStrike().run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("strike")&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(J,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Barré"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Shift+X"})]})]})]}),(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:[(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleBulletList().run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("bulletList")&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(ee.List,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Liste à puces"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Shift+8"})]})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().toggleOrderedList().run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive("orderedList")&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(et.ListOrdered,{className:"h-4 w-4"})})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Liste numérotée"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ctrl+Shift+7"})]})]})]}),(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 border-r pr-2 mr-2",children:[(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().setTextAlign("left").run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive({textAlign:"left"})&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(ei.AlignLeft,{className:"h-4 w-4"})})}),(0,i.jsx)(K.TooltipContent,{children:(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Aligner à gauche"})})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().setTextAlign("center").run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive({textAlign:"center"})&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(en.AlignCenter,{className:"h-4 w-4"})})}),(0,i.jsx)(K.TooltipContent,{children:(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Centrer"})})]}),(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>T.chain().focus().setTextAlign("right").run(),className:(0,E.cn)("h-8 w-8 p-0 transition-all",T.isActive({textAlign:"right"})&&"bg-brand-blue-ghost text-brand-blue shadow-sm"),children:(0,i.jsx)(es.AlignRight,{className:"h-4 w-4"})})}),(0,i.jsx)(K.TooltipContent,{children:(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Aligner à droite"})})]})]}),(u||p||x||m)&&(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1",children:[(0,i.jsxs)("div",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" flex items-center gap-1 px-2 border-r pr-2 mr-2",children:[(0,i.jsx)(ex.Sparkles,{className:"h-4 w-4 text-brand-blue"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs font-medium text-gray-600 hidden sm:inline",children:"Premium"})]}),u&&(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:u,className:"h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost",children:[(0,i.jsx)(eg.Zap,{className:"h-4 w-4"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs hidden sm:inline",children:"Templates"})]})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Templates rapides"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Insérer des structures prédéfinies"})]})]}),p&&(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:p,className:"h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost",children:[(0,i.jsx)(el.Table,{className:"h-4 w-4"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs hidden sm:inline",children:"Tableau"})]})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Éditeur de tableau premium"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Créer et personnaliser des tableaux"})]})]}),x&&(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:x,className:"h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost",children:[(0,i.jsx)(em.Square,{className:"h-4 w-4"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs hidden sm:inline",children:"Forme"})]})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Éditeur de formes"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Insérer des formes géométriques"})]})]}),m&&(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:m,className:"h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost",children:[(0,i.jsx)(eu.Image,{className:"h-4 w-4"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs hidden sm:inline",children:"Élément"})]})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Palette d'éléments"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Images, QR codes, codes-barres, etc."})]})]}),g&&(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:g,className:"h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost",children:[(0,i.jsx)(ep.Type,{className:"h-4 w-4"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs hidden sm:inline",children:"Styles"})]})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Styles prédéfinis"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Appliquer des styles de paragraphe"})]})]}),h&&(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{type:"button",variant:"ghost",size:"sm",onClick:h,className:"h-8 px-2 gap-1 transition-all hover:bg-brand-blue-ghost",children:[(0,i.jsx)(eh.Droplet,{className:"h-4 w-4"}),(0,i.jsx)("span",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs hidden sm:inline",children:"Filigrane"})]})}),(0,i.jsxs)(K.TooltipContent,{children:[(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]]),children:"Filigrane"}),(0,i.jsx)("p",{className:S.default.dynamic([["ac6c869678541b8e",[l]]])+" text-xs text-gray-400",children:"Ajouter un filigrane au document"})]})]})]})]}),(0,i.jsx)(L.EditorContent,{editor:T,className:"prose-editor"}),(0,i.jsx)(S.default,{id:"ac6c869678541b8e",dynamic:[l],children:`.tiptap-editor .ProseMirror{min-height:${l}px;outline:none}.tiptap-editor .ProseMirror p.is-editor-empty:first-child:before{content:attr(data-placeholder);float:left;color:#9ca3af;pointer-events:none;height:0}.tiptap-editor .ProseMirror:focus{outline:none}.tiptap-editor .ProseMirror table{border-collapse:collapse;table-layout:fixed;border-radius:6px;width:100%;margin:18pt 0;overflow:hidden;box-shadow:0 1px 3px #0000001a}.tiptap-editor .ProseMirror table td,.tiptap-editor .ProseMirror table th{vertical-align:top;box-sizing:border-box;border:1px solid #e5e7eb;min-width:1em;padding:10pt 12pt;position:relative}.tiptap-editor .ProseMirror table th{text-align:left;color:#fff;background-color:#335acf;font-weight:600}.tiptap-editor .ProseMirror table td{color:#374151;background-color:#fff}.tiptap-editor .ProseMirror table tr:nth-child(2n) td{background-color:#f9fafb}.tiptap-editor .ProseMirror table .selectedCell:after{z-index:2;content:"";pointer-events:none;background:#c8c8ff66;position:absolute;inset:0}.tiptap-editor .ProseMirror table .column-resize-handle{pointer-events:none;background-color:#335acf;width:4px;position:absolute;top:0;bottom:-2px;right:-2px}.tiptap-editor .ProseMirror div[style*=border]{margin:18pt 0;display:block}.tiptap-editor .ProseMirror span[style*="background-color: #E0F2FE"]{display:inline-block}`})]})}):(0,i.jsx)("div",{className:(0,E.cn)("h-[400px] border rounded-lg bg-gray-50 animate-pulse",a)})});ef.displayName="TiptapEditor";let ey=(0,n.forwardRef)(function({onChange:e,...t},s){let a=(0,n.useRef)(null);return(0,n.useImperativeHandle)(s,()=>({insertVariable:e=>{a.current&&a.current.insertVariable(e)},insertVariableNode:(e,t,i)=>{a.current&&a.current.insertVariableNode(e,t,i)},insertConditionalBlock:(e="if")=>{a.current&&a.current.insertConditionalBlock(e)},getEditor:()=>a.current?.getEditor(),insertTable:(e=3,t=3)=>{a.current&&a.current.insertTable(e,t)},insertTableWithProperties:e=>{a.current&&a.current.insertTable(e.rows||3,e.cols||3)},insertBorderedFrame:e=>{a.current&&a.current.insertBorderedFrame(e)},insertFramedSection:(e,t)=>{a.current&&a.current.insertFramedSection(e,t)},insertAdminTable:(e,t)=>{a.current&&a.current.insertAdminTable(e,t)},insertHTML:e=>{a.current&&a.current.insertHTML(e)}}),[]),(0,i.jsx)(ef,{ref:a,...t,onChange:e||(()=>{})})});ey.displayName="RichTextEditor";var eb=e.i(463415);let ev=(0,v.default)("Box",[["path",{d:"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",key:"hh9hay"}],["path",{d:"m3.3 7 8.7 5 8.7-5",key:"g66t2b"}],["path",{d:"M12 22V12",key:"d0xqtd"}]]);var ej=e.i(926125),ew=e.i(630374),e_=e.i(23750),eC=e.i(62870);function eN({open:e,onOpenChange:t,editorRef:s,onInsert:a}){let[r,l]=(0,n.useState)({rows:3,cols:3,width:100,height:void 0,headers:"first-row",cellSpacing:1,borderSize:1,cellPadding:8,alignment:"undefined",title:"",summary:""});return(0,i.jsx)(ew.Dialog,{open:e,onOpenChange:t,children:(0,i.jsxs)(ew.DialogContent,{className:"max-w-lg max-h-[90vh] overflow-y-auto",children:[(0,i.jsxs)(ew.DialogHeader,{children:[(0,i.jsx)(ew.DialogTitle,{children:"Propriétés du tableau"}),(0,i.jsx)(ew.DialogDescription,{children:"Configurez les propriétés du tableau avant de l'insérer dans le document."})]}),(0,i.jsxs)("div",{className:"space-y-4 py-4",children:[(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"rows",children:"Lignes"}),(0,i.jsx)(e_.Input,{id:"rows",type:"number",min:"1",max:"20",value:r.rows,onChange:e=>l({...r,rows:parseInt(e.target.value)||1})})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"cols",children:"Colonnes"}),(0,i.jsx)(e_.Input,{id:"cols",type:"number",min:"1",max:"10",value:r.cols,onChange:e=>l({...r,cols:parseInt(e.target.value)||1})})]})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"width",children:"Largeur"}),(0,i.jsx)(e_.Input,{id:"width",type:"number",min:"0",max:"100",value:r.width||"",onChange:e=>l({...r,width:e.target.value?parseInt(e.target.value):void 0}),placeholder:"100"}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:"% (0-100)"})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"height",children:"Hauteur"}),(0,i.jsx)(e_.Input,{id:"height",type:"number",min:"0",value:r.height||"",onChange:e=>l({...r,height:e.target.value?parseInt(e.target.value):void 0}),placeholder:"Auto"}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:"px (optionnel)"})]})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"headers",children:"En-têtes"}),(0,i.jsxs)(eC.SelectRoot,{value:r.headers,onValueChange:e=>l({...r,headers:e}),children:[(0,i.jsx)(eC.SelectTrigger,{id:"headers",children:(0,i.jsx)(eC.SelectValue,{})}),(0,i.jsxs)(eC.SelectContent,{children:[(0,i.jsx)(eC.SelectItem,{value:"none",children:"Aucun"}),(0,i.jsx)(eC.SelectItem,{value:"first-row",children:"Première ligne"}),(0,i.jsx)(eC.SelectItem,{value:"first-col",children:"Première colonne"}),(0,i.jsx)(eC.SelectItem,{value:"both",children:"Première ligne et colonne"})]})]})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"cellSpacing",children:"Espacement entre les cellules"}),(0,i.jsx)(e_.Input,{id:"cellSpacing",type:"number",min:"0",max:"10",value:r.cellSpacing,onChange:e=>l({...r,cellSpacing:parseInt(e.target.value)||0})}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:"px (0-10)"})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"borderSize",children:"Taille de la bordure"}),(0,i.jsx)(e_.Input,{id:"borderSize",type:"number",min:"0",max:"5",value:r.borderSize,onChange:e=>l({...r,borderSize:parseInt(e.target.value)||0})}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:"px (0-5)"})]})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"cellPadding",children:"Marge interne des cellules"}),(0,i.jsx)(e_.Input,{id:"cellPadding",type:"number",min:"0",max:"20",value:r.cellPadding,onChange:e=>l({...r,cellPadding:parseInt(e.target.value)||0})}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:"px (0-20)"})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"alignment",children:"Alignement"}),(0,i.jsxs)(eC.SelectRoot,{value:r.alignment,onValueChange:e=>l({...r,alignment:e}),children:[(0,i.jsx)(eC.SelectTrigger,{id:"alignment",children:(0,i.jsx)(eC.SelectValue,{})}),(0,i.jsxs)(eC.SelectContent,{children:[(0,i.jsx)(eC.SelectItem,{value:"undefined",children:"Indéfini"}),(0,i.jsx)(eC.SelectItem,{value:"left",children:"Gauche"}),(0,i.jsx)(eC.SelectItem,{value:"center",children:"Centre"}),(0,i.jsx)(eC.SelectItem,{value:"right",children:"Droite"})]})]})]})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"title",children:"Titre du tableau"}),(0,i.jsx)(e_.Input,{id:"title",type:"text",value:r.title||"",onChange:e=>l({...r,title:e.target.value}),placeholder:"Titre du tableau (optionnel)"})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{htmlFor:"summary",children:"Résumé (description)"}),(0,i.jsx)(e_.Input,{id:"summary",type:"text",value:r.summary||"",onChange:e=>l({...r,summary:e.target.value}),placeholder:"Description du tableau (optionnel)"})]})]}),(0,i.jsxs)(ew.DialogFooter,{children:[(0,i.jsx)(c.Button,{variant:"outline",onClick:()=>t(!1),children:"Annuler"}),(0,i.jsx)(c.Button,{onClick:()=>{a(r),t(!1)},children:"OK"})]})]})})}function eA({editorRef:e}){let[t,s]=(0,n.useState)(!1),a=(t,i)=>{if(e.current)try{e.current.insertTable(t,i)}catch(e){console.error("Error inserting table:",e)}},r=t=>{if(e.current)try{e.current.insertBorderedFrame({simple:{borderStyle:"solid",borderWidth:2,borderColor:"#E5E7EB",backgroundColor:"#F9FAFB",padding:15},colored:{borderStyle:"solid",borderWidth:2,borderColor:"#335ACF",backgroundColor:"#EFF6FF",padding:15},gradient:{borderStyle:"solid",borderWidth:2,borderColor:"#335ACF",backgroundColor:"#F0F9FF",padding:20}}[t])}catch(e){console.error("Error inserting frame:",e)}},l=t=>{if(e.current)try{e.current.insertFramedSection("Titre de la section",t)}catch(e){console.error("Error inserting section:",e)}};return(0,i.jsxs)("div",{className:"flex items-center gap-2 p-2 border-b border-bg-gray-200 bg-bg-gray-50",children:[(0,i.jsxs)(eb.DropdownMenu,{children:[(0,i.jsx)(eb.DropdownMenuTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",className:"gap-2",children:[(0,i.jsx)(el.Table,{className:"h-4 w-4"}),"Tableau"]})}),(0,i.jsxs)(eb.DropdownMenuContent,{align:"start",className:"w-56",children:[(0,i.jsx)(eb.DropdownMenuLabel,{children:"Insérer un tableau"}),(0,i.jsx)(eb.DropdownMenuSeparator,{}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>s(!0),children:[(0,i.jsx)(el.Table,{className:"h-4 w-4 mr-2"}),"Propriétés du tableau..."]}),(0,i.jsx)(eb.DropdownMenuSeparator,{}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>a(2,2),children:[(0,i.jsx)(el.Table,{className:"h-4 w-4 mr-2"}),"2x2 (rapide)"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>a(3,3),children:[(0,i.jsx)(el.Table,{className:"h-4 w-4 mr-2"}),"3x3 (rapide)"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>a(4,4),children:[(0,i.jsx)(el.Table,{className:"h-4 w-4 mr-2"}),"4x4 (rapide)"]}),(0,i.jsx)(eb.DropdownMenuSeparator,{}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>a(3,2),children:[(0,i.jsx)(ej.Columns,{className:"h-4 w-4 mr-2"}),"3 lignes, 2 colonnes"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>a(5,2),children:[(0,i.jsx)(ej.Columns,{className:"h-4 w-4 mr-2"}),"5 lignes, 2 colonnes"]}),(0,i.jsx)(eb.DropdownMenuSeparator,{}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>((t,i)=>{if(e.current)try{e.current.insertAdminTable(t,3)}catch(e){console.error("Error inserting admin table:",e)}})(["Champ","Valeur"],0),children:[(0,i.jsx)(el.Table,{className:"h-4 w-4 mr-2"}),"Tableau administratif (2 colonnes)"]})]})]}),(0,i.jsx)(eN,{open:t,onOpenChange:s,editorRef:e,onInsert:t=>{if(e.current)try{e.current.insertTableWithProperties(t)}catch(e){console.error("Error inserting table with properties:",e)}}}),(0,i.jsxs)(eb.DropdownMenu,{children:[(0,i.jsx)(eb.DropdownMenuTrigger,{asChild:!0,children:(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",className:"gap-2",children:[(0,i.jsx)(em.Square,{className:"h-4 w-4"}),"Cadre"]})}),(0,i.jsxs)(eb.DropdownMenuContent,{align:"start",className:"w-56",children:[(0,i.jsx)(eb.DropdownMenuLabel,{children:"Insérer un cadre"}),(0,i.jsx)(eb.DropdownMenuSeparator,{}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>r("simple"),children:[(0,i.jsx)(ev,{className:"h-4 w-4 mr-2"}),"Cadre simple"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>r("colored"),children:[(0,i.jsx)(ev,{className:"h-4 w-4 mr-2",style:{color:"#335ACF"}}),"Cadre bleu"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>r("gradient"),children:[(0,i.jsx)(ev,{className:"h-4 w-4 mr-2",style:{color:"#34B9EE"}}),"Cadre avec fond"]}),(0,i.jsx)(eb.DropdownMenuSeparator,{}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>l("#335ACF"),children:[(0,i.jsx)(em.Square,{className:"h-4 w-4 mr-2"}),"Section avec titre (bleu)"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>l("#34B9EE"),children:[(0,i.jsx)(em.Square,{className:"h-4 w-4 mr-2"}),"Section avec titre (cyan)"]}),(0,i.jsxs)(eb.DropdownMenuItem,{onClick:()=>l("#10B981"),children:[(0,i.jsx)(em.Square,{className:"h-4 w-4 mr-2"}),"Section avec titre (vert)"]})]})]})]})}var ez=e.i(782691);function ek({template:e,onTemplateChange:t,onEditorRefReady:s,isActive:a}){let r=(0,n.useRef)(null),l=(0,n.useRef)(!1),[o,d]=(0,n.useState)(()=>{let t=e.header?.content;return(0,ez.convertTagsToVariableNodes)(t||"")}),c=(0,n.useRef)(!1);(0,n.useEffect)(()=>{a&&!c.current&&r.current&&s?(c.current=!0,s({insertVariable:e=>{r.current?.insertVariable(e)}})):a||(c.current=!1)},[a,s]);let p=e.header||{enabled:!0,height:100,elements:[],repeatOnAllPages:!0,content:""},x=i=>{t({header:{...p,...i},header_enabled:void 0!==i.enabled?i.enabled:e.header_enabled,header_height:void 0!==i.height?i.height:e.header_height})};return(0,n.useEffect)(()=>{if(l.current)return;let t=e.header?.content||"",i=(0,ez.convertTagsToVariableNodes)(t);i!==o&&(l.current=!0,d(i),setTimeout(()=>{l.current=!1},100))},[e.header]),(0,i.jsxs)("div",{className:"space-y-4",children:[(0,i.jsxs)(z.Card,{children:[(0,i.jsxs)(z.CardHeader,{children:[(0,i.jsx)(z.CardTitle,{children:"Configuration de l'en-tête"}),(0,i.jsx)(z.CardDescription,{children:"Personnalisez l'apparence et le contenu de l'en-tête"})]}),(0,i.jsxs)(z.CardContent,{className:"space-y-6",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)(k.Label,{children:"Afficher l'en-tête"}),(0,i.jsx)("p",{className:"text-sm text-text-tertiary",children:"Afficher l'en-tête sur toutes les pages"})]}),(0,i.jsx)(T.Switch,{checked:e.header_enabled,onCheckedChange:e=>{t({header_enabled:e})}})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsxs)(k.Label,{children:["Hauteur : ",p.height,"px"]}),(0,i.jsx)(F,{value:[p.height],onValueChange:([e])=>x({height:e}),min:50,max:250,step:5,className:"w-full",disabled:!e.header_enabled}),(0,i.jsxs)("div",{className:"flex justify-between text-xs text-text-tertiary",children:[(0,i.jsx)("span",{children:"Min: 50px"}),(0,i.jsx)("span",{children:"Max: 250px"})]})]})]})]}),(0,i.jsxs)(z.Card,{className:"flex-1 flex flex-col overflow-hidden",children:[(0,i.jsxs)(z.CardHeader,{children:[(0,i.jsx)(z.CardTitle,{children:"Contenu de l'en-tête"}),(0,i.jsx)(z.CardDescription,{children:"Éditez le contenu de l'en-tête. Utilisez la barre latérale pour insérer des variables, tableaux et cadres."})]}),(0,i.jsxs)(z.CardContent,{className:"flex-1 flex flex-col min-h-[400px]",children:[(0,i.jsx)(eA,{editorRef:r}),(0,i.jsx)("div",{onDragOver:e=>{e.preventDefault(),e.stopPropagation(),e.dataTransfer.dropEffect="copy"},onDrop:e=>{e.preventDefault(),e.stopPropagation();let t=e.dataTransfer.getData("text/plain")||e.dataTransfer.getData("text/html")?.replace(/[{}]/g,"");t&&r.current&&r.current.insertVariable(t)},className:"flex-1",children:(0,i.jsx)(ey,{ref:r,value:o,onChange:e=>{l.current||(d(e),x({content:(0,ez.convertVariableNodesToTags)(e)}))},placeholder:"Saisissez le contenu de l'en-tête...",className:"flex-1"})})]})]})]})}function eT({template:e,onTemplateChange:t,onEditorRefReady:n,isActive:s}){return(0,i.jsx)(ek,{template:e,onTemplateChange:t,onEditorRefReady:n,isActive:s})}var eE=e.i(645760),eF=e.i(770703),eS=e.i(327430),eL=e.i(16715),eD=e.i(373375),eM=e.i(463059),eI=e.i(303281);let eB=(0,v.default)("ZoomIn",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14",key:"1vmskp"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]]),eP=(0,v.default)("ZoomOut",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]]),eq=(0,v.default)("Maximize2",[["polyline",{points:"15 3 21 3 21 9",key:"mznyad"}],["polyline",{points:"9 21 3 21 3 15",key:"1avn1i"}],["line",{x1:"21",x2:"14",y1:"3",y2:"10",key:"ota7mn"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]),eR=(0,v.default)("Minimize2",[["polyline",{points:"4 14 10 14 10 20",key:"11kfnr"}],["polyline",{points:"20 10 14 10 14 4",key:"rlmsce"}],["line",{x1:"14",x2:"21",y1:"10",y2:"3",key:"o5lafz"}],["line",{x1:"3",x2:"10",y1:"21",y2:"14",key:"1atl0r"}]]);var eO=e.i(677159);let eH={ecole_nom:"École Moderne de Dakar",ecole_logo:"",ecole_adresse:"123 Avenue de l'Education, Dakar, Sénégal",ecole_ville:"Dakar",ecole_telephone:"+221 77 123 45 67",ecole_email:"contact@ecolemoderne.sn",ecole_site_web:"www.ecolemoderne.sn",ecole_slogan:"Excellence et Innovation",eleve_nom:"DIALLO",eleve_prenom:"Amadou",eleve_numero:"LYC001",eleve_date_naissance:"15/03/2007",eleve_classe:"Terminale A",formation_nom:"Formation en Développement Web",formation_code:"DEV-WEB-2024",formation_duree:"6 mois",formation_prix:"500 000 XOF",session_nom:"Session Janvier 2024",session_debut:"01/01/2024",session_fin:"30/06/2024",date_jour:new Date().toLocaleDateString("fr-FR"),date_emission:new Date().toLocaleDateString("fr-FR"),annee_scolaire:"2024-2025",numero_document:"2025-001",date_generation:new Date().toLocaleDateString("fr-FR"),numero_page:1,total_pages:1};function e$(e,t){if(!e)return e;let i=(0,eO.processConditionals)(e,t);return Object.entries(t).forEach(([e,t])=>{let n=RegExp(`\\{${e}\\}`,"g"),s=t?String(t).replace(/</g,"&lt;").replace(/>/g,"&gt;"):"";i=i.replace(n,s)}),i}let eV={A4:{width:210,height:297},A3:{width:297,height:420},Letter:{width:216,height:279},Legal:{width:216,height:356}};function eU({htmlContent:e,headerContent:t,footerContent:s,className:a,pageSize:r="A4",margins:l={top:20,right:20,bottom:20,left:20},fullPageMode:o=!1}){let[d,p]=(0,n.useState)(!1),[x,m]=(0,n.useState)(0),[g,h]=(0,n.useState)(1),[f,y]=(0,n.useState)(1),[b,v]=(0,n.useState)(.8),[j,w]=(0,n.useState)(!1),[_,C]=(0,n.useState)(!1),N=(0,n.useRef)(null),A=(0,n.useMemo)(()=>{let i=e?e$(e,eH):"",n=t?e$(t,eH):"",a=s?e$(s,eH):"",r=Math.max(1,Math.ceil(i.length/3e3));return{header:n,body:i,footer:a,estimatedPages:r}},[e,t,s]),z=eV[r];z.width;let k=3.779527559*z.height-100-60-(l.top+l.bottom)*3.779527559;(0,n.useEffect)(()=>{let e=()=>{if(N.current){let e=Math.max(1,Math.ceil(N.current.scrollHeight/k));y(e),g>e&&h(e)}};requestAnimationFrame(()=>{requestAnimationFrame(e)})},[A.body,g,k]);let T=e=>{e>=1&&e<=f&&h(e)};return(0,i.jsxs)(eE.GlassCard,{variant:"premium",className:(0,E.cn)("flex flex-col overflow-hidden",a),children:[(0,i.jsxs)("div",{className:"flex items-center justify-between p-4 border-b border-gray-200",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(u.Eye,{className:"h-5 w-5 text-brand-blue"}),(0,i.jsx)("h3",{className:"font-semibold text-text-primary",children:"Prévisualisation en temps réel"})]}),(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsxs)("div",{className:"flex items-center gap-1 border rounded-lg",children:[(0,i.jsx)(c.Button,{variant:"ghost",size:"sm",onClick:()=>v(e=>Math.max(e-.1,.3)),disabled:b<=.3,className:"h-8 w-8 p-0",children:(0,i.jsx)(eP,{className:"h-4 w-4"})}),(0,i.jsxs)("span",{className:"text-xs text-text-secondary px-2 min-w-[3rem] text-center",children:[Math.round(100*b),"%"]}),(0,i.jsx)(c.Button,{variant:"ghost",size:"sm",onClick:()=>v(e=>Math.min(e+.1,1.5)),disabled:b>=1.5,className:"h-8 w-8 p-0",children:(0,i.jsx)(eB,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"ghost",size:"sm",onClick:()=>v(.8),className:"h-8 px-2 text-xs",children:"Reset"})]}),(0,i.jsx)(c.Button,{variant:_?"default":"outline",size:"sm",onClick:()=>C(!_),className:"gap-2",title:"Afficher toutes les pages",children:_?(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(eR,{className:"h-4 w-4"}),"Vue page"]}):(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(eq,{className:"h-4 w-4"}),"Vue complète"]})}),(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:()=>{w(!0),window.print(),setTimeout(()=>w(!1),1e3)},className:"gap-2",children:[(0,i.jsx)(eI.Printer,{className:"h-4 w-4"}),"Imprimer"]}),(0,i.jsxs)(c.Button,{variant:"ghost",size:"sm",onClick:()=>{p(!0),m(e=>e+1),setTimeout(()=>p(!1),300)},disabled:d,className:"gap-2",children:[(0,i.jsx)(eL.RefreshCw,{className:(0,E.cn)("h-4 w-4",d&&"animate-spin")}),"Actualiser"]})]})]}),(0,i.jsxs)("div",{className:"flex-1 overflow-auto p-4 bg-gray-50 preview-container",children:[f>1&&!j&&!_&&(0,i.jsxs)("div",{className:"flex items-center justify-center gap-4 mb-4 preview-navigation",children:[(0,i.jsx)(c.Button,{variant:"outline",size:"sm",onClick:()=>T(g-1),disabled:1===g,children:(0,i.jsx)(eD.ChevronLeft,{className:"h-4 w-4"})}),(0,i.jsxs)("span",{className:"text-sm text-text-secondary",children:["Page ",g," / ",f]}),(0,i.jsx)(c.Button,{variant:"outline",size:"sm",onClick:()=>T(g+1),disabled:g===f,children:(0,i.jsx)(eM.ChevronRight,{className:"h-4 w-4"})})]}),(0,i.jsxs)("div",{className:"mb-4 flex items-center gap-2 preview-controls",children:[(0,i.jsx)("label",{className:"text-sm text-text-secondary",children:"Format:"}),(0,i.jsxs)("select",{value:r,onChange:e=>{},disabled:!0,className:"text-sm px-2 py-1 border rounded",children:[(0,i.jsx)("option",{value:"A4",children:"A4 (210 × 297 mm)"}),(0,i.jsx)("option",{value:"A3",children:"A3 (297 × 420 mm)"}),(0,i.jsx)("option",{value:"Letter",children:"Letter (216 × 279 mm)"}),(0,i.jsx)("option",{value:"Legal",children:"Legal (216 × 356 mm)"})]})]}),(0,i.jsx)("div",{className:(0,E.cn)("space-y-4",_&&"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"),children:Array.from({length:f}).map((e,t)=>{let n=t+1,s=n===g;return(0,i.jsxs)("div",{className:(0,E.cn)("mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all preview-page",_?"w-full":"",s?"ring-2 ring-brand-blue":_?"opacity-90":"opacity-60",!s&&f>1&&!j&&!_&&"hidden"),style:{width:`${z.width}mm`,minHeight:`${z.height}mm`,maxWidth:"100%",transform:`scale(${b})`,transformOrigin:"top center",padding:`${l.top}mm ${l.right}mm ${l.bottom}mm ${l.left}mm`},children:[A.header&&(0,i.jsx)("div",{className:"border-b border-gray-300 bg-gray-100/50 p-4",style:{minHeight:"100px"},dangerouslySetInnerHTML:{__html:e$(A.header,{...eH,numero_page:n,total_pages:f})}}),(0,i.jsx)("div",{ref:1===n?N:null,className:"p-6 prose prose-sm max-w-none",style:{fontFamily:"Inter, Arial, sans-serif",fontSize:"14px",lineHeight:"1.6",display:1===n?"block":"none"},dangerouslySetInnerHTML:{__html:e$(A.body,{...eH,numero_page:n,total_pages:f})}},`${x}-${n}`),A.footer&&(0,i.jsx)("div",{className:"border-t border-gray-300 bg-gray-100/50 p-4 mt-auto",style:{minHeight:"60px"},dangerouslySetInnerHTML:{__html:e$(A.footer,{...eH,numero_page:n,total_pages:f})}})]},n)})})]})]})}var eG=e.i(952571),eW=e.i(77705),eX=e.i(178583),eK=e.i(964978);e.i(882205);var eQ=e.i(846932),eY=e.i(88653),eZ=e.i(762687);let eJ=`
  <div style="width: 100%; padding: 10px 0 10px 0; margin-bottom: 12px; font-family: 'Times New Roman', Times, serif;">
    <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0; table-layout: fixed;">
      <tr>
        <td style="width: 70%; vertical-align: top; padding-right: 15px; border: 0; text-align: left;">
          <p style="font-weight: bold; font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; margin: 0 0 3px 0; color: #1A1A1A; line-height: 1.2;">
            {ecole_nom}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            {ecole_adresse}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            {ecole_code_postal} {ecole_ville}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            Email : {ecole_email}
          </p>
          <p style="font-size: 7.5pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 1px 0; line-height: 1.3;">
            Tel : {ecole_telephone}
          </p>
        </td>
        <td style="width: 30%; vertical-align: top; border: 0; text-align: right;">
          {ecole_logo}
        </td>
      </tr>
    </table>
  </div>
`,e0=`
  <div style="padding: 8px 0 6px 0; margin-top: 10px; background-color: #FAFAFA; font-family: 'Times New Roman', Times, serif;">
    <p style="font-size: 7pt; font-family: 'Times New Roman', Times, serif; color: #1A1A1A; margin: 0; text-align: center; font-weight: 500; line-height: 1.3;">
      {ecole_nom} | {ecole_adresse} {ecole_ville} {ecole_code_postal} | Num\xe9ro SIRET: {ecole_siret}
    </p>
    <p style="font-size: 7pt; font-family: 'Times New Roman', Times, serif; color: #666; margin: 2px 0 0 0; text-align: center; line-height: 1.2;">
      Num\xe9ro de d\xe9claration d'activit\xe9: {ecole_numero_declaration} <em>(aupr\xe8s du pr\xe9fet de r\xe9gion de: {ecole_region})</em>
    </p>
    <p style="font-size: 7pt; font-family: 'Times New Roman', Times, serif; color: #888; font-style: italic; margin: 2px 0 0 0; text-align: center; line-height: 1.2;">
      Cet enregistrement ne vaut pas l'agr\xe9ment de l'\xc9tat.
    </p>
  </div>
`;function e1(e,t){return`
    <div style="margin-top: 40px;">
      <p style="text-align: center; margin-bottom: 25px; font-size: 10pt;">
        Fait \xe0 {ecole_ville}, le {date_jour}
      </p>
      
      <div style="display: flex; justify-content: space-between;">
        <div style="width: 45%; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">${e}</p>
          <p style="margin-bottom: 8px; font-size: 10pt;">{ecole_nom}</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
            <p style="font-size: 9pt; color: #666;">Signature</p>
          </div>
        </div>
        <div style="width: 45%; text-align: center;">
          <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">${t}</p>
          <p style="margin-bottom: 8px; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
            <p style="font-size: 9pt; color: #666;">Signature</p>
          </div>
        </div>
      </div>
    </div>
  `}let e9={convention:{type:"convention",name:"Contrat de formation professionnelle",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          Contrat de formation professionnelle
        </h1>
        <p style="font-size: 9pt; color: #666; margin: 0; font-style: italic;">
          (Article L. 6353-1 du Code du Travail D\xe9cret N\xb0 2018-1341 du 28 d\xe9cembre 2018)
        </p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="font-weight: bold; margin: 0 0 12px 0; font-size: 11pt;">Entre l'organisme de formation : {ecole_nom}</p>
        <p style="margin: 0 0 3px 0; font-size: 10pt;">immatricul\xe9e au RCS de sous le num\xe9ro {ecole_siret}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;">Dont le si\xe8ge social est situ\xe9 {ecole_adresse} {ecole_code_postal} {ecole_ville}.</p>
        
        <p style="margin: 12px 0 0 0; font-size: 10pt;">
          Repr\xe9sent\xe9e aux fins des pr\xe9sentes par {ecole_representant} en sa qualit\xe9 de repr\xe9sentant, d\xfbment habilit\xe9(e).
        </p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">
          D\xe9claration d'activit\xe9 n\xb0{ecole_numero_declaration} aupr\xe8s de la pr\xe9fecture de la r\xe9gion {ecole_region}.
        </p>
        
        <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
          Ci-apr\xe8s d\xe9nomm\xe9e \xab l'Organisme de Formation \xbb
        </p>
        
        <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'une part</p>
        
        <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">Et {eleve_prenom} {eleve_nom}</p>
        
        <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
          Ci-apr\xe8s d\xe9nomm\xe9e \xab le B\xe9n\xe9ficiaire \xbb
        </p>
        
        <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'autre part</p>
        
        <p style="margin: 20px 0 15px 0; font-style: italic; font-size: 10pt;">
          Ci-apr\xe8s individuellement ou collectivement d\xe9sign\xe9(s) la ou les \xab Partie(s) \xbb
        </p>
      </div>

      <p style="text-align: justify; line-height: 1.6; margin: 20px 0; font-size: 10pt;">
        Il est conclu un contrat de formation professionnelle conform\xe9ment aux dispositions des articles L. 6311-1 \xe0 L. 6363-2 du Code du Travail, et 
        \xe9galement en application des dispositions du Livre III de la 6\xe8me partie et des cat\xe9gories pr\xe9vues \xe0 l'article L6313.1 du Code du Travail relatif \xe0 la 
        formation professionnelle continue tout au long de la vie
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">1. Objet du contrat</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        Aux termes du pr\xe9sent contrat, l'Organisme de Formation s'engage \xe0 organiser l'action de formation suivante :
      </p>
      <p style="font-weight: bold; font-size: 11pt; margin: 10px 0;">{formation_nom} DU {session_debut} au {session_fin}</p>
      
      <p style="margin: 10px 0 5px 0; font-size: 10pt;">
        Cat\xe9gorie de l'action de formation (art. L6313-1 du code du travail) :<br/>
        <strong>Action de formation</strong>
      </p>
      
      <p style="margin: 15px 0 8px 0; font-size: 10pt;">
        Dipl\xf4me vis\xe9 : <strong>Certification (dont CQP) ou habilitation enregistr\xe9e au R\xe9pertoire National des Certifications Professionnelles (RNCP)</strong>
      </p>
      
      <p style="margin: 15px 0 5px 0; font-size: 10pt;">Objectifs : {formation_objectifs}</p>
      <p style="margin: 5px 0; font-size: 10pt;">Contenu de l'action de formation et moyens pr\xe9vus : Annexe 1</p>
      <p style="margin: 5px 0; font-size: 10pt;">Dur\xe9e : <strong>{formation_duree}</strong></p>
      <p style="margin: 5px 0; font-size: 10pt;">Lieu de la formation : <strong>{session_lieu}</strong></p>
      <p style="margin: 5px 0; font-size: 10pt;">Effectifs form\xe9s : <strong>{session_effectif}</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #F3F4F6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #E5E7EB; font-weight: bold;">Date</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #E5E7EB; font-weight: bold;">Heure</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #E5E7EB; font-weight: bold;">Lieu</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">du {session_debut} au {session_fin}</td>
            <td style="padding: 8px; text-align: center; border: 1px solid #E5E7EB;">en pr\xe9sentiel</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #E5E7EB;">en pr\xe9sentiel</td>
          </tr>
        </tbody>
      </table>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">2. Effectif form\xe9</h2>
      
      <p style="font-size: 10pt; margin: 0 0 10px 0;"><strong>Public vis\xe9 au sens de l'article L 6313-3 du Code du Travail :</strong></p>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>les actions de formation ont pour objet de permettre \xe0 toute personne sans qualification professionnelle ou sans contrat de travail d'acc\xe9der dans les meilleures conditions \xe0 un emploi</li>
        <li>favoriser l'adaptation des travailleurs \xe0 leur poste de travail, \xe0 l'\xe9volution des emplois ainsi que leur maintien dans l'emploi et de participer au d\xe9veloppement des comp\xe9tences en lien ou non avec leur poste de travail. Elles peuvent permettre \xe0 des travailleurs d'acqu\xe9rir une qualification plus \xe9lev\xe9e</li>
        <li>r\xe9duire, pour les travailleurs dont l'emploi est menac\xe9, les risques r\xe9sultant d'une qualification inadapt\xe9e \xe0 l'\xe9volution des techniques et des structures des entreprises, en les pr\xe9parant \xe0 une mutation d'activit\xe9 soit dans le cadre, soit en dehors de leur entreprise. Elles peuvent permettre \xe0 des salari\xe9s dont le contrat de travail est rompu d'acc\xe9der \xe0 des emplois exigeant une qualification diff\xe9rente, ou \xe0 des non-salari\xe9s d'acc\xe9der \xe0 de nouvelles activit\xe9s professionnelles</li>
        <li>favoriser la mobilit\xe9 professionnelle.</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">3. Prix de la formation</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        En contrepartie de cette action de formation, le b\xe9n\xe9ficiaire (ou le financeur dans le cadre d'une subrogation de paiement) s'acquittera des co\xfbts 
        suivants qui couvrent l'int\xe9gralit\xe9 des frais engag\xe9s par l'organisme de formation pour cette session :
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #F3F4F6;">
            <th style="padding: 8px; text-align: left; border: 1px solid #E5E7EB; font-weight: bold;">Description</th>
            <th style="padding: 8px; text-align: right; border: 1px solid #E5E7EB; font-weight: bold;">Prix</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #E5E7EB;">Formation</td>
            <td style="padding: 8px; text-align: right; border: 1px solid #E5E7EB;">{montant_ttc}€</td>
          </tr>
        </tbody>
      </table>
      
      <p style="margin: 10px 0 5px 0; font-size: 10pt;">L'organisme de formation atteste \xeatre exon\xe9r\xe9 de TVA.</p>
      <p style="margin: 5px 0; font-size: 10pt; font-weight: bold;">TOTAL NET DE TAXES : {montant_ttc}€</p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">4. Modalit\xe9s de d\xe9roulement (pr\xe9sentiel, \xe0 distance, mixte, en situation de travail) et de suivi</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        La Formation s'effectue Formation pr\xe9sentielle.
      </p>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        Des feuilles de pr\xe9sence seront sign\xe9es par les Stagiaires et le(s) formateur(s) par demi-journ\xe9e de formation, l'objectif \xe9tant de justifier la 
        r\xe9alisation de la Formation.
      </p>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        L'appr\xe9ciation des r\xe9sultats se fera \xe0 travers la mise en œuvre QCM et/ou grilles d'\xe9valuation et/ou travaux pratiques et/ou fiches d'\xe9valuation 
        et/ou mises en situation et/ou autre.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">5. Moyens de sanction (dipl\xf4me, titre professionnel, certification, attestation de fin de formation ou autres)</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        \xc0 l'issue de la Formation, l'Organisme de Formation d\xe9livre au Stagiaire le {diplome_ou_certification} en cas de r\xe9ussite.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">6. D\xe9dit ou abandon</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
        En cas de d\xe9dit par le B\xe9n\xe9ficiaire \xe0 moins de 7 jours francs avant le d\xe9but de l'action mentionn\xe9e \xe0 l'article 1, ou d'abandon en cours de 
        Formation par un ou plusieurs Stagiaire(s), l'Organisme de Formation (i) remboursera sur le co\xfbt total, les sommes qu'il n'aura pas r\xe9ellement 
        d\xe9pens\xe9es ou engag\xe9es pour la r\xe9alisation de ladite action et/ou (ii) proposera une nouvelle date de Formation.
      </p>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Le cas \xe9ch\xe9ant, le B\xe9n\xe9ficiaire s'engage au versement d'un montant de 20 % du co\xfbt total de la Formation \xe0 titre de d\xe9dommagement, cette 
        somme ne pouvant faire l'objet d'un financement par fonds publics ou paritaires.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">7. Modalit\xe9s de r\xe8glement</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Le paiement sera d\xfb en totalit\xe9 \xe0 r\xe9ception d'une facture \xe9mise par l'Organisme de Formation \xe0 destination du B\xe9n\xe9ficiaire.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">8. Propri\xe9t\xe9 intellectuelle</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Les supports de formation, quelle qu'en soit la forme, et les contenus de toute nature (textes, images, visuels, musiques, logos, marques, base de 
        donn\xe9es, etc.) exploit\xe9s par l'Organisme de Formation dans le cadre de l'action de formation sont prot\xe9g\xe9s par tous droits de propri\xe9t\xe9 
        intellectuelle ou droits des producteurs de bases de donn\xe9es en vigueur. Tous d\xe9sassemblages, d\xe9compilations, d\xe9cryptages, extractions, 
        r\xe9utilisations, copies et plus g\xe9n\xe9ralement, tous actes de reproduction, repr\xe9sentation, diffusion et utilisation de l'un quelconque de ces 
        \xe9l\xe9ments, en tout ou partie, sans l'autorisation de l'Organisme de Formation sont strictement interdits et pourront faire l'objet de poursuites 
        judiciaires.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">9. Donn\xe9es \xe0 caract\xe8re personnel</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        L'Organisme de Formation pratique une politique de protection des donn\xe9es personnelles dont les caract\xe9ristiques sont explicit\xe9es dans la 
        politique de confidentialit\xe9.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">10. Diff\xe9rents \xe9ventuels</h2>
      <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
        Si une contestation ou un diff\xe9rend ne peuvent \xeatre r\xe9gl\xe9s \xe0 l'amiable, le Tribunal de {ecole_ville} sera seul comp\xe9tent pour r\xe9gler le litige.
      </p>

      <p style="text-align: center; margin: 30px 0 20px 0; font-size: 10pt;">
        Document r\xe9alis\xe9 en 2 exemplaires \xe0 {ecole_ville}, le {date_jour}.
      </p>

      <div style="margin-top: 40px;">
        <p style="text-align: center; margin-bottom: 25px; font-size: 10pt;">
          Pour l'organisme de formation,
        </p>
        
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">Pour l'Organisme de Formation</p>
            <p style="margin-bottom: 8px; font-size: 10pt;">{ecole_nom}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
              <p style="font-size: 9pt; color: #666;">Signature</p>
            </div>
          </div>
          <div style="width: 45%; text-align: center;">
            <p style="font-weight: bold; margin-bottom: 50px; font-size: 10pt;">Pour le B\xe9n\xe9ficiaire</p>
            <p style="margin-bottom: 8px; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
            <div style="border-top: 1px solid #1A1A1A; margin: 0 auto; width: 80%; padding-top: 8px;">
              <p style="font-size: 9pt; color: #666;">Signature</p>
            </div>
          </div>
        </div>
      </div>

      <div style="page-break-before: always; margin-top: 40px;">
        <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Annexe 1 : Programme de formation</h2>
        <p style="font-size: 10pt; margin: 0 0 10px 0;"><strong>Nom de la session :</strong> {formation_nom} DU {session_debut} au {session_fin}</p>
        
        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">DUR\xc9E ET LIEU DE FORMATION</h3>
        <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
          <li>Dur\xe9e en heures : {formation_duree}</li>
          <li>Lieu : {session_lieu}</li>
        </ul>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">PUBLIC CONCERN\xc9</h3>
        <p style="font-size: 10pt; margin: 0 0 20px 0;">{formation_public_concerne}</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">PR\xc9REQUIS</h3>
        <div style="font-size: 10pt; margin: 0 0 20px 0;">
          {formation_prerequis}
        </div>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">QUALIT\xc9 ET INDICATEURS DE R\xc9SULTATS</h3>
        <p style="font-size: 10pt; margin: 0 0 20px 0;">{formation_qualite_et_resultats}</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">ACCESSIBILIT\xc9</h3>
        <p style="font-size: 10pt; margin: 0 0 20px 0;">Formation accessible aux personnes en situation de handicap. Pour toutes demandes d'adaptation, veuillez contacter notre r\xe9f\xe9rent handicap.</p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">OBJECTIFS</h3>
        <div style="font-size: 10pt; margin: 0 0 20px 0;">
          {formation_objectifs}
        </div>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">CONTENU DE LA FORMATION</h3>
        <div style="font-size: 10pt; margin: 0 0 20px 0;">
          {formation_contenu}
        </div>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">ORGANISATION DE LA FORMATION</h3>
        <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
          <li><strong>\xc9quipe p\xe9dagogique :</strong> {formation_equipe_pedagogique}</li>
          <li><strong>Ressources p\xe9dagogiques et techniques pr\xe9vues :</strong> {formation_ressources}</li>
          <li>accueil des Stagiaires dans une salle d\xe9di\xe9e \xe0 la formation,</li>
          <li>fourniture des supports de formation : {formation_supports}</li>
        </ul>
      </div>

      <div style="page-break-before: always; margin-top: 40px;">
        <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Annexe 2 : R\xe8glement Int\xe9rieur</h2>
        
        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 1 - Objet et champ d'application</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 15px 0; font-size: 10pt;">
          Conform\xe9ment aux dispositions des articles L.6352-3, L.6352-4 et R.6352-1 \xe0 R.6352-15 du Code du Travail, le pr\xe9sent r\xe8glement a pour objet de 
          d\xe9terminer les principales mesures applicables en mati\xe8re de sant\xe9, de s\xe9curit\xe9 et de discipline aux stagiaires de l'organisme de formation, 
          d\xe9nomm\xe9 ci-apr\xe8s.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 15px 0; font-size: 10pt;">
          Tout stagiaire doit respecter les termes du pr\xe9sent r\xe8glement durant toute la dur\xe9e de l'action de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Toutefois, lorsque la formation se d\xe9roule dans une entreprise d\xe9j\xe0 dot\xe9e d'un r\xe8glement int\xe9rieur, les mesures de sant\xe9 et de s\xe9curit\xe9 
          applicables aux stagiaires sont celles de ce r\xe8glement.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 2 - Hygi\xe8ne et s\xe9curit\xe9</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Chaque stagiaire doit veiller au respect des consignes g\xe9n\xe9rales et particuli\xe8res en mati\xe8re d'hygi\xe8ne et de s\xe9curit\xe9, sous peine de sanctions 
          disciplinaires.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Propret\xe9 des locaux</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les stagiaires doivent maintenir en ordre et en \xe9tat de propret\xe9 constante les locaux o\xf9 se d\xe9roule la formation. \xc0 ce titre, il leur est interdit de 
          manger dans les salles de cours.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Alcool et produits stup\xe9fiants</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'introduction et la consommation de produits stup\xe9fiants ou de boissons alcoolis\xe9es est strictement interdite.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Il est \xe9galement interdit de p\xe9n\xe9trer ou de demeurer dans l'\xe9tablissement en \xe9tat d'ivresse ou sous l'emprise de produits stup\xe9fiants.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Consignes de s\xe9curit\xe9 – Incendie</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les consignes d'incendie et notamment un plan de localisation des extincteurs et des issues de secours sont affich\xe9s dans les locaux de formation 
          de mani\xe8re \xe0 \xeatre connus des stagiaires.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les stagiaires sont tenu\xb7e\xb7s d'ex\xe9cuter sans d\xe9lai l'ordre d'\xe9vacuation donn\xe9 par l'animateur de la formation ou par un salari\xe9 de l'entreprise o\xf9 
          se d\xe9roule la formation.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Accident - d\xe9claration</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tout accident ou incident survenu \xe0 l'occasion ou en cours de formation doit \xeatre imm\xe9diatement d\xe9clar\xe9 par le\xb7la stagiaire accident\xe9\xb7e ou les 
          personnes t\xe9moins de l'accident, \xe0 l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Conform\xe9ment \xe0 l'article R. 6342-3 du Code du Travail, l'accident survenu au\xb7\xe0 la stagiaire pendant qu'il\xb7elle se trouve sur le lieu de formation ou 
          pendant qu'il\xb7elle s'y rend ou en revient, fait l'objet d'une d\xe9claration par l'organisme de formation aupr\xe8s de la caisse de s\xe9curit\xe9 sociale.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">Interdiction de fumer ou de vapoter</p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Il est interdit de fumer ou de vapoter (utilisation d'une cigarette \xe9lectronique) dans les locaux de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Les stagiaires sont toutefois autoris\xe9\xb7e\xb7s pendant leur temps de pause \xe0 aller fumer ou vapoter \xe0 l'ext\xe9rieur de l'\xe9tablissement.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 3 – Horaires, absences et retards</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les horaires de la formation seront communiqu\xe9s aux stagiaires au pr\xe9alable. Les stagiaires sont tenu\xb7e\xb7s de respecter ces horaires.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Sauf autorisation express, les stagiaires ne peuvent pas s'absenter pendant les heures de formation. L'\xe9margement devra \xeatre fait au d\xe9but ou \xe0 
          la fin de chaque atelier selon la pratique de l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          En cas d'absence ou retard, les stagiaires en informent dans les plus brefs d\xe9lais l'organisme de formation et s'en justifier.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'employeur du stagiaire est inform\xe9 des absences dans les meilleurs d\xe9lais qui suivent la connaissance par l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          De plus, pour les stagiaires dont le co\xfbt de la formation est pris en charge par un financeur externe (OPCO, P\xf4le Emploi, Caisse des D\xe9p\xf4ts), les 
          absences non justifi\xe9es entra\xeenent une retenue sur la prise en charge du co\xfbt de la formation, proportionnelle \xe0 la dur\xe9e de l'absence.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 4 - Comportement</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Il est demand\xe9 \xe0 tout stagiaire d'avoir un comportement garantissant le respect des r\xe8gles \xe9l\xe9mentaires de savoir vivre, de savoir \xeatre en 
          collectivit\xe9 et le bon d\xe9roulement des formations.
        </p>
        <p style="font-size: 10pt; margin: 10px 0 5px 0; font-weight: bold;">\xc0 titre d'exemple, il est formellement interdit aux stagiaires :</p>
        <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
          <li>De modifier, d'utiliser \xe0 une fin tierce ou de diffuser les supports de formation sans l'autorisation express de l'organisme de formation ;</li>
          <li>De modifier les r\xe9glages des param\xe8tres de l'ordinateur ;</li>
          <li>D'utiliser leurs t\xe9l\xe9phones portables durant les sessions \xe0 des fins autres que celles de la formation.</li>
        </ul>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 5 : Acc\xe8s aux locaux</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les stagiaires ont acc\xe8s aux locaux o\xf9 se d\xe9roule la formation exclusivement pour suivre le stage auquel ils\xb7elles sont inscrit\xb7e\xb7s. Ils\xb7elles ne 
          peuvent y entrer ou y demeurer \xe0 d'autres fins, sauf autorisation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Il leur est interdit d'\xeatre accompagn\xe9\xb7e\xb7s de personnes non inscrites au stage.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 6 - Utilisation du mat\xe9riel</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tout\xb7e stagiaire est tenu\xb7e de conserver en bon \xe9tat le mat\xe9riel et la documentation mis \xe0 la disposition par l'organisme de formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'utilisation du mat\xe9riel \xe0 d'autres fins, notamment personnelles est interdite, sauf pour le mat\xe9riel mis \xe0 disposition \xe0 cet effet.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Il est formellement interdit de diffuser les codes personnels n\xe9cessaires pour se connecter \xe0 l'espace extranet.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          A la fin du stage, le\xb7la stagiaire est tenu\xb7e de restituer tout mat\xe9riel et document en sa possession appartenant \xe0 l'organisme de formation, sauf 
          les documents p\xe9dagogiques distribu\xe9s en cours de formation ou pr\xe9sents sur son extranet.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          La documentation p\xe9dagogique remise lors des sessions de formation est prot\xe9g\xe9e au titre des droits d'auteur et ne peut \xeatre r\xe9utilis\xe9e que pour 
          un strict usage personnel.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Il est formellement interdit pour le.la stagiaire, sauf d\xe9rogation expresse, d'enregistrer ou de filmer les sessions de formation.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 7 : Vol ou d\xe9gradation des biens personnels des stagiaires</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          L'organisme de formation d\xe9cline toute responsabilit\xe9 en cas de perte, vol ou d\xe9t\xe9rioration des objets personnels de toute nature d\xe9pos\xe9s par 
          les stagiaires dans les locaux de formation.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 8 - Sanctions</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tout agissement consid\xe9r\xe9 comme fautif pourra, en fonction de sa gravit\xe9, faire l'objet de l'une ou l'autre des sanctions ci-apr\xe8s, sans 
          n\xe9cessairement suivre l'ordre de ce classement :
        </p>
        <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
          <li>rappel \xe0 l'ordre ;</li>
          <li>avertissement \xe9crit ;</li>
          <li>bl\xe2me ;</li>
          <li>exclusion temporaire de la formation ;</li>
          <li>exclusion d\xe9finitive de la formation.</li>
        </ul>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          L'organisme de formation informe de la sanction prise le cas \xe9ch\xe9ant : l'employeur du\xb7de la stagiaire ou l'administration de l'agent stagiaire ; 
          et/ou le financeur du stage.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 9 - Proc\xe9dure disciplinaire</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          En application de l'article R.6352-4 du Code du Travail, \xab aucune sanction ne peut \xeatre prononc\xe9e \xe0 l'encontre du stagiaire sans que celui-ci ait 
          \xe9t\xe9 inform\xe9 au pr\xe9alable des griefs retenus contre lui \xbb.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Lorsque l'organisme de formation envisage une prise de sanction, il convoque le la stagiaire par lettre recommand\xe9e avec accus\xe9 de r\xe9ception ou 
          remise \xe0 l'int\xe9ress\xe9́ contre d\xe9charge en lui indiquant l'objet de la convocation, la date, l'heure et le lieu de l'entretien, sauf si la sanction 
          envisag\xe9e n'a pas d'incidence sur la pr\xe9sence du de la stagiaire pour la suite de la formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Au cours de l'entretien, le.la stagiaire a la possibilit\xe9 de se faire assister par une personne de son choix, stagiaire ou salari\xe9 de l'organisme de 
          formation. La convocation mentionn\xe9e \xe0 l'article pr\xe9c\xe8dent fait \xe9tat de cette facult\xe9. Lors de l'entretien, le motif de la sanction envisag\xe9e est 
          indiqu\xe9 au \xe0 la stagiaire : celui.celle-ci a alors la possibilit\xe9 de donner toute explication ou justification des faits qui lui sont reproch\xe9s.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Lorsqu'une mesure conservatoire d'exclusion temporaire \xe0 effet imm\xe9diat est consid\xe9r\xe9e comme indispensable par l'organisme de formation, 
          aucune sanction d\xe9finitive relative \xe0 l'agissement fautif \xe0 l'origine de cette exclusion ne peut \xeatre prise sans que le la stagiaire n'ait \xe9t\xe9 au 
          pr\xe9alable inform\xe9 des griefs retenus contre lui elle et, \xe9ventuellement, qu'il elle ait \xe9t\xe9 convoqu\xe9(e) \xe0 un entretien et ait eu la possibilit\xe9́ de 
          s'expliquer devant un Commission de discipline.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          La sanction ne peut intervenir moins d'un jour franc ni plus de 15 jours apr\xe8s l'entretien o\xf9, le cas \xe9ch\xe9ant, apr\xe8s avis de la Commission de 
          discipline.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Elle fait l'objet d'une notification \xe9crite et motiv\xe9e au \xe0 la stagiaire sous forme lettre recommand\xe9e, ou d'une lettre remise contre d\xe9charge.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          L'organisme de formation informe concomitamment l'employeur, et \xe9ventuellement l'organisme paritaire prenant \xe0 sa charge les frais de 
          formation, de la sanction prise.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 10 : Repr\xe9sentation des stagiaires</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Dans les stages d'une dur\xe9e sup\xe9rieure \xe0 500 heures, il est proc\xe9d\xe9 simultan\xe9ment \xe0 l'\xe9lection d'un d\xe9l\xe9gu\xe9 titulaire et d'un d\xe9l\xe9gu\xe9 suppl\xe9ant 
          conform\xe9ment aux dispositions des articles R.6352-9 et suivants du Code du Travail.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Tous les stagiaires sont \xe9lecteurs et \xe9ligibles, sauf les d\xe9tenus admis \xe0 participer \xe0 une action de formation professionnelle.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          L'organisme de formation organise le scrutin qui a lieu pendant les heures de formation, au plus t\xf4t 20 heures, au plus tard 40 heures apr\xe8s le 
          d\xe9but du stage. En cas d'impossibilit\xe9́ de d\xe9signer les repr\xe9sentants des stagiaires, l'organisme de formation dresse un PV de carence qu'il 
          transmet au pr\xe9fet de r\xe9gion territorialement comp\xe9tent.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Les d\xe9l\xe9gu\xe9s sont \xe9lus pour la dur\xe9e de la formation. Leurs fonctions prennent fin lorsqu'ils cessent, pour quelque cause que ce soit, de participer 
          \xe0 la formation.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0 0 10px 0; font-size: 10pt;">
          Si le d\xe9l\xe9gu\xe9 titulaire et le d\xe9l\xe9gu\xe9 suppl\xe9ant ont cess\xe9 leurs fonctions avant la fin de la session de formation, il est proc\xe9d\xe9 \xe0 une nouvelle 
          \xe9lection dans les conditions pr\xe9vues aux articles R.6352-9 \xe0 R.6352-12.
        </p>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Les repr\xe9sentants des stagiaires font toute suggestion pour am\xe9liorer le d\xe9roulement des stages et les conditions de vie des stagiaires dans 
          l'organisme de formation. Ils pr\xe9sentent toutes les r\xe9clamations individuelles ou collectives relatives \xe0 ces mati\xe8res, aux conditions d'hygi\xe8ne et 
          de s\xe9curit\xe9 ́ et \xe0 l'application du r\xe8glement int\xe9rieur.
        </p>

        <h3 style="font-size: 11pt; font-weight: bold; margin: 20px 0 10px 0; color: #1A1A1A;">Article 11 : Publicit\xe9</h3>
        <p style="text-align: justify; line-height: 1.6; margin: 0; font-size: 10pt;">
          Le pr\xe9sent r\xe8glement est affich\xe9 dans les locaux et sur le site internet de l'organisme de formation. En outre, un exemplaire est remis \xe0 chaque 
          stagiaire.
        </p>

        <p style="margin-top: 30px; font-size: 10pt;">Fait \xe0 {ecole_ville}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Le {date_jour}</p>
      </div>
    `,footerContent:e0},facture:{type:"facture",name:"Facture",headerContent:eJ,bodyContent:`
      <!-- En-t\xeate Facture Ultra Premium Compact -->
      <div style="margin-bottom: 5px;">
        <table cellpadding="0" cellspacing="0" style="width: 100%; border: 0;">
          <tr>
            <td style="width: 60%; vertical-align: top; border: 0;">
              <div style="background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%); color: white; padding: 6px 12px; border-radius: 3px; display: inline-block;">
                <p style="margin: 0; font-size: 16pt; font-weight: 800; letter-spacing: 0.3px; font-family: 'Times New Roman', Times, serif;">FACTURE</p>
              </div>
              <p style="margin: 3px 0 0 0; font-size: 10pt; font-weight: 700; color: #1E3A5F; font-family: 'Times New Roman', Times, serif;">N\xb0 {numero_facture}</p>
            </td>
            <td style="width: 40%; vertical-align: top; border: 0; text-align: right;">
              <table cellpadding="0" cellspacing="0" style="margin-left: auto; border: 0;">
                <tr>
                  <td style="padding: 1px 5px 1px 0; font-size: 6.5pt; color: #64748B; border: 0; text-align: right;">Date d'\xe9mission</td>
                  <td style="padding: 1px 0; font-size: 7.5pt; font-weight: 600; color: #1E293B; border: 0;">{date_emission}</td>
                </tr>
                <tr>
                  <td style="padding: 1px 5px 1px 0; font-size: 6.5pt; color: #64748B; border: 0; text-align: right;">\xc9ch\xe9ance</td>
                  <td style="padding: 1px 0; font-size: 7.5pt; font-weight: 600; color: #DC2626; border: 0;">{date_echeance}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- S\xe9parateur \xe9l\xe9gant -->
      <div style="height: 1px; background: linear-gradient(90deg, #2563EB 0%, #60A5FA 50%, transparent 100%); margin: 4px 0;"></div>

      <!-- Informations Client Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 5px; border: 0;">
        <tr>
          <td style="width: 55%; vertical-align: top; padding-right: 8px; border: 0;">
            <div style="background: #F8FAFC; border-left: 2px solid #2563EB; padding: 4px 8px; border-radius: 0 2px 2px 0;">
              <p style="margin: 0 0 2px 0; font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #64748B;">Factur\xe9 \xe0</p>
              <p style="margin: 0 0 1px 0; font-size: 9pt; font-weight: 700; color: #0F172A;">{eleve_prenom} {eleve_nom}</p>
              <p style="margin: 0 0 1px 0; font-size: 7pt; color: #475569; line-height: 1.15;">{eleve_adresse}</p>
              <p style="margin: 0 0 1px 0; font-size: 7pt; color: #475569; line-height: 1.15;">{eleve_code_postal} {eleve_ville}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #475569; line-height: 1.15;">{eleve_email} | {eleve_telephone}</p>
            </div>
          </td>
          <td style="width: 45%; vertical-align: top; border: 0;">
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; padding: 4px 8px; border-radius: 2px;">
              <p style="margin: 0 0 2px 0; font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; color: #1D4ED8;">R\xe9f\xe9rence client</p>
              <p style="margin: 0 0 1px 0; font-size: 8.5pt; font-weight: 700; color: #1E40AF;">N\xb0 {eleve_numero}</p>
              <p style="margin: 0; font-size: 7pt; color: #3B82F6; line-height: 1.15;">{formation_nom}</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- Tableau des prestations Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 5px; border-collapse: collapse; font-size: 7.5pt;">
        <thead>
          <tr>
            <th style="padding: 5px 6px; text-align: left; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.2px;">Description</th>
            <th style="padding: 5px 4px; text-align: center; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; width: 35px;">Qt\xe9</th>
            <th style="padding: 5px 4px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; width: 65px;">P.U. HT</th>
            <th style="padding: 5px 6px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-weight: 600; font-size: 6.5pt; text-transform: uppercase; width: 65px;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background: #FFFFFF;">
            <td style="padding: 6px; border-bottom: 1px solid #E2E8F0; border-left: 1px solid #E2E8F0;">
              <p style="margin: 0 0 1px 0; font-weight: 600; font-size: 8pt; color: #0F172A;">{formation_nom}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #64748B; line-height: 1.15;">{session_debut} → {session_fin} | {formation_duree}</p>
            </td>
            <td style="padding: 6px 4px; text-align: center; border-bottom: 1px solid #E2E8F0; font-weight: 500; color: #334155; font-size: 7.5pt;">1</td>
            <td style="padding: 6px 4px; text-align: right; border-bottom: 1px solid #E2E8F0; font-weight: 500; color: #334155; font-size: 7.5pt;">{montant_ht} €</td>
            <td style="padding: 6px; text-align: right; border-bottom: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0; font-weight: 700; color: #0F172A; font-size: 7.5pt;">{montant_ht} €</td>
          </tr>
        </tbody>
      </table>

      <!-- Bloc Totaux Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 5px; border: 0;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 8px; border: 0;">
            <!-- Montant en lettres -->
            <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 4px 8px; border-radius: 2px;">
              <p style="margin: 0 0 1px 0; font-size: 6pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; color: #166534;">Arr\xeat\xe9 \xe0 la somme de</p>
              <p style="margin: 0; font-size: 7.5pt; font-style: italic; color: #15803D; line-height: 1.15;">{montant_lettres}</p>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; border: 0;">
            <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7pt; color: #64748B; border: 1px solid #E2E8F0;">Sous-total HT</td>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7.5pt; font-weight: 600; color: #334155; border: 1px solid #E2E8F0; width: 70px;">{montant_ht} €</td>
              </tr>
              <tr>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7pt; color: #64748B; border: 1px solid #E2E8F0;">TVA ({taux_tva}%)</td>
                <td style="padding: 3px 6px; text-align: right; background: #F8FAFC; font-size: 7.5pt; font-weight: 500; color: #334155; border: 1px solid #E2E8F0;">{tva} €</td>
              </tr>
              <tr>
                <td style="padding: 5px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-size: 8pt; font-weight: 700; border-radius: 0 0 0 2px;">TOTAL TTC</td>
                <td style="padding: 5px; text-align: right; background: linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%); color: white; font-size: 9.5pt; font-weight: 800; border-radius: 0 0 2px 0;">{montant_ttc} €</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Informations de paiement Ultra Compact -->
      <table cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 4px; border: 0;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 4px; border: 0;">
            <div style="background: #FEF3C7; border-left: 2px solid #F59E0B; padding: 4px 8px; border-radius: 0 2px 2px 0;">
              <p style="margin: 0 0 2px 0; font-size: 6.5pt; font-weight: 700; color: #92400E;">💳 PAIEMENT</p>
              <p style="margin: 0 0 1px 0; font-size: 6.5pt; color: #78350F; line-height: 1.1;"><strong>Mode:</strong> {mode_paiement}</p>
              <p style="margin: 0; font-size: 6.5pt; color: #78350F; line-height: 1.1;"><strong>IBAN:</strong> {iban}</p>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 4px; border: 0;">
            <div style="background: #FEF2F2; border-left: 2px solid #EF4444; padding: 4px 8px; border-radius: 0 2px 2px 0;">
              <p style="margin: 0 0 2px 0; font-size: 6.5pt; font-weight: 700; color: #991B1B;">⚠️ RETARD</p>
              <p style="margin: 0; font-size: 6pt; color: #7F1D1D; line-height: 1.1;">Taux \xd7 3 + 40€ (L441-10)</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- Mentions l\xe9gales ultra compactes -->
      <div style="background: #F1F5F9; padding: 3px 8px; border-radius: 2px; margin-top: 3px;">
        <p style="margin: 0; font-size: 6pt; color: #64748B; text-align: center; line-height: 1.2;">
          TVA non applicable (art. 293B CGI) • SIRET: {ecole_siret} • D\xe9claration: {ecole_numero_declaration}
        </p>
      </div>
    `,footerContent:e0},devis:{type:"devis",name:"Devis",headerContent:eJ,bodyContent:`
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
        <div style="flex: 1;">
          <h1 style="font-size: 20pt; font-weight: bold; margin: 0; color: #1A1A1A;">DEVIS</h1>
          <p style="font-size: 12pt; margin: 8px 0 0 0; color: #666;">N\xb0 {numero_devis}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 10pt; margin: 0;"><strong>Date d'\xe9mission :</strong> {date_emission}</p>
          <p style="font-size: 10pt; margin: 5px 0;"><strong>Valable jusqu'au :</strong> {validite_devis}</p>
        </div>
      </div>

      <div style="border-top: 1px solid #E5E7EB; margin: 20px 0;"></div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
        <div style="width: 48%; padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A;">
          <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 10pt; text-transform: uppercase; color: #666;">Devis pour :</p>
          <p style="margin: 0; font-size: 11pt; font-weight: bold;">{eleve_nom} {eleve_prenom}</p>
          <p style="margin: 5px 0; font-size: 10pt; color: #666;">{eleve_adresse}</p>
          <p style="margin: 3px 0; font-size: 10pt; color: #666;">T\xe9l : {eleve_telephone}</p>
          <p style="margin: 3px 0; font-size: 10pt; color: #666;">Email : {eleve_email}</p>
        </div>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 11pt; font-weight: 600;">
          Objet : Devis pour la formation "{formation_nom}"
        </p>
        <p style="margin: 8px 0 0 0; font-size: 10pt; color: #333;">{formation_description}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #1A1A1A; color: white;">
            <th style="padding: 10px 12px; text-align: left; font-weight: bold;">Description de la formation</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: bold; width: 80px;">Dur\xe9e</th>
            <th style="padding: 10px 12px; text-align: right; font-weight: bold; width: 100px;">Prix HT</th>
            <th style="padding: 10px 12px; text-align: right; font-weight: bold; width: 100px;">Montant HT</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 12px;">
              <p style="margin: 0; font-weight: 600;">{formation_nom}</p>
              <p style="margin: 4px 0 0 0; font-size: 9pt; color: #666;">P\xe9riode : {session_debut} au {session_fin}</p>
              <p style="margin: 2px 0 0 0; font-size: 9pt; color: #666;">Lieu : {session_lieu}</p>
            </td>
            <td style="padding: 12px; text-align: center; font-weight: 500;">{formation_duree}</td>
            <td style="padding: 12px; text-align: right; font-weight: 500;">{montant_ht} €</td>
            <td style="padding: 12px; text-align: right; font-weight: 600;">{montant_ht} €</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: flex-end; margin-bottom: 25px;">
        <table style="width: 280px; border-collapse: collapse; font-size: 10pt;">
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB;">Sous-total HT :</td>
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB; font-weight: 600;">{montant_ht} €</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB;">TVA ({taux_tva}%) :</td>
            <td style="padding: 8px 12px; text-align: right; background-color: #F9FAFB;">{tva} €</td>
          </tr>
          <tr style="background-color: #1A1A1A; color: white;">
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 12pt;">TOTAL TTC :</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 12pt;">{montant_ttc} €</td>
          </tr>
        </table>
      </div>

      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 20px;">
        <p style="margin: 0 0 10px 0; font-size: 10pt; font-weight: 600; color: #92400E;">
          Conditions et validit\xe9 du devis
        </p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6; color: #78350F;">
          <li>Ce devis est valable jusqu'au <strong>{validite_devis}</strong></li>
          <li>Modalit\xe9s de paiement : <strong>{mode_paiement}</strong></li>
          <li>La r\xe9servation est d\xe9finitive apr\xe8s acceptation \xe9crite du pr\xe9sent devis</li>
          <li>En cas d'acceptation, un acompte de 30% peut \xeatre demand\xe9</li>
        </ul>
      </div>

      <div style="padding: 15px; background-color: #F0FDF4; border-left: 3px solid #10B981;">
        <p style="margin: 0; font-size: 10pt; line-height: 1.6; color: #166534;">
          <strong>Pour accepter ce devis :</strong><br/>
          Veuillez retourner ce document sign\xe9 par courrier, email ({ecole_email}) ou directement \xe0 notre secr\xe9tariat 
          avant le {validite_devis}.
        </p>
      </div>

      ${e1("L'Organisme de Formation","Le Client (Bon pour accord)")}
    `,footerContent:e0},convocation:{type:"convocation",name:"Convocation",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          CONVOCATION
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="font-size: 10pt; margin: 0 0 15px 0;">Madame, Monsieur,</p>
        <p style="font-size: 10pt; margin: 0 0 10px 0; text-align: justify; line-height: 1.6;">
          Nous avons l'honneur de vous convier \xe0 :
        </p>
      </div>

      <div style="padding: 20px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px;">
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Objet :</strong> {convocation_objet}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Date :</strong> {convocation_date}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Heure :</strong> {convocation_heure}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Lieu :</strong> {convocation_lieu}</p>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Adresse :</strong> {convocation_adresse}</p>
        <p style="margin: 0; font-size: 10pt;"><strong>Dur\xe9e pr\xe9vue :</strong> {convocation_duree}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Participant(s) :</strong></p>
        <p style="margin: 0; font-size: 10pt;">{eleve_nom} {eleve_prenom}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Num\xe9ro d'\xe9l\xe8ve : {eleve_numero}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Formation : {formation_nom}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Ordre du jour :</strong></p>
        <div style="margin-left: 15px; font-size: 10pt;">
          {convocation_contenu}
        </div>
      </div>

      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 10pt; font-weight: 600; color: #92400E;">Note importante :</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt; color: #78350F;">
          Veuillez confirmer votre pr\xe9sence avant le {date_confirmation} en r\xe9pondant \xe0 ce message ou en contactant 
          le {ecole_telephone}.
        </p>
      </div>

      <p style="margin: 25px 0 10px 0; font-size: 10pt;">Nous restons \xe0 votre disposition pour tout compl\xe9ment d'information.</p>
      <p style="margin: 10px 0 20px 0; font-size: 10pt;">Cordialement,</p>
      
      <div style="margin-top: 30px;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">{ecole_representant}</p>
        <p style="margin: 3px 0; font-size: 10pt;">{ecole_nom}</p>
      </div>

      <p style="margin-top: 25px; font-size: 9pt; color: #666;">
        Fait \xe0 {ecole_ville}, le {date_jour}
      </p>
    `,footerContent:e0},contrat:{type:"contrat",name:"Contrat de scolarité",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CONTRAT DE SCOLARIT\xc9
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Ann\xe9e scolaire {annee_scolaire}</p>
      </div>

      
    <div style="margin-bottom: 25px;">
      <p style="font-weight: bold; margin: 0 0 12px 0; font-size: 11pt;">Entre l'organisme de formation : {ecole_nom}</p>
      <p style="margin: 0 0 3px 0; font-size: 10pt;">immatricul\xe9e au RCS de sous le num\xe9ro {ecole_siret}</p>
      <p style="margin: 0 0 10px 0; font-size: 10pt;">Dont le si\xe8ge social est situ\xe9 {ecole_adresse} {ecole_code_postal} {ecole_ville}.</p>
      
      <p style="margin: 12px 0 0 0; font-size: 10pt;">
        Repr\xe9sent\xe9e aux fins des pr\xe9sentes par {ecole_representant} en sa qualit\xe9 de repr\xe9sentant, d\xfbment habilit\xe9(e).
      </p>
      <p style="margin: 5px 0 0 0; font-size: 10pt;">
        D\xe9claration d'activit\xe9 n\xb0{ecole_numero_declaration} aupr\xe8s de la pr\xe9fecture de la r\xe9gion .
      </p>
      
      <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
        Ci-apr\xe8s d\xe9nomm\xe9e \xab l'Organisme de Formation \xbb
      </p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'une part</p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">Et {eleve_prenom} {eleve_nom}</p>
      
      <p style="margin: 15px 0 5px 0; font-weight: bold; font-style: italic; font-size: 10pt;">
        Ci-apr\xe8s d\xe9nomm\xe9e \xab le B\xe9n\xe9ficiaire \xbb
      </p>
      
      <p style="margin: 20px 0 10px 0; font-weight: bold; font-size: 11pt;">D'autre part</p>
      
      <p style="margin: 20px 0 15px 0; font-style: italic; font-size: 10pt;">
        Ci-apr\xe8s individuellement ou collectivement d\xe9sign\xe9(s) la ou les \xab Partie(s) \xbb
      </p>
    </div>
  

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 1 - Inscription et scolarit\xe9</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">
        L'\xe9l\xe8ve <strong>{eleve_nom} {eleve_prenom}</strong> est inscrit(e) pour l'ann\xe9e scolaire <strong>{annee_scolaire}</strong> 
        dans la classe <strong>{eleve_classe}</strong> de l'\xe9tablissement <strong>{ecole_nom}</strong>.
      </p>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin-top: 10px;">
        La scolarit\xe9 d\xe9bute le {session_debut} et se termine le {session_fin}. 
        Les cours sont dispens\xe9s selon le calendrier scolaire et les horaires d\xe9finis par l'\xe9tablissement.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 2 - Frais de scolarit\xe9</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">
        Les frais de scolarit\xe9 pour l'ann\xe9e scolaire <strong>{annee_scolaire}</strong> s'\xe9l\xe8vent \xe0 
        <strong>{montant_ttc} €</strong> (en toutes lettres : {montant_lettres}).
      </p>
      <p style="margin: 15px 0 5px 0; font-size: 10pt;"><strong>Modalit\xe9s de paiement :</strong></p>
      <p style="font-size: 10pt; margin: 0;">{mode_paiement}</p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 3 - Obligations de l'\xe9l\xe8ve</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">L'\xe9l\xe8ve s'engage \xe0 :</p>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Suivre assid\xfbment tous les cours et activit\xe9s p\xe9dagogiques</li>
        <li>Respecter le r\xe8glement int\xe9rieur de l'\xe9tablissement</li>
        <li>Acquitter les frais de scolarit\xe9 dans les d\xe9lais convenus</li>
        <li>Participer activement aux \xe9valuations</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 4 - Engagements de l'\xe9tablissement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">L'\xe9tablissement s'engage \xe0 :</p>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Dispenser un enseignement de qualit\xe9 conforme aux programmes</li>
        <li>Fournir les moyens p\xe9dagogiques n\xe9cessaires</li>
        <li>Assurer le suivi p\xe9dagogique et l'\xe9valuation des acquis</li>
        <li>D\xe9livrer les documents administratifs n\xe9cessaires</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 5 - R\xe9siliation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt;">
        Le pr\xe9sent contrat peut \xeatre r\xe9sili\xe9 par l'une ou l'autre des parties, sous r\xe9serve d'un pr\xe9avis d'un mois. 
        En cas de r\xe9siliation par l'\xe9l\xe8ve ou sa famille, les frais de scolarit\xe9 dus pour la p\xe9riode d\xe9j\xe0 \xe9coul\xe9e 
        restent acquis \xe0 l'\xe9tablissement.
      </p>

      ${e1("L'Établissement","L'Élève / Représentant légal")}
    `,footerContent:e0},attestation_reussite:{type:"attestation_reussite",name:"Attestation de réussite",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION DE R\xc9USSITE
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, \xe9tablissement situ\xe9 \xe0 <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>ATTESTE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, n\xe9(e) le 
          <strong>{eleve_date_naissance}</strong>, num\xe9ro d'\xe9l\xe8ve <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          a suivi avec <strong>assiduit\xe9</strong> et a <strong>r\xe9ussi</strong> la formation intitul\xe9e 
          <strong>"{formation_nom}"</strong>
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          qui s'est d\xe9roul\xe9e du <strong>{session_debut}</strong> au <strong>{session_fin}</strong> 
          (dur\xe9e : {formation_duree}).
        </p>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">R\xe9sultats :</p>
        <p style="margin: 8px 0 0 0; font-size: 10pt;">Moyenne g\xe9n\xe9rale : <strong>{moyenne}/20</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Mention : <strong>{mention}</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Classement : <strong>{classement}</strong></p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 30px 0;">
        La pr\xe9sente attestation est d\xe9livr\xe9e \xe0 l'int\xe9ress\xe9(e) pour servir et valoir ce que de droit.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,footerContent:e0},certificat_scolarite:{type:"certificat_scolarite",name:"Certificat de scolarité",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CERTIFICAT DE SCOLARIT\xc9
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Ann\xe9e scolaire {annee_scolaire}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, \xe9tablissement situ\xe9 \xe0 <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>CERTIFIE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, n\xe9(e) le 
          <strong>{eleve_date_naissance}</strong>, num\xe9ro d'\xe9l\xe8ve <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          est r\xe9guli\xe8rement inscrit(e) dans cet \xe9tablissement pour l'ann\xe9e scolaire <strong>{annee_scolaire}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          en classe de <strong>{eleve_classe}</strong>.
        </p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 40px 0;">
        Le pr\xe9sent certificat est d\xe9livr\xe9 \xe0 l'int\xe9ress\xe9(e) pour servir et valoir ce que de droit.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,footerContent:e0},releve_notes:{type:"releve_notes",name:"Relevé de notes",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          RELEV\xc9 DE NOTES
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Ann\xe9e scolaire {annee_scolaire} - {trimestre}</p>
      </div>

      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
          <tr><td style="padding: 4px 0; width: 150px; font-weight: 600;">Nom :</td><td style="padding: 4px 0; font-weight: bold;">{eleve_nom}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Pr\xe9nom :</td><td style="padding: 4px 0; font-weight: bold;">{eleve_prenom}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Num\xe9ro d'\xe9l\xe8ve :</td><td style="padding: 4px 0;">{eleve_numero}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Classe :</td><td style="padding: 4px 0;">{eleve_classe}</td></tr>
        </table>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 10pt;">
        <thead>
          <tr style="background-color: #1A1A1A; color: white;">
            <th style="padding: 10px 12px; text-align: left; font-weight: bold;">Mati\xe8re</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: bold; width: 70px;">Coeff.</th>
            <th style="padding: 10px 12px; text-align: center; font-weight: bold; width: 80px;">Note /20</th>
            <th style="padding: 10px 12px; text-align: left; font-weight: bold;">Appr\xe9ciation</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #E5E7EB; background-color: #FAFAFA;">
            <td style="padding: 10px 12px; font-weight: 500;">{matiere_1}</td>
            <td style="padding: 10px 12px; text-align: center;">{coef_1}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: bold;">{note_1}</td>
            <td style="padding: 10px 12px; font-size: 9pt; color: #666;">{appreciation_1}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB;">
            <td style="padding: 10px 12px; font-weight: 500;">{matiere_2}</td>
            <td style="padding: 10px 12px; text-align: center;">{coef_2}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: bold;">{note_2}</td>
            <td style="padding: 10px 12px; font-size: 9pt; color: #666;">{appreciation_2}</td>
          </tr>
          <tr style="border-bottom: 1px solid #E5E7EB; background-color: #FAFAFA;">
            <td style="padding: 10px 12px; font-weight: 500;">{matiere_3}</td>
            <td style="padding: 10px 12px; text-align: center;">{coef_3}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: bold;">{note_3}</td>
            <td style="padding: 10px 12px; font-size: 9pt; color: #666;">{appreciation_3}</td>
          </tr>
        </tbody>
      </table>

      <div style="display: flex; justify-content: space-between; padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 25px;">
        <div style="flex: 1;">
          <p style="margin: 0 0 8px 0; font-size: 11pt;">
            <strong>Moyenne g\xe9n\xe9rale :</strong> <span style="font-size: 14pt; font-weight: bold;">{moyenne}/20</span>
          </p>
          <p style="margin: 0 0 5px 0; font-size: 10pt; color: #666;">Moyenne de la classe : {moyenne_classe}/20</p>
          <p style="margin: 0; font-size: 10pt; color: #666;">Classement : {classement} sur {effectif_classe} \xe9l\xe8ves</p>
        </div>
        <div style="text-align: right; padding-left: 20px;">
          <div style="padding: 10px 15px; background-color: #FEF3C7; border-radius: 4px; display: inline-block;">
            <p style="margin: 0; font-size: 9pt; font-weight: 600; color: #92400E; text-transform: uppercase;">Mention</p>
            <p style="margin: 4px 0 0 0; font-size: 12pt; font-weight: bold; color: #78350F;">{mention}</p>
          </div>
        </div>
      </div>

      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 25px;">
        <p style="font-weight: bold; margin: 0 0 10px 0; font-size: 10pt;">Appr\xe9ciation g\xe9n\xe9rale :</p>
        <p style="text-align: justify; line-height: 1.6; font-size: 10pt; color: #333; margin: 0;">
          {appreciations}
        </p>
      </div>

      <div style="margin-top: 40px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 30px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
        </div>
      </div>
    `,footerContent:e0},attestation_entree:{type:"attestation_entree",name:"Attestation d'entrée en formation",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION D'ENTR\xc9E EN FORMATION
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, \xe9tablissement situ\xe9 \xe0 <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>ATTESTE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, n\xe9(e) le 
          <strong>{eleve_date_naissance}</strong>, num\xe9ro d'\xe9l\xe8ve <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          a \xe9t\xe9 admis(e) et s'est inscrit(e) dans la formation intitul\xe9e <strong>"{formation_nom}"</strong>
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          qui d\xe9butera le <strong>{session_debut}</strong> et se terminera le <strong>{session_fin}</strong> 
          (dur\xe9e : {formation_duree}).
        </p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 40px 0;">
        La pr\xe9sente attestation est d\xe9livr\xe9e \xe0 l'int\xe9ress\xe9(e) pour servir et valoir ce que de droit, 
        notamment pour l'\xe9tablissement des droits sociaux et administratifs.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,footerContent:e0},reglement_interieur:{type:"reglement_interieur",name:"Règlement intérieur",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          R\xc8GLEMENT INT\xc9RIEUR
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">Ann\xe9e scolaire {annee_scolaire}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 12pt; font-weight: bold; margin: 0 0 12px 0; color: #1A1A1A;">PR\xc9AMBULE</h2>
        <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
          Le pr\xe9sent r\xe8glement int\xe9rieur a pour objet de fixer les r\xe8gles de vie collective applicables 
          \xe0 tous les membres de la communaut\xe9 \xe9ducative de <strong>{ecole_nom}</strong>. Il s'applique 
          \xe0 l'ensemble des personnes pr\xe9sentes dans l'\xe9tablissement.
        </p>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 1 : Principes g\xe9n\xe9raux</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'\xe9tablissement <strong>{ecole_nom}</strong> a pour mission de dispenser un enseignement de qualit\xe9 
        dans le respect des valeurs de la R\xe9publique : libert\xe9, \xe9galit\xe9, fraternit\xe9, la\xefcit\xe9.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 2 : Horaires</h2>
      <ul style="margin: 10px 0 10px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Horaires d'ouverture : {horaires_ouverture}</li>
        <li>Horaires des cours : {horaires_cours}</li>
        <li>Les \xe9l\xe8ves doivent arriver \xe0 l'heure et assister \xe0 tous les cours</li>
        <li>Tout retard ou absence doit \xeatre justifi\xe9</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 3 : Assiduit\xe9</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'assiduit\xe9 est obligatoire pour tous les cours et activit\xe9s p\xe9dagogiques. 
        Les absences doivent \xeatre signal\xe9es et justifi\xe9es dans les meilleurs d\xe9lais.
        En cas d'absences r\xe9p\xe9t\xe9es et non justifi\xe9es, l'\xe9tablissement se r\xe9serve le droit de prendre 
        les mesures appropri\xe9es.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 4 : Comportement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les \xe9l\xe8ves doivent adopter un comportement respectueux envers tous les membres de la communaut\xe9 
        \xe9ducative et se conformer aux r\xe8gles de politesse et de civilit\xe9.
        Tout acte de violence, de harc\xe8lement ou de discrimination est strictement interdit et peut 
        donner lieu \xe0 des sanctions disciplinaires.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 5 : Sanctions disciplinaires</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        En cas de manquement au r\xe8glement int\xe9rieur, des sanctions peuvent \xeatre prononc\xe9es selon 
        la gravit\xe9 des faits : avertissement, exclusion temporaire ou d\xe9finitive.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 6 : Hygi\xe8ne et s\xe9curit\xe9</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les consignes de s\xe9curit\xe9 affich\xe9es dans l'\xe9tablissement doivent \xeatre respect\xe9es.
        L'usage du tabac, de l'alcool et de toute substance illicite est strictement interdit.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 7 : Publicit\xe9</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Le pr\xe9sent r\xe8glement est affich\xe9 dans les locaux et sur le site internet de l'organisme de formation. En outre, un exemplaire est remis \xe0 chaque 
        stagiaire.
      </p>

      <div style="margin-top: 40px;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}</p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Le {date_jour}</p>
      </div>
    `,footerContent:e0},cgv:{type:"cgv",name:"Conditions Générales de Vente",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          CONDITIONS G\xc9N\xc9RALES DE VENTE
        </h1>
        <p style="font-size: 11pt; color: #666; margin: 0;">{ecole_nom}</p>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 1 - Objet</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les pr\xe9sentes Conditions G\xe9n\xe9rales de Vente (CGV) r\xe9gissent les relations contractuelles entre 
        <strong>{ecole_nom}</strong> et ses clients dans le cadre de la vente de formations et de services \xe9ducatifs.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 2 - Commandes</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Toute commande de formation implique l'acceptation sans r\xe9serve des pr\xe9sentes CGV. 
        La commande devient ferme et d\xe9finitive apr\xe8s acceptation de l'\xe9tablissement.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 3 - Prix</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Les prix des formations sont indiqu\xe9s en euros TTC. Ils sont fermes et non r\xe9visables pendant 
        la dur\xe9e de validit\xe9 indiqu\xe9e sur le devis.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 4 - Modalit\xe9s de paiement</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Le paiement s'effectue selon les modalit\xe9s d\xe9finies dans le contrat ou le devis accept\xe9. 
        En cas de retard de paiement, des p\xe9nalit\xe9s de retard au taux de 3 fois le taux l\xe9gal 
        peuvent \xeatre appliqu\xe9es.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 5 - Droit de r\xe9tractation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        Conform\xe9ment \xe0 la l\xe9gislation en vigueur, le client dispose d'un d\xe9lai de 14 jours calendaires 
        pour exercer son droit de r\xe9tractation \xe0 compter de l'acceptation de la commande.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 6 - Annulation</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        En cas d'annulation par le client, des frais d'annulation peuvent \xeatre appliqu\xe9s selon 
        les conditions pr\xe9vues dans le contrat. L'\xe9tablissement se r\xe9serve le droit d'annuler 
        une formation en cas d'insuffisance d'inscriptions.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 7 - Responsabilit\xe9</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'\xe9tablissement s'engage \xe0 dispenser les formations dans les conditions de qualit\xe9 
        pr\xe9vues. La responsabilit\xe9 de l'\xe9tablissement est limit\xe9e aux dommages directs et pr\xe9visibles.
      </p>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Article 8 - Litiges</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        En cas de litige, les parties conviennent de rechercher une solution amiable avant toute 
        action judiciaire. \xc0 d\xe9faut, les tribunaux de {ecole_ville} seront seuls comp\xe9tents.
      </p>

      <div style="margin-top: 40px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 30px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
        </div>
      </div>
    `,footerContent:e0},programme:{type:"programme",name:"Programme de formation",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0 0 8px 0; color: #1A1A1A;">
          PROGRAMME DE FORMATION
        </h1>
        <p style="font-size: 14pt; font-weight: bold; margin: 10px 0 0 0; color: #333;">
          {programme_nom}
        </p>
        <p style="font-size: 10pt; color: #666; margin: 5px 0 0 0;">
          Code : {programme_code} | Dur\xe9e totale : {programme_duree_totale}
        </p>
      </div>

      <div style="padding: 15px; background-color: #F9FAFB; border-left: 3px solid #1A1A1A; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11pt; font-weight: bold;">📋 Description du programme :</p>
        <p style="margin: 0; text-align: justify; line-height: 1.6; font-size: 10pt;">
          {programme_description}
        </p>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11pt; font-weight: bold;">🎯 Objectifs du programme :</p>
        <p style="margin: 0; text-align: justify; line-height: 1.6; font-size: 10pt;">
          {programme_objectifs}
        </p>
      </div>

      <div style="padding: 15px; background-color: #FEF3C7; border-left: 3px solid #F59E0B; margin-bottom: 20px;">
        <p style="margin: 0 0 8px 0; font-size: 11pt; font-weight: bold;">👥 Public concern\xe9 :</p>
        <p style="margin: 0; line-height: 1.6; font-size: 10pt;">
          {programme_public_concerne}
        </p>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">Pr\xe9requis</h2>
      <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
        <li>{prerequis_1}</li>
        <li>{prerequis_2}</li>
        <li>{prerequis_3}</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">CONTENU P\xc9DAGOGIQUE</h2>

      <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0;">Module 1 : {module_1_titre}</h3>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Dur\xe9e :</strong> {module_1_duree}</p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6;">
          <li>{module_1_contenu_1}</li>
          <li>{module_1_contenu_2}</li>
          <li>{module_1_contenu_3}</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0;">Module 2 : {module_2_titre}</h3>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Dur\xe9e :</strong> {module_2_duree}</p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6;">
          <li>{module_2_contenu_1}</li>
          <li>{module_2_contenu_2}</li>
          <li>{module_2_contenu_3}</li>
        </ul>
      </div>

      <div style="margin-bottom: 20px; padding: 15px; background-color: #FAFAFA; border-radius: 4px;">
        <h3 style="font-size: 11pt; font-weight: bold; margin: 0 0 10px 0;">Module 3 : {module_3_titre}</h3>
        <p style="margin: 0 0 10px 0; font-size: 10pt;"><strong>Dur\xe9e :</strong> {module_3_duree}</p>
        <ul style="margin: 0 0 0 20px; font-size: 10pt; line-height: 1.6;">
          <li>{module_3_contenu_1}</li>
          <li>{module_3_contenu_2}</li>
          <li>{module_3_contenu_3}</li>
        </ul>
      </div>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">M\xc9THODES P\xc9DAGOGIQUES</h2>
      <ul style="margin: 10px 0 20px 20px; font-size: 10pt; line-height: 1.6;">
        <li>Cours th\xe9oriques et pratiques</li>
        <li>Travaux dirig\xe9s et \xe9tudes de cas</li>
        <li>Projets et mises en situation</li>
        <li>\xc9valuations continues</li>
      </ul>

      <h2 style="font-size: 12pt; font-weight: bold; margin: 25px 0 12px 0; color: #1A1A1A;">MODALIT\xc9S D'\xc9VALUATION</h2>
      <p style="text-align: justify; line-height: 1.6; font-size: 10pt; margin: 0;">
        L'\xe9valuation se fait par contr\xf4le continu, travaux pratiques et examen final. 
        Une attestation de r\xe9ussite est d\xe9livr\xe9e aux participants ayant obtenu une moyenne 
        minimale de 10/20.
      </p>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin: 25px 0;">
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Dates de formation :</strong></p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;">Du {session_debut} au {session_fin}</p>
        <p style="margin: 0 0 8px 0; font-size: 10pt;"><strong>Lieu :</strong> {session_lieu}</p>
        <p style="margin: 0; font-size: 10pt;"><strong>Horaires :</strong> {session_horaires}</p>
      </div>

      <div style="margin-top: 30px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 20px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
        </div>
      </div>
    `,footerContent:e0},attestation_assiduite:{type:"attestation_assiduite",name:"Attestation d'assiduité",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          ATTESTATION D'ASSIDUIT\xc9
        </h1>
      </div>

      <div style="margin-bottom: 25px;">
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          Le directeur de <strong>{ecole_nom}</strong>, \xe9tablissement situ\xe9 \xe0 <strong>{ecole_adresse}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          <strong>ATTESTE</strong> que <strong>{eleve_nom} {eleve_prenom}</strong>, n\xe9(e) le 
          <strong>{eleve_date_naissance}</strong>, num\xe9ro d'\xe9l\xe8ve <strong>{eleve_numero}</strong>,
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0 0 15px 0;">
          a suivi avec <strong>assiduit\xe9</strong> la formation intitul\xe9e <strong>"{formation_nom}"</strong>
        </p>
        <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 0;">
          qui s'est d\xe9roul\xe9e du <strong>{session_debut}</strong> au <strong>{session_fin}</strong> 
          (dur\xe9e totale : {formation_duree}).
        </p>
      </div>

      <div style="padding: 15px; background-color: #F0F9FF; border-left: 3px solid #0EA5E9; margin-bottom: 25px;">
        <p style="margin: 0; font-size: 10pt; font-weight: bold;">Taux de pr\xe9sence :</p>
        <p style="margin: 8px 0 0 0; font-size: 10pt;">Heures suivies : <strong>{heures_suivies}</strong> sur <strong>{heures_totales}</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 10pt;">Taux d'assiduit\xe9 : <strong>{taux_assiduite}%</strong></p>
      </div>

      <p style="text-align: justify; line-height: 1.8; font-size: 10pt; margin: 40px 0;">
        La pr\xe9sente attestation est d\xe9livr\xe9e \xe0 l'int\xe9ress\xe9(e) pour servir et valoir ce que de droit, 
        notamment pour l'\xe9tablissement des droits sociaux, administratifs et pour justifier de sa 
        pr\xe9sence en formation.
      </p>

      <div style="margin-top: 50px; text-align: right;">
        <p style="margin: 0; font-size: 10pt;">Fait \xe0 {ecole_ville}, le {date_jour}</p>
        <div style="margin-top: 40px;">
          <p style="margin: 0; font-weight: bold; font-size: 10pt;">{ecole_representant}</p>
          <p style="margin: 3px 0 0 0; font-size: 10pt;">Directeur</p>
          <div style="border-top: 1px solid #1A1A1A; margin: 30px 0 0 auto; width: 180px; padding-top: 8px; text-align: center;">
            <p style="font-size: 9pt; color: #666; margin: 0;">Signature et cachet</p>
          </div>
        </div>
      </div>
    `,footerContent:e0},certificat_realisation:{type:"certificat_realisation",name:"Certificat de réalisation",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          CERTIFICAT DE R\xc9ALISATION
        </h1>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6;">
          L'\xe9tablissement <strong>{ecole_nom}</strong> certifie que 
          <strong>{eleve_prenom} {eleve_nom}</strong> a r\xe9alis\xe9 avec succ\xe8s la formation 
          <strong>"{formation_nom}"</strong>.
        </p>
      </div>
      
      <div style="margin-top: 50px; text-align: center;">
        <p style="margin-bottom: 30px;">{ecole_ville}, le {date_jour}</p>
        <p><strong>Le Directeur</strong></p>
        <p style="margin-top: 40px;">________________________</p>
        <p>{ecole_directeur}</p>
      </div>
    `,footerContent:e0},livret_accueil:{type:"livret_accueil",name:"Livret d'accueil",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          LIVRET D'ACCUEIL
        </h1>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">BIENVENUE</h2>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6;">
          Bienvenue \xe0 <strong>{ecole_nom}</strong>.
        </p>
        <p style="text-align: justify; font-size: 11pt; line-height: 1.6; margin-top: 10px;">
          Ce livret vous pr\xe9sente les informations essentielles de notre \xe9tablissement.
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 14pt; font-weight: bold; margin-bottom: 15px;">PR\xc9SENTATION</h2>
        <p style="font-size: 11pt; line-height: 1.6;"><strong>\xc9tablissement :</strong> {ecole_nom}</p>
        <p style="font-size: 11pt; line-height: 1.6;"><strong>Adresse :</strong> {ecole_adresse}, {ecole_ville}</p>
        <p style="font-size: 11pt; line-height: 1.6;"><strong>Contact :</strong> {ecole_telephone} | {ecole_email}</p>
      </div>
    `,footerContent:e0},emargement:{type:"emargement",name:"Feuille d'émargement",headerContent:eJ,bodyContent:`
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="font-size: 16pt; font-weight: bold; margin: 0; color: #1A1A1A;">
          FEUILLE D'\xc9MARGEMENT
        </h1>
      </div>
      
      <div style="margin-bottom: 30px;">
        <p style="font-size: 11pt; line-height: 1.6;"><strong>Formation :</strong> {formation_nom}</p>
        <p style="font-size: 11pt; line-height: 1.6;"><strong>Session :</strong> {session_nom}</p>
        <p style="font-size: 11pt; line-height: 1.6;"><strong>Date :</strong> {session_debut}</p>
        <p style="font-size: 11pt; line-height: 1.6;"><strong>Lieu :</strong> {session_lieu}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 30px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left; font-size: 11pt;">Nom et Pr\xe9nom</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 11pt;">Signature</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-size: 11pt;">{eleve_prenom} {eleve_nom}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">________________</td>
          </tr>
        </tbody>
      </table>
    `,footerContent:e0}},e2=(0,eF.default)(()=>e.A(158930).then(e=>({default:e.TableEditor})),{loadableGenerated:{modules:[140501]},ssr:!1}),e6=(0,eF.default)(()=>e.A(604566).then(e=>({default:e.ShapeEditor})),{loadableGenerated:{modules:[834606]},ssr:!1}),e5=(0,eF.default)(()=>e.A(906380).then(e=>({default:e.ElementPalette})),{loadableGenerated:{modules:[273026]},ssr:!1}),e4=(0,eF.default)(()=>e.A(807263).then(e=>({default:e.MediaLibrary})),{loadableGenerated:{modules:[697899]},ssr:!1}),e8=(0,eF.default)(()=>e.A(25177).then(e=>({default:e.QuickTemplates})),{loadableGenerated:{modules:[300756]},ssr:!1}),e3=(0,eF.default)(()=>e.A(445894).then(e=>({default:e.StylePalette})),{loadableGenerated:{modules:[891564]},ssr:!1}),e7=(0,eF.default)(()=>e.A(870781).then(e=>({default:e.WatermarkEditor})),{loadableGenerated:{modules:[377120]},ssr:!1});(0,eF.default)(()=>e.A(599661).then(e=>({default:e.ChartEditor})),{loadableGenerated:{modules:[836246]},ssr:!1});let te=(0,eF.default)(()=>e.A(810741).then(e=>({default:e.ColumnLayout})),{loadableGenerated:{modules:[311993]},ssr:!1}),tt=(0,eF.default)(()=>e.A(328488).then(e=>({default:e.ColorPicker})),{loadableGenerated:{modules:[109098]},ssr:!1}),ti=(0,eF.default)(()=>e.A(957964).then(e=>({default:e.TextBox})),{loadableGenerated:{modules:[268655]},ssr:!1}),tn=(0,eF.default)(()=>e.A(615357).then(e=>({default:e.ImageResizer})),{loadableGenerated:{modules:[944369]},ssr:!1});(0,eF.default)(()=>e.A(364782).then(e=>({default:e.LayoutGrid})),{loadableGenerated:{modules:[911350]},ssr:!1}),(0,eF.default)(()=>e.A(364782).then(e=>({default:e.GridOverlay})),{loadableGenerated:{modules:[911350]},ssr:!1}),(0,eF.default)(()=>e.A(364782).then(e=>({default:e.Rulers})),{loadableGenerated:{modules:[911350]},ssr:!1});let ts=(0,eF.default)(()=>e.A(519829).then(e=>({default:e.SignatureField})),{loadableGenerated:{modules:[939754]},ssr:!1}),ta=(0,eF.default)(()=>e.A(492331).then(e=>({default:e.MapEmbed})),{loadableGenerated:{modules:[473345]},ssr:!1}),tr=(0,eF.default)(()=>e.A(934367).then(e=>({default:e.AttachmentEmbed})),{loadableGenerated:{modules:[897169]},ssr:!1}),tl=(0,eF.default)(()=>e.A(393911).then(e=>({default:e.FormFieldEditor})),{loadableGenerated:{modules:[810760]},ssr:!1}),to=(0,eF.default)(()=>e.A(212612).then(e=>({default:e.CollaborationUsers})),{loadableGenerated:{modules:[487442]},ssr:!1});function td({template:e,onTemplateChange:s,onEditorRefReady:a,isActive:r}){let{user:l}=(0,o.useAuth)(),d=(0,n.useRef)(null),p=(0,n.useRef)(!1),[x,m]=(0,n.useState)(()=>{let t=e.content?.html,i=e.content?.elements?.[0]?.content;return(0,ez.convertTagsToVariableNodes)(t||i||"")});(0,n.useEffect)(()=>{if(!e.id||!e.type)return;let t=e.content?.html,i=e.content?.elements?.[0]?.content,n=t||i||"",a=n.trim();if(console.log("[BodyEditor] Template chargé:",{templateId:e.id,templateType:e.type,hasHtml:!!t,hasElementsContent:!!i,currentContentLength:n.length,trimmedLength:a.length}),!a||a.length<50){console.log("[BodyEditor] Contenu vide ou trop court ("+a.length+" caractères), initialisation avec le contenu par défaut...");try{let t=e9[e.type];if(console.log("[BodyEditor] Contenu par défaut récupéré:",{hasBodyContent:!!t.bodyContent,bodyContentLength:t.bodyContent?.length||0}),t.bodyContent&&t.bodyContent.trim().length>50){let i=t.bodyContent;console.log("[BodyEditor] Mise à jour du template avec le contenu par défaut ("+i.length+" caractères)");let n=(0,ez.convertTagsToVariableNodes)(i);m(n),s({content:{...e.content,elements:[{id:"main-content",type:"text",position:{x:0,y:0},content:i}]},header:{...e.header,content:t.headerContent},footer:{...e.footer,content:t.footerContent}})}else console.warn("[BodyEditor] Le contenu par défaut est également vide ou trop court")}catch(e){console.error("[BodyEditor] Erreur lors de l'initialisation du contenu par défaut:",e)}}else n===x||p.current||(console.log("[BodyEditor] Synchronisation du contenu depuis le template ("+a.length+" caractères)"),p.current=!0,m((0,ez.convertTagsToVariableNodes)(n)),setTimeout(()=>{p.current=!1},100))},[e.id,e.type,e.content]);let[g,h]=(0,n.useState)(!1),[f,y]=(0,n.useState)(!1),[b,v]=(0,n.useState)(!1),[j,w]=(0,n.useState)(!1),[_,C]=(0,n.useState)(!1),[N,A]=(0,n.useState)(!1),[z,k]=(0,n.useState)(!1),[T,E]=(0,n.useState)(!1),[F,S]=(0,n.useState)(!1),[L,D]=(0,n.useState)(!1),[M,I]=(0,n.useState)(null),[B,P]=(0,n.useState)(!1),[q,R]=(0,n.useState)(!1),[O,H]=(0,n.useState)(!1),[$,V]=(0,n.useState)(!1),[U,G]=(0,n.useState)(!1),[W,X]=(0,n.useState)(!1),[K,Q]=(0,n.useState)(!1),[Y,Z]=(0,n.useState)(null),[J,ee]=(0,n.useState)(1),[et,ei]=(0,n.useState)(!0),[en,es]=(0,n.useState)(!1),[ea,er]=(0,n.useState)({enabled:!1,gridSize:10,snapToGrid:!1,showRulers:!1,showGuides:!1,guideColor:"#335ACF",gridColor:"#e5e7eb"}),[el,eo]=(0,n.useState)(!1);(0,eS.useSnapToGrid)(ea.gridSize,ea.snapToGrid),(0,n.useEffect)(()=>{if(!e.id||!l?.id)return;if(!t.default.env.NEXT_PUBLIC_WS_URL)return void h(!1);let i=!0;return(async()=>{try{await eZ.realtimeCollaborationService.initializeCollaboration(e.id,l.id,l.full_name||l.email||"Utilisateur",l.email||"",l.avatar_url||void 0),i&&h(!0)}catch(e){if(i){h(!1);let t=e instanceof Error?e.message:String(e);t.includes("désactivée")||t.includes("aucun serveur")||console.warn("Collaboration non disponible:",t)}}})(),()=>{i=!1,e.id&&l?.id&&eZ.realtimeCollaborationService.disconnect(e.id,l.id)}},[e.id,l?.id,l?.email,l?.full_name,l?.avatar_url]);let ed=(0,n.useRef)(!1);(0,n.useEffect)(()=>{r&&!ed.current&&d.current&&a?(ed.current=!0,a({insertVariable:e=>{d.current?.insertVariable(e)}})):r||(ed.current=!1)},[r,a]);let ec=e=>{if(d.current)if(console.log("Insertion HTML:",e),d.current.insertHTML)d.current.insertHTML(e);else{let t=d.current.getEditor();if(t)try{t.chain().focus().insertContent(e).run()}catch(e){console.error("Erreur lors de l'insertion:",e)}}else console.error("editorRef.current est null")},ep=e.header?.content||"",ex=e.footer?.content||"",em=e.content?.pageSize||e.page_size||"A4",eu=e.margins||{top:20,right:20,bottom:20,left:20};return(0,i.jsxs)("div",{className:"space-y-4",children:[(0,i.jsx)(eE.GlassCard,{variant:"subtle",className:"p-4",children:(0,i.jsxs)("div",{className:"flex items-start justify-between gap-3",children:[(0,i.jsxs)("div",{className:"flex items-start gap-3 flex-1",children:[(0,i.jsx)(eG.Info,{className:"h-5 w-5 text-brand-blue mt-0.5 flex-shrink-0"}),(0,i.jsxs)("div",{className:"space-y-1",children:[(0,i.jsx)("p",{className:"text-sm font-medium text-text-primary",children:"Zone d'édition du corps du document"}),(0,i.jsx)("p",{className:"text-sm text-text-secondary",children:"L'en-tête et le pied de page sont affichés en grisé pour référence. Ils seront automatiquement ajoutés à chaque page lors de la génération du document."})]})]}),(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[g&&e.id&&l?.id&&(0,i.jsx)(to,{templateId:e.id,currentUserId:l.id}),(0,i.jsx)(c.Button,{variant:"outline",size:"sm",onClick:()=>ei(!et),className:"gap-2",children:et?(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(eW.EyeOff,{className:"h-4 w-4"}),"Masquer l'aperçu"]}):(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(u.Eye,{className:"h-4 w-4"}),"Afficher l'aperçu"]})})]})]})}),(0,i.jsxs)("div",{className:"flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:()=>P(!0),title:"Insérer une zone de texte",children:[(0,i.jsx)(eX.FileText,{className:"h-4 w-4 mr-2"}),"Zone de texte"]}),(0,i.jsxs)(c.Button,{variant:ea.enabled?"default":"outline",size:"sm",onClick:()=>es(!0),title:"Grille et règles",children:[(0,i.jsx)(eK.Grid3x3,{className:"h-4 w-4 mr-2"}),"Grille"]})]}),(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(c.Button,{variant:"outline",size:"sm",onClick:()=>ee(e=>Math.max(e-.1,.5)),disabled:J<=.5,title:"Zoom arrière",children:(0,i.jsx)(eP,{className:"h-4 w-4"})}),(0,i.jsxs)("span",{className:"text-sm text-gray-600 min-w-[60px] text-center",children:[Math.round(100*J),"%"]}),(0,i.jsx)(c.Button,{variant:"outline",size:"sm",onClick:()=>ee(e=>Math.min(e+.1,2)),disabled:J>=2,title:"Zoom avant",children:(0,i.jsx)(eB,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"outline",size:"sm",onClick:()=>ee(1),title:"Réinitialiser le zoom",children:(0,i.jsx)(eq,{className:"h-4 w-4"})})]})]}),(0,i.jsx)(eE.GlassCard,{variant:"premium",className:"flex-1 flex flex-col overflow-hidden p-6",children:(0,i.jsx)("div",{className:"flex-1 flex flex-col min-h-[600px]",children:(0,i.jsx)("div",{onDragOver:e=>{e.preventDefault(),e.stopPropagation(),e.dataTransfer.dropEffect="copy"},onDrop:e=>{e.preventDefault(),e.stopPropagation();let t=e.dataTransfer.getData("text/plain")||e.dataTransfer.getData("text/html")?.replace(/[{}]/g,"");t&&d.current&&d.current.insertVariable(t)},className:"flex-1",style:{transform:`scale(${J})`,transformOrigin:"top left",width:`${100/J}%`,height:`${100/J}%`},children:(0,i.jsx)(ey,{ref:d,value:x,onChange:t=>{if(p.current)return;m(t);let i=(0,ez.convertVariableNodesToTags)(t);s({content:{...e.content,elements:[{id:"main-content",type:"text",position:{x:0,y:0},content:i}]}})},placeholder:"Saisissez le contenu du document...",className:"flex-1",onTableEditorOpen:()=>y(!0),onShapeEditorOpen:()=>v(!0),onElementPaletteOpen:()=>w(!0),onSignatureFieldOpen:()=>H(!0),onQuickTemplatesOpen:()=>C(!0),onStylePaletteOpen:()=>A(!0),onWatermarkEditorOpen:()=>k(!0)})})})}),et&&(0,i.jsx)("div",{className:"mt-4",children:(0,i.jsx)(eU,{htmlContent:x,headerContent:ep,footerContent:ex,pageSize:em,margins:eu,className:"h-full"})}),(0,i.jsxs)(eY.AnimatePresence,{children:[f&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>y(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(e2,{onInsert:ec,onClose:()=>y(!1)})})}),b&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>v(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(e6,{onInsert:ec,onClose:()=>v(!1)})})}),j&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>w(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(e5,{onInsert:ec,onClose:()=>w(!1),onChartEditorOpen:()=>{w(!1),E(!0)},onSignatureFieldOpen:()=>{w(!1),H(!0)},onFormFieldOpen:()=>{w(!1),X(!0)},onMediaLibraryOpen:()=>{w(!1),Q(!0)}})})}),_&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>C(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(e8,{onInsert:ec,onClose:()=>C(!1)})})}),N&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>A(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(e3,{onApplyStyle:e=>{let t=[];e.fontSize&&t.push(`font-size: ${e.fontSize}`),e.fontWeight&&t.push(`font-weight: ${e.fontWeight}`),e.fontStyle&&t.push(`font-style: ${e.fontStyle}`),e.color&&t.push(`color: ${e.color}`),e.backgroundColor&&t.push(`background-color: ${e.backgroundColor}`),e.textAlign&&t.push(`text-align: ${e.textAlign}`),e.lineHeight&&t.push(`line-height: ${e.lineHeight}`),e.marginTop&&t.push(`margin-top: ${e.marginTop}`),e.marginBottom&&t.push(`margin-bottom: ${e.marginBottom}`),e.padding&&t.push(`padding: ${e.padding}`),e.borderLeft&&t.push(`border-left: ${e.borderLeft} solid ${e.borderColor||"#335ACF"}`);let i=t.join("; ");ec(`<p style="${i}">Texte stylis\xe9</p>`),A(!1)},onClose:()=>A(!1)})})}),z&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>k(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(e7,{onInsert:ec,onClose:()=>k(!1)})})}),F&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>S(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(te,{onInsert:ec,onClose:()=>S(!1)})})}),L&&M&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>{D(!1),I(null)},children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(tt,{onSelect:e=>{M(e),D(!1),I(null)},onClose:()=>{D(!1),I(null)}})})}),B&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>P(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(ti,{onInsert:ec,onClose:()=>P(!1)})})}),q&&Y&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>{R(!1),Z(null)},children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(tn,{imageUrl:Y.url,onUpdate:e=>{ec(`
                    <p style="text-align: ${e.align||"center"}; margin: 16px 0;">
                      <img 
                        src="${Y.url}" 
                        alt="Image" 
                        style="
                          width: ${"%"===e.widthUnit?`${e.width}%`:"auto"===e.widthUnit?"auto":`${e.width}px`};
                          height: ${"%"===e.heightUnit?`${e.height}%`:"auto"===e.heightUnit?"auto":`${e.height}px`};
                          border-radius: ${e.borderRadius||0}px;
                          opacity: ${e.opacity||1};
                          transform: rotate(${e.rotation||0}deg);
                          display: block;
                          max-width: 100%;
                          height: auto;
                        "
                      />
                    </p>
                  `),R(!1),Z(null)},onClose:()=>{R(!1),Z(null)}})})}),O&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>H(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(ts,{onInsert:ec,onClose:()=>H(!1)})})}),$&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>V(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(ta,{onInsert:ec,onClose:()=>V(!1)})})}),U&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>G(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(tr,{onInsert:ec,onClose:()=>G(!1)})})}),W&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4",onClick:()=>X(!1),children:(0,i.jsx)(eQ.motion.div,{initial:{scale:.9,opacity:0},animate:{scale:1,opacity:1},exit:{scale:.9,opacity:0},onClick:e=>e.stopPropagation(),children:(0,i.jsx)(tl,{onInsert:e=>{ec(e),X(!1)},onClose:()=>X(!1)})})}),K&&(0,i.jsx)(e4,{onInsert:(e,t)=>{ec(`<p style="text-align: center; margin: 16px 0;">
                <img 
                  src="${e}" 
                  alt="${t||"Image"}" 
                  style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;"
                />
              </p>`),Q(!1)},category:"image",showUpload:!0})]})]})}var tc=e.i(647780);let tp=[{id:"logo_left_info_right",name:"Logo Gauche / Infos Droite",description:"Logo à gauche, informations de contact à droite",preview:"Logo | Nom École\n       | Contact"},{id:"logo_centered",name:"Logo Centré",description:"Logo et nom centrés verticalement",preview:"       Logo\n   Nom École"},{id:"banner_gradient",name:"Bannière Gradient",description:"Header avec fond dégradé et logo",preview:"Logo | Nom École\n     | Contact (fond bleu)"},{id:"minimal",name:"Minimal",description:"Header simple et épuré",preview:"Logo | Nom École"},{id:"professional",name:"Professionnel",description:"Header avec bordure et slogan",preview:"Logo | Nom École\n     | Slogan (avec bordure)"}],tx=[{id:"simple",name:"Simple",description:"Pagination centrée avec nom de l'école",preview:"Nom École | Page X / Y"},{id:"complete",name:"Complet",description:"Contact, pagination et site web",preview:"Contact | Page X / Y | Site Web\nDate génération"},{id:"minimal",name:"Minimal",description:"Uniquement la pagination",preview:"Page X / Y"},{id:"professional",name:"Professionnel",description:"Avec bordure et mentions légales",preview:"Confidentiel | Page X / Y | Contact\n       Mentions légales"},{id:"modern",name:"Moderne",description:"QR Code, contact et pagination",preview:"[QR] | Contact | Page X / Y | Site Web"}];function tm({type:e,value:t,onChange:n}){return(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-3",children:[("header"===e?tp:tx).map(e=>{let s=t===e.id;return(0,i.jsx)(z.Card,{className:(0,E.cn)("cursor-pointer transition-all hover:border-brand-blue hover:shadow-md",s&&"border-brand-blue border-2 shadow-md"),onClick:()=>n(e.id),children:(0,i.jsx)(z.CardContent,{className:"p-4",children:(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsx)("h4",{className:"text-sm font-semibold text-text-primary",children:e.name}),s&&(0,i.jsx)("div",{className:"h-2 w-2 rounded-full bg-brand-blue"})]}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:e.description}),(0,i.jsx)("div",{className:"mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 whitespace-pre-line border border-gray-200",children:e.preview})]})})},e.id)}),(0,i.jsx)(z.Card,{className:(0,E.cn)("cursor-pointer transition-all hover:border-brand-blue hover:shadow-md","custom"===t&&"border-brand-blue border-2 shadow-md"),onClick:()=>n("custom"),children:(0,i.jsx)(z.CardContent,{className:"p-4",children:(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsx)("h4",{className:"text-sm font-semibold text-text-primary",children:"Personnalisé"}),"custom"===t&&(0,i.jsx)("div",{className:"h-2 w-2 rounded-full bg-brand-blue"})]}),(0,i.jsx)("p",{className:"text-xs text-text-tertiary",children:"Créez votre propre layout"}),(0,i.jsx)("div",{className:"mt-3 p-2 bg-gray-50 rounded text-xs font-mono text-gray-400 whitespace-pre-line border border-gray-200 flex items-center justify-center h-12",children:(0,i.jsx)(tc.Palette,{className:"h-4 w-4 opacity-50"})})]})})})]})}function tu({template:e,onTemplateChange:t,onEditorRefReady:s,isActive:a}){let r=(0,n.useRef)(null),l=(0,n.useRef)(!1),[o,d]=(0,n.useState)(()=>{let t=e.footer?.content;return(0,ez.convertTagsToVariableNodes)(t||"")}),c=(0,n.useRef)(!1);(0,n.useEffect)(()=>{a&&!c.current&&r.current&&s?(c.current=!0,s({insertVariable:e=>{r.current?.insertVariable(e)}})):a||(c.current=!1)},[a,s]);let p=e.footer||{enabled:!0,height:60,layout:"complete",elements:[],repeatOnAllPages:!0,pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},content:""},x=i=>{let{pagination:n,...s}=i;t({footer:{...p,...s,...n&&p.pagination?{pagination:{...p.pagination,...n}}:n?{pagination:{enabled:!1,format:"Page {numero_page} / {total_pages}",position:"center",...n}}:{}},footer_enabled:void 0!==i.enabled?i.enabled:e.footer_enabled,footer_height:void 0!==i.height?i.height:e.footer_height})};return(0,n.useEffect)(()=>{if(l.current)return;let t=e.footer?.content||"",i=(0,ez.convertTagsToVariableNodes)(t);i!==o&&(l.current=!0,d(i),setTimeout(()=>{l.current=!1},100))},[e.footer]),(0,i.jsxs)("div",{className:"space-y-4",children:[(0,i.jsxs)(z.Card,{children:[(0,i.jsxs)(z.CardHeader,{children:[(0,i.jsx)(z.CardTitle,{children:"Configuration du pied de page"}),(0,i.jsx)(z.CardDescription,{children:"Personnalisez l'apparence et le contenu du pied de page"})]}),(0,i.jsxs)(z.CardContent,{className:"space-y-6",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)(k.Label,{children:"Afficher le pied de page"}),(0,i.jsx)("p",{className:"text-sm text-text-tertiary",children:"Afficher le pied de page sur toutes les pages"})]}),(0,i.jsx)(T.Switch,{checked:e.footer_enabled,onCheckedChange:e=>{t({footer_enabled:e})}})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsxs)(k.Label,{children:["Hauteur : ",p.height,"px"]}),(0,i.jsx)(F,{value:[p.height],onValueChange:([e])=>x({height:e}),min:30,max:150,step:5,className:"w-full",disabled:!e.footer_enabled}),(0,i.jsxs)("div",{className:"flex justify-between text-xs text-text-tertiary",children:[(0,i.jsx)("span",{children:"Min: 30px"}),(0,i.jsx)("span",{children:"Max: 150px"})]})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{children:"Layout prédéfini"}),(0,i.jsx)(tm,{type:"footer",value:p.layout||"complete",onChange:e=>{let t=function(e,t={}){let i=[];switch(e){case"simple":return i.push({id:"school_name_center",type:"text",position:{x:0,y:20},content:"{ecole_nom}",style:{fontSize:9,color:"#4D4D4D",textAlign:"center"}},{id:"pagination_right",type:"text",position:{x:450,y:20},content:"Page {numero_page} / {total_pages}",style:{fontSize:8,color:"#666666",textAlign:"right"}}),{height:50,backgroundColor:"#F9FAFB",pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"right"},elements:i,layout:"simple"};case"complete":return i.push({id:"contact_left",type:"text",position:{x:20,y:15},content:"{ecole_telephone} | {ecole_email}",style:{fontSize:8,color:"#4D4D4D",textAlign:"left"}},{id:"pagination_center",type:"text",position:{x:0,y:15},content:"Page {numero_page} / {total_pages}",style:{fontSize:9,color:"#4D4D4D",textAlign:"center"}},{id:"website_right",type:"text",position:{x:450,y:15},content:"{ecole_site_web}",style:{fontSize:8,color:"#34B9EE",textAlign:"right",textDecoration:"underline"}},{id:"generation_date",type:"text",position:{x:20,y:30},content:"Document généré le {date_generation}",style:{fontSize:7,color:"#999999",fontStyle:"italic"}}),{height:60,backgroundColor:"#F9FAFB",border:{top:{enabled:!0,color:"#E5E7EB",width:1,style:"solid"}},pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},elements:i,layout:"complete"};case"minimal":return{height:40,backgroundColor:"#FFFFFF",pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},elements:[],layout:"minimal"};case"professional":return i.push({id:"separator",type:"line",position:{x:0,y:0},style:{color:"#E5E7EB",border:{enabled:!0,color:"#E5E7EB",width:1}}},{id:"legal",type:"text",position:{x:20,y:10},content:"Document confidentiel - Tous droits réservés",style:{fontSize:7,color:"#999999",textAlign:"left"}},{id:"contact",type:"text",position:{x:20,y:25},content:"{ecole_telephone} | {ecole_email}",style:{fontSize:8,color:"#4D4D4D",textAlign:"left"}},{id:"pagination",type:"text",position:{x:0,y:20},content:"Page {numero_page} / {total_pages}",style:{fontSize:8,color:"#4D4D4D",textAlign:"center"}}),{height:50,backgroundColor:"#FFFFFF",border:{top:{enabled:!0,color:"#E5E7EB",width:1,style:"solid"}},pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},elements:i,layout:"professional"};case"modern":return i.push({id:"qrcode",type:"qrcode",position:{x:20,y:10},size:{width:30,height:30},qrData:"{ecole_site_web}"},{id:"contact",type:"text",position:{x:60,y:15},content:"{ecole_telephone} | {ecole_email}",style:{fontSize:8,color:"#4D4D4D"}},{id:"pagination",type:"text",position:{x:0,y:15},content:"Page {numero_page} / {total_pages}",style:{fontSize:8,color:"#4D4D4D",textAlign:"center"}},{id:"website",type:"text",position:{x:420,y:15},content:"{ecole_site_web}",style:{fontSize:8,color:"#34B9EE",textAlign:"right"}}),{height:50,backgroundColor:"#F9FAFB",border:{top:{enabled:!0,color:"#E5E7EB",width:1,style:"dashed"}},pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},elements:i,layout:"modern"};default:return{height:60,backgroundColor:"#F9FAFB",pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},elements:[],layout:"custom"}}}(e);x({layout:e,...t})}})]}),p.pagination&&(0,i.jsxs)("div",{className:"space-y-4 border-t border-bg-gray-200 pt-4",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)(k.Label,{children:"Afficher la numérotation"}),(0,i.jsx)("p",{className:"text-sm text-text-tertiary",children:"Numérotation automatique des pages"})]}),(0,i.jsx)(T.Switch,{checked:p.pagination.enabled,onCheckedChange:e=>{x({pagination:p.pagination?{...p.pagination,enabled:e}:{enabled:e,format:"Page {numero_page} / {total_pages}",position:"center"}})}})]}),p.pagination.enabled&&(0,i.jsxs)("div",{className:"space-y-2 pl-4",children:[(0,i.jsx)(k.Label,{children:"Format"}),(0,i.jsxs)("select",{value:p.pagination.format,onChange:e=>{x({pagination:{...p.pagination,format:e.target.value}})},className:"w-full border border-bg-gray-200 rounded px-3 py-2 text-sm",children:[(0,i.jsx)("option",{value:"Page {numero_page}",children:"Page X"}),(0,i.jsx)("option",{value:"{numero_page} / {total_pages}",children:"X / Y"}),(0,i.jsx)("option",{value:"Page {numero_page} / {total_pages}",children:"Page X / Y"}),(0,i.jsx)("option",{value:"Page {numero_page} sur {total_pages}",children:"Page X sur Y"})]}),(0,i.jsx)(k.Label,{children:"Position"}),(0,i.jsxs)("select",{value:p.pagination.position,onChange:e=>{x({pagination:{...p.pagination,position:e.target.value}})},className:"w-full border border-bg-gray-200 rounded px-3 py-2 text-sm",children:[(0,i.jsx)("option",{value:"left",children:"Gauche"}),(0,i.jsx)("option",{value:"center",children:"Centre"}),(0,i.jsx)("option",{value:"right",children:"Droite"})]})]})]})]})]}),(0,i.jsxs)(z.Card,{className:"flex-1 flex flex-col overflow-hidden",children:[(0,i.jsxs)(z.CardHeader,{children:[(0,i.jsx)(z.CardTitle,{children:"Contenu du pied de page"}),(0,i.jsx)(z.CardDescription,{children:"Éditez le contenu du pied de page. Utilisez la barre latérale pour insérer des variables, tableaux et cadres."})]}),(0,i.jsxs)(z.CardContent,{className:"flex-1 flex flex-col min-h-[300px]",children:[(0,i.jsx)(eA,{editorRef:r}),(0,i.jsx)("div",{onDragOver:e=>{e.preventDefault(),e.stopPropagation(),e.dataTransfer.dropEffect="copy"},onDrop:e=>{e.preventDefault(),e.stopPropagation();let t=e.dataTransfer.getData("text/plain")||e.dataTransfer.getData("text/html")?.replace(/[{}]/g,"");t&&r.current&&r.current.insertVariable(t)},className:"flex-1",children:(0,i.jsx)(ey,{ref:r,value:o,onChange:e=>{l.current||(d(e),x({content:(0,ez.convertVariableNodesToTags)(e)}))},placeholder:"Saisissez le contenu du pied de page...",className:"flex-1"})})]})]})]})}function tg({template:e,onTemplateChange:t,onEditorRefReady:n,isActive:s}){return(0,i.jsx)(tu,{template:e,onTemplateChange:t,onEditorRefReady:n,isActive:s})}var th=e.i(87316),tf=e.i(284614),ty=e.i(898791);let tb=(0,v.default)("GitCompare",[["circle",{cx:"18",cy:"18",r:"3",key:"1xkwt0"}],["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M13 6h3a2 2 0 0 1 2 2v7",key:"1yeb86"}],["path",{d:"M11 18H8a2 2 0 0 1-2-2V9",key:"19pyzm"}]]);var tv=e.i(576844),tj=e.i(587470),tw=e.i(37727);function t_({templateId:e,version1Id:t,version2Id:s,onClose:r}){let[l,o]=(0,n.useState)(null),[p,x]=(0,n.useState)(null),{data:m}=(0,a.useQuery)({queryKey:["template-version",e,t],queryFn:async()=>{let i=await d.documentTemplateService.getTemplateVersionById(e,t);return i&&i.template_data?i.template_data:null},enabled:!!t}),{data:u}=(0,a.useQuery)({queryKey:["template-version",e,s],queryFn:async()=>{let t=await d.documentTemplateService.getTemplateVersionById(e,s);return t&&t.template_data?t.template_data:null},enabled:!!s});(0,n.useEffect)(()=>{m&&o(m),u&&x(u)},[m,u]);let g=e=>{if(!e)return"";let t=e.header?.elements?.map(e=>e.content||"").filter(Boolean).join(" ")||"",i=e.content?.elements?.map(e=>e.content||"").filter(Boolean).join(" ")||"",n=e.footer?.elements?.map(e=>e.content||"").filter(Boolean).join(" ")||"";return`${e.name} ${t} ${i} ${n}`.replace(/\s+/g," ").trim()},h=g(l),f=g(p);return(0,i.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:(0,i.jsxs)(z.Card,{className:"w-full max-w-6xl max-h-[90vh] overflow-y-auto",children:[(0,i.jsxs)(z.CardHeader,{className:"flex flex-row items-center justify-between space-y-0 pb-4",children:[(0,i.jsx)(z.CardTitle,{children:"Comparaison des versions"}),(0,i.jsx)(c.Button,{variant:"ghost",size:"icon",onClick:r,children:(0,i.jsx)(tw.X,{className:"h-4 w-4"})})]}),(0,i.jsx)(z.CardContent,{children:(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("h3",{className:"font-semibold mb-2",children:"Version 1"}),(0,i.jsx)("div",{className:"p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto",children:(0,i.jsx)("pre",{className:"text-xs whitespace-pre-wrap font-mono",children:h||"Aucun contenu"})})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("h3",{className:"font-semibold mb-2",children:"Version 2"}),(0,i.jsx)("div",{className:"p-4 bg-gray-50 rounded-lg border max-h-96 overflow-y-auto",children:(0,i.jsx)("pre",{className:"text-xs whitespace-pre-wrap font-mono",children:f||"Aucun contenu"})})]})]})})]})})}function tC({templateId:e,onVersionRestore:t}){let[s,o]=(0,n.useState)(null),[p,x]=(0,n.useState)(!1),[m,f]=(0,n.useState)(!1),[y,b]=(0,n.useState)(null),[v,j]=(0,n.useState)(null),w=(0,l.useQueryClient)(),{data:_,isLoading:N}=(0,a.useQuery)({queryKey:["template-versions",e],queryFn:()=>d.documentTemplateService.getTemplateVersions(e),enabled:!!e}),A=(0,r.useMutation)({mutationFn:t=>d.documentTemplateService.restoreTemplateVersion(e,t),onSuccess:()=>{w.invalidateQueries({queryKey:["document-template",e]}),w.invalidateQueries({queryKey:["template-versions",e]}),t?.(),o(null)}});return N?(0,i.jsx)(eE.GlassCard,{variant:"premium",className:"p-6",children:(0,i.jsxs)("div",{className:"flex items-center gap-2 text-text-secondary",children:[(0,i.jsx)(h.History,{className:"h-5 w-5 animate-pulse"}),(0,i.jsx)("span",{children:"Chargement de l'historique..."})]})}):_&&0!==_.length?(0,i.jsxs)("div",{className:"space-y-4",children:[(0,i.jsxs)(eE.GlassCard,{variant:"premium",className:"p-6",children:[(0,i.jsx)("div",{className:"flex items-center justify-between mb-4",children:(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(h.History,{className:"h-5 w-5 text-brand-blue"}),(0,i.jsx)("h3",{className:"font-semibold text-text-primary",children:"Historique des versions"}),(0,i.jsxs)("span",{className:"text-sm text-text-tertiary",children:["(",_.length," version",_.length>1?"s":"",")"]})]})}),(0,i.jsx)("div",{className:"space-y-2 max-h-[500px] overflow-y-auto",children:(0,i.jsx)(eY.AnimatePresence,{children:_.map((e,t)=>(0,i.jsx)(eQ.motion.div,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},transition:{delay:.05*t},className:(0,E.cn)("p-4 rounded-lg border transition-all cursor-pointer",s?.id===e.id?"border-brand-blue bg-brand-blue-ghost":"border-gray-200 hover:border-brand-blue hover:bg-gray-50"),onClick:()=>o(e),children:(0,i.jsxs)("div",{className:"flex items-start justify-between",children:[(0,i.jsxs)("div",{className:"flex-1",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2 mb-2",children:[(0,i.jsxs)("span",{className:"font-semibold text-text-primary",children:["Version ",e.version_number]}),0===t&&(0,i.jsx)("span",{className:"text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded",children:"Dernière"})]}),e.name&&(0,i.jsx)("p",{className:"text-sm text-text-secondary mb-1",children:e.name}),e.description&&(0,i.jsx)("p",{className:"text-xs text-text-tertiary mb-2",children:e.description}),(0,i.jsxs)("div",{className:"flex items-center gap-4 text-xs text-text-tertiary",children:[(0,i.jsxs)("div",{className:"flex items-center gap-1",children:[(0,i.jsx)(th.Calendar,{className:"h-3 w-3"}),(0,i.jsx)("span",{children:(0,tv.formatDistanceToNow)(new Date(e.created_at),{addSuffix:!0,locale:tj.fr})})]}),e.created_by&&(0,i.jsxs)("div",{className:"flex items-center gap-1",children:[(0,i.jsx)(tf.User,{className:"h-3 w-3"}),(0,i.jsx)("span",{children:"Par utilisateur"})]})]})]}),(0,i.jsxs)("div",{className:"flex items-center gap-2 ml-4",children:[(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:t=>{t.stopPropagation(),x(!0),o(e)},children:[(0,i.jsx)(u.Eye,{className:"h-4 w-4 mr-1"}),"Aperçu"]}),t>0&&_&&(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:e=>{e.stopPropagation(),b(_[t].id),j(_[0].id),f(!0)},children:[(0,i.jsx)(tb,{className:"h-4 w-4 mr-1"}),"Comparer"]}),t>0&&(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:t=>{var i;t.stopPropagation(),i=e.version_number,confirm(`\xcates-vous s\xfbr de vouloir restaurer la version ${i} ? Cette action remplacera la version actuelle.`)&&A.mutate(i)},disabled:A.isPending,className:"text-orange-600 hover:text-orange-700 hover:border-orange-300",children:[(0,i.jsx)(g.RotateCcw,{className:"h-4 w-4 mr-1"}),"Restaurer"]})]})]})},e.id))})})]}),A.isPending&&(0,i.jsx)("div",{className:"fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center",children:(0,i.jsxs)(eE.GlassCard,{variant:"premium",className:"p-6 max-w-md",children:[(0,i.jsxs)("div",{className:"flex items-center gap-3 mb-4",children:[(0,i.jsx)(g.RotateCcw,{className:"h-6 w-6 text-brand-blue animate-spin"}),(0,i.jsx)("h3",{className:"font-semibold text-text-primary",children:"Restauration en cours..."})]}),(0,i.jsx)("p",{className:"text-text-secondary",children:"Veuillez patienter pendant la restauration de la version."})]})}),A.isSuccess&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},className:"fixed top-4 right-4 z-50",children:(0,i.jsx)(eE.GlassCard,{variant:"premium",className:"p-4 border-green-200 bg-green-50",children:(0,i.jsxs)("div",{className:"flex items-center gap-2 text-green-700",children:[(0,i.jsx)(C.CheckCircle2,{className:"h-5 w-5"}),(0,i.jsx)("span",{className:"font-medium",children:"Version restaurée avec succès"})]})})}),A.isError&&(0,i.jsx)(eQ.motion.div,{initial:{opacity:0,y:-20},animate:{opacity:1,y:0},exit:{opacity:0,y:-20},className:"fixed top-4 right-4 z-50",children:(0,i.jsx)(eE.GlassCard,{variant:"premium",className:"p-4 border-red-200 bg-red-50",children:(0,i.jsxs)("div",{className:"flex items-center gap-2 text-red-700",children:[(0,i.jsx)(ty.AlertCircle,{className:"h-5 w-5"}),(0,i.jsxs)("span",{className:"font-medium",children:["Erreur lors de la restauration : ",A.error?.message||"Erreur inconnue"]})]})})}),m&&y&&v&&(0,i.jsx)(t_,{templateId:e,version1Id:y,version2Id:v,onClose:()=>{f(!1),b(null),j(null)}})]}):(0,i.jsx)(eE.GlassCard,{variant:"premium",className:"p-6",children:(0,i.jsxs)("div",{className:"text-center py-8",children:[(0,i.jsx)(h.History,{className:"h-12 w-12 mx-auto mb-4 text-text-tertiary opacity-50"}),(0,i.jsx)("p",{className:"text-text-secondary",children:"Aucune version précédente"}),(0,i.jsx)("p",{className:"text-sm text-text-tertiary mt-2",children:"Les versions seront créées automatiquement lors des modifications"})]})})}var tN=e.i(718052);function tA({onClose:e}){return(0,i.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:(0,i.jsxs)(z.Card,{className:"w-full max-w-2xl max-h-[90vh] overflow-y-auto",children:[(0,i.jsxs)(z.CardHeader,{className:"flex flex-row items-center justify-between space-y-0 pb-4",children:[(0,i.jsx)(z.CardTitle,{children:"Raccourcis clavier"}),(0,i.jsx)(c.Button,{variant:"ghost",size:"icon",onClick:e,children:(0,i.jsx)(tw.X,{className:"h-4 w-4"})})]}),(0,i.jsx)(z.CardContent,{children:(0,i.jsx)("div",{className:"space-y-4",children:[{keys:["Ctrl","S"],description:"Sauvegarder le template"},{keys:["Ctrl","P"],description:"Aperçu du document"},{keys:["Ctrl","Z"],description:"Annuler"},{keys:["Ctrl","Y"],description:"Refaire"},{keys:["Ctrl","B"],description:"Gras"},{keys:["Ctrl","I"],description:"Italique"},{keys:["Ctrl","U"],description:"Souligné"}].map((e,t)=>(0,i.jsxs)("div",{className:"flex items-center justify-between p-3 border rounded-lg",children:[(0,i.jsx)("span",{className:"text-sm text-muted-foreground",children:e.description}),(0,i.jsx)("div",{className:"flex gap-1",children:e.keys.map((e,t)=>(0,i.jsx)("kbd",{className:"px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg",children:e},t))})]},t))})})]})})}function tz({template:e,onClose:t}){return(0,i.jsxs)(z.Card,{className:"w-full max-w-2xl",children:[(0,i.jsxs)(z.CardHeader,{className:"flex flex-row items-center justify-between space-y-0 pb-4",children:[(0,i.jsx)(z.CardTitle,{children:"Génération programmée"}),(0,i.jsx)(c.Button,{variant:"ghost",size:"icon",onClick:t,className:"h-6 w-6",children:(0,i.jsx)(tw.X,{className:"h-4 w-4"})})]}),(0,i.jsxs)(z.CardContent,{children:[(0,i.jsx)("p",{className:"text-sm text-gray-500",children:"La fonctionnalité de génération programmée sera bientôt disponible."}),(0,i.jsx)("div",{className:"mt-4 flex justify-end",children:(0,i.jsx)(c.Button,{onClick:t,children:"Fermer"})})]})]})}function tk({template:e,onClose:t}){return(0,i.jsxs)(z.Card,{className:"w-full max-w-2xl",children:[(0,i.jsxs)(z.CardHeader,{className:"flex flex-row items-center justify-between space-y-0 pb-4",children:[(0,i.jsx)(z.CardTitle,{children:"Collaboration"}),(0,i.jsx)(c.Button,{variant:"ghost",size:"icon",onClick:t,className:"h-6 w-6",children:(0,i.jsx)(tw.X,{className:"h-4 w-4"})})]}),(0,i.jsxs)(z.CardContent,{children:[(0,i.jsx)("p",{className:"text-sm text-gray-500",children:"La fonctionnalité de collaboration sera bientôt disponible."}),(0,i.jsx)("div",{className:"mt-4 flex justify-end",children:(0,i.jsx)(c.Button,{onClick:t,children:"Fermer"})})]})]})}var tT=e.i(994179),tE=e.i(127341),tF=e.i(605631),tS=e.i(738308),tL=e.i(431343),tD=e.i(107233),tM=e.i(727612),tI=e.i(920755);let tB=new class{supabase;constructor(e){this.supabase=e||(0,tI.createClient)()}async createWorkflow(e,t){let{data:i,error:n}=await this.supabase.from("template_workflows").insert({organization_id:e.organization_id,name:e.name,description:e.description,is_default:e.is_default||!1,created_by:t}).select().single();if(n)throw n;if(e.steps.length>0){let t=e.steps.map(e=>({workflow_id:i.id,step_order:e.step_order,name:e.name,description:e.description,approver_role:e.approver_role||null,approver_user_id:e.approver_user_id||null,is_required:e.is_required??!0,can_reject:e.can_reject??!0,can_comment:e.can_comment??!0,timeout_days:e.timeout_days||null})),{error:n}=await this.supabase.from("template_workflow_steps").insert(t);if(n)throw n}return i}async getWorkflows(e){let{data:t,error:i}=await this.supabase.from("template_workflows").select("*").eq("organization_id",e).order("created_at",{ascending:!1});if(i)throw i;return t||[]}async getWorkflowWithSteps(e){let{data:t,error:i}=await this.supabase.from("template_workflows").select("*").eq("id",e).single();if(i)throw i;let{data:n,error:s}=await this.supabase.from("template_workflow_steps").select("*").eq("workflow_id",e).order("step_order",{ascending:!0});if(s)throw s;return{...t,steps:n||[]}}async updateWorkflow(e,t){let{data:i,error:n}=await this.supabase.from("template_workflows").update(t).eq("id",e).select().single();if(n)throw n;return i}async deleteWorkflow(e){let{error:t}=await this.supabase.from("template_workflows").delete().eq("id",e);if(t)throw t}async addWorkflowStep(e,t){let{data:i,error:n}=await this.supabase.from("template_workflow_steps").insert({workflow_id:e,...t}).select().single();if(n)throw n;return i}async updateWorkflowStep(e,t){let{data:i,error:n}=await this.supabase.from("template_workflow_steps").update(t).eq("id",e).select().single();if(n)throw n;return i}async deleteWorkflowStep(e){let{error:t}=await this.supabase.from("template_workflow_steps").delete().eq("id",e);if(t)throw t}async startWorkflow(e,t,i){let{data:n}=await this.supabase.from("template_workflow_steps").select("id").eq("workflow_id",t).order("step_order",{ascending:!0}).limit(1).single(),{data:s,error:a}=await this.supabase.from("template_workflow_instances").insert({template_id:e,workflow_id:t,started_by:i,status:"in_progress",current_step_id:n?.id||null}).select().single();if(a)throw a;return n&&await this.createApprovalsForStep(s.id,n.id),s}async createApprovalsForStep(e,t){let{data:i}=await this.supabase.from("template_workflow_steps").select("*").eq("id",t).single();if(i){if(i.approver_user_id){let n=i.timeout_days?new Date(Date.now()+24*i.timeout_days*36e5).toISOString():null;await this.supabase.from("template_workflow_approvals").insert({instance_id:e,step_id:t,approver_id:i.approver_user_id,status:"pending",deadline:n})}else if(i.approver_role){let{data:n}=await this.supabase.from("users").select("id").eq("role",i.approver_role);if(n){let s=i.timeout_days?new Date(Date.now()+24*i.timeout_days*36e5).toISOString():null,a=n.map(i=>({instance_id:e,step_id:t,approver_id:i.id,status:"pending",deadline:s}));await this.supabase.from("template_workflow_approvals").insert(a)}}}}async getTemplateInstances(e){let{data:t,error:i}=await this.supabase.from("template_workflow_instances").select("*, workflow:template_workflows(*)").eq("template_id",e).order("created_at",{ascending:!1});if(i)throw i;return t||[]}async getInstanceWithDetails(e){let{data:t,error:i}=await this.supabase.from("template_workflow_instances").select("*, workflow:template_workflows(*)").eq("id",e).single();if(i)throw i;let n=null;if(t.current_step_id){let{data:e}=await this.supabase.from("template_workflow_steps").select("*").eq("id",t.current_step_id).single();n=e||null}let{data:s}=await this.supabase.from("template_workflow_approvals").select("*, step:template_workflow_steps(*), approver:users!template_workflow_approvals_approver_id_fkey(id, email, full_name)").eq("instance_id",e).order("created_at",{ascending:!0});return{...t,workflow:t.workflow,current_step:n,approvals:s||[]}}async approveStep(e,t,i,n){let{data:s,error:a}=await this.supabase.from("template_workflow_approvals").update({status:t,comment:i,approved_at:"approved"===t?new Date().toISOString():null}).eq("id",e).select().single();if(a)throw a;if("rejected"===t)await this.supabase.from("template_workflow_instances").update({status:"rejected",completed_at:new Date().toISOString()}).eq("id",s.instance_id);else{let{data:e}=await this.supabase.from("template_workflow_approvals").select("*, step:template_workflow_steps(*)").eq("instance_id",s.instance_id).eq("step_id",s.step_id),{data:t}=await this.supabase.from("template_workflow_steps").select("*").eq("id",s.step_id).single();if(!t)throw Error("Étape non trouvée");let i=e?.filter(e=>{let t=e.step;return t?.is_required!==!1})||[];if(i.length>0&&i.every(e=>"approved"===e.status)){let{data:e}=await this.supabase.from("template_workflow_instances").select("workflow_id, current_step_id").eq("id",s.instance_id).single();if(!e)throw Error("Instance non trouvée");let{data:i}=await this.supabase.from("template_workflow_steps").select("*").eq("workflow_id",e.workflow_id).gt("step_order",t.step_order).order("step_order",{ascending:!0}).limit(1).single();i?(await this.supabase.from("template_workflow_instances").update({current_step_id:i.id,status:"in_progress"}).eq("id",s.instance_id),await this.createApprovalsForStep(s.instance_id,i.id)):await this.supabase.from("template_workflow_instances").update({status:"approved",completed_at:new Date().toISOString(),current_step_id:null}).eq("id",s.instance_id)}}return s}async getPendingApprovals(e){let{data:t,error:i}=await this.supabase.from("template_workflow_approvals").select("*, instance:template_workflow_instances(*, template:document_templates(*)), step:template_workflow_steps(*)").eq("approver_id",e).eq("status","pending").order("created_at",{ascending:!0});if(i)throw i;return t||[]}};function tP({template:e,onClose:t}){let{user:s}=(0,o.useAuth)(),{addToast:d}=(0,A.useToast)(),p=(0,l.useQueryClient)(),[x,m]=(0,n.useState)("workflows"),[u,g]=(0,n.useState)(!1),[h,f]=(0,n.useState)(""),[y,b]=(0,n.useState)(""),[v,j]=(0,n.useState)([]),{data:w}=(0,a.useQuery)({queryKey:["workflows",s?.organization_id],queryFn:()=>tB.getWorkflows(s?.organization_id||""),enabled:!!s?.organization_id}),{data:_}=(0,a.useQuery)({queryKey:["workflow-instances",e.id],queryFn:()=>tB.getTemplateInstances(e.id||""),enabled:!!e.id}),{data:C}=(0,a.useQuery)({queryKey:["pending-approvals",s?.id],queryFn:()=>tB.getPendingApprovals(s?.id||""),enabled:!!s?.id}),N=(0,r.useMutation)({mutationFn:async()=>{if(!s?.organization_id||!s?.id)throw Error("Utilisateur non authentifié");return tB.createWorkflow({organization_id:s.organization_id,name:h,description:y,steps:v},s.id)},onSuccess:()=>{d({title:"Workflow créé",description:"Le workflow de validation a été créé avec succès.",type:"success"}),p.invalidateQueries({queryKey:["workflows"]}),g(!1),f(""),b(""),j([])},onError:e=>{d({title:"Erreur",description:e.message||"Impossible de créer le workflow.",type:"error"})}}),T=(0,r.useMutation)({mutationFn:async t=>{if(!s?.id||!e.id)throw Error("Données manquantes");return tB.startWorkflow(e.id,t,s.id)},onSuccess:()=>{d({title:"Workflow démarré",description:"Le processus de validation a été démarré.",type:"success"}),p.invalidateQueries({queryKey:["workflow-instances"]})},onError:e=>{d({title:"Erreur",description:e.message||"Impossible de démarrer le workflow.",type:"error"})}}),F=(0,r.useMutation)({mutationFn:async({approvalId:e,status:t,comment:i})=>tB.approveStep(e,t,i,s?.id),onSuccess:()=>{d({title:"Décision enregistrée",description:"Votre décision a été enregistrée.",type:"success"}),p.invalidateQueries({queryKey:["workflow-instances"]}),p.invalidateQueries({queryKey:["pending-approvals"]})},onError:e=>{d({title:"Erreur",description:e.message||"Impossible d'enregistrer la décision.",type:"error"})}}),S=(e,t)=>{let i=[...v];i[e]={...i[e],...t},j(i)},L=e=>{switch(e){case"approved":return(0,i.jsx)(tT.Badge,{className:"bg-green-100 text-green-800",children:"Approuvé"});case"rejected":return(0,i.jsx)(tT.Badge,{className:"bg-red-100 text-red-800",children:"Rejeté"});case"in_progress":return(0,i.jsx)(tT.Badge,{className:"bg-blue-100 text-blue-800",children:"En cours"});case"pending":return(0,i.jsx)(tT.Badge,{className:"bg-yellow-100 text-yellow-800",children:"En attente"});default:return(0,i.jsx)(tT.Badge,{children:e})}};return(0,i.jsxs)(z.Card,{className:"w-full max-w-4xl max-h-[90vh] overflow-y-auto",children:[(0,i.jsx)(z.CardHeader,{children:(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)(z.CardTitle,{children:"Workflow de validation"}),(0,i.jsx)(z.CardDescription,{children:"Configurez et gérez les processus d'approbation multi-niveaux pour vos templates"})]}),t&&(0,i.jsx)(c.Button,{variant:"ghost",size:"icon",onClick:t,children:(0,i.jsx)(tw.X,{className:"h-4 w-4"})})]})}),(0,i.jsx)(z.CardContent,{children:(0,i.jsxs)(tE.Tabs,{value:x,onValueChange:m,children:[(0,i.jsxs)(tE.TabsList,{className:"grid w-full grid-cols-3",children:[(0,i.jsx)(tE.TabsTrigger,{value:"workflows",children:"Workflows"}),(0,i.jsx)(tE.TabsTrigger,{value:"instances",children:"Instances"}),(0,i.jsx)(tE.TabsTrigger,{value:"approvals",children:"Mes approbations"})]}),(0,i.jsxs)(tE.TabsContent,{value:"workflows",className:"space-y-4",children:[(0,i.jsxs)("div",{className:"flex justify-between items-center",children:[(0,i.jsx)("h3",{className:"text-lg font-semibold",children:"Workflows disponibles"}),(0,i.jsxs)(c.Button,{onClick:()=>g(!0),children:[(0,i.jsx)(tD.Plus,{className:"h-4 w-4 mr-2"}),"Créer un workflow"]})]}),u&&(0,i.jsxs)(z.Card,{className:"p-4 space-y-4",children:[(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{children:"Nom du workflow *"}),(0,i.jsx)(e_.Input,{value:h,onChange:e=>f(e.target.value),placeholder:"ex: Validation standard"})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{children:"Description"}),(0,i.jsx)(e_.Input,{value:y,onChange:e=>b(e.target.value),placeholder:"Description du workflow..."})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsxs)("div",{className:"flex justify-between items-center",children:[(0,i.jsx)(k.Label,{children:"Étapes du workflow"}),(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:()=>{j([...v,{step_order:v.length+1,name:`\xc9tape ${v.length+1}`,is_required:!0,can_reject:!0,can_comment:!0}])},children:[(0,i.jsx)(tD.Plus,{className:"h-4 w-4 mr-2"}),"Ajouter une étape"]})]}),(0,i.jsx)(eY.AnimatePresence,{children:v.map((e,t)=>(0,i.jsxs)(eQ.motion.div,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},className:"p-4 border rounded-lg space-y-3",children:[(0,i.jsxs)("div",{className:"flex justify-between items-center",children:[(0,i.jsxs)("h4",{className:"font-medium",children:["Étape ",e.step_order]}),(0,i.jsx)(c.Button,{variant:"ghost",size:"icon",onClick:()=>{j(v.filter((e,i)=>i!==t).map((e,t)=>({...e,step_order:t+1})))},children:(0,i.jsx)(tM.Trash2,{className:"h-4 w-4"})})]}),(0,i.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{children:"Nom *"}),(0,i.jsx)(e_.Input,{value:e.name,onChange:e=>S(t,{name:e.target.value}),placeholder:"ex: Validation manager"})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{children:"Rôle approbateur"}),(0,i.jsxs)(eC.Select,{value:e.approver_role||"",onValueChange:e=>S(t,{approver_role:e}),children:[(0,i.jsx)(eC.SelectTrigger,{children:(0,i.jsx)(eC.SelectValue,{placeholder:"Sélectionner un rôle"})}),(0,i.jsxs)(eC.SelectContent,{children:[(0,i.jsx)(eC.SelectItem,{value:"admin",children:"Administrateur"}),(0,i.jsx)(eC.SelectItem,{value:"manager",children:"Manager"}),(0,i.jsx)(eC.SelectItem,{value:"director",children:"Directeur"})]})]})]})]}),(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsx)(k.Label,{children:"Description"}),(0,i.jsx)(e_.Input,{value:e.description||"",onChange:e=>S(t,{description:e.target.value}),placeholder:"Description de l'étape..."})]}),(0,i.jsxs)("div",{className:"flex gap-4",children:[(0,i.jsxs)(k.Label,{className:"flex items-center gap-2",children:[(0,i.jsx)("input",{type:"checkbox",checked:e.is_required??!0,onChange:e=>S(t,{is_required:e.target.checked})}),"Requis"]}),(0,i.jsxs)(k.Label,{className:"flex items-center gap-2",children:[(0,i.jsx)("input",{type:"checkbox",checked:e.can_reject??!0,onChange:e=>S(t,{can_reject:e.target.checked})}),"Peut rejeter"]}),(0,i.jsxs)(k.Label,{className:"flex items-center gap-2",children:[(0,i.jsx)("input",{type:"checkbox",checked:e.can_comment??!0,onChange:e=>S(t,{can_comment:e.target.checked})}),"Peut commenter"]})]})]},t))})]}),(0,i.jsxs)("div",{className:"flex justify-end gap-2",children:[(0,i.jsx)(c.Button,{variant:"outline",onClick:()=>g(!1),children:"Annuler"}),(0,i.jsx)(c.Button,{onClick:()=>N.mutate(),disabled:!h||0===v.length,children:"Créer le workflow"})]})]}),(0,i.jsx)("div",{className:"space-y-2",children:w?.map(e=>(0,i.jsx)(z.Card,{className:"p-4",children:(0,i.jsxs)("div",{className:"flex justify-between items-center",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("h4",{className:"font-semibold",children:e.name}),e.description&&(0,i.jsx)("p",{className:"text-sm text-muted-foreground",children:e.description})]}),(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:()=>T.mutate(e.id),disabled:T.isPending,children:[(0,i.jsx)(tL.Play,{className:"h-4 w-4 mr-2"}),"Démarrer"]})]})},e.id))})]}),(0,i.jsxs)(tE.TabsContent,{value:"instances",className:"space-y-4",children:[(0,i.jsx)("h3",{className:"text-lg font-semibold",children:"Workflows en cours"}),(0,i.jsxs)("div",{className:"space-y-2",children:[_?.map(e=>(0,i.jsx)(z.Card,{className:"p-4",children:(0,i.jsx)("div",{className:"flex justify-between items-start",children:(0,i.jsxs)("div",{children:[(0,i.jsx)("h4",{className:"font-semibold",children:e.workflow?.name||"Workflow"}),(0,i.jsxs)("p",{className:"text-sm text-muted-foreground",children:["Démarré le ",(0,E.formatDate)(e.started_at)]}),L(e.status)]})})},e.id)),(!_||0===_.length)&&(0,i.jsx)("p",{className:"text-sm text-muted-foreground text-center py-8",children:"Aucun workflow en cours pour ce template"})]})]}),(0,i.jsxs)(tE.TabsContent,{value:"approvals",className:"space-y-4",children:[(0,i.jsx)("h3",{className:"text-lg font-semibold",children:"Mes approbations en attente"}),(0,i.jsxs)("div",{className:"space-y-2",children:[C?.map(e=>(0,i.jsx)(z.Card,{className:"p-4",children:(0,i.jsxs)("div",{className:"space-y-3",children:[(0,i.jsxs)("div",{className:"flex justify-between items-start",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("h4",{className:"font-semibold",children:e.instance?.template?.name||"Template"}),(0,i.jsxs)("p",{className:"text-sm text-muted-foreground",children:["Étape: ",e.step?.name||"N/A"]})]}),L(e.status)]}),(0,i.jsxs)("div",{className:"flex gap-2",children:[(0,i.jsxs)(c.Button,{size:"sm",onClick:()=>F.mutate({approvalId:e.id,status:"approved"}),disabled:F.isPending,children:[(0,i.jsx)(tF.CheckCircle,{className:"h-4 w-4 mr-2"}),"Approuver"]}),(0,i.jsxs)(c.Button,{size:"sm",variant:"destructive",onClick:()=>F.mutate({approvalId:e.id,status:"rejected"}),disabled:F.isPending,children:[(0,i.jsx)(tS.XCircle,{className:"h-4 w-4 mr-2"}),"Rejeter"]})]})]})},e.id)),(!C||0===C.length)&&(0,i.jsx)("p",{className:"text-sm text-muted-foreground text-center py-8",children:"Aucune approbation en attente"})]})]})]})})]})}var tq=e.i(555436),tR=e.i(750570),tO=e.i(758472),tH=e.i(664659),t$=e.i(655900);let tV=[{name:"Établissement",variables:[{key:"ecole_nom",label:"Nom de l'école"},{key:"ecole_adresse",label:"Adresse de l'école"},{key:"ecole_ville",label:"Ville de l'école"},{key:"ecole_code_postal",label:"Code postal"},{key:"ecole_telephone",label:"Téléphone de l'école"},{key:"ecole_email",label:"Email de l'école"},{key:"ecole_site_web",label:"Site web de l'école"},{key:"ecole_slogan",label:"Slogan de l'école"},{key:"ecole_logo",label:"Logo de l'école"},{key:"ecole_siret",label:"SIRET"},{key:"ecole_region",label:"Région"},{key:"ecole_numero_declaration",label:"N° de déclaration d'activité"},{key:"ecole_representant",label:"Représentant légal"}]},{name:"Élève",variables:[{key:"eleve_nom",label:"Nom de l'élève"},{key:"eleve_prenom",label:"Prénom de l'élève"},{key:"eleve_numero",label:"Numéro de l'élève"},{key:"eleve_date_naissance",label:"Date de naissance"},{key:"eleve_classe",label:"Classe de l'élève"},{key:"eleve_photo",label:"Photo de l'élève"},{key:"eleve_adresse",label:"Adresse de l'élève"},{key:"eleve_telephone",label:"Téléphone de l'élève"},{key:"eleve_email",label:"Email de l'élève"}]},{name:"Tuteur",variables:[{key:"tuteur_nom",label:"Nom du tuteur"},{key:"tuteur_telephone",label:"Téléphone du tuteur"},{key:"tuteur_email",label:"Email du tuteur"},{key:"tuteur_adresse",label:"Adresse du tuteur"}]},{name:"Formation",variables:[{key:"formation_nom",label:"Nom de la formation"},{key:"formation_code",label:"Code de la formation"},{key:"formation_duree",label:"Durée de la formation"},{key:"formation_prix",label:"Prix de la formation"},{key:"formation_dates",label:"Dates de la formation"},{key:"formation_description",label:"Description de la formation"}]},{name:"Session",variables:[{key:"session_nom",label:"Nom de la session"},{key:"session_debut",label:"Date de début"},{key:"session_fin",label:"Date de fin"},{key:"session_lieu",label:"Lieu de la session"},{key:"session_horaires",label:"Horaires de la session"}]},{name:"Finances",variables:[{key:"montant",label:"Montant"},{key:"montant_lettres",label:"Montant en lettres"},{key:"montant_ttc",label:"Montant TTC"},{key:"montant_ht",label:"Montant HT"},{key:"tva",label:"TVA"},{key:"taux_tva",label:"Taux de TVA (%)"},{key:"date_paiement",label:"Date de paiement"},{key:"date_echeance",label:"Date d'échéance"},{key:"mode_paiement",label:"Mode de paiement"},{key:"numero_facture",label:"Numéro de facture"},{key:"numero_devis",label:"Numéro de devis"},{key:"validite_devis",label:"Validité du devis"}]},{name:"Dates",variables:[{key:"date_jour",label:"Date du jour"},{key:"date_emission",label:"Date d'émission"},{key:"annee_scolaire",label:"Année scolaire"},{key:"trimestre",label:"Trimestre"},{key:"semestre",label:"Semestre"}]},{name:"Notes",variables:[{key:"moyenne",label:"Moyenne"},{key:"moyenne_classe",label:"Moyenne de la classe"},{key:"classement",label:"Classement"},{key:"appreciations",label:"Appréciations"},{key:"mention",label:"Mention"}]},{name:"Convocation",variables:[{key:"convocation_objet",label:"Objet de la convocation"},{key:"convocation_date",label:"Date de convocation"},{key:"convocation_heure",label:"Heure de convocation"},{key:"convocation_lieu",label:"Lieu de convocation"},{key:"convocation_adresse",label:"Adresse de convocation"},{key:"convocation_duree",label:"Durée prévue"},{key:"convocation_contenu",label:"Contenu/Ordre du jour"},{key:"date_confirmation",label:"Date limite de confirmation"}]},{name:"Notes & Évaluations",variables:[{key:"matiere_1",label:"Matière 1"},{key:"matiere_2",label:"Matière 2"},{key:"matiere_3",label:"Matière 3"},{key:"coef_1",label:"Coefficient 1"},{key:"coef_2",label:"Coefficient 2"},{key:"coef_3",label:"Coefficient 3"},{key:"note_1",label:"Note 1"},{key:"note_2",label:"Note 2"},{key:"note_3",label:"Note 3"},{key:"appreciation_1",label:"Appréciation 1"},{key:"appreciation_2",label:"Appréciation 2"},{key:"appreciation_3",label:"Appréciation 3"},{key:"effectif_classe",label:"Effectif de la classe"}]},{name:"Programme",variables:[{key:"formation_objectifs",label:"Objectifs de la formation"},{key:"prerequis_1",label:"Prérequis 1"},{key:"prerequis_2",label:"Prérequis 2"},{key:"prerequis_3",label:"Prérequis 3"},{key:"module_1_titre",label:"Module 1 - Titre"},{key:"module_1_duree",label:"Module 1 - Durée"},{key:"module_1_contenu_1",label:"Module 1 - Contenu 1"},{key:"module_1_contenu_2",label:"Module 1 - Contenu 2"},{key:"module_1_contenu_3",label:"Module 1 - Contenu 3"},{key:"module_2_titre",label:"Module 2 - Titre"},{key:"module_2_duree",label:"Module 2 - Durée"},{key:"module_2_contenu_1",label:"Module 2 - Contenu 1"},{key:"module_2_contenu_2",label:"Module 2 - Contenu 2"},{key:"module_2_contenu_3",label:"Module 2 - Contenu 3"},{key:"module_3_titre",label:"Module 3 - Titre"},{key:"module_3_duree",label:"Module 3 - Durée"},{key:"module_3_contenu_1",label:"Module 3 - Contenu 1"},{key:"module_3_contenu_2",label:"Module 3 - Contenu 2"},{key:"module_3_contenu_3",label:"Module 3 - Contenu 3"}]},{name:"Règlement & Horaires",variables:[{key:"horaires_ouverture",label:"Horaires d'ouverture"},{key:"horaires_cours",label:"Horaires des cours"}]},{name:"Assiduité",variables:[{key:"heures_suivies",label:"Heures suivies"},{key:"heures_totales",label:"Heures totales"},{key:"taux_assiduite",label:"Taux d'assiduité (%)"}]},{name:"Divers",variables:[{key:"numero_document",label:"Numéro du document"},{key:"validite_document",label:"Validité du document"},{key:"code_verification",label:"Code de vérification"},{key:"date_generation",label:"Date de génération"},{key:"heure",label:"Heure"},{key:"annee_actuelle",label:"Année actuelle"},{key:"copyright",label:"Copyright"},{key:"numero_page",label:"Numéro de page"},{key:"total_pages",label:"Total de pages"}]}];function tU({onVariableSelect:e,className:t}){let[s,a]=(0,n.useState)(""),[r,l]=(0,n.useState)(!1),[o,d]=(0,n.useState)(!1),[c,p]=(0,n.useState)(!1),[x,m]=(0,n.useState)(!1),[u,g]=(0,n.useState)(!1),[h,f]=(0,n.useState)(new Set(tV.map(e=>e.name))),y=tV.map(e=>({...e,variables:e.variables.filter(e=>e.label.toLowerCase().includes(s.toLowerCase())||e.key.toLowerCase().includes(s.toLowerCase()))})).filter(e=>e.variables.length>0);return(0,i.jsxs)(z.Card,{className:(0,E.cn)("h-full flex flex-col",t),children:[(0,i.jsxs)(z.CardHeader,{className:"pb-3",children:[(0,i.jsx)(z.CardTitle,{className:"text-lg",children:"Balises à glisser-déposer"}),(0,i.jsx)("div",{className:"mt-3",children:(0,i.jsx)(e_.Input,{placeholder:"Rechercher une balise",value:s,onChange:e=>a(e.target.value),leftIcon:(0,i.jsx)(tq.Search,{className:"h-4 w-4 text-text-tertiary"}),className:"w-full"})})]}),(0,i.jsxs)(z.CardContent,{className:"flex-1 overflow-y-auto",children:[(0,i.jsx)("div",{className:"space-y-2",children:(0,i.jsx)(eY.AnimatePresence,{children:y.map((t,n)=>(0,i.jsxs)(eQ.motion.div,{initial:{opacity:0,y:-10},animate:{opacity:1,y:0},exit:{opacity:0,y:-10},transition:{duration:.2,delay:.05*n},className:"space-y-1",children:[(0,i.jsxs)("button",{onClick:()=>{var e;let i;return e=t.name,void((i=new Set(h)).has(e)?i.delete(e):i.add(e),f(i))},className:"w-full flex items-center justify-between px-2 py-1.5 text-sm font-semibold text-text-primary hover:bg-bg-gray-100 rounded transition-all duration-200 hover:shadow-sm",children:[(0,i.jsx)("span",{children:t.name}),(0,i.jsx)(eQ.motion.span,{animate:{rotate:180*!h.has(t.name)},transition:{duration:.2},className:"text-text-tertiary",children:h.has(t.name)?"−":"+"})]}),(0,i.jsx)(eY.AnimatePresence,{children:h.has(t.name)&&(0,i.jsx)(eQ.motion.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.2},className:"space-y-1 pl-2 overflow-hidden",children:t.variables.map((t,n)=>(0,i.jsx)(eQ.motion.div,{initial:{opacity:0,x:-10},animate:{opacity:1,x:0},transition:{delay:.03*n},children:(0,i.jsxs)("button",{onClick:()=>{e(t.key)},className:"w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-brand-blue-ghost hover:text-brand-blue rounded-lg transition-all duration-200 cursor-move group hover:shadow-sm hover:scale-[1.02]",draggable:!0,onDragStart:e=>{e.dataTransfer.setData("application/x-variable-id",t.key),e.dataTransfer.setData("application/x-variable-label",t.label),e.dataTransfer.setData("application/x-variable-value",`{${t.key}}`),e.dataTransfer.setData("text/html",`{${t.key}}`),e.dataTransfer.setData("text/plain",t.key),e.dataTransfer.effectAllowed="copy",e.dataTransfer.dropEffect="copy",e.currentTarget.style.opacity="0.5"},onDragEnd:e=>{e.currentTarget.style.opacity="1"},children:[(0,i.jsx)(tR.GripVertical,{className:"h-4 w-4 text-text-tertiary group-hover:text-brand-blue transition-all duration-200 group-hover:scale-110"}),(0,i.jsx)("span",{className:"flex-1 text-left",children:t.label}),(0,i.jsx)("code",{className:"text-xs text-brand-blue bg-brand-blue-ghost px-1.5 py-0.5 rounded transition-all duration-200 group-hover:bg-brand-blue group-hover:text-white",children:`{${t.key}}`})]})},t.key))})})]},t.name))})}),0===y.length&&(0,i.jsxs)(eQ.motion.div,{initial:{opacity:0},animate:{opacity:1},className:"text-center py-8 text-text-tertiary text-sm",children:['Aucune balise trouvée pour "',s,'"']})]}),(0,i.jsx)("div",{className:"border-t p-4",children:(0,i.jsxs)(eE.GlassCard,{variant:"subtle",className:"p-3",children:[(0,i.jsxs)("button",{onClick:()=>l(!r),className:"w-full flex items-center justify-between text-sm font-semibold text-text-primary",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(tO.Code,{className:"h-4 w-4 text-brand-blue"}),(0,i.jsx)("span",{children:"Conditions (IF/ELSE)"})]}),r?(0,i.jsx)(t$.ChevronUp,{className:"h-4 w-4"}):(0,i.jsx)(tH.ChevronDown,{className:"h-4 w-4"})]}),(0,i.jsx)(eY.AnimatePresence,{children:r&&(0,i.jsxs)(eQ.motion.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.2},className:"mt-3 space-y-3 text-xs text-text-secondary overflow-hidden",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Condition simple :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{IF variable}
  Contenu affich\xe9 si variable existe
{ENDIF}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Avec ELSE :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{IF variable}
  Contenu si vrai
{ELSE}
  Contenu si faux
{ENDIF}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Comparaisons :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{IF montant > 1000}
  Montant \xe9lev\xe9
{ENDIF}

{IF eleve_classe == "Terminale"}
  Classe terminale
{ENDIF}`})]}),(0,i.jsx)("div",{className:"pt-2 border-t",children:(0,i.jsxs)("p",{className:"text-xs text-text-tertiary",children:["Opérateurs supportés : ",(0,i.jsx)("code",{children:"=="}),", ",(0,i.jsx)("code",{children:"!="}),", ",(0,i.jsx)("code",{children:">"}),", ",(0,i.jsx)("code",{children:"<"}),", ",(0,i.jsx)("code",{children:">="}),", ",(0,i.jsx)("code",{children:"<="})]})})]})})]})}),(0,i.jsx)("div",{className:"border-t p-4",children:(0,i.jsxs)(eE.GlassCard,{variant:"subtle",className:"p-3",children:[(0,i.jsxs)("button",{onClick:()=>d(!o),className:"w-full flex items-center justify-between text-sm font-semibold text-text-primary",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(tO.Code,{className:"h-4 w-4 text-brand-blue"}),(0,i.jsx)("span",{children:"Boucles (FOR/WHILE)"})]}),o?(0,i.jsx)(t$.ChevronUp,{className:"h-4 w-4"}):(0,i.jsx)(tH.ChevronDown,{className:"h-4 w-4"})]}),(0,i.jsx)(eY.AnimatePresence,{children:o&&(0,i.jsxs)(eQ.motion.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.2},className:"mt-3 space-y-3 text-xs text-text-secondary overflow-hidden",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Boucle FOR sur tableau :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{FOR item IN items}
  {item.nom} - {item.prix}
{ENDFOR}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Boucle FOR sur plage :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{FOR i FROM 1 TO 10}
  Ligne {i}
{ENDFOR}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Variables de boucle :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{item_index} - Index (0-based)
{item_number} - Num\xe9ro (1-based)
{item_is_first} - Premi\xe8re it\xe9ration
{item_is_last} - Derni\xe8re it\xe9ration`})]})]})})]})}),(0,i.jsx)("div",{className:"border-t p-4",children:(0,i.jsxs)(eE.GlassCard,{variant:"subtle",className:"p-3",children:[(0,i.jsxs)("button",{onClick:()=>m(!x),className:"w-full flex items-center justify-between text-sm font-semibold text-text-primary",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(tO.Code,{className:"h-4 w-4 text-brand-blue"}),(0,i.jsx)("span",{children:"Tableaux dynamiques"})]}),x?(0,i.jsx)(t$.ChevronUp,{className:"h-4 w-4"}):(0,i.jsx)(tH.ChevronDown,{className:"h-4 w-4"})]}),(0,i.jsx)(eY.AnimatePresence,{children:x&&(0,i.jsxs)(eQ.motion.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.2},className:"mt-3 space-y-3 text-xs text-text-secondary overflow-hidden",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Tableau dynamique :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{TABLE items}
  <table>
    <thead>...</thead>
    {ROW}
      <tr><td>{item.nom}</td></tr>
    {ENDROW}
  </table>
{ENDTABLE}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Ligne conditionnelle :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{IF_ROW item.prix > 100}
  <tr class="highlight">...</tr>
{ENDIF_ROW}`})]})]})})]})}),(0,i.jsx)("div",{className:"border-t p-4",children:(0,i.jsxs)(eE.GlassCard,{variant:"subtle",className:"p-3",children:[(0,i.jsxs)("button",{onClick:()=>g(!u),className:"w-full flex items-center justify-between text-sm font-semibold text-text-primary",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(tO.Code,{className:"h-4 w-4 text-brand-blue"}),(0,i.jsx)("span",{children:"Visibilité conditionnelle"})]}),u?(0,i.jsx)(t$.ChevronUp,{className:"h-4 w-4"}):(0,i.jsx)(tH.ChevronDown,{className:"h-4 w-4"})]}),(0,i.jsx)(eY.AnimatePresence,{children:u&&(0,i.jsxs)(eQ.motion.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.2},className:"mt-3 space-y-3 text-xs text-text-secondary overflow-hidden",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Afficher conditionnellement :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{SHOW_IF condition}
  Contenu affich\xe9 si vrai
{ELSE}
  Contenu alternatif
{END_SHOW}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Masquer conditionnellement :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{HIDE_IF condition}
  Contenu masqu\xe9 si vrai
{END_HIDE}`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Classes CSS conditionnelles :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:'<div class="{IF condition}visible{ELSE}hidden{ENDIF}">'})]})]})})]})}),(0,i.jsx)("div",{className:"border-t p-4",children:(0,i.jsxs)(eE.GlassCard,{variant:"subtle",className:"p-3",children:[(0,i.jsxs)("button",{onClick:()=>p(!c),className:"w-full flex items-center justify-between text-sm font-semibold text-text-primary",children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(tO.Code,{className:"h-4 w-4 text-brand-blue"}),(0,i.jsx)("span",{children:"Fonctions calculées"})]}),c?(0,i.jsx)(t$.ChevronUp,{className:"h-4 w-4"}):(0,i.jsx)(tH.ChevronDown,{className:"h-4 w-4"})]}),(0,i.jsx)(eY.AnimatePresence,{children:c&&(0,i.jsxs)(eQ.motion.div,{initial:{height:0,opacity:0},animate:{height:"auto",opacity:1},exit:{height:0,opacity:0},transition:{duration:.2},className:"mt-3 space-y-3 text-xs text-text-secondary overflow-hidden",children:[(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Calculs :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{SUM notes} - Somme
{AVERAGE notes} - Moyenne
{COUNT items} - Nombre
{MIN values} - Minimum
{MAX values} - Maximum`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Formatage :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{ROUND montant 2} - Arrondir
{FORMAT_CURRENCY montant EUR} - Devise
{FORMAT_DATE date DD/MM/YYYY} - Date`})]}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-semibold mb-1",children:"Texte :"}),(0,i.jsx)("code",{className:"block bg-gray-100 p-2 rounded text-xs",children:`{UPPERCASE texte} - Majuscules
{LOWERCASE texte} - Minuscules
{CAPITALIZE texte} - Premi\xe8re lettre majuscule`})]})]})})]})})]})}var tG=e.i(239616);function tW({template:e,onTemplateChange:t}){let[s,a]=(0,n.useState)(e.font_size||10);return(0,i.jsxs)(z.Card,{className:"border border-gray-200",children:[(0,i.jsx)(z.CardHeader,{className:"pb-3",children:(0,i.jsxs)(z.CardTitle,{className:"text-base font-semibold flex items-center gap-2",children:[(0,i.jsx)(tG.Settings,{className:"h-4 w-4"}),"Paramètres du document"]})}),(0,i.jsx)(z.CardContent,{className:"space-y-4",children:(0,i.jsxs)("div",{className:"space-y-2",children:[(0,i.jsxs)("div",{className:"flex items-center justify-between",children:[(0,i.jsx)(k.Label,{htmlFor:"font-size",className:"text-sm font-medium",children:"Taille de police par défaut"}),(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(e_.Input,{id:"font-size",type:"number",min:"6",max:"24",step:"0.5",value:s,onChange:e=>{let i=parseFloat(e.target.value);!isNaN(i)&&i>=6&&i<=24&&(a(i),t({font_size:i}))},className:"w-16 h-8 text-sm text-center"}),(0,i.jsx)("span",{className:"text-sm text-gray-500",children:"pt"})]})]}),(0,i.jsx)(F,{value:[s],onValueChange:e=>{let i=e[0];a(i),t({font_size:i})},min:6,max:24,step:.5,className:"w-full"}),(0,i.jsxs)("div",{className:"flex justify-between text-xs text-gray-400",children:[(0,i.jsx)("span",{children:"6pt"}),(0,i.jsx)("span",{children:"12pt"}),(0,i.jsx)("span",{children:"18pt"}),(0,i.jsx)("span",{children:"24pt"})]}),(0,i.jsx)("p",{className:"text-xs text-gray-500 mt-1",children:"Cette taille sera appliquée à tout le contenu du document par défaut. Vous pouvez toujours modifier la taille de police individuellement dans l'éditeur."})]})})]})}var tX=e.i(781947),tK=e.i(569074),tQ=e.i(643531),tY=e.i(778917),tZ=e.i(520958),tJ=e.i(440160),t0=e.i(846696);function t1({templateId:e,currentDocxUrl:t,onUploadSuccess:s,onRemoveSuccess:a}){let[r,l]=(0,n.useState)(!1),[o,d]=(0,n.useState)(!1),[p,x]=(0,n.useState)(!1),m=(0,n.useRef)(null),u=e=>{e.preventDefault(),e.stopPropagation(),"dragenter"===e.type||"dragover"===e.type?x(!0):"dragleave"===e.type&&x(!1)},g=async e=>{e.preventDefault(),e.stopPropagation(),x(!1),e.dataTransfer.files&&e.dataTransfer.files[0]&&await f(e.dataTransfer.files[0])},h=async e=>{e.target.files&&e.target.files[0]&&await f(e.target.files[0])},f=async t=>{if(!t.name.endsWith(".docx"))return void t0.toast.error("Le fichier doit être un document Word (.docx)");if(t.size>0xa00000)return void t0.toast.error("Le fichier est trop volumineux (max 10MB)");l(!0);try{let i=new FormData;i.append("file",t),i.append("templateId",e);let n=await fetch("/api/documents/upload-docx-template",{method:"POST",body:i}),a=await n.json();if(!n.ok)throw Error(a.error||"Erreur lors de l'upload");t0.toast.success("Template DOCX uploadé avec succès"),s?.(a.docxTemplateUrl)}catch(e){console.error("Erreur upload:",e),t0.toast.error(e instanceof Error?e.message:"Erreur lors de l'upload")}finally{l(!1),m.current&&(m.current.value="")}},y=async()=>{if(confirm("Êtes-vous sûr de vouloir supprimer le template DOCX ?")){d(!0);try{if(!(await fetch(`/api/document-templates/${e}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({docx_template_url:null})})).ok)throw Error("Erreur lors de la suppression");t0.toast.success("Template DOCX supprimé"),a?.()}catch(e){console.error("Erreur suppression:",e),t0.toast.error(e instanceof Error?e.message:"Erreur lors de la suppression")}finally{d(!1)}}};return(0,i.jsxs)(z.Card,{className:"mt-6",children:[(0,i.jsxs)(z.CardHeader,{children:[(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsx)(eX.FileText,{className:"h-5 w-5 text-blue-500"}),(0,i.jsx)(z.CardTitle,{className:"text-lg",children:"Template Word Natif (DOCX)"}),(0,i.jsx)(K.TooltipProvider,{children:(0,i.jsxs)(K.Tooltip,{children:[(0,i.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,i.jsx)(tZ.HelpCircle,{className:"h-4 w-4 text-muted-foreground cursor-help"})}),(0,i.jsx)(K.TooltipContent,{className:"max-w-xs",children:(0,i.jsxs)("p",{children:["Uploadez un template Word (.docx) pour une génération fidèle au design. Utilisez des balises ","{variable}"," dans le document pour les variables dynamiques."]})})]})})]}),(0,i.jsxs)(z.CardDescription,{children:["Pour une génération Word parfaite, uploadez un template DOCX avec des balises ","{variable}"]})]}),(0,i.jsxs)(z.CardContent,{children:[t?(0,i.jsxs)("div",{className:"space-y-4",children:[(0,i.jsxs)(tX.Alert,{className:"bg-green-50 border-green-200",children:[(0,i.jsx)(tQ.Check,{className:"h-4 w-4 text-green-600"}),(0,i.jsx)(tX.AlertDescription,{className:"text-green-800",children:"Un template DOCX est configuré. Les documents Word seront générés avec une fidélité parfaite."})]}),(0,i.jsxs)("div",{className:"flex items-center justify-between p-3 bg-muted rounded-lg",children:[(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)(eX.FileText,{className:"h-8 w-8 text-blue-500"}),(0,i.jsxs)("div",{children:[(0,i.jsx)("p",{className:"font-medium",children:"Template DOCX"}),(0,i.jsx)("p",{className:"text-sm text-muted-foreground",children:"Fichier uploadé"})]})]}),(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:()=>window.open(t,"_blank"),children:[(0,i.jsx)(tJ.Download,{className:"h-4 w-4 mr-1"}),"Télécharger"]}),(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:()=>m.current?.click(),disabled:r,children:[(0,i.jsx)(tK.Upload,{className:"h-4 w-4 mr-1"}),"Remplacer"]}),(0,i.jsxs)(c.Button,{variant:"outline",size:"sm",onClick:y,disabled:o,className:"text-destructive hover:text-destructive",children:[(0,i.jsx)(tM.Trash2,{className:"h-4 w-4 mr-1"}),"Supprimer"]})]})]})]}):(0,i.jsxs)("div",{className:`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${p?"border-primary bg-primary/5":"border-muted-foreground/25"}
              ${r?"opacity-50 pointer-events-none":"cursor-pointer hover:border-primary/50"}
            `,onDragEnter:u,onDragLeave:u,onDragOver:u,onDrop:g,onClick:()=>!r&&m.current?.click(),children:[(0,i.jsx)(tK.Upload,{className:"h-10 w-10 mx-auto mb-4 text-muted-foreground"}),(0,i.jsx)("p",{className:"font-medium mb-1",children:r?"Upload en cours...":"Glissez-déposez votre template DOCX ici"}),(0,i.jsx)("p",{className:"text-sm text-muted-foreground mb-4",children:"ou cliquez pour sélectionner un fichier"}),(0,i.jsx)("p",{className:"text-xs text-muted-foreground",children:"Format accepté : .docx (max 10MB)"})]}),(0,i.jsx)("input",{ref:m,type:"file",accept:".docx",onChange:h,className:"hidden"}),(0,i.jsx)("div",{className:"mt-4 pt-4 border-t",children:(0,i.jsxs)("a",{href:"/docs/DOCX_TEMPLATE_GUIDE.md",target:"_blank",className:"text-sm text-primary hover:underline inline-flex items-center gap-1",children:[(0,i.jsx)(tY.ExternalLink,{className:"h-3 w-3"}),"Guide de création de templates DOCX"]})})]})]})}var t9=e.i(55479);function t2(){let t=(0,s.useParams)(),v=(0,s.useRouter)(),z=(0,s.useSearchParams)(),{user:k}=(0,o.useAuth)(),{addToast:T}=(0,A.useToast)(),F=(0,l.useQueryClient)(),S=t.type,L=(0,t9.getDocumentTypeConfig)(S),D=z.get("template_id"),[M,I]=(0,n.useState)("body"),[B,P]=(0,n.useState)(null),[q,R]=(0,n.useState)(!1),[O,H]=(0,n.useState)(!1),[$,V]=(0,n.useState)(!1),[U,G]=(0,n.useState)(!1),[W,X]=(0,n.useState)(!1),[K,Q]=(0,n.useState)(!1),[Y,Z]=(0,n.useState)(!1),[J,ee]=(0,n.useState)(null),et=(0,n.useRef)(null),ei=(0,n.useCallback)(e=>{ee(e)},[]);(0,n.useEffect)(()=>{let e="true"===localStorage.getItem("editor-dark-mode");V(e),e&&document.documentElement.classList.add("dark")},[]);let en=()=>{let e=!$;V(e),localStorage.setItem("editor-dark-mode",String(e)),e?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark")},{data:es,isLoading:ea}=(0,a.useQuery)({queryKey:["document-template",k?.organization_id,S,D],queryFn:async()=>{if(!k?.organization_id)return null;if(D)try{let e=await d.documentTemplateService.getTemplateById(D);if(e.type===S)return e}catch(e){console.error("Erreur lors du chargement du template spécifique:",e)}let e=await d.documentTemplateService.getDefaultTemplate(k.organization_id,S),t=await d.documentTemplateService.getAllTemplates(k.organization_id,{type:S});if(!e&&0===t.length)try{let e=e9[S];return await d.documentTemplateService.createTemplate({organization_id:k.organization_id,type:S,name:e.name,header:{enabled:!0,height:100,elements:[],repeatOnAllPages:!0,content:e.headerContent},content:{pageSize:"A4",margins:{top:20,right:20,bottom:20,left:20},elements:[],html:e.bodyContent},font_size:10,footer:{enabled:!0,height:60,elements:[],repeatOnAllPages:!0,pagination:{enabled:!0,format:"Page {numero_page} / {total_pages}",position:"center"},content:e.footerContent},header_enabled:!0,header_height:100,footer_enabled:!0,footer_height:60,is_default:!0})}catch(e){if("23505"===e.code||e.message?.includes("duplicate")){let e=await d.documentTemplateService.getDefaultTemplate(k.organization_id,S);if(e)return e;if(t.length>0)return t[0]}throw e}if(!e&&t.length>0){let e=t[0],i=e.content?.html,n=e.content?.elements?.[0]?.content,s=(i||n||"").trim(),a=s&&s.length>=50;if(console.log("[Page] Template existant trouvé:",{templateId:e.id,hasHtml:!!i,htmlLength:i?.length||0,hasElementsContent:!!n,elementsContentLength:n?.length||0,trimmedLength:s.length,hasContent:a}),!a){console.log("[Page] Template vide, initialisation avec le contenu par défaut...");let t=e9[S];try{let i=await d.documentTemplateService.updateTemplate({id:e.id,content:{...e.content,html:t.bodyContent,elements:[{id:"main-content",type:"text",position:{x:0,y:0},content:t.bodyContent}]},header:{...e.header,content:t.headerContent},footer:{...e.footer,content:t.footerContent}});return console.log("[Page] Template mis à jour avec succès"),i}catch(e){console.error("[Page] Erreur lors de la mise à jour du template:",e)}}return e}if(e){let t=e.content?.html,i=e.content?.elements?.[0]?.content,n=(t||i||"").trim(),s=n&&n.length>=50,a=e9[S],r=a.bodyContent.trim(),l=!0===e.is_default;if(console.log("[Page] Template par défaut trouvé:",{templateId:e.id,isDefault:l,hasHtml:!!t,htmlLength:t?.length||0,hasElementsContent:!!i,elementsContentLength:i?.length||0,trimmedLength:n.length,hasContent:s,defaultContentLength:r.length}),!s){console.log("[Page] Template par défaut vide, initialisation avec le contenu par défaut...");try{let t=await d.documentTemplateService.updateTemplate({id:e.id,content:{...e.content,html:a.bodyContent,elements:[{id:"main-content",type:"text",position:{x:0,y:0},content:a.bodyContent}]},header:{...e.header,content:a.headerContent},footer:{...e.footer,content:a.footerContent}});return console.log("[Page] Template par défaut mis à jour avec succès"),t}catch(e){console.error("[Page] Erreur lors de la mise à jour du template par défaut:",e)}}}return e},enabled:!!k?.organization_id&&!!S}),er=(0,n.useRef)(null);(0,n.useEffect)(()=>{es&&!q&&!O&&(er.current&&JSON.stringify(es)===JSON.stringify(er.current)||(P(es),er.current=es))},[es,q,O]),(0,n.useEffect)(()=>{es&&!er.current&&(er.current=es,console.log("[Page] savedTemplateRef initialisé avec le template existant"))},[es]);let el=(0,r.useMutation)({mutationFn:async e=>{let{id:t,...i}=e;return d.documentTemplateService.updateTemplate({id:t,...i})},onSuccess:e=>{er.current=e||B,F.invalidateQueries({queryKey:["document-template"]}),F.invalidateQueries({queryKey:["document-templates"]}),R(!1),T({type:"success",title:"Modèle enregistré",description:"Le modèle a été enregistré avec succès."})},onError:e=>{T({type:"error",title:"Erreur",description:e instanceof Error?e.message:"Une erreur est survenue lors de l'enregistrement."})}}),eo=async()=>{if(B&&k?.organization_id&&confirm("Êtes-vous sûr de vouloir réinitialiser ce template avec le contenu par défaut ? Toutes les modifications non sauvegardées seront perdues."))try{let e=e9[S],t={...B,name:e.name,content:{...B.content,elements:[{id:"main-content",type:"text",position:{x:0,y:0},content:e.bodyContent}]},header:{...B.header,content:e.headerContent},footer:{...B.footer,content:e.footerContent}};await el.mutateAsync(t),P(t),R(!1),T({type:"success",title:"Template réinitialisé",description:"Le template a été réinitialisé avec le contenu par défaut."})}catch(e){console.error("Erreur lors de la réinitialisation:",e),T({type:"error",title:"Erreur",description:"Une erreur est survenue lors de la réinitialisation du template."})}},ed=()=>{B&&el.mutate(B)};(0,n.useEffect)(()=>{if(B&&q&&!O)return et.current&&clearTimeout(et.current),et.current=setTimeout(async()=>{H(!0);try{await d.documentTemplateService.updateTemplate(B),er.current={...B},setTimeout(()=>{JSON.stringify(B)===JSON.stringify(B)&&(R(!1),er.current={...B},setTimeout(()=>{F.invalidateQueries({queryKey:["document-template",k?.organization_id,S]})},500))},200)}catch(e){console.error("Erreur lors de l'auto-sauvegarde:",e)}finally{H(!1),et.current=null}},3e3),()=>{et.current&&(clearTimeout(et.current),et.current=null)}},[B,q,k?.organization_id,S,F]);let ec=e=>{!B||Object.keys(e).some(t=>{let i=e[t],n=B[t];return JSON.stringify(i)!==JSON.stringify(n)})&&(P({...B,...e}),R(!0))};return((0,n.useEffect)(()=>{let{loadCustomShortcuts:t,getShortcutConfig:i,matchesShortcut:n,DEFAULT_SHORTCUTS:s}=e.r(211312),a=t(),r=e=>{e.target?.tagName==="INPUT"||e.target?.tagName==="TEXTAREA"||e.target?.isContentEditable||Object.keys(s).forEach(t=>{if(n(e,a[t]?a[t]:i(t)))switch(e.preventDefault(),t){case"save":B&&q&&ed();break;case"preview":v.push(`/dashboard/settings/document-templates/${S}/preview`);break;case"cycleTabs":let s=["header","body","footer","versions"],r=(s.indexOf(M)+1)%s.length;I(s[r]);break;case"toggleDarkMode":en()}})};return window.addEventListener("keydown",r),()=>{window.removeEventListener("keydown",r)}},[B,q,M,S,v]),ea||!B)?(0,i.jsx)(tN.SkeletonLoader,{}):(0,i.jsxs)("div",{className:(0,E.cn)("h-screen flex flex-col",$&&"dark"),children:[(0,i.jsxs)("div",{className:"flex items-center justify-between border-b border-bg-gray-200 pb-4 px-6 pt-4 flex-shrink-0",children:[(0,i.jsxs)("div",{className:"flex items-center gap-4",children:[(0,i.jsx)(N.default,{href:"/dashboard/settings/document-templates",children:(0,i.jsx)(c.Button,{variant:"outline",size:"icon",children:(0,i.jsx)(x.ArrowLeft,{className:"h-4 w-4"})})}),(0,i.jsxs)("div",{children:[(0,i.jsxs)("h1",{className:"text-2xl font-bold text-text-primary flex items-center gap-2",children:[(0,i.jsx)(L.icon,{className:"h-6 w-6",style:{color:L.color}}),L.name]}),(0,i.jsx)("p",{className:"text-sm text-text-tertiary mt-1",children:"Éditeur de modèle de document"})]})]}),(0,i.jsxs)("div",{className:"flex items-center gap-2",children:[(0,i.jsxs)(c.Button,{variant:"outline",onClick:()=>I("versions"),className:"versions"===M?"bg-brand-blue-ghost border-brand-blue":"",children:[(0,i.jsx)(h.History,{className:"h-4 w-4 mr-2"}),"Versions"]}),(0,i.jsxs)(c.Button,{variant:"outline",onClick:()=>{v.push(`/dashboard/settings/document-templates/${S}/preview`)},children:[(0,i.jsx)(u.Eye,{className:"h-4 w-4 mr-2"}),"Prévisualiser"]}),O&&(0,i.jsxs)("div",{className:"flex items-center gap-2 text-sm text-text-tertiary",children:[(0,i.jsx)(f.Loader2,{className:"h-4 w-4 animate-spin"}),(0,i.jsx)("span",{className:"hidden sm:inline",children:"Auto-sauvegarde..."})]}),(0,i.jsx)(c.Button,{variant:"outline",size:"icon",onClick:en,title:$?"Mode clair":"Mode sombre",children:$?(0,i.jsx)(b.Sun,{className:"h-4 w-4"}):(0,i.jsx)(y.Moon,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"outline",size:"icon",onClick:()=>G(!0),title:"Raccourcis clavier",children:(0,i.jsx)(j,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"outline",size:"icon",onClick:eo,title:"Réinitialiser avec le contenu par défaut",children:(0,i.jsx)(g.RotateCcw,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"outline",size:"icon",onClick:()=>X(!0),title:"Génération programmée",children:(0,i.jsx)(w.Clock,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"outline",size:"icon",onClick:()=>Q(!0),title:"Collaboration",children:(0,i.jsx)(_.Users,{className:"h-4 w-4"})}),(0,i.jsx)(c.Button,{variant:"outline",size:"icon",onClick:()=>Z(!0),title:"Workflow de validation",children:(0,i.jsx)(C.CheckCircle2,{className:"h-4 w-4"})}),(0,i.jsxs)(c.Button,{variant:"default",onClick:ed,disabled:!q||el.isPending,className:"hidden sm:flex",title:q?"Enregistrer les modifications":"Aucune modification à enregistrer",children:[(0,i.jsx)(m.Save,{className:"h-4 w-4 mr-2"}),el.isPending?"Enregistrement...":"Enregistrer"]}),(0,i.jsx)(c.Button,{variant:"default",size:"icon",onClick:ed,disabled:!q||el.isPending,className:"sm:hidden",title:q?"Enregistrer les modifications":"Aucune modification à enregistrer",children:(0,i.jsx)(m.Save,{className:"h-4 w-4"})}),!1]})]}),(0,i.jsxs)("div",{className:"flex-1 flex overflow-hidden",children:[(0,i.jsx)("div",{className:"flex-1 overflow-y-auto px-6 py-4",children:(0,i.jsxs)(p.Accordion,{type:"single",defaultValue:M||void 0,className:"w-full space-y-4",children:[(0,i.jsxs)(p.AccordionItem,{value:"header",className:"border rounded-lg",children:[(0,i.jsx)(p.AccordionTrigger,{className:"px-6 py-4 hover:no-underline",children:(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)("span",{className:"text-xl",children:"🔝"}),(0,i.jsx)("span",{className:"text-lg font-semibold",children:"En-tête"})]})}),(0,i.jsx)(p.AccordionContent,{className:"px-0",children:(0,i.jsx)("div",{className:"px-6 pb-4",children:(0,i.jsx)(eT,{template:B,onTemplateChange:ec,onEditorRefReady:ei,isActive:"header"===M})})})]}),(0,i.jsxs)(p.AccordionItem,{value:"body",className:"border rounded-lg",children:[(0,i.jsx)(p.AccordionTrigger,{className:"px-6 py-4 hover:no-underline",children:(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)("span",{className:"text-xl",children:"📄"}),(0,i.jsx)("span",{className:"text-lg font-semibold",children:"Contenu du document"})]})}),(0,i.jsx)(p.AccordionContent,{className:"px-0",children:(0,i.jsx)("div",{className:"px-6 pb-4",children:(0,i.jsx)(td,{template:B,onTemplateChange:ec,onEditorRefReady:ei,isActive:"body"===M})})})]}),(0,i.jsxs)(p.AccordionItem,{value:"footer",className:"border rounded-lg",children:[(0,i.jsx)(p.AccordionTrigger,{className:"px-6 py-4 hover:no-underline",children:(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)("span",{className:"text-xl",children:"🔻"}),(0,i.jsx)("span",{className:"text-lg font-semibold",children:"Pied de page"})]})}),(0,i.jsx)(p.AccordionContent,{className:"px-0",children:(0,i.jsx)("div",{className:"px-6 pb-4",children:(0,i.jsx)(tg,{template:B,onTemplateChange:ec,onEditorRefReady:ei,isActive:"footer"===M})})})]}),(0,i.jsxs)(p.AccordionItem,{value:"versions",className:"border rounded-lg",children:[(0,i.jsx)(p.AccordionTrigger,{className:"px-6 py-4 hover:no-underline",children:(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)(h.History,{className:"h-5 w-5"}),(0,i.jsx)("span",{className:"text-lg font-semibold",children:"Versions"})]})}),(0,i.jsx)(p.AccordionContent,{className:"px-0",children:(0,i.jsx)("div",{className:"px-6 pb-4",children:(0,i.jsx)(tC,{templateId:B.id,onVersionRestore:()=>{F.invalidateQueries({queryKey:["document-template",k?.organization_id,S]}),I("body"),R(!1)}})})})]}),(0,i.jsxs)(p.AccordionItem,{value:"docx-template",className:"border rounded-lg",children:[(0,i.jsx)(p.AccordionTrigger,{className:"px-6 py-4 hover:no-underline",children:(0,i.jsxs)("div",{className:"flex items-center gap-3",children:[(0,i.jsx)("span",{className:"text-xl",children:"📝"}),(0,i.jsx)("span",{className:"text-lg font-semibold",children:"Template Word (DOCX)"}),B.docx_template_url&&(0,i.jsx)("span",{className:"text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full",children:"Configuré"})]})}),(0,i.jsx)(p.AccordionContent,{className:"px-0",children:(0,i.jsx)("div",{className:"px-6 pb-4",children:(0,i.jsx)(t1,{templateId:B.id,currentDocxUrl:B.docx_template_url,onUploadSuccess:e=>{ec({docx_template_url:e}),T({type:"success",title:"Template DOCX uploadé",description:"Le template Word sera utilisé pour la génération de documents Word."})},onRemoveSuccess:()=>{ec({docx_template_url:null}),T({type:"info",title:"Template DOCX supprimé",description:"La génération Word utilisera désormais la conversion HTML."})}})})})]})]})}),(0,i.jsxs)("div",{className:"w-80 border-l border-gray-200 flex-shrink-0 overflow-y-auto bg-white flex flex-col",children:[(0,i.jsx)("div",{className:"p-4 border-b border-gray-200",children:(0,i.jsx)(tW,{template:B,onTemplateChange:ec})}),(0,i.jsx)("div",{className:"flex-1 overflow-y-auto",children:(0,i.jsx)(tU,{onVariableSelect:e=>{J&&J.insertVariable(e)},className:"h-full border-0 rounded-none"})})]})]}),U&&(0,i.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:(0,i.jsx)(tA,{onClose:()=>G(!1)})}),W&&B&&(0,i.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:(0,i.jsx)(tz,{template:B,onClose:()=>X(!1)})}),K&&B&&(0,i.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:(0,i.jsx)(tk,{template:B,onClose:()=>Q(!1)})}),Y&&B&&(0,i.jsx)("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",children:(0,i.jsx)(tP,{template:B,onClose:()=>Z(!1)})})]})}e.s(["default",()=>t2],606725)}]);