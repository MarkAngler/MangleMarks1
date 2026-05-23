import React, { useState, useEffect } from 'react';
import { Bookmark, Star, ArrowDownRight, Compass, Copy, Check, MousePointerClick, Smartphone, Share2, DownloadCloud, Grid } from 'lucide-react';

export default function BookmarkletSection() {
  const [activeTab, setActiveTab] = useState<'desktop' | 'android'>('desktop');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://manglemarks.web.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // JavaScript snippet for bookmarklet.
  const bookmarkletCode = `javascript:(function(){var url=encodeURIComponent(window.location.href);var title=encodeURIComponent(document.title);var popup=window.open('${origin}/?add_url='+url+'&add_title='+title,'MangleMarksClick','width=520,height=600,status=no,resizable=yes,scrollbars=yes');if(window.focus){popup.focus();}})();`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/10 p-6 space-y-6">
      
      {/* Tab Switcher Headers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-150 pb-4 gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-indigo-505 p-2.5 text-white bg-indigo-500 shadow-md shadow-indigo-500/10 shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-base font-extrabold text-zinc-950 tracking-tight">Save Links from Everywhere</h3>
            <p className="text-xs text-zinc-500">Enable superpowered bookmarking on desktop browsers and mobile devices.</p>
          </div>
        </div>
        
        {/* Toggle options */}
        <div className="flex bg-zinc-100 p-1 rounded-lg self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('desktop')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Desktop Bookmarklet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'android'
                ? 'bg-indigo-550 bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Android App
          </button>
        </div>
      </div>

      {activeTab === 'desktop' ? (
        <>
          <div className="flex items-start gap-2.5 text-zinc-600">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-zinc-500">
              Drag this smart link directly to your bookmark bar, or copy the widget script manually. Click it from any page on the web to instantly bookmark it under your account!
            </p>
          </div>

          {/* Installer visual bar */}
          <div className="flex flex-col md:flex-row items-center gap-6 justify-between rounded-xl bg-white border border-zinc-150 p-5">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
                Install Link Button <MousePointerClick className="h-3 w-3" />
              </div>
              <p className="text-xs text-zinc-400">Drag or copy this button link:</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Draggable button */}
              <a
                href={bookmarkletCode}
                onClick={(e) => {
                  e.preventDefault();
                  alert("Bookmarklet launcher clicked! To install it, drag this button directly to your browser's bookmarks bar (press Cmd/Ctrl + Shift + B if hidden). You can also click 'Copy Link Code' to register it manually.");
                }}
                className="select-none inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 text-white font-extrabold px-5 py-3 text-sm hover:bg-indigo-600 active:scale-95 transition cursor-grab shadow-md shadow-indigo-600/10 z-10"
                title="Drag me to your bookmarks bar!"
              >
                <Bookmark className="h-4 w-4" />
                Add to MangleMarks
              </a>

              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1 hover:border-zinc-300 border border-zinc-200 text-zinc-650 font-semibold bg-zinc-50 rounded-lg px-4 py-3 text-xs transition active:scale-95 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-indigo-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tutorial columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">1</div>
              <h5 className="font-bold text-zinc-800 text-xs text-left">Drag and Drop</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed text-left">
                Drag the <strong className="text-indigo-600 font-bold">Add to MangleMarks</strong> button up to your Web Browser's Bookmarks/Favorites bar.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">2</div>
              <h5 className="font-bold text-zinc-800 text-xs text-left">Click on Any Website</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed text-left">
                When reading any site (e.g. Medium, Github, Google), click the <strong className="text-indigo-600 font-bold">Add to MangleMarks</strong> shortcut.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">3</div>
              <h5 className="font-bold text-zinc-800 text-xs text-left">Instantly Categorize</h5>
              <p className="text-[11px] text-zinc-500 leading-relaxed text-left">
                A secure mini-window opens with the page title/URL pre-filled. Customize tags, select a Dashboard tab & save!
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-2.5 text-zinc-650">
            <Share2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed text-zinc-500">
              Integrate MangleMarks directly into your Android OS’s native share sheet. Save items with a single tap straight from Google Chrome, Firefox, or other mobile browsers!
            </p>
          </div>

          {/* Tutorial steps for PWA registration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            <div className="bg-white border border-zinc-150 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">1</div>
                <h5 className="font-bold text-zinc-950 text-xs">Install App on Android</h5>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Open this website in <strong className="text-indigo-600 font-bold">Google Chrome</strong> on your Android phone. Tap Chrome's menu icon (<span className="font-bold">⋮</span>) at the top-right and select <strong className="text-zinc-800">"Install App"</strong> or <strong className="text-zinc-800">"Add to Home screen"</strong>.
              </p>
              <div className="text-[10px] bg-slate-50 text-slate-500 p-2 rounded-md font-semibold text-center border">
                PWA Web-APK Install enabled
              </div>
            </div>

            <div className="bg-white border border-zinc-150 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">2</div>
                <h5 className="font-bold text-zinc-950 text-xs">Tap Browser "Share"</h5>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                While browsing any web page on your phone, use Chrome or Firefox's native browser menu to select <strong className="text-indigo-600 font-bold">"Share..."</strong> or click the native browser share symbol.
              </p>
              <div className="text-[10px] bg-indigo-50 text-indigo-700 p-2 rounded-md font-bold text-center border border-indigo-100">
                Detects Page Title + URL
              </div>
            </div>

            <div className="bg-white border border-zinc-150 p-4 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold flex items-center justify-center">3</div>
                <h5 className="font-bold text-zinc-950 text-xs">Choose MangleMarks</h5>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Tap <strong className="text-zinc-800">"MangleMarks"</strong> from your Android share sheet. This boots up our custom, lightning-fast <strong className="text-indigo-600">Quick Link Saver</strong> modal so you can save in one-click!
              </p>
              <div className="text-[10px] bg-emerald-50 text-emerald-700 p-2 rounded-md font-bold text-center border border-emerald-100">
                Secured and Syncs Instantly
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
