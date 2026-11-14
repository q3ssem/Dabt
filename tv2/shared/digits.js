/* عرض الأرقام بالأرقام العربية في كل النصوص الظاهرة (لا يغيّر الحقول ولا البيانات المخزنة) */
(function(){var A='٠١٢٣٤٥٦٧٨٩',re=/[0-9]/,skip={INPUT:1,TEXTAREA:1,SCRIPT:1,STYLE:1,CODE:1};
function fix(n){if(n.nodeType===3){var p=n.parentNode;if(!p||skip[p.nodeName]||(p.closest&&p.closest('[data-latin]')))return;var t=n.nodeValue;if(re.test(t)){var u=t.replace(/[0-9]/g,function(d){return A[d]});if(u!==t)n.nodeValue=u}}else if(n.nodeType===1&&!skip[n.nodeName])for(var c=n.firstChild;c;c=c.nextSibling)fix(c)}
function go(){fix(document.body);new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')fix(m.target);else m.addedNodes.forEach(fix)})}).observe(document.body,{childList:true,subtree:true,characterData:true})}
if(document.body)go();else document.addEventListener('DOMContentLoaded',go)})();
