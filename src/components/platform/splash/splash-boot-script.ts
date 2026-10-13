/**
 * Shared constants + pre-paint boot script for the animated launch splash.
 * Kept out of the `'use client'` component so the server layout can inline the raw string.
 */

export const SPLASH_ATTRIBUTE = 'data-ticknal-splash';
export const SPLASH_SESSION_KEY = 'ticknal:splash-shown';

/**
 * Inline boot script, executed synchronously before first paint.
 *
 * Decides whether the animated splash should play:
 *   - Capacitor native app (Android/iOS) cold start, or
 *   - installed PWA (display-mode: standalone) cold start, or
 *   - forced with `?splash=1` (handy for previewing in a normal browser).
 * It plays once per session, so reloads and in-app navigations are never blocked.
 *
 * When active it also hides the static native splash right away, so the native logo
 * crossfades into the animated intro instead of covering it until React hydrates.
 */
export const SPLASH_BOOT_SCRIPT = `(function(){try{
var d=document.documentElement,w=window,C=w.Capacitor;
var force=/[?&]splash=1(&|$)/.test(location.search);
var isNative=!!(w.androidBridge||(w.webkit&&w.webkit.messageHandlers&&w.webkit.messageHandlers.bridge)||(C&&C.isNativePlatform&&C.isNativePlatform()));
var seen=false;try{seen=sessionStorage.getItem('${SPLASH_SESSION_KEY}')==='1';}catch(e){}
if(!(force||!seen))return;
d.setAttribute('${SPLASH_ATTRIBUTE}','on');
w.__ticknalSplashStart=w.performance?performance.now():0;
if(isNative){requestAnimationFrame(function(){try{var opts={fadeOutDuration:250},p=null;
if(C&&C.Plugins&&C.Plugins.SplashScreen&&C.Plugins.SplashScreen.hide){p=C.Plugins.SplashScreen.hide(opts);}
else if(C&&C.nativePromise){p=C.nativePromise('SplashScreen','hide',opts);}
if(p&&p.catch){p.catch(function(){});}
}catch(e){}});}
}catch(e){}})();`;
