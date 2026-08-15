"use client";

import Script from "next/script";

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      AppEvents: {
        logPageView: () => void;
        logEvent?: (eventName: string, valueToSum?: number, parameters?: Record<string, any>) => void;
      };
      login?: (callback: (response: any) => void, options?: { scope: string }) => void;
      getLoginStatus?: (callback: (response: any) => void) => void;
      api?: (path: string, method?: string | object, params?: object | ((response: any) => void), callback?: (response: any) => void) => void;
    };
  }
}

interface FacebookSDKProps {
  appId?: string;
  version?: string;
  language?: string;
}

export default function FacebookSDK({
  appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "",
  version = process.env.NEXT_PUBLIC_FACEBOOK_API_VERSION || "v20.0",
  language = "vi_VN",
}: FacebookSDKProps) {
  return (
    <>
      <div id="fb-root" />
      <Script
        id="facebook-jssdk-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.fbAsyncInit = function() {
              if (window.FB) {
                window.FB.init({
                  appId      : '${appId}',
                  cookie     : true,
                  xfbml      : true,
                  version    : '${version}'
                });
                
                try {
                  window.FB.AppEvents.logPageView();
                } catch (e) {
                  console.warn('Facebook AppEvents logPageView error:', e);
                }
              }
            };
          `,
        }}
      />
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src={`https://connect.facebook.net/${language}/sdk.js`}
      />
    </>
  );
}
