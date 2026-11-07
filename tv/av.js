/* Player avatars: twelve line drawings, shared by the TV and the phones */
var AVC=['#6E9CFF','#E8A93B','#4FC08D','#E8637A','#A988F0','#3FC1C9','#F2D58E','#6E9CFF','#E8637A','#4FC08D','#A988F0','#E8A93B'];
var AVN=['الصقر','الهلال','النخلة','الدلة','البومة','السمكة','النجمة','الصاروخ','القط','الفانوس','السفينة','الجمل'];
var AVP=[
 '<path d="M12 40c8-14 20-20 40-20-6 4-8 10-8 16 0 8-6 14-16 14-6 0-12-4-16-10z"/><path d="M44 26l10-4-6 8"/><circle cx="40" cy="30" r="2.6" fill="currentColor"/><path d="M22 46l-6 8M30 50l-2 8"/>',
 '<path d="M40 8a24 24 0 1 0 14 40A20 20 0 1 1 40 8z"/><path d="M50 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="currentColor"/>',
 '<path d="M32 58V28"/><path d="M32 28c-6-10-16-12-24-8M32 28c6-10 16-12 24-8M32 28c-10-2-18 4-20 12M32 28c10-2 18 4 20 12M32 28c-2-10 2-18 8-22"/><path d="M24 58h16"/>',
 '<path d="M22 54h26l-4-22c-1-6-6-10-9-10s-8 4-9 10z"/><path d="M27 22l3-8h10l3 8"/><path d="M48 34l10-8M18 40c-6 0-8 6-4 10"/><circle cx="35" cy="10" r="2.6" fill="currentColor"/>',
 '<path d="M14 18l8 6M50 18l-8 6"/><path d="M14 18c0 22 6 36 18 36s18-14 18-36c-6 4-12 6-18 6s-12-2-18-6z"/><circle cx="25" cy="32" r="5"/><circle cx="39" cy="32" r="5"/><path d="M30 40l2 4 2-4z" fill="currentColor"/>',
 '<path d="M8 32c8-12 20-16 32-12 6 2 10 6 12 12-2 6-6 10-12 12-12 4-24 0-32-12z"/><path d="M52 32l8-8v16z"/><circle cx="22" cy="30" r="2.6" fill="currentColor"/><path d="M32 24c2 4 2 12 0 16"/>',
 '<path d="M32 6l6 16 17 1-13 11 4 17-14-9-14 9 4-17L9 23l17-1z"/>',
 '<path d="M32 6c10 8 14 20 12 34H20C18 26 22 14 32 6z"/><circle cx="32" cy="24" r="5"/><path d="M20 34l-8 10 10-2M44 34l8 10-10-2"/><path d="M27 44l5 12 5-12"/>',
 '<path d="M14 54V24l8 6h20l8-6v30z"/><circle cx="25" cy="38" r="3" fill="currentColor"/><circle cx="39" cy="38" r="3" fill="currentColor"/><path d="M30 46l2 2 2-2M10 44h10M44 44h10"/>',
 '<path d="M32 6v6"/><path d="M24 12h16l-2 6H26z"/><path d="M22 18h20l4 28H18z"/><path d="M18 46h28l-4 8H22z"/><path d="M32 26c-4 4-4 10 0 14 4-4 4-10 0-14z" fill="currentColor"/>',
 '<path d="M8 42h48l-8 12H16z"/><path d="M32 42V8"/><path d="M32 10c12 6 16 18 14 28H32z"/><path d="M30 16c-8 6-12 14-12 22h12"/>',
 '<path d="M8 48c2-10 6-16 12-16s6-10 12-10 6 10 12 10c4 0 6 4 8 8"/><path d="M52 40c4-4 4-12 0-16h-4l2 6"/><path d="M16 48v10M24 48v10M40 48v10M48 44v14"/><path d="M8 48h44"/>'
];
function avSVG(i,size){i=((i|0)%12+12)%12;return '<svg class="av" viewBox="0 0 64 64" width="'+(size||48)+'" height="'+(size||48)+'" fill="none" stroke="'+AVC[i]+'" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" style="color:'+AVC[i]+'">'+AVP[i]+'</svg>'}
