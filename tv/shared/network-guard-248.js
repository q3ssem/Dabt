/* TV authoritative, pure network health policy. No network traffic. */
(function(root){'use strict';
function health(s,now,up,phones){var missing=[];if(!s||s.phase!=='question')return {reason:'',missing:missing};var grace=Math.max(0,s.roundStart||0);s.players.forEach(function(p){var seen=phones[p.id]&&phones[p.id].seen||0;if(now-Math.max(seen,grace)>=10000)missing.push(p.id)});return {reason:!up?'brokers':missing.length>=2?'players':'',missing:missing}}
function canResume(s,now,up,phones){if(!s||!s.networkPause)return true;if(!up)return false;var h=health(s,now,up,phones);if(h.reason)return false;return !s.players.length||s.players.some(function(p){return phones[p.id]&&now-phones[p.id].seen<10000})}
var api={health:health,canResume:canResume};root.MajlisNetworkGuard=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);