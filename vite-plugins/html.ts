import { type Plugin } from "vite";

import { displayName, description, homepage } from "../package.json";
import {
  audioUrls,
  cloudflareInsightsUrls,
  type Environment
} from "../env.config";

const html = (): Plugin => {
  let mode: Environment = "development";

  return {
    name: "html",
    config(_config, { mode: configMode }) {
      mode = configMode as Environment;
    },
    transformIndexHtml(html) {
      const audioUrl = audioUrls[mode];
      const cloudflareInsightsUrl = cloudflareInsightsUrls[mode];

      return html
        .replace(/__DISPLAY_NAME__/g, displayName)
        .replace(/__DESCRIPTION__/g, description)
        .replace(/__HOME_URL__/g, homepage)
        .replace(/__SCREENSHOT_URL__/g, `${homepage}/screenshot.png`)
        .replace(/__AUDIO_URL__/g, audioUrl)
        .replace(/__CLOUDFLARE_INSIGHTS_URL__/g, cloudflareInsightsUrl);
    }
  };
};

export default html;
