(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const config = window.GIFT_CONFIG, effects = window.GiftEffects;
  const scenes = ['welcome', 'classroom', 'flower', 'memories', 'gift'];
  let current = 'welcome', history = [], currentPhoto = 0, transitionTimer, toastTimer, resizeTimer;
  let filmFrame = 0, previousFrame = 0, filmDrag = null, suppressFilmClick = false, resumeAfter = 0, filmPosition = 0;
  const photos = config.photos.length ? config.photos : [{ src:'assets/images/start-logo.png', caption:'Gửi ngàn lời tri ân', alt:'Ngày Nhà giáo Việt Nam' }];
  const music = $('#music'); let wantsMusic = false;
  const audioOwner = `${Date.now()}-${Math.random()}`;
  const audioChannel = typeof window.BroadcastChannel==='function' ? new BroadcastChannel('teachers-day-background-music') : null;
  if(audioChannel) audioChannel.onmessage=event=>{
    if(event.data?.type==='music-owner' && event.data.owner!==audioOwner){wantsMusic=false;music.pause();$('#gift-frame').contentWindow?.GiftAudioControls?.stop();}
  };
  music.addEventListener('play',()=>{if(current==='gift'){music.pause();return;}audioChannel?.postMessage({type:'music-owner',owner:audioOwner});});
  document.title = config.title; music.src = config.music;
  music.volume = Math.max(0, Math.min(1, Number.isFinite(Number(config.musicVolume)) ? Number(config.musicVolume) : .35));
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible'); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
  function updatePhoto(index) {
    currentPhoto = (index + photos.length) % photos.length;
    $('#large-photo').src = photos[currentPhoto].src; $('#large-photo').alt = photos[currentPhoto].alt || photos[currentPhoto].caption;
    $('#photo-caption').textContent = photos[currentPhoto].caption; $('#photo-count').textContent = `${currentPhoto + 1} / ${photos.length}`;
  }
  function openPhoto(index) { updatePhoto(index); if (!$('#photo-dialog').open) $('#photo-dialog').showModal(); }
  function makePhoto(photo, index, type) {
    const button = document.createElement('button'); button.type = 'button'; button.className = type;
    button.setAttribute('aria-label', `Xem lớn: ${photo.alt || photo.caption}`);
    const image = document.createElement('img'); image.src = photo.src; image.alt = photo.alt || photo.caption; image.draggable = false;
    image.addEventListener('error', () => { if (!image.dataset.fallback) { image.dataset.fallback = 'true'; image.src = 'assets/images/start-logo.png'; } });
    const caption = document.createElement('span'); caption.className = 'caption'; caption.textContent = photo.caption;
    button.append(image,caption);
    if (type === 'polaroid') { const clip = document.createElement('span'); clip.className = 'paperclip'; clip.setAttribute('aria-hidden','true'); button.append(clip); }
    button.addEventListener('click', () => openPhoto(index)); return button;
  }
  document.querySelectorAll('[data-photo-wall]').forEach(wall => photos.slice(0,3).forEach((p,i) => wall.append(makePhoto(p,i,'polaroid'))));
  photos.slice(0,2).forEach((photo,index)=>$('[data-bloom-photos]').append(makePhoto(photo,index,'polaroid')));
  // Two identical halves make the film loop without a visible jump.
  const filmCount = Math.max(9, photos.length);
  for (let half = 0; half < 2; half++) for (let i = 0; i < filmCount; i++) {
    const item = makePhoto(photos[i % photos.length],i % photos.length,'film-photo');
    if (half) { item.tabIndex = -1; item.setAttribute('aria-hidden','true'); }
    $('#film-track').append(item);
  }
  for (let i=0;i<24;i++) { const dust=document.createElement('i'); dust.style.cssText=`--x:${Math.random()*100}%;--y:${Math.random()*100}%;--size:${1+Math.random()*2}px;--duration:${5+Math.random()*8}s;--delay:${-Math.random()*12}s`; $('.dust').append(dust); }
  $('#passcode-hint').textContent = config.passcodeHint;
  $('#passcode').maxLength = Math.max(4,String(config.passcode).length);
  function updateMusic() { const audio=current==='gift'?$('#gift-frame').contentWindow?.GiftAudioControls:null; const playing=current==='gift'?!!(audio?.playing&&!audio?.muted):!music.paused; $('#music-button').setAttribute('aria-pressed',String(playing)); $('#music-button').setAttribute('aria-label',playing?'Tắt âm thanh':'Bật âm thanh'); $('#music-icon').textContent=playing?'♫':'♪'; }
  async function playMusic() { if(current==='gift')return; try { await music.play(); } catch { wantsMusic=false; updateMusic(); toast('Chạm nút ♪ để bật nhạc nền nhé.'); } }
  music.addEventListener('play',updateMusic); music.addEventListener('pause',updateMusic);
  function closeMenu() { $('#scene-menu').hidden=true; $('#menu-button').setAttribute('aria-expanded','false'); }
  function stopFilm() { cancelAnimationFrame(filmFrame); filmFrame=0; previousFrame=0; }
  function paintFilm() {
    const items=$('#film-track').children;
    const loop=items[filmCount]?.offsetLeft-items[0]?.offsetLeft;
    if(loop>0) filmPosition=((filmPosition%loop)+loop)%loop;
    $('#film-track').style.transform=`translate3d(${-filmPosition}px,0,0)`;
  }
  function runFilm(time) {
    if(current!=='memories' || document.hidden) { stopFilm(); return; }
    const dt=previousFrame?Math.min(50,time-previousFrame):0; previousFrame=time;
    if(!filmDrag && !$('#photo-dialog').open && time>resumeAfter) {
      filmPosition += dt*(effects.reducedMotion()?.120:.270);
      paintFilm();
    }
    filmFrame=requestAnimationFrame(runFilm);
  }
  function startFilm() { stopFilm(); filmFrame=requestAnimationFrame(runFilm); }
  function showScene(name, options={}) {
    if(name==='letter') name='flower';
    if(!scenes.includes(name)||name===current) return;
    clearTimeout(transitionTimer); stopFilm(); closeMenu();
    const leavingGift=current==='gift';
    if(leavingGift)$('#gift-frame').contentWindow?.GiftAudioControls?.stop();
    document.querySelectorAll('.screen.leaving').forEach(screen=>{screen.hidden=true;screen.classList.remove('leaving');screen.querySelector('iframe')?.removeAttribute('src');});
    if(options.record!==false) history.push(current);
    const old=document.getElementById(current), next=document.getElementById(name);
    old.classList.remove('active'); old.classList.add('leaving'); old.inert=true; old.setAttribute('aria-hidden','true');
    const leavingFrame=old.querySelector('iframe');
    current=name; next.hidden=false; next.inert=false; next.removeAttribute('aria-hidden'); next.classList.add('active'); next.tabIndex=-1; next.focus({preventScroll:true});
    if(name==='gift')music.pause();
    else if(leavingGift && wantsMusic && name!=='welcome' && !document.hidden)playMusic();
    updateMusic();
    $('#experience-tools').hidden=name==='welcome'; $('#back-button').disabled=!history.length;
    document.body.classList.toggle('night-mode',['flower','gift'].includes(name));
    document.querySelectorAll('#scene-menu [data-go]').forEach(button=>{button.classList.toggle('current',button.dataset.go===name);if(button.dataset.go===name)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    if(name==='welcome') { wantsMusic=false;music.pause(); }
    if(name==='classroom') setTimeout(()=>{if(current===name)next.classList.add('finished');},effects.reducedMotion()?0:8000);
    if(name==='memories') { resumeAfter=0; requestAnimationFrame(()=>effects.collage($('#collage-canvas'),photos)); startFilm(); }
    if(name==='flower') { $('#flower').removeAttribute('data-flower-stage'); $('#bloom-frame').src=$('#bloom-frame').dataset.src; }
    if(name==='gift') {
      $('#gift-loading').hidden=false;
      const source=new URL($('#gift-frame').dataset.src,location.href);
      if(new URLSearchParams(location.search).get('resume')==='finale')source.searchParams.set('resume','finale');
      $('#gift-frame').src=source.href;
    }
    transitionTimer=setTimeout(()=>{old.hidden=true;old.classList.remove('leaving');if(leavingFrame)leavingFrame.removeAttribute('src');},effects.reducedMotion()?0:850);
  }
  document.querySelectorAll('[data-go]').forEach(button=>button.addEventListener('click',()=>showScene(button.dataset.go)));
  window.addEventListener('message',event=>{
    if(event.origin===location.origin && event.source===$('#gift-frame').contentWindow && event.data?.type==='gift-audio-state'){
      if(current!=='gift'){$('#gift-frame').contentWindow?.GiftAudioControls?.stop();return;}
      music.pause(); updateMusic();
      if($('#gift-frame').contentWindow?.GiftAudioControls?.playing)audioChannel?.postMessage({type:'music-owner',owner:audioOwner});
      return;
    }
    if(event.origin!==location.origin || event.source!==$('#bloom-frame').contentWindow) return;
    if(current==='flower' && event.data?.type==='bloom-stage' && ['bloom','spiral','halo','heart','finale'].includes(event.data.stage)) {$('#flower').dataset.flowerStage=event.data.stage;}
    if(current==='flower' && event.data?.type==='bloom-cycle-complete') showScene('memories');
  });
  $('#gift-frame').addEventListener('load',()=>{if(current==='gift' && $('#gift-frame').hasAttribute('src')) $('#gift-loading').hidden=true;});
  function begin(){wantsMusic=true;playMusic();showScene('classroom');}
  $('#start-button').addEventListener('click',()=>{if(config.enablePasscode){$('#passcode-dialog').showModal();$('#passcode').focus();}else begin();});
  $('#passcode-form').addEventListener('submit',e=>{e.preventDefault();if($('#passcode').value===String(config.passcode)){$('#passcode-dialog').close();begin();}else{$('#passcode-error').textContent='Chưa đúng rồi, thử lại theo gợi ý nhé ♡';$('#passcode').value='';}});
  $('#cancel-passcode').addEventListener('click',()=>$('#passcode-dialog').close());
  $('#music-button').addEventListener('click',()=>{if(current==='gift'){$('#gift-frame').contentWindow?.GiftAudioControls?.toggle();updateMusic();return;}wantsMusic=music.paused;if(wantsMusic){playMusic();}else{music.pause();}});
  $('#back-button').addEventListener('click',()=>{const previous=history.pop();if(previous)showScene(previous,{record:false});});
  $('#menu-button').addEventListener('click',()=>{const opening=$('#scene-menu').hidden;$('#scene-menu').hidden=!opening;$('#menu-button').setAttribute('aria-expanded',String(opening));if(opening)$('#scene-menu button.current')?.focus();});
  document.addEventListener('click',e=>{if(!e.target.closest('#scene-menu,#menu-button'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#scene-menu').hidden){closeMenu();$('#menu-button').focus();}if($('#photo-dialog').open&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();updatePhoto(currentPhoto+(e.key==='ArrowRight'?1:-1));}});
  $('#close-photo').addEventListener('click',()=>$('#photo-dialog').close());$('#photo-prev').addEventListener('click',()=>updatePhoto(currentPhoto-1));$('#photo-next').addEventListener('click',()=>updatePhoto(currentPhoto+1));
  $('#photo-dialog').addEventListener('click',e=>{if(e.target===$('#photo-dialog'))$('#photo-dialog').close();});
  function stepFilm(direction){resumeAfter=performance.now()+1200;filmPosition+=direction*300;paintFilm();}
  $('#film-strip').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();stepFilm(e.key==='ArrowLeft'?-1:1);}});
  $('#film-strip').addEventListener('pointerdown',e=>{resumeAfter=performance.now()+1200;filmDrag={x:e.clientX,position:filmPosition};suppressFilmClick=false;});
  $('#film-strip').addEventListener('pointermove',e=>{if(!filmDrag)return;const dx=e.clientX-filmDrag.x;if(Math.abs(dx)>5){suppressFilmClick=true;$('#film-strip').setPointerCapture(e.pointerId);$('#film-strip').classList.add('dragging');filmPosition=filmDrag.position-dx;paintFilm();}});
  function releaseFilm(){filmDrag=null;$('#film-strip').classList.remove('dragging');resumeAfter=performance.now()+1200;}
  window.addEventListener('pointerup',releaseFilm);$('#film-strip').addEventListener('pointercancel',releaseFilm);
  $('#film-strip').addEventListener('pointerleave',()=>{if(filmDrag)releaseFilm();});
  $('#film-strip').addEventListener('click',e=>{if(suppressFilmClick){e.preventDefault();e.stopImmediatePropagation();suppressFilmClick=false;}},true);
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(current==='memories')effects.collage($('#collage-canvas'),photos);},150);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopFilm();music.pause();}else{if(current==='memories')startFilm();if(wantsMusic&&current!=='welcome'&&current!=='gift')playMusic();}});
  const requested=new URLSearchParams(location.search).get('scene');if(requested&&!config.enablePasscode)showScene(requested,{record:false});
})();
