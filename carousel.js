var carousels={};
function initCarousel(id){if(!carousels[id])carousels[id]={idx:0};}
function move(id,dir){
  initCarousel(id);
  var el=document.getElementById(id);
  if(!el)return;
  var slides=el.querySelectorAll('.slide');
  var dots=el.querySelectorAll('.dot');
  var n=slides.length;
  carousels[id].idx=(carousels[id].idx+dir+n)%n;
  el.querySelector('.slides').style.transform='translateX(-'+(carousels[id].idx*100)+'%)';
  slides.forEach(function(s,i){s.classList.toggle('active',i===carousels[id].idx);});
  dots.forEach(function(d,i){d.classList.toggle('active',i===carousels[id].idx);});
}
function goTo(cid,idx){
  initCarousel(cid);
  var diff=idx-carousels[cid].idx;
  if(diff!==0)move(cid,diff);
}
var lbData={};
function openLB(id,cid){
  var slides=document.getElementById(cid).querySelectorAll('.slide');
  var idx=carousels[cid]?carousels[cid].idx:0;
  lbData[id]={idx:idx,total:slides.length,slides:slides};
  setLBImg(id);
  document.getElementById(id).classList.add('open');
}
function setLBImg(id){
  var d=lbData[id];
  var slide=d.slides[d.idx];
  document.getElementById(id+'-img').src=slide.querySelector('img').src;
  var cap=slide.querySelector('.slide-caption');
  document.getElementById(id+'-cap').textContent=cap?cap.textContent:'';
}
function lbMove(id,dir){
  var d=lbData[id];
  d.idx=(d.idx+dir+d.total)%d.total;
  setLBImg(id);
}
function closeLB(id){document.getElementById(id).classList.remove('open');}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape')document.querySelectorAll('.lightbox.open').forEach(function(el){el.classList.remove('open');});
});
